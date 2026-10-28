package expo.modules.blocker

import android.content.Context

/**
 * Localized strings for native UI (overlays, notifications). The React Native
 * layer syncs translations via BlockerModule.syncLocalizedStrings whenever the
 * app starts or the language changes, because the in-app language can differ
 * from the system locale (so Android string resources cannot be used).
 * Falls back to English until the first sync happens.
 */
object LocalizedStrings {
    private const val PREFS_NAME = "brainclean_i18n"

    private val defaults = mapOf(
        "blocker.notifTitle" to "BrainClean",
        "blocker.notifText" to "BrainClean is protecting your focus.",
        "blocker.overlayTitle" to "This app is blocked",
        "blocker.overlaySubtitle" to "Return to BrainClean to check your session.",
        "wellness.notifEye" to "Eye care active",
        "wellness.notifAutoBlock" to "Usage monitoring active",
        "wellness.notifBoth" to "Eye care & usage monitoring active",
        "wellness.eyeTitle" to "Look Away",
        "wellness.eyeSubtitle" to "Look at something 20 feet away",
        "wellness.breakTitle" to "Take a Break",
        "wellness.breakSubtitle" to "You've been scrolling for {minutes} minutes",
        // Global wellness custom overlay messages. Empty by default so the
        // overlays fall back to the built-in subtitle. Synced from RN.
        "custom.eye" to "",
        "custom.appMonitor" to "",
    )

    fun sync(context: Context, strings: Map<String, String>) {
        val editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        strings.forEach { (key, value) -> editor.putString(key, value) }
        editor.apply()
    }

    fun get(context: Context, key: String): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(key, null) ?: defaults[key] ?: key
    }

    fun get(context: Context, key: String, vararg args: Pair<String, String>): String {
        var value = get(context, key)
        args.forEach { (name, replacement) -> value = value.replace("{$name}", replacement) }
        return value
    }
}
