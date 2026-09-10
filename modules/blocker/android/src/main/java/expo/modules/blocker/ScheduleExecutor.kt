package expo.modules.blocker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Executes a scheduled block: creates and starts the backend task, then writes
 * the blocking session into BlockerState. Runs inside BlockerService (already
 * foregrounded), NOT inside the alarm receiver — receivers are killed after
 * ~10s, which is not enough for two HTTP round-trips on a slow network.
 */
object ScheduleExecutor {
    private const val TAG = "ScheduleExecutor"
    private const val SCHEDULE_CHANNEL_ID = "brainclean_schedule"
    private const val SCHEDULE_NOTIFICATION_ID = 1003
    private const val HTTP_TIMEOUT_MS = 10_000

    /** Returns true if a blocking session was started. */
    fun execute(context: Context, scheduleId: String): Boolean {
        val state = ScheduleState.getInstance(context)
        val schedule = state.getSchedule(scheduleId)
        // Do NOT re-check schedule.enabled here: the receiver already
        // validated it at fire time, and for one-time schedules it flips
        // enabled=false immediately after handing off to us.
        if (schedule == null) {
            Log.w(TAG, "Schedule $scheduleId not found, skipping")
            return false
        }

        val authToken = state.getAuthToken()
        val baseUrl = state.getBaseUrl()
        val selectedApps = state.getSelectedApps()

        if (authToken.isEmpty() || baseUrl.isEmpty()) {
            Log.e(TAG, "Missing auth config, skipping schedule=$scheduleId")
            showFailureNotification(context, "schedule.failedAuth")
            return false
        }
        if (selectedApps.isEmpty()) {
            Log.e(TAG, "No apps selected, skipping schedule=$scheduleId")
            showFailureNotification(context, "schedule.failedGeneric")
            return false
        }

        val taskName = if (schedule.label.isNotBlank()) {
            schedule.label
        } else {
            val time = String.format("%02d:%02d", schedule.hour, schedule.minute)
            val date = SimpleDateFormat("MMM dd", Locale.getDefault()).format(Calendar.getInstance().time)
            "$time - $date"
        }

        val minDurationSeconds = schedule.durationHours * 3600 + schedule.durationMinutes * 60
        val maxDurationSeconds = minDurationSeconds + 60

        val createResult = createTask(baseUrl, authToken, taskName, minDurationSeconds, maxDurationSeconds)
        val taskId = when (createResult) {
            is CreateResult.Success -> createResult.taskId
            is CreateResult.Failure -> {
                Log.e(TAG, "Failed to create task for schedule=$scheduleId (http=${createResult.code})")
                showFailureNotification(context, failureKeyForHttp(createResult.code))
                return false
            }
        }

        if (!startTask(baseUrl, authToken, taskId)) {
            Log.e(TAG, "Failed to start task=$taskId for schedule=$scheduleId")
            showFailureNotification(context, "schedule.failedGeneric")
            return false
        }

        Log.i(TAG, "Task created and started: id=$taskId, name=$taskName")

        BlockerState.getInstance(context).startSession(
            selectedApps.toList(),
            taskId,
            authToken,
            baseUrl,
            maxDurationSeconds * 1000L,
            schedule.notificationBlockMode,
            minDurationSeconds * 1000L,
            schedule.customMessage
        )
        showStartedNotification(context, taskName, schedule)
        return true
    }

    private fun failureKeyForHttp(code: Int?): String = when (code) {
        401, 403 -> "schedule.failedAuth"
        402 -> "schedule.failedSubscription"
        else -> "schedule.failedGeneric"
    }

    private sealed class CreateResult {
        data class Success(val taskId: String) : CreateResult()
        data class Failure(val code: Int?) : CreateResult()
    }

    private fun createTask(baseUrl: String, authToken: String, name: String, minSeconds: Int, maxSeconds: Int): CreateResult {
        val connection = URL("$baseUrl/tasks").openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = HTTP_TIMEOUT_MS
            connection.readTimeout = HTTP_TIMEOUT_MS
            connection.doOutput = true

            val body = JSONObject().apply {
                put("name", name)
                put("minimumDurationSeconds", minSeconds)
                put("maximumDurationSeconds", maxSeconds)
            }
            connection.outputStream.bufferedWriter().use { it.write(body.toString()) }

            if (connection.responseCode == 201) {
                val response = connection.inputStream.bufferedReader().readText()
                CreateResult.Success(JSONObject(response).getString("id"))
            } else {
                val error = try { connection.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
                Log.w(TAG, "Create task returned ${connection.responseCode}: $error")
                CreateResult.Failure(connection.responseCode)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Create task request failed", e)
            CreateResult.Failure(null)
        } finally {
            connection.disconnect()
        }
    }

    private fun startTask(baseUrl: String, authToken: String, taskId: String): Boolean {
        val connection = URL("$baseUrl/tasks/$taskId/start").openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "PATCH"
            connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = HTTP_TIMEOUT_MS
            connection.readTimeout = HTTP_TIMEOUT_MS

            connection.responseCode == 200
        } catch (e: Exception) {
            Log.e(TAG, "Start task request failed", e)
            false
        } finally {
            connection.disconnect()
        }
    }

    private fun ensureChannel(context: Context, nm: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                SCHEDULE_CHANNEL_ID,
                "Scheduled Tasks",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications about scheduled blocking sessions"
            }
            nm.createNotificationChannel(channel)
        }
    }

    private fun launchAppIntent(context: Context): PendingIntent {
        val launchIntent = Intent(Intent.ACTION_MAIN).apply {
            component = ComponentName(context.packageName, "${context.packageName}.MainActivity")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        return PendingIntent.getActivity(
            context, SCHEDULE_NOTIFICATION_ID, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun showStartedNotification(context: Context, taskName: String, schedule: ScheduleData) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(context, nm)

        val durationText = buildString {
            if (schedule.durationHours > 0) append("${schedule.durationHours}h ")
            if (schedule.durationMinutes > 0) append("${schedule.durationMinutes}m")
        }.trim()

        val notification = NotificationCompat.Builder(context, SCHEDULE_CHANNEL_ID)
            .setContentTitle(LocalizedStrings.get(context, "schedule.startedTitle"))
            .setContentText(
                LocalizedStrings.get(
                    context, "schedule.startedText",
                    "name" to taskName, "duration" to durationText
                )
            )
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(launchAppIntent(context))
            .build()

        try {
            nm.notify(SCHEDULE_NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "Cannot post notification (POST_NOTIFICATIONS not granted)", e)
        }
    }

    private fun showFailureNotification(context: Context, messageKey: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(context, nm)

        val notification = NotificationCompat.Builder(context, SCHEDULE_CHANNEL_ID)
            .setContentTitle(LocalizedStrings.get(context, "schedule.failedTitle"))
            .setContentText(LocalizedStrings.get(context, messageKey))
            .setStyle(NotificationCompat.BigTextStyle().bigText(LocalizedStrings.get(context, messageKey)))
            .setSmallIcon(android.R.drawable.stat_notify_error)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(launchAppIntent(context))
            .build()

        try {
            nm.notify(SCHEDULE_NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "Cannot post notification (POST_NOTIFICATIONS not granted)", e)
        }
    }
}
