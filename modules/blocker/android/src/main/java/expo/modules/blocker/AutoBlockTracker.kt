package expo.modules.blocker

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class AutoBlockTracker {
    private var monitorJob: Job? = null
    private var scope: CoroutineScope? = null
    private val overlay = CountdownOverlay()
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile private var monitoredApps: Set<String> = emptySet()
    @Volatile private var currentTrackedApp: String? = null
    @Volatile private var usageStartTime: Long = 0L
    @Volatile private var isBlocking: Boolean = false
    @Volatile private var usageLimitMs: Long = 0L
    @Volatile private var blockDurationSeconds: Int = 0

    fun start(
        context: Context,
        apps: Set<String>,
        usageLimitMinutes: Int,
        durationSeconds: Int
    ) {
        stop()
        monitoredApps = apps
        usageLimitMs = usageLimitMinutes * 60 * 1000L
        blockDurationSeconds = durationSeconds
        val ownPackage = context.packageName

        if (apps.isEmpty()) {
            Log.i(TAG, "No apps to monitor, not starting")
            return
        }

        Log.i(TAG, "Starting auto block: ${apps.size} apps, limit=${usageLimitMinutes}min, break=${durationSeconds}s")

        scope = CoroutineScope(Dispatchers.Default)
        monitorJob = scope?.launch {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            if (usm == null) {
                Log.e(TAG, "UsageStatsManager not available")
                return@launch
            }

            while (isActive) {
                try {
                    val foreground = getForegroundPackage(usm)

                    if (foreground != null && foreground != ownPackage && !isBlocking) {
                        if (monitoredApps.contains(foreground)) {
                            if (currentTrackedApp == foreground) {
                                val elapsed = SystemClock.elapsedRealtime() - usageStartTime
                                if (elapsed >= usageLimitMs) {
                                    isBlocking = true
                                    Log.i(TAG, "Usage limit reached for $foreground (${elapsed}ms), showing break overlay")
                                    mainHandler.post {
                                        val config = CountdownOverlayConfig(
                                            icon = "⏳",
                                            title = "Take a Break",
                                            subtitle = "You've been scrolling for ${usageLimitMs / 60000} minutes",
                                            durationSeconds = blockDurationSeconds,
                                            accentColor = Color.parseColor("#F43F5E")
                                        )
                                        overlay.show(context, config) {
                                            Log.i(TAG, "Break finished, resetting tracker")
                                            isBlocking = false
                                            currentTrackedApp = null
                                            usageStartTime = 0L
                                        }
                                    }
                                }
                            } else {
                                currentTrackedApp = foreground
                                usageStartTime = SystemClock.elapsedRealtime()
                            }
                        } else {
                            if (currentTrackedApp != null) {
                                currentTrackedApp = null
                                usageStartTime = 0L
                            }
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
        mainHandler.post { overlay.hide() }
        currentTrackedApp = null
        usageStartTime = 0L
        isBlocking = false
        Log.i(TAG, "Auto block tracker stopped")
    }

    fun updateApps(apps: Set<String>) {
        monitoredApps = apps
    }

    fun isRunning(): Boolean = monitorJob?.isActive == true

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
        private const val TAG = "AutoBlockTracker"
        private const val POLL_INTERVAL_MS = 1000L
        private const val EVENT_WINDOW_MS = 10000L
    }
}
