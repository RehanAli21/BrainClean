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
    @Volatile
    private var paused: Boolean = false
    @Volatile
    private var useWideWindow: Boolean = true
    @Volatile
    private var lastKnownForeground: String? = null
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
        paused = false
        useWideWindow = true
        lastKnownForeground = null
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

            var tickCount = 0L
            var lastHeartbeatLoggedAt = 0L
            while (isActive) {
                if (paused) {
                    delay(PAUSED_POLL_INTERVAL_MS)
                    continue
                }

                try {
                    // The first poll (and the first after resume) uses a wide
                    // window so an app that was ALREADY open when the session
                    // started is still detected — its ACTIVITY_RESUMED event
                    // may be much older than the normal 10s window.
                    val windowMs = if (useWideWindow) WIDE_EVENT_WINDOW_MS else EVENT_WINDOW_MS
                    useWideWindow = false

                    val detected = getForegroundPackage(usageStatsManager, windowMs)
                    // ACTIVITY_RESUMED fires once per app open; after ~10s it
                    // leaves the query window and the query returns null. Keep
                    // the last known value until a different app is detected.
                    if (detected != null) {
                        lastKnownForeground = detected
                    }
                    lastKnownForeground?.let { onForegroundAppChanged(it) }
                } catch (e: Exception) {
                    Log.e(TAG, "Error polling foreground app", e)
                }

                tickCount++
                val now = System.currentTimeMillis()
                if (now - lastHeartbeatLoggedAt >= HEARTBEAT_INTERVAL_MS) {
                    Log.i(TAG, "heartbeat tick=$tickCount foreground=$lastKnownForeground")
                    lastHeartbeatLoggedAt = now
                }

                delay(POLL_INTERVAL_MS)
            }
        }
    }

    private fun onForegroundAppChanged(packageName: String) {
        // Our own package counts as "left the blocked app" — the overlay tells
        // the user to return to BrainClean, so it must not cover BrainClean.
        if (packageName != ownPackage && blockedPackages.contains(packageName)) {
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

    fun pause() {
        paused = true
    }

    fun resume() {
        // Whatever was foreground before the screen went off may resume with
        // an event older than the normal window — widen the first query.
        useWideWindow = true
        paused = false
    }

    fun stop() {
        monitorJob?.cancel()
        monitorJob = null
        scope = null
        overlayShowing = false
        paused = false
        lastKnownForeground = null
        onBlockedAppDetected = null
        onBlockedAppLeft = null
    }

    fun isRunning(): Boolean = monitorJob?.isActive == true

    fun updateBlockedPackages(packages: Set<String>) {
        blockedPackages = packages
    }

    private fun getForegroundPackage(usageStatsManager: UsageStatsManager, windowMs: Long): String? {
        val now = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(now - windowMs, now)
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
        private const val PAUSED_POLL_INTERVAL_MS = 1000L
        private const val EVENT_WINDOW_MS = 10_000L
        private const val WIDE_EVENT_WINDOW_MS = 60_000L
        private const val HEARTBEAT_INTERVAL_MS = 60_000L
    }
}
