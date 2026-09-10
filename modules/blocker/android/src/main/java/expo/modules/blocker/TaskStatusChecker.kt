package expo.modules.blocker

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

class TaskStatusChecker {
    private var pollJob: Job? = null
    private var scope: CoroutineScope? = null

    @Volatile private var baseUrl: String = ""
    @Volatile private var authToken: String = ""
    // True once the initial delay has elapsed and periodic polling is live. Before
    // that, an out-of-band checkNow() would only ever see the session task still
    // active (completion isn't possible before the minimum duration), so we skip it.
    @Volatile private var pollingActive: Boolean = false
    // Guards against onNoActiveTasks firing twice (poll tick racing checkNow()).
    private val triggered = AtomicBoolean(false)
    private var onNoActiveTasks: (() -> Unit)? = null

    fun start(
        baseUrl: String,
        authToken: String,
        initialDelayMs: Long = 0L,
        pollIntervalMs: Long = POLL_INTERVAL_MS,
        onNoActiveTasks: () -> Unit
    ) {
        stop()
        this.baseUrl = baseUrl
        this.authToken = authToken
        this.onNoActiveTasks = onNoActiveTasks
        triggered.set(false)
        val sc = CoroutineScope(Dispatchers.IO)
        scope = sc

        pollJob = sc.launch {
            if (initialDelayMs > 0) {
                Log.i(TAG, "Delaying task status polling for ${initialDelayMs / 1000}s")
                delay(initialDelayMs)
            }
            pollingActive = true
            // Check immediately when the window opens so a task completed exactly at
            // its minimum duration is caught at once, then poll on the interval.
            if (checkOnce()) return@launch
            while (isActive) {
                delay(pollIntervalMs)
                if (checkOnce()) return@launch
            }
        }
    }

    /**
     * One-shot status check triggered from OUTSIDE the poll loop — specifically
     * when the screen turns on. While the screen is off the polling coroutine's
     * timer is suspended in Doze (the wake lock is released to save battery), so a
     * task completed on the backend in the background isn't noticed until the
     * device wakes. This makes the very next wake re-check immediately and unblock,
     * with no need to open the React Native app.
     */
    fun checkNow() {
        if (!pollingActive || triggered.get()) return
        scope?.launch { checkOnce() }
    }

    /** Returns true if an unblock was triggered. Safe to call concurrently. */
    private fun checkOnce(): Boolean {
        try {
            val activeCount = fetchActiveTaskCount(baseUrl, authToken)
            if (activeCount != null && activeCount == 0) {
                // Only the first caller to win the CAS invokes the unblock callback.
                if (triggered.compareAndSet(false, true)) {
                    Log.i(TAG, "No active tasks found, triggering unblock")
                    onNoActiveTasks?.invoke()
                }
                return true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error polling task status", e)
        }
        return false
    }

    fun stop() {
        pollJob?.cancel()
        pollJob = null
        scope = null
        pollingActive = false
        onNoActiveTasks = null
    }

    fun isRunning(): Boolean = pollJob?.isActive == true

    private fun fetchActiveTaskCount(baseUrl: String, authToken: String): Int? {
        val url = URL("$baseUrl/tasks/status-counts")
        val connection = url.openConnection() as HttpURLConnection

        return try {
            connection.requestMethod = "GET"
            connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000

            if (connection.responseCode == 200) {
                val body = connection.inputStream.bufferedReader().readText()
                val json = JSONObject(body)
                json.optInt("active", -1).takeIf { it >= 0 }
            } else {
                Log.w(TAG, "Status check returned HTTP ${connection.responseCode}")
                null
            }
        } finally {
            connection.disconnect()
        }
    }

    companion object {
        private const val TAG = "TaskStatusChecker"
        private const val POLL_INTERVAL_MS = 20_000L
    }
}
