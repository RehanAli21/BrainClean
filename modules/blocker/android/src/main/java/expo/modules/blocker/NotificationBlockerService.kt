package expo.modules.blocker

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.telecom.TelecomManager
import android.util.Log

class NotificationBlockerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val state = BlockerState.getInstance(applicationContext)
        if (!state.isActive()) return

        // Never cancel critical notifications — incoming calls, alarms, or
        // anything from the system/dialer. Missing an emergency call is worse
        // than any focus session.
        if (isCritical(sbn)) return

        val mode = state.getNotificationBlockMode()
        when (mode) {
            1 -> {
                if (sbn.packageName in state.getBlockedPackages()) {
                    cancelNotification(sbn.key)
                }
            }
            2 -> {
                if (sbn.packageName != applicationContext.packageName) {
                    cancelNotification(sbn.key)
                }
            }
        }
    }

    private fun isCritical(sbn: StatusBarNotification): Boolean {
        val category = sbn.notification.category
        if (category == Notification.CATEGORY_CALL || category == Notification.CATEGORY_ALARM) {
            return true
        }
        if (sbn.packageName == "android" || sbn.packageName == "com.android.systemui") {
            return true
        }
        if (sbn.packageName == defaultDialerPackage()) {
            return true
        }
        return false
    }

    private fun defaultDialerPackage(): String? = try {
        (getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)?.defaultDialerPackage
    } catch (_: Exception) {
        null
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
