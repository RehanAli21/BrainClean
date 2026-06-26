package expo.modules.blocker

import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NotificationBlockerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val state = BlockerState.getInstance(applicationContext)
        if (!state.isActive() || !state.shouldBlockNotifications()) return

        val blockedPackages = state.getBlockedPackages()
        if (sbn.packageName in blockedPackages) {
            cancelNotification(sbn.key)
        }
    }

    companion object {
        private const val TAG = "NotificationBlocker"

        fun ensureBound(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    val componentName = ComponentName(
                        context.packageName,
                        NotificationBlockerService::class.java.name
                    )
                    requestRebind(componentName)
                    Log.i(TAG, "Requested rebind for NotificationListenerService")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to request rebind", e)
                }
            }
        }
    }
}
