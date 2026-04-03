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
    private var lastDetectedBlocked: String? = null

    fun start(
        context: Context,
        packages: Set<String>,
        onBlockedAppDetected: (String) -> Unit,
        onBlockedAppLeft: () -> Unit
    ) {
        stop()
        blockedPackages = packages
        ownPackage = context.packageName
        lastDetectedBlocked = null
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

                    if (foregroundPackage != null && blockedPackages.contains(foregroundPackage)) {
                        if (lastDetectedBlocked != foregroundPackage) {
                            lastDetectedBlocked = foregroundPackage
                            onBlockedAppDetected(foregroundPackage)
                        }
                    } else if (lastDetectedBlocked != null) {
                        // Ignore our own package — overlay is part of GrayGuard's process,
                        // so when overlay shows, UsageStats may report our package as foreground.
                        // Only clear the blocked state when a genuinely different app is in front.
                        if (foregroundPackage != null && foregroundPackage != ownPackage) {
                            lastDetectedBlocked = null
                            onBlockedAppLeft()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error polling foreground app", e)
                }

                delay(POLL_INTERVAL_MS)
            }
        }
    }

    fun stop() {
        monitorJob?.cancel()
        monitorJob = null
        scope = null
        lastDetectedBlocked = null
    }

    fun isRunning(): Boolean = monitorJob?.isActive == true

    fun updateBlockedPackages(packages: Set<String>) {
        blockedPackages = packages
    }

    private fun getForegroundPackage(usageStatsManager: UsageStatsManager): String? {
        val now = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(now - 2000, now)
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
        private const val POLL_INTERVAL_MS = 500L
    }
}
