package expo.modules.blocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class WellnessService : Service() {
    private val eyeBlinkerTimer = EyeBlinkerTimer()
    private val autoBlockTracker = AutoBlockTracker()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val state = WellnessState.getInstance(this)

        if (!state.isAnyFeatureEnabled()) {
            Log.w(TAG, "No wellness features enabled, stopping service")
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification(state))
        WellnessWatchdogReceiver.schedule(this)

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
        if (!WellnessState.getInstance(this).isAnyFeatureEnabled()) {
            WellnessWatchdogReceiver.cancel(this)
        }
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
            state.isEyeBlinkerEnabled() && state.isAutoBlockEnabled() -> "Eye care & usage monitoring active"
            state.isEyeBlinkerEnabled() -> "Eye care active"
            state.isAutoBlockEnabled() -> "Usage monitoring active"
            else -> "BrainClean wellness"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("BrainClean")
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
            val intent = Intent(context, WellnessService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, WellnessService::class.java)
            context.stopService(intent)
        }
    }
}
