package expo.modules.blocker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

class ScheduleAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return
        Log.i(TAG, "Alarm fired for schedule=$scheduleId")

        val state = ScheduleState.getInstance(context)
        val schedule = state.getSchedule(scheduleId)
        if (schedule == null || !schedule.enabled) {
            Log.w(TAG, "Schedule $scheduleId not found or disabled, skipping")
            return
        }

        // Hand off to BlockerService: the HTTP work (create + start task) takes
        // longer than a receiver is allowed to live, so the service does it
        // after calling startForeground(). See ScheduleExecutor.
        if (BlockerState.getInstance(context).isActive()) {
            Log.i(TAG, "A blocking session is already active, skipping schedule=$scheduleId")
        } else {
            state.setPendingScheduleId(scheduleId)
            BlockerService.start(context)
        }

        scheduleNext(context, schedule)
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

    companion object {
        private const val TAG = "ScheduleAlarmReceiver"
        const val EXTRA_SCHEDULE_ID = "schedule_id"

        fun canScheduleExactAlarms(context: Context): Boolean {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return false
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }
        }

        fun scheduleAlarm(context: Context, schedule: ScheduleData) {
            if (!schedule.enabled) return

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return

            if (!canScheduleExactAlarms(context)) {
                Log.e(TAG, "Exact alarms not permitted, cannot schedule ${schedule.id}")
                return
            }

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

            try {
                val alarmInfo = AlarmManager.AlarmClockInfo(triggerAt, showPending)
                alarmManager.setAlarmClock(alarmInfo, pendingIntent)
                val cal = Calendar.getInstance().apply { timeInMillis = triggerAt }
                Log.i(TAG, "Alarm clock scheduled for ${schedule.id} at ${cal.time}")
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException scheduling exact alarm for ${schedule.id}", e)
            }
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
