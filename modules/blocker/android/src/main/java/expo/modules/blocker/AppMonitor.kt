package expo.modules.blocker

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class AppMonitor {
    private var monitorJob: Job? = null
    private var scope: CoroutineScope? = null
    private var blockedPackages: Set<String> = emptySet()
    private var ownPackage: String = ""
    @Volatile
    private var overlayShowing: Boolean = false
    private var onBlockedAppDetected: ((String) -> Unit)? = null
    private var onBlockedAppLeft: (() -> Unit)? = null

    fun start(
        context: Context,
        packages: Set<String>,
        onBlockedAppDetected: (String) -> Unit,
        onBlockedAppLeft: () -> Unit
    ) {
        stop()
        blockedPackages = packages
        ownPackage = context.packageName
        overlayShowing = false
        this.onBlockedAppDetected = onBlockedAppDetected
        this.onBlockedAppLeft = onBlockedAppLeft
        scope = CoroutineScope(Dispatchers.Default)

        monitorJob = scope?.launch {
            val usageStatsManager =
                context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager

            if (usageStatsManager == null) {
                Log.e(TAG, "UsageStatsManager not available")
                return@launch
            }

            while (isActive) {
                try {
                    val foregroundPackage = getForegroundPackage(usageStatsManager)
                    if (foregroundPackage != null) {
                        onForegroundAppChanged(foregroundPackage)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error polling foreground app", e)
                }

                delay(POLL_INTERVAL_MS)
            }
        }
    }

    private fun onForegroundAppChanged(packageName: String) {
        // Ignore our own package — overlay is part of BrainClean's process
        if (packageName == ownPackage) return

        if (blockedPackages.contains(packageName)) {
            if (!overlayShowing) {
                overlayShowing = true
                onBlockedAppDetected?.invoke(packageName)
            }
        } else {
            if (overlayShowing) {
                overlayShowing = false
                onBlockedAppLeft?.invoke()
            }
        }
    }

    fun stop() {
        monitorJob?.cancel()
        monitorJob = null
        scope = null
        overlayShowing = false
        onBlockedAppDetected = null
        onBlockedAppLeft = null
    }

    fun isRunning(): Boolean = monitorJob?.isActive == true

    fun updateBlockedPackages(packages: Set<String>) {
        blockedPackages = packages
    }

    private fun getForegroundPackage(usageStatsManager: UsageStatsManager): String? {
        val now = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(now - EVENT_WINDOW_MS, now)
        val event = UsageEvents.Event()
        var lastForegroundPackage: String? = null

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                lastForegroundPackage = event.packageName
            }
        }

        return lastForegroundPackage
    }

    companion object {
        private const val TAG = "AppMonitor"
        private const val POLL_INTERVAL_MS = 250L
        private const val EVENT_WINDOW_MS = 10000L
    }
}
