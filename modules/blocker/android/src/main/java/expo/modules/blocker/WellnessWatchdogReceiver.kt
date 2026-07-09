package expo.modules.blocker

import android.app.AlarmManager
import android.app.ActivityManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class WellnessWatchdogReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        val state = WellnessState.getInstance(context)
        if (!state.isAnyFeatureEnabled()) {
            Log.i(TAG, "Watchdog fired but no wellness features enabled — skipping")
            cancel(context)
            return
        }

        if (isServiceRunning(context)) {
            Log.i(TAG, "Watchdog fired — WellnessService already running, rescheduling")
        } else {
            Log.w(TAG, "Watchdog fired — WellnessService NOT running, restarting it")
            WellnessService.start(context)
        }

        schedule(context)
    }

    private fun isServiceRunning(context: Context): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return false
        @Suppress("DEPRECATION")
        val running = activityManager.getRunningServices(Int.MAX_VALUE)
        return running.any { it.service.className == WellnessService::class.java.name }
    }

    companion object {
        private const val TAG = "WellnessWatchdog"
        private const val REQUEST_CODE = 4202
        private const val INTERVAL_MS = 10L * 60L * 1000L

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
                Log.i(TAG, "Watchdog scheduled in ${INTERVAL_MS}ms")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule watchdog", e)
            }
        }

        fun cancel(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return
            alarmManager.cancel(buildPendingIntent(context))
            Log.i(TAG, "Watchdog cancelled")
        }

        private fun buildPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, WellnessWatchdogReceiver::class.java)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
        }
    }
}
