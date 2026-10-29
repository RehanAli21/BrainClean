package expo.modules.blocker

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray

/**
 * The scheduled-task feature was removed. Installs upgraded from a version that
 * had it may still hold alarm-clock alarms (status-bar alarm icon) pointing at
 * the deleted ScheduleAlarmReceiver, and a SharedPreferences file containing a
 * plaintext auth token. Cancel the alarms and delete the file. Idempotent and
 * cheap once the file is gone.
 */
object LegacyScheduleCleanup {
    private const val TAG = "LegacyScheduleCleanup"
    private const val PREFS_NAME = "brainclean_schedule_state"
    private const val KEY_SCHEDULES = "schedules_json"
    private const val RECEIVER_CLASS = "expo.modules.blocker.ScheduleAlarmReceiver"
    private val CHANNEL_IDS = listOf("brainclean_schedule", "brainclean_schedule_status")

    fun run(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (prefs.all.isEmpty()) return

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        try {
            val schedules = JSONArray(prefs.getString(KEY_SCHEDULES, "[]") ?: "[]")
            for (i in 0 until schedules.length()) {
                val id = schedules.getJSONObject(i).optString("id")
                if (id.isEmpty()) continue
                val intent = Intent().setComponent(ComponentName(context.packageName, RECEIVER_CLASS))
                val pi = PendingIntent.getBroadcast(
                    context,
                    id.hashCode(),
                    intent,
                    PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                ) ?: continue
                alarmManager?.cancel(pi)
                pi.cancel()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cancel legacy schedule alarms", e)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(NotificationManager::class.java)
            CHANNEL_IDS.forEach { nm?.deleteNotificationChannel(it) }
        }

        prefs.edit().clear().commit()
        context.deleteSharedPreferences(PREFS_NAME)
        Log.i(TAG, "Removed legacy schedule state")
    }
}
