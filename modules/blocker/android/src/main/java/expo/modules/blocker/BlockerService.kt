package expo.modules.blocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class BlockerService : Service() {
    private val appMonitor = AppMonitor()
    private val overlay = BlockerOverlay()
    private val taskStatusChecker = TaskStatusChecker()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var maxTimeRunnable: Runnable? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var screenReceiverRegistered = false

    // Polling every 250ms is pointless while the screen is off — nobody can
    // open an app. Pausing the monitor and dropping the wake lock keeps the
    // battery cost of long sessions down without losing enforcement.
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val state = BlockerState.getInstance(context)
            if (!state.isActive()) return
            when (intent.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    Log.i(TAG, "Screen off — pausing app monitor")
                    appMonitor.pause()
                    releaseWakeLock()
                }
                Intent.ACTION_SCREEN_ON -> {
                    Log.i(TAG, "Screen on — resuming app monitor")
                    appMonitor.resume()
                    acquireWakeLock(remainingSessionMs(state))
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        if (!screenReceiverRegistered) {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_ON)
                addAction(Intent.ACTION_SCREEN_OFF)
            }
            registerReceiver(screenReceiver, filter)
            screenReceiverRegistered = true
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val state = BlockerState.getInstance(this)
        val scheduleState = ScheduleState.getInstance(this)
        val pendingScheduleId = scheduleState.getPendingScheduleId()

        if (!state.isActive() && pendingScheduleId == null) {
            Log.w(TAG, "BlockerState not active, stopping service")
            stopSelf()
            return START_NOT_STICKY
        }

        // Must foreground within 5s of startForegroundService — before any
        // network work for a pending schedule.
        startForeground(NOTIFICATION_ID, buildNotification())

        if (pendingScheduleId != null) {
            // Clear before executing so a START_STICKY restart can't re-run it.
            scheduleState.clearPendingSchedule()
            if (!state.isActive()) {
                Log.i(TAG, "Executing pending schedule=$pendingScheduleId")
                serviceScope.launch {
                    val started = ScheduleExecutor.execute(this@BlockerService, pendingScheduleId)
                    mainHandler.post {
                        if (started) {
                            beginSession()
                        } else if (!BlockerState.getInstance(this@BlockerService).isActive()) {
                            stopSelf()
                        }
                    }
                }
                return START_STICKY
            }
        }

        beginSession()
        return START_STICKY
    }

    private fun beginSession() {
        val state = BlockerState.getInstance(this)
        if (!state.isActive()) {
            stopSelf()
            return
        }

        val blockedPackages = state.getBlockedPackages()
        val sessionId = state.getSessionId()

        Log.i(TAG, "Starting blocker session=$sessionId with ${blockedPackages.size} blocked apps")

        acquireWakeLock(remainingSessionMs(state))
        BlockerWatchdogReceiver.schedule(this)

        if (state.getNotificationBlockMode() > 0) {
            NotificationBlockerService.ensureBound(this)
        }

        appMonitor.start(
            context = this,
            packages = blockedPackages,
            onBlockedAppDetected = { packageName ->
                Log.i(TAG, "Blocked app detected: $packageName")
                mainHandler.post { overlay.show(this@BlockerService) }
            },
            onBlockedAppLeft = {
                Log.i(TAG, "Left blocked app")
                mainHandler.post { overlay.hide() }
            }
        )

        // Poll backend to detect task completion — delay until 1 min before min duration
        val authToken = state.getAuthToken()
        val baseUrl = state.getBaseUrl()
        if (authToken.isNotEmpty() && baseUrl.isNotEmpty()) {
            val minDurationMs = state.getMinimumDurationMs()
            val elapsed = state.getElapsedSinceStart()
            val pollDelay = maxOf(0L, minDurationMs - 60_000L - elapsed)

            taskStatusChecker.start(
                baseUrl = baseUrl,
                authToken = authToken,
                initialDelayMs = pollDelay,
                onNoActiveTasks = {
                    Log.i(TAG, "Backend reports no active tasks, stopping blocker")
                    state.stopSession()
                    mainHandler.post {
                        overlay.hide()
                        stopSelf()
                    }
                }
            )
        }

        // Enforce max block time
        val maxBlockTimeMs = state.getMaxBlockTimeMs()
        if (maxBlockTimeMs > 0) {
            val elapsed = state.getElapsedSinceStart()
            val remaining = maxBlockTimeMs - elapsed
            if (remaining <= 0) {
                Log.i(TAG, "Max block time already exceeded, stopping blocker")
                state.stopSession()
                overlay.hide()
                stopSelf()
                return
            }
            // onStartCommand can run more than once per instance (watchdog,
            // repeated startBlocking) — never stack a second stop runnable.
            maxTimeRunnable?.let { mainHandler.removeCallbacks(it) }
            maxTimeRunnable = Runnable {
                Log.i(TAG, "Max block time reached, stopping blocker")
                state.stopSession()
                overlay.hide()
                stopSelf()
            }
            mainHandler.postDelayed(maxTimeRunnable!!, remaining)
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "BlockerService destroyed")
        appMonitor.stop()
        taskStatusChecker.stop()
        serviceScope.cancel()
        maxTimeRunnable?.let { mainHandler.removeCallbacks(it) }
        overlay.hide()
        releaseWakeLock()
        if (screenReceiverRegistered) {
            try {
                unregisterReceiver(screenReceiver)
            } catch (_: Exception) {
            }
            screenReceiverRegistered = false
        }
        // Cancel watchdog only if the session ended cleanly; if the OS killed us,
        // the watchdog will fire, see isActive=true, and restart us.
        if (!BlockerState.getInstance(this).isActive()) {
            BlockerWatchdogReceiver.cancel(this)
        }
        super.onDestroy()
    }

    private fun remainingSessionMs(state: BlockerState): Long {
        val maxBlockTimeMs = state.getMaxBlockTimeMs()
        if (maxBlockTimeMs <= 0) return DEFAULT_WAKELOCK_TIMEOUT_MS
        val remaining = maxBlockTimeMs - state.getElapsedSinceStart()
        return if (remaining > 0) remaining else DEFAULT_WAKELOCK_TIMEOUT_MS
    }

    private fun acquireWakeLock(timeoutMs: Long) {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "BrainClean::BlockerWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(timeoutMs)
        }
        Log.i(TAG, "WakeLock acquired (timeout=${timeoutMs}ms)")
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                Log.i(TAG, "WakeLock released")
            }
        }
        wakeLock = null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "BrainClean Blocker",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when BrainClean is blocking apps"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(LocalizedStrings.get(this, "blocker.notifTitle"))
            .setContentText(LocalizedStrings.get(this, "blocker.notifText"))
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val TAG = "BlockerService"
        private const val CHANNEL_ID = "brainclean_blocker"
        private const val NOTIFICATION_ID = 1001
        private const val DEFAULT_WAKELOCK_TIMEOUT_MS = 24L * 60L * 60L * 1000L

        fun start(context: Context) {
            // Called from receivers while the app may be in the background.
            // If the FGS-start exemption is gone (e.g. the user revoked the
            // overlay permission), this throws — never crash the caller.
            try {
                val intent = Intent(context, BlockerService::class.java)
                ContextCompat.startForegroundService(context, intent)
            } catch (e: Exception) {
                Log.e(TAG, "Unable to start BlockerService", e)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, BlockerService::class.java)
            context.stopService(intent)
        }
    }
}
