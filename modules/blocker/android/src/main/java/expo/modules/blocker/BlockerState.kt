package expo.modules.blocker

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock

class BlockerState private constructor(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // customMessage: the per-session message shown on the block overlay (the
    // task's own message). Empty falls back to the default.
    fun startSession(packages: List<String>, sessionId: String, maxBlockTimeMs: Long, notificationBlockMode: Int, minimumDurationMs: Long, customMessage: String = "") {
        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, true)
            .putStringSet(KEY_BLOCKED_PACKAGES, packages.toSet())
            .putString(KEY_SESSION_ID, sessionId)
            .putLong(KEY_STARTED_AT, System.currentTimeMillis())
            .putLong(KEY_ELAPSED_REALTIME_AT_START, SystemClock.elapsedRealtime())
            .remove(LEGACY_KEY_AUTH_TOKEN)
            .remove(LEGACY_KEY_BASE_URL)
            .putLong(KEY_MAX_BLOCK_TIME_MS, maxBlockTimeMs)
            .putInt(KEY_NOTIFICATION_BLOCK_MODE, notificationBlockMode)
            .putLong(KEY_MIN_DURATION_MS, minimumDurationMs)
            .putString(KEY_CUSTOM_MESSAGE, customMessage)
            .apply()
    }

    fun stopSession() {
        prefs.edit()
            .putBoolean(KEY_IS_ACTIVE, false)
            .putStringSet(KEY_BLOCKED_PACKAGES, emptySet())
            .putString(KEY_SESSION_ID, "")
            .putLong(KEY_STARTED_AT, 0L)
            .putLong(KEY_ELAPSED_REALTIME_AT_START, 0L)
            .remove(LEGACY_KEY_AUTH_TOKEN)
            .remove(LEGACY_KEY_BASE_URL)
            .putLong(KEY_MAX_BLOCK_TIME_MS, 0L)
            .putInt(KEY_NOTIFICATION_BLOCK_MODE, 0)
            .putLong(KEY_MIN_DURATION_MS, 0L)
            .putString(KEY_CUSTOM_MESSAGE, "")
            .apply()
    }

    fun isActive(): Boolean = prefs.getBoolean(KEY_IS_ACTIVE, false)

    fun getBlockedPackages(): Set<String> =
        prefs.getStringSet(KEY_BLOCKED_PACKAGES, emptySet()) ?: emptySet()

    fun getSessionId(): String = prefs.getString(KEY_SESSION_ID, "") ?: ""

    fun getStartedAt(): Long = prefs.getLong(KEY_STARTED_AT, 0L)

    fun getElapsedRealtimeAtStart(): Long = prefs.getLong(KEY_ELAPSED_REALTIME_AT_START, 0L)

    /**
     * Returns elapsed ms since session started using monotonic clock when available.
     * Falls back to wall clock after reboot (elapsedRealtime resets to 0).
     */
    fun getElapsedSinceStart(): Long {
        val realtimeAtStart = getElapsedRealtimeAtStart()
        if (realtimeAtStart > 0 && SystemClock.elapsedRealtime() >= realtimeAtStart) {
            return SystemClock.elapsedRealtime() - realtimeAtStart
        }
        val startedAt = getStartedAt()
        if (startedAt > 0) {
            return System.currentTimeMillis() - startedAt
        }
        return 0L
    }

    fun getMaxBlockTimeMs(): Long = prefs.getLong(KEY_MAX_BLOCK_TIME_MS, 0L)

    fun getNotificationBlockMode(): Int = prefs.getInt(KEY_NOTIFICATION_BLOCK_MODE, 0)

    fun getMinimumDurationMs(): Long = prefs.getLong(KEY_MIN_DURATION_MS, 0L)

    fun getCustomMessage(): String = prefs.getString(KEY_CUSTOM_MESSAGE, "") ?: ""

    /**
     * True once the session has run for its minimum duration, measured on the
     * monotonic clock so changing the device time can't end a session early.
     * Tasks live only on the device now, so this is the sole enforcement.
     */
    fun hasMetMinimumDuration(): Boolean =
        !isActive() || getElapsedSinceStart() >= getMinimumDurationMs()

    /** Strips the backend token a pre-local-tasks version left in a running session. */
    fun clearLegacyAuth() {
        prefs.edit().remove(LEGACY_KEY_AUTH_TOKEN).remove(LEGACY_KEY_BASE_URL).apply()
    }

    companion object {
        private const val PREFS_NAME = "brainclean_blocker_state"
        private const val KEY_IS_ACTIVE = "is_active"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val KEY_SESSION_ID = "session_id"
        private const val KEY_STARTED_AT = "started_at"
        private const val KEY_ELAPSED_REALTIME_AT_START = "elapsed_realtime_at_start"
        // Written by versions that polled the backend; only ever removed now.
        private const val LEGACY_KEY_AUTH_TOKEN = "auth_token"
        private const val LEGACY_KEY_BASE_URL = "base_url"
        private const val KEY_MAX_BLOCK_TIME_MS = "max_block_time_ms"
        private const val KEY_NOTIFICATION_BLOCK_MODE = "notification_block_mode"
        private const val KEY_MIN_DURATION_MS = "min_duration_ms"
        private const val KEY_CUSTOM_MESSAGE = "custom_message"

        @Volatile
        private var instance: BlockerState? = null

        fun getInstance(context: Context): BlockerState {
            return instance ?: synchronized(this) {
                instance ?: BlockerState(context.applicationContext).also { instance = it }
            }
        }
    }
}
