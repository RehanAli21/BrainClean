package expo.modules.blocker

import android.content.Context
import android.content.SharedPreferences

class BlockerState private constructor(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun startSession(packages: List<String>, sessionId: String, authToken: String, baseUrl: String, maxBlockTimeMs: Long, blockNotifications: Boolean) {
        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, true)
            .putStringSet(KEY_BLOCKED_PACKAGES, packages.toSet())
            .putString(KEY_SESSION_ID, sessionId)
            .putLong(KEY_STARTED_AT, System.currentTimeMillis())
            .putString(KEY_AUTH_TOKEN, authToken)
            .putString(KEY_BASE_URL, baseUrl)
            .putLong(KEY_MAX_BLOCK_TIME_MS, maxBlockTimeMs)
            .putBoolean(KEY_BLOCK_NOTIFICATIONS, blockNotifications)
            .apply()
    }

    fun stopSession() {
        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, false)
            .putStringSet(KEY_BLOCKED_PACKAGES, emptySet())
            .putString(KEY_SESSION_ID, "")
            .putLong(KEY_STARTED_AT, 0L)
            .putString(KEY_AUTH_TOKEN, "")
            .putString(KEY_BASE_URL, "")
            .putLong(KEY_MAX_BLOCK_TIME_MS, 0L)
            .putBoolean(KEY_BLOCK_NOTIFICATIONS, false)
            .apply()
    }

    fun isActive(): Boolean = prefs.getBoolean(KEY_IS_ACTIVE, false)

    fun getBlockedPackages(): Set<String> =
        prefs.getStringSet(KEY_BLOCKED_PACKAGES, emptySet()) ?: emptySet()

    fun getSessionId(): String = prefs.getString(KEY_SESSION_ID, "") ?: ""

    fun getStartedAt(): Long = prefs.getLong(KEY_STARTED_AT, 0L)

    fun getAuthToken(): String = prefs.getString(KEY_AUTH_TOKEN, "") ?: ""

    fun getBaseUrl(): String = prefs.getString(KEY_BASE_URL, "") ?: ""

    fun getMaxBlockTimeMs(): Long = prefs.getLong(KEY_MAX_BLOCK_TIME_MS, 0L)

    fun shouldBlockNotifications(): Boolean = prefs.getBoolean(KEY_BLOCK_NOTIFICATIONS, false)

    companion object {
        private const val PREFS_NAME = "brainclean_blocker_state"
        private const val KEY_IS_ACTIVE = "is_active"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val KEY_SESSION_ID = "session_id"
        private const val KEY_STARTED_AT = "started_at"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_MAX_BLOCK_TIME_MS = "max_block_time_ms"
        private const val KEY_BLOCK_NOTIFICATIONS = "block_notifications"

        @Volatile
        private var instance: BlockerState? = null

        fun getInstance(context: Context): BlockerState {
            return instance ?: synchronized(this) {
                instance ?: BlockerState(context.applicationContext).also { instance = it }
            }
        }
    }
}
