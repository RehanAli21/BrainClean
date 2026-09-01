package expo.modules.blocker

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class ScheduleData(
    val id: String,
    val hour: Int,
    val minute: Int,
    val durationHours: Int,
    val durationMinutes: Int,
    val repeatDays: Set<Int>,
    val label: String,
    val enabled: Boolean,
    // Per-schedule notification blocking: 0 = off, 1 = blocked apps only, 2 = all.
    val notificationBlockMode: Int = 0
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("hour", hour)
        put("minute", minute)
        put("durationHours", durationHours)
        put("durationMinutes", durationMinutes)
        put("repeatDays", JSONArray(repeatDays.toList()))
        put("label", label)
        put("enabled", enabled)
        put("notificationBlockMode", notificationBlockMode)
    }

    companion object {
        fun fromJson(json: JSONObject): ScheduleData {
            val daysArray = json.getJSONArray("repeatDays")
            val days = mutableSetOf<Int>()
            for (i in 0 until daysArray.length()) {
                days.add(daysArray.getInt(i))
            }
            return ScheduleData(
                id = json.getString("id"),
                hour = json.getInt("hour"),
                minute = json.getInt("minute"),
                durationHours = json.getInt("durationHours"),
                durationMinutes = json.getInt("durationMinutes"),
                repeatDays = days,
                label = json.optString("label", ""),
                enabled = json.getBoolean("enabled"),
                // Older schedules persisted before this field default to off.
                notificationBlockMode = json.optInt("notificationBlockMode", 0)
            )
        }
    }
}

class ScheduleState private constructor(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun setAuthConfig(authToken: String, baseUrl: String, selectedApps: Set<String>) {
        prefs.edit()
            .putString(KEY_AUTH_TOKEN, authToken)
            .putString(KEY_BASE_URL, baseUrl)
            .putStringSet(KEY_SELECTED_APPS, selectedApps)
            .apply()
    }

    fun clearAuthConfig() {
        prefs.edit()
            .putString(KEY_AUTH_TOKEN, "")
            .putString(KEY_BASE_URL, "")
            .apply()
    }

    // A schedule the alarm receiver has handed off to BlockerService for
    // execution (task creation happens in the service, not the receiver,
    // because broadcast receivers get killed after ~10s).
    fun setPendingScheduleId(id: String) {
        prefs.edit().putString(KEY_PENDING_SCHEDULE, id).apply()
    }

    fun getPendingScheduleId(): String? =
        prefs.getString(KEY_PENDING_SCHEDULE, null)?.takeIf { it.isNotEmpty() }

    fun clearPendingSchedule() {
        prefs.edit().remove(KEY_PENDING_SCHEDULE).apply()
    }

    fun getAuthToken(): String = prefs.getString(KEY_AUTH_TOKEN, "") ?: ""
    fun getBaseUrl(): String = prefs.getString(KEY_BASE_URL, "") ?: ""
    fun getSelectedApps(): Set<String> = prefs.getStringSet(KEY_SELECTED_APPS, emptySet()) ?: emptySet()

    fun getAllSchedules(): List<ScheduleData> {
        val json = prefs.getString(KEY_SCHEDULES, "[]") ?: "[]"
        val array = JSONArray(json)
        val list = mutableListOf<ScheduleData>()
        for (i in 0 until array.length()) {
            list.add(ScheduleData.fromJson(array.getJSONObject(i)))
        }
        return list
    }

    fun getSchedule(id: String): ScheduleData? = getAllSchedules().find { it.id == id }

    fun addSchedule(schedule: ScheduleData) {
        val schedules = getAllSchedules().toMutableList()
        schedules.add(schedule)
        saveSchedules(schedules)
    }

    fun removeSchedule(id: String) {
        val schedules = getAllSchedules().filter { it.id != id }
        saveSchedules(schedules)
    }

    fun updateScheduleEnabled(id: String, enabled: Boolean) {
        val schedules = getAllSchedules().map {
            if (it.id == id) it.copy(enabled = enabled) else it
        }
        saveSchedules(schedules)
    }

    fun hasAnyEnabledSchedule(): Boolean = getAllSchedules().any { it.enabled }

    private fun saveSchedules(schedules: List<ScheduleData>) {
        val array = JSONArray()
        schedules.forEach { array.put(it.toJson()) }
        prefs.edit().putString(KEY_SCHEDULES, array.toString()).apply()
    }

    companion object {
        private const val PREFS_NAME = "brainclean_schedule_state"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_SELECTED_APPS = "selected_apps"
        private const val KEY_SCHEDULES = "schedules_json"
        private const val KEY_PENDING_SCHEDULE = "pending_schedule_id"

        @Volatile
        private var instance: ScheduleState? = null

        fun getInstance(context: Context): ScheduleState {
            return instance ?: synchronized(this) {
                instance ?: ScheduleState(context.applicationContext).also { instance = it }
            }
        }
    }
}
