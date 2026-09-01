package expo.modules.blocker

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class ServiceGuardReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        Log.i(TAG, "Service guard fired — checking all services")

        val blockerState = BlockerState.getInstance(context)
        val wellnessState = WellnessState.getInstance(context)
        val scheduleState = ScheduleState.getInstance(context)

        var anyActive = false

        if (blockerState.isActive()) {
            anyActive = true
            if (!isServiceRunning(context, BlockerService::class.java.name)) {
                Log.w(TAG, "BlockerService should be running but is not — restarting")
                BlockerService.start(context)
            } else {
                Log.i(TAG, "BlockerService is running")
            }
        }

        if (wellnessState.isAnyFeatureEnabled()) {
            anyActive = true
            if (!isServiceRunning(context, WellnessService::class.java.name)) {
                Log.w(TAG, "WellnessService should be running but is not — restarting")
                WellnessService.start(context)
            } else {
                Log.i(TAG, "WellnessService is running")
            }
        }

        if (scheduleState.hasAnyEnabledSchedule()) {
            anyActive = true
            Log.i(TAG, "Enabled schedules found — ensuring alarms are registered")
            ScheduleAlarmReceiver.rescheduleAll(context)
        }

        if (anyActive) {
            schedule(context)
        } else {
            Log.i(TAG, "No active services or schedules — cancelling guard alarm")
            cancel(context)
        }
    }

    private fun isServiceRunning(context: Context, className: String): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return false
        @Suppress("DEPRECATION")
        val running = activityManager.getRunningServices(Int.MAX_VALUE)
        return running.any { it.service.className == className }
    }

    companion object {
        private const val TAG = "ServiceGuard"
        private const val REQUEST_CODE = 4203
        private const val INTERVAL_MS = 2L * 60L * 1000L

        fun schedule(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return
            val pi = buildPendingIntent(context)
            val triggerAt = System.currentTimeMillis() + INTERVAL_MS

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                }
                Log.i(TAG, "Service guard scheduled in ${INTERVAL_MS / 60000}min")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule service guard", e)
            }
        }

        fun cancel(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return
            alarmManager.cancel(buildPendingIntent(context))
            Log.i(TAG, "Service guard cancelled")
        }

        fun scheduleIfNeeded(context: Context) {
            if (isAnythingActive(context)) {
                schedule(context)
            }
        }

        // A service ending must NOT cancel the shared guard while another feature
        // (wellness, schedules, or the other service) is still active. Only cancel
        // when nothing needs keeping alive.
        fun cancelIfIdle(context: Context) {
            if (!isAnythingActive(context)) {
                cancel(context)
            }
        }

        private fun isAnythingActive(context: Context): Boolean {
            val blockerActive = BlockerState.getInstance(context).isActive()
            val wellnessActive = WellnessState.getInstance(context).isAnyFeatureEnabled()
            val schedulesActive = ScheduleState.getInstance(context).hasAnyEnabledSchedule()
            return blockerActive || wellnessActive || schedulesActive
        }

        private fun buildPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, ServiceGuardReceiver::class.java)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
        }
    }
}
