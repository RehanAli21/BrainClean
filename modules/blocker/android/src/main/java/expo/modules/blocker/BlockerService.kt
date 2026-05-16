package expo.modules.blocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class BlockerService : Service() {
    private val appMonitor = AppMonitor()
    private val overlay = BlockerOverlay()
    private val taskStatusChecker = TaskStatusChecker()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var maxTimeRunnable: Runnable? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val state = BlockerState.getInstance(this)

        if (!state.isActive()) {
            Log.w(TAG, "BlockerState not active, stopping service")
            stopSelf()
            return START_NOT_STICKY
        }

        val blockedPackages = state.getBlockedPackages()
        val sessionId = state.getSessionId()

        Log.i(TAG, "Starting blocker service for session=$sessionId with ${blockedPackages.size} blocked apps")

        startForeground(NOTIFICATION_ID, buildNotification())
        acquireWakeLock(state.getMaxBlockTimeMs())
        BlockerWatchdogReceiver.schedule(this)

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

        // Poll backend to detect task completion
        val authToken = state.getAuthToken()
        val baseUrl = state.getBaseUrl()
        if (authToken.isNotEmpty() && baseUrl.isNotEmpty()) {
            taskStatusChecker.start(
                baseUrl = baseUrl,
                authToken = authToken,
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
            val elapsed = System.currentTimeMillis() - state.getStartedAt()
            val remaining = maxBlockTimeMs - elapsed
            if (remaining <= 0) {
                Log.i(TAG, "Max block time already exceeded, stopping blocker")
                state.stopSession()
                overlay.hide()
                stopSelf()
                return START_NOT_STICKY
            }
            maxTimeRunnable = Runnable {
                Log.i(TAG, "Max block time reached, stopping blocker")
                state.stopSession()
                overlay.hide()
                stopSelf()
            }
            mainHandler.postDelayed(maxTimeRunnable!!, remaining)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "BlockerService destroyed")
        appMonitor.stop()
        taskStatusChecker.stop()
        maxTimeRunnable?.let { mainHandler.removeCallbacks(it) }
        overlay.hide()
        releaseWakeLock()
        // Cancel watchdog only if the session ended cleanly; if the OS killed us,
        // the watchdog will fire, see isActive=true, and restart us.
        if (!BlockerState.getInstance(this).isActive()) {
            BlockerWatchdogReceiver.cancel(this)
        }
        super.onDestroy()
    }

    private fun acquireWakeLock(maxBlockTimeMs: Long) {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val timeoutMs = if (maxBlockTimeMs > 0) maxBlockTimeMs else DEFAULT_WAKELOCK_TIMEOUT_MS
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
            .setContentTitle("BrainClean")
            .setContentText("BrainClean is protecting your focus.")
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
            val intent = Intent(context, BlockerService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, BlockerService::class.java)
            context.stopService(intent)
        }
    }
}
