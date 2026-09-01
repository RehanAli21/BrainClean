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
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class WellnessService : Service() {
    private val eyeBlinkerTimer = EyeBlinkerTimer()
    private val autoBlockTracker = AutoBlockTracker()
    private var powerReceiverRegistered = false

    // Charging transitions are a common moment for aggressive OEMs to freeze the
    // app or silently re-apply battery optimization, which drops the
    // self-rescheduling watchdog alarm. Re-anchor the keep-alive on each one.
    private val powerReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (!WellnessState.getInstance(context).isAnyFeatureEnabled()) return
            Log.i(TAG, "Power state changed (${intent.action}) — re-anchoring keep-alive")
            ServiceGuardReceiver.schedule(context)
            warnIfBatteryOptimizationLost(context)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        if (!powerReceiverRegistered) {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_POWER_CONNECTED)
                addAction(Intent.ACTION_POWER_DISCONNECTED)
            }
            registerReceiver(powerReceiver, filter)
            powerReceiverRegistered = true
        }
    }

    private fun warnIfBatteryOptimizationLost(context: Context) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
        if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
            Log.w(TAG, "Battery optimization NO LONGER ignored — background service restarts may be blocked")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val state = WellnessState.getInstance(this)

        if (!state.isAnyFeatureEnabled()) {
            Log.w(TAG, "No wellness features enabled, stopping service")
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification(state))
        ServiceGuardReceiver.schedule(this)

        if (state.isEyeBlinkerEnabled()) {
            eyeBlinkerTimer.start(
                this,
                state.getEyeBlinkerIntervalMinutes(),
                state.getEyeBlinkerDurationSeconds()
            )
        } else {
            eyeBlinkerTimer.stop()
        }

        if (state.isAutoBlockEnabled()) {
            val apps = state.getAutoBlockApps()
            if (apps.isNotEmpty()) {
                autoBlockTracker.start(
                    this,
                    apps,
                    state.getAutoBlockUsageLimitMinutes(),
                    state.getAutoBlockDurationSeconds()
                )
            } else {
                autoBlockTracker.stop()
            }
        } else {
            autoBlockTracker.stop()
        }

        Log.i(TAG, "WellnessService started: eye=${state.isEyeBlinkerEnabled()}, autoBlock=${state.isAutoBlockEnabled()}")

        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "WellnessService destroyed")
        eyeBlinkerTimer.stop()
        autoBlockTracker.stop()
        if (powerReceiverRegistered) {
            try {
                unregisterReceiver(powerReceiver)
            } catch (_: Exception) {
            }
            powerReceiverRegistered = false
        }
        // Cancel the shared guard only if nothing else needs keeping alive.
        ServiceGuardReceiver.cancelIfIdle(this)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "BrainClean Wellness",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when BrainClean wellness features are active"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(state: WellnessState): Notification {
        val text = when {
            state.isEyeBlinkerEnabled() && state.isAutoBlockEnabled() -> LocalizedStrings.get(this, "wellness.notifBoth")
            state.isEyeBlinkerEnabled() -> LocalizedStrings.get(this, "wellness.notifEye")
            state.isAutoBlockEnabled() -> LocalizedStrings.get(this, "wellness.notifAutoBlock")
            else -> "BrainClean wellness"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(LocalizedStrings.get(this, "blocker.notifTitle"))
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val TAG = "WellnessService"
        private const val CHANNEL_ID = "brainclean_wellness"
        private const val NOTIFICATION_ID = 1002

        fun start(context: Context) {
            try {
                val intent = Intent(context, WellnessService::class.java)
                ContextCompat.startForegroundService(context, intent)
            } catch (e: Exception) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    e is android.app.ForegroundServiceStartNotAllowedException) {
                    Log.e(TAG, "FGS start BLOCKED by OS (background start not allowed) — " +
                        "battery optimization exemption likely lost or app is background-restricted", e)
                } else {
                    Log.e(TAG, "Unable to start WellnessService", e)
                }
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, WellnessService::class.java)
            context.stopService(intent)
        }
    }
}
