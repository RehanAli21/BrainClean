package expo.modules.blocker

import android.content.Context
import android.content.SharedPreferences

class WellnessState private constructor(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun setEyeBlinkerConfig(enabled: Boolean, intervalMinutes: Int, durationSeconds: Int) {
        prefs.edit()
            .putBoolean(KEY_EYE_BLINKER_ENABLED, enabled)
            .putInt(KEY_EYE_BLINKER_INTERVAL_MINUTES, intervalMinutes)
            .putInt(KEY_EYE_BLINKER_DURATION_SECONDS, durationSeconds)
            .apply()
    }

    fun isEyeBlinkerEnabled(): Boolean = prefs.getBoolean(KEY_EYE_BLINKER_ENABLED, false)
    fun getEyeBlinkerIntervalMinutes(): Int = prefs.getInt(KEY_EYE_BLINKER_INTERVAL_MINUTES, DEFAULT_EYE_INTERVAL)
    fun getEyeBlinkerDurationSeconds(): Int = prefs.getInt(KEY_EYE_BLINKER_DURATION_SECONDS, DEFAULT_EYE_DURATION)

    fun setAutoBlockConfig(enabled: Boolean, usageLimitMinutes: Int, durationSeconds: Int, apps: List<String>) {
        prefs.edit()
            .putBoolean(KEY_AUTO_BLOCK_ENABLED, enabled)
            .putInt(KEY_AUTO_BLOCK_USAGE_LIMIT_MINUTES, usageLimitMinutes)
            .putInt(KEY_AUTO_BLOCK_DURATION_SECONDS, durationSeconds)
            .putStringSet(KEY_AUTO_BLOCK_APPS, apps.toSet())
            .apply()
    }

    fun isAutoBlockEnabled(): Boolean = prefs.getBoolean(KEY_AUTO_BLOCK_ENABLED, false)
    fun getAutoBlockUsageLimitMinutes(): Int = prefs.getInt(KEY_AUTO_BLOCK_USAGE_LIMIT_MINUTES, DEFAULT_AUTO_LIMIT)
    fun getAutoBlockDurationSeconds(): Int = prefs.getInt(KEY_AUTO_BLOCK_DURATION_SECONDS, DEFAULT_AUTO_DURATION)
    fun getAutoBlockApps(): Set<String> = prefs.getStringSet(KEY_AUTO_BLOCK_APPS, emptySet()) ?: emptySet()

    fun isAnyFeatureEnabled(): Boolean = isEyeBlinkerEnabled() || isAutoBlockEnabled()

    companion object {
        private const val PREFS_NAME = "brainclean_wellness_state"
        private const val KEY_EYE_BLINKER_ENABLED = "eye_blinker_enabled"
        private const val KEY_EYE_BLINKER_INTERVAL_MINUTES = "eye_blinker_interval_minutes"
        private const val KEY_EYE_BLINKER_DURATION_SECONDS = "eye_blinker_duration_seconds"
        private const val KEY_AUTO_BLOCK_ENABLED = "auto_block_enabled"
        private const val KEY_AUTO_BLOCK_USAGE_LIMIT_MINUTES = "auto_block_usage_limit_minutes"
        private const val KEY_AUTO_BLOCK_DURATION_SECONDS = "auto_block_duration_seconds"
        private const val KEY_AUTO_BLOCK_APPS = "auto_block_apps"

        private const val DEFAULT_EYE_INTERVAL = 20
        private const val DEFAULT_EYE_DURATION = 20
        private const val DEFAULT_AUTO_LIMIT = 15
        private const val DEFAULT_AUTO_DURATION = 30

        @Volatile
        private var instance: WellnessState? = null

        fun getInstance(context: Context): WellnessState {
            return instance ?: synchronized(this) {
                instance ?: WellnessState(context.applicationContext).also { instance = it }
            }
        }
    }
}
