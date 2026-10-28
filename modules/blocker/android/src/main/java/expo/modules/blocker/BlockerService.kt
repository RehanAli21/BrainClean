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

class BlockerService : Service() {
    private val appMonitor = AppMonitor()
    private val overlay = BlockerOverlay()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var maxTimeRunnable: Runnable? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var systemReceiverRegistered = false

    // Polling every 250ms is pointless while the screen is off — nobody can
    // open an app. Pausing the monitor and dropping the wake lock keeps the
    // battery cost of long sessions down without losing enforcement.
    //
    // Power connect/disconnect is handled here too: charging transitions are a
    // common moment for aggressive OEMs to freeze the app or silently re-apply
    // battery optimization, which drops the self-rescheduling watchdog alarm and
    // re-restricts background FGS starts. We re-anchor the keep-alive on every
    // such transition while the service is still alive.
    private val systemStateReceiver = object : BroadcastReceiver() {
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
                    // The max-time runnable is a Handler delay, which doesn't
                    // advance in deep sleep. Check against the monotonic clock
                    // the moment the device wakes so an expired session lifts.
                    val maxBlockTimeMs = state.getMaxBlockTimeMs()
                    if (maxBlockTimeMs > 0 && state.getElapsedSinceStart() >= maxBlockTimeMs) {
                        Log.i(TAG, "Screen on — max block time already reached, stopping blocker")
                        endSession(state)
                        return
                    }
                    Log.i(TAG, "Screen on — resuming app monitor")
                    appMonitor.resume()
                    acquireWakeLock(remainingSessionMs(state))
                    // Re-arm on every screen-on so a single dropped alarm fire
                    // (Doze / OEM freeze) can't permanently break the chain.
                    ServiceGuardReceiver.schedule(context)
                }
                Intent.ACTION_POWER_CONNECTED,
                Intent.ACTION_POWER_DISCONNECTED -> {
                    Log.i(TAG, "Power state changed (${intent.action}) — re-anchoring keep-alive")
                    ServiceGuardReceiver.schedule(context)
                    warnIfBatteryOptimizationLost(context)
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        if (!systemReceiverRegistered) {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_ON)
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_POWER_CONNECTED)
                addAction(Intent.ACTION_POWER_DISCONNECTED)
            }
            registerReceiver(systemStateReceiver, filter)
            systemReceiverRegistered = true
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val state = BlockerState.getInstance(this)

        if (!state.isActive()) {
            Log.w(TAG, "BlockerState not active, stopping service")
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification())
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
        ServiceGuardReceiver.schedule(this)

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

        // Enforce max block time
        val maxBlockTimeMs = state.getMaxBlockTimeMs()
        if (maxBlockTimeMs > 0) {
            val elapsed = state.getElapsedSinceStart()
            val remaining = maxBlockTimeMs - elapsed
            if (remaining <= 0) {
                Log.i(TAG, "Max block time already exceeded, stopping blocker")
                endSession(state)
                return
            }
            // onStartCommand can run more than once per instance (watchdog,
            // repeated startBlocking) — never stack a second stop runnable.
            maxTimeRunnable?.let { mainHandler.removeCallbacks(it) }
            maxTimeRunnable = Runnable {
                Log.i(TAG, "Max block time reached, stopping blocker")
                endSession(state)
            }
            mainHandler.postDelayed(maxTimeRunnable!!, remaining)
        }
    }

    private fun endSession(state: BlockerState) {
        state.stopSession()
        overlay.hide()
        stopSelf()
    }

    override fun onDestroy() {
        Log.i(TAG, "BlockerService destroyed")
        appMonitor.stop()
        maxTimeRunnable?.let { mainHandler.removeCallbacks(it) }
        overlay.hide()
        releaseWakeLock()
        if (systemReceiverRegistered) {
            try {
                unregisterReceiver(systemStateReceiver)
            } catch (_: Exception) {
            }
            systemReceiverRegistered = false
        }
        // Cancel the guard only if nothing needs keeping alive anymore. If the OS
        // killed us mid-session, isActive stays true, so cancelIfIdle is a no-op
        // and the guard fires, sees isActive=true, and restarts us.
        ServiceGuardReceiver.cancelIfIdle(this)
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

    private fun warnIfBatteryOptimizationLost(context: Context) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
        if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
            Log.w(TAG, "Battery optimization NO LONGER ignored — background service restarts may be blocked")
        }
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    e is android.app.ForegroundServiceStartNotAllowedException) {
                    Log.e(TAG, "FGS start BLOCKED by OS (background start not allowed) — " +
                        "battery optimization exemption likely lost or app is background-restricted", e)
                } else {
                    Log.e(TAG, "Unable to start BlockerService", e)
                }
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, BlockerService::class.java)
            context.stopService(intent)
        }
    }
}
