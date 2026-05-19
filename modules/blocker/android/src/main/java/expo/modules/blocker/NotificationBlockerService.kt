package expo.modules.blocker

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class NotificationBlockerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val state = BlockerState.getInstance(applicationContext)
        if (!state.isActive() || !state.shouldBlockNotifications()) return

        val blockedPackages = state.getBlockedPackages()
        if (sbn.packageName in blockedPackages) {
            cancelNotification(sbn.key)
        }
    }
}
