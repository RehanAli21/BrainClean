package expo.modules.blocker

import android.content.Context
import android.content.SharedPreferences

class BlockerState private constructor(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun startSession(packages: List<String>, sessionId: String) {
        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, true)
            .putStringSet(KEY_BLOCKED_PACKAGES, packages.toSet())
            .putString(KEY_SESSION_ID, sessionId)
            .putLong(KEY_STARTED_AT, System.currentTimeMillis())
            .apply()
    }

    fun stopSession() {
        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, false)
            .putStringSet(KEY_BLOCKED_PACKAGES, emptySet())
            .putString(KEY_SESSION_ID, "")
            .putLong(KEY_STARTED_AT, 0L)
            .apply()
    }

    fun isActive(): Boolean = prefs.getBoolean(KEY_IS_ACTIVE, false)

    fun getBlockedPackages(): Set<String> =
        prefs.getStringSet(KEY_BLOCKED_PACKAGES, emptySet()) ?: emptySet()

    fun getSessionId(): String = prefs.getString(KEY_SESSION_ID, "") ?: ""

    fun getStartedAt(): Long = prefs.getLong(KEY_STARTED_AT, 0L)

    companion object {
        private const val PREFS_NAME = "grayguard_blocker_state"
        private const val KEY_IS_ACTIVE = "is_active"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val KEY_SESSION_ID = "session_id"
        private const val KEY_STARTED_AT = "started_at"

        @Volatile
        private var instance: BlockerState? = null

        fun getInstance(context: Context): BlockerState {
            return instance ?: synchronized(this) {
                instance ?: BlockerState(context.applicationContext).also { instance = it }
            }
        }
    }
}
