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
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class BlockerService : Service() {
    private val appMonitor = AppMonitor()
    private val overlay = BlockerOverlay()
    private val mainHandler = Handler(Looper.getMainLooper())

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

        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "BlockerService destroyed")
        appMonitor.stop()
        overlay.hide()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GrayGuard Blocker",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when GrayGuard is blocking apps"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("GrayGuard")
            .setContentText("GrayGuard is protecting your focus.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val TAG = "BlockerService"
        private const val CHANNEL_ID = "grayguard_blocker"
        private const val NOTIFICATION_ID = 1001

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
