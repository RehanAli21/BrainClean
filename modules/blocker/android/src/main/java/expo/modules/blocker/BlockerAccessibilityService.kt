package expo.modules.blocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager

class BlockerAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
        Log.i(TAG, "BlockerAccessibilityService connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return

        // Push the event to AppMonitor if it's running
        AppMonitor.instance.get()?.onForegroundAppChanged(packageName)
    }

    override fun onInterrupt() {
        Log.w(TAG, "BlockerAccessibilityService interrupted")
    }

    companion object {
        private const val TAG = "BlockerA11yService"

        fun isEnabled(context: Context): Boolean {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
                ?: return false

            val enabledServices = am.getEnabledAccessibilityServiceList(
                AccessibilityServiceInfo.FEEDBACK_GENERIC
            )

            val expectedComponent = "${context.packageName}/${BlockerAccessibilityService::class.java.canonicalName}"

            return enabledServices.any { info ->
                info.resolveInfo?.serviceInfo?.let { serviceInfo ->
                    "${serviceInfo.packageName}/${serviceInfo.name}" == expectedComponent
                } ?: false
            }
        }
    }
}
