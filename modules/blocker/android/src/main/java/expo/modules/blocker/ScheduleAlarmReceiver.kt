package expo.modules.blocker

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.UUID

class ScheduleAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return
        Log.i(TAG, "Alarm fired for schedule=$scheduleId")

        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                executeSchedule(context, scheduleId)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to execute schedule=$scheduleId", e)
            } finally {
                pending.finish()
            }
        }
    }

    private fun executeSchedule(context: Context, scheduleId: String) {
        val state = ScheduleState.getInstance(context)
        val schedule = state.getSchedule(scheduleId)
        if (schedule == null || !schedule.enabled) {
            Log.w(TAG, "Schedule $scheduleId not found or disabled, skipping")
            return
        }

        val authToken = state.getAuthToken()
        val baseUrl = state.getBaseUrl()
        val selectedApps = state.getSelectedApps()

        if (authToken.isEmpty() || baseUrl.isEmpty() || selectedApps.isEmpty()) {
            Log.e(TAG, "Missing auth config or selected apps, skipping schedule=$scheduleId")
            return
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

        val taskId = createTask(baseUrl, authToken, taskName, minDurationSeconds, maxDurationSeconds)
        if (taskId == null) {
            Log.e(TAG, "Failed to create task for schedule=$scheduleId")
            scheduleNext(context, schedule)
            return
        }

        val started = startTask(baseUrl, authToken, taskId)
        if (!started) {
            Log.e(TAG, "Failed to start task=$taskId for schedule=$scheduleId")
            scheduleNext(context, schedule)
            return
        }

        Log.i(TAG, "Task created and started: id=$taskId, name=$taskName")

        val blockerState = BlockerState.getInstance(context)
        blockerState.startSession(
            selectedApps.toList(),
            taskId,
            authToken,
            baseUrl,
            maxDurationSeconds * 1000L,
            state.getNotificationBlockMode(),
            minDurationSeconds * 1000L
        )
        BlockerService.start(context)
        showScheduleNotification(context, taskName, schedule)

        scheduleNext(context, schedule)
    }

    private fun createTask(baseUrl: String, authToken: String, name: String, minSeconds: Int, maxSeconds: Int): String? {
        val url = URL("$baseUrl/tasks")
        val connection = url.openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.doOutput = true

            val body = JSONObject().apply {
                put("name", name)
                put("minimumDurationSeconds", minSeconds)
                put("maximumDurationSeconds", maxSeconds)
            }
            connection.outputStream.bufferedWriter().use { it.write(body.toString()) }

            if (connection.responseCode == 201) {
                val response = connection.inputStream.bufferedReader().readText()
                JSONObject(response).getString("id")
            } else {
                val error = try { connection.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
                Log.w(TAG, "Create task returned ${connection.responseCode}: $error")
                null
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun startTask(baseUrl: String, authToken: String, taskId: String): Boolean {
        val url = URL("$baseUrl/tasks/$taskId/start")
        val connection = url.openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "PATCH"
            connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000

            connection.responseCode == 200
        } finally {
            connection.disconnect()
        }
    }

    private fun scheduleNext(context: Context, schedule: ScheduleData) {
        if (schedule.repeatDays.isEmpty()) {
            val state = ScheduleState.getInstance(context)
            state.updateScheduleEnabled(schedule.id, false)
            Log.i(TAG, "One-time schedule=${schedule.id} disabled after firing")
            return
        }
        scheduleAlarm(context, schedule)
    }

    private fun showScheduleNotification(context: Context, taskName: String, schedule: ScheduleData) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                SCHEDULE_CHANNEL_ID,
                "Scheduled Tasks",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications when scheduled tasks start automatically"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val durationText = buildString {
            if (schedule.durationHours > 0) append("${schedule.durationHours}h ")
            if (schedule.durationMinutes > 0) append("${schedule.durationMinutes}m")
        }.trim()

        val launchIntent = Intent(Intent.ACTION_MAIN).apply {
            component = ComponentName(context.packageName, "${context.packageName}.MainActivity")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val contentIntent = PendingIntent.getActivity(
            context, SCHEDULE_NOTIFICATION_ID, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, SCHEDULE_CHANNEL_ID)
            .setContentTitle("Scheduled task started")
            .setContentText("$taskName — blocking for $durationText")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()

        notificationManager.notify(SCHEDULE_NOTIFICATION_ID, notification)
    }

    companion object {
        private const val TAG = "ScheduleAlarmReceiver"
        const val EXTRA_SCHEDULE_ID = "schedule_id"
        private const val SCHEDULE_CHANNEL_ID = "brainclean_schedule"
        private const val SCHEDULE_NOTIFICATION_ID = 1003

        fun scheduleAlarm(context: Context, schedule: ScheduleData) {
            if (!schedule.enabled) return

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, ScheduleAlarmReceiver::class.java).apply {
                putExtra(EXTRA_SCHEDULE_ID, schedule.id)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                schedule.id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerAt = getNextTriggerTime(schedule)

            val showIntent = Intent(Intent.ACTION_MAIN).apply {
                component = ComponentName(context.packageName, "${context.packageName}.MainActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val showPending = PendingIntent.getActivity(
                context, schedule.id.hashCode() + 1, showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmInfo = AlarmManager.AlarmClockInfo(triggerAt, showPending)
            alarmManager.setAlarmClock(alarmInfo, pendingIntent)

            val cal = Calendar.getInstance().apply { timeInMillis = triggerAt }
            Log.i(TAG, "Alarm clock scheduled for ${schedule.id} at ${cal.time}")
        }

        fun cancelAlarm(context: Context, scheduleId: String) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, ScheduleAlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                scheduleId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
            Log.i(TAG, "Alarm cancelled for $scheduleId")
        }

        fun rescheduleAll(context: Context) {
            val state = ScheduleState.getInstance(context)
            state.getAllSchedules().filter { it.enabled }.forEach { schedule ->
                scheduleAlarm(context, schedule)
            }
        }

        private fun getNextTriggerTime(schedule: ScheduleData): Long {
            val now = Calendar.getInstance()
            val target = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, schedule.hour)
                set(Calendar.MINUTE, schedule.minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (schedule.repeatDays.isEmpty()) {
                if (target.after(now)) return target.timeInMillis
                target.add(Calendar.DAY_OF_YEAR, 1)
                return target.timeInMillis
            }

            for (daysAhead in 0..7) {
                val candidate = Calendar.getInstance().apply {
                    timeInMillis = target.timeInMillis
                    add(Calendar.DAY_OF_YEAR, daysAhead)
                }
                val dayOfWeek = candidate.get(Calendar.DAY_OF_WEEK) - 1
                if (schedule.repeatDays.contains(dayOfWeek) && candidate.after(now)) {
                    return candidate.timeInMillis
                }
            }

            target.add(Calendar.DAY_OF_YEAR, 7)
            return target.timeInMillis
        }
    }
}
