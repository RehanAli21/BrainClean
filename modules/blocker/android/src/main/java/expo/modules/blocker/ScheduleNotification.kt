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

/**
 * Posts a single, dismissible notification the moment a schedule becomes active
 * (created or enabled) so the user knows a blocking schedule is set. It is a
 * one-shot informational notification — NOT ongoing and NOT a foreground
 * service.
 */
object ScheduleNotification {
    private const val TAG = "ScheduleNotification"
    private const val CHANNEL_ID = "brainclean_schedule_status"
    private const val NOTIFICATION_ID = 1004

    fun show(context: Context) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Schedules",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifies you when a blocking schedule is set"
            }
            nm.createNotificationChannel(channel)
        }

        val launch = Intent(Intent.ACTION_MAIN).apply {
            component = ComponentName(context.packageName, "${context.packageName}.MainActivity")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, NOTIFICATION_ID, launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(LocalizedStrings.get(context, "blocker.notifTitle"))
            .setContentText(LocalizedStrings.get(context, "schedule.activeText"))
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            nm.notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "Cannot post schedule notification (POST_NOTIFICATIONS not granted)", e)
        }
    }
}
