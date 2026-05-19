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

class TaskStatusChecker {
    private var pollJob: Job? = null
    private var scope: CoroutineScope? = null

    fun start(
        baseUrl: String,
        authToken: String,
        pollIntervalMs: Long = POLL_INTERVAL_MS,
        onNoActiveTasks: () -> Unit
    ) {
        stop()
        scope = CoroutineScope(Dispatchers.IO)

        pollJob = scope?.launch {
            while (isActive) {
                delay(pollIntervalMs)

                try {
                    val activeCount = fetchActiveTaskCount(baseUrl, authToken)
                    if (activeCount != null && activeCount == 0) {
                        Log.i(TAG, "No active tasks found, triggering unblock")
                        onNoActiveTasks()
                        return@launch
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error polling task status", e)
                }
            }
        }
    }

    fun stop() {
        pollJob?.cancel()
        pollJob = null
        scope = null
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
        private const val POLL_INTERVAL_MS = 5_000L
    }
}
