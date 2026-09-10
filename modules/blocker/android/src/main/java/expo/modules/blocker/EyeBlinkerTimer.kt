package expo.modules.blocker

import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.util.Log

class EyeBlinkerTimer {
    private var handler: Handler? = null
    private var runnable: Runnable? = null
    private val overlay = CountdownOverlay()

    fun start(context: Context, intervalMinutes: Int, durationSeconds: Int) {
        stop()
        handler = Handler(Looper.getMainLooper())
        val intervalMs = intervalMinutes * 60 * 1000L

        Log.i(TAG, "Starting eye blinker: interval=${intervalMinutes}min, duration=${durationSeconds}s")

        runnable = object : Runnable {
            override fun run() {
                if (overlay.isShowing()) {
                    handler?.postDelayed(this, intervalMs)
                    return
                }

                val config = CountdownOverlayConfig(
                    icon = "👁️",
                    title = LocalizedStrings.get(context, "wellness.eyeTitle"),
                    subtitle = LocalizedStrings.get(context, "custom.eye")
                        .ifBlank { LocalizedStrings.get(context, "wellness.eyeSubtitle") },
                    durationSeconds = durationSeconds,
                    accentColor = Color.parseColor("#06B6D4"),
                    animateIcon = true
                )
                overlay.show(context, config) {
                    Log.i(TAG, "Eye blinker break finished, scheduling next in ${intervalMinutes}min")
                    handler?.postDelayed(this, intervalMs)
                }
            }
        }
        handler?.postDelayed(runnable!!, intervalMs)
    }

    fun stop() {
        runnable?.let { handler?.removeCallbacks(it) }
        overlay.hide()
        handler = null
        runnable = null
        Log.i(TAG, "Eye blinker stopped")
    }

    fun isRunning(): Boolean = handler != null

    companion object {
        private const val TAG = "EyeBlinkerTimer"
    }
}
