package expo.modules.blocker

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.CountDownTimer
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

data class CountdownOverlayConfig(
    val icon: String,
    val title: String,
    val subtitle: String,
    val durationSeconds: Int,
    val accentColor: Int
)

class CountdownOverlay {
    private var overlayView: FrameLayout? = null
    private var windowManager: WindowManager? = null
    private var countDownTimer: CountDownTimer? = null
    private var countdownText: TextView? = null

    fun show(context: Context, config: CountdownOverlayConfig, onFinished: () -> Unit) {
        if (overlayView != null) return

        if (!Settings.canDrawOverlays(context)) {
            Log.w(TAG, "Overlay permission not granted")
            return
        }

        val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        val container = FrameLayout(context).apply {
            setBackgroundColor(Color.parseColor("#050508"))
        }

        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 0, 48, 0)
        }

        val icon = TextView(context).apply {
            text = config.icon
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 48f)
            gravity = Gravity.CENTER
        }

        val title = TextView(context).apply {
            text = config.title
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 16)
        }

        val subtitle = TextView(context).apply {
            text = config.subtitle
            setTextColor(Color.parseColor("#A1A1AA"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 48)
        }

        val countdown = TextView(context).apply {
            text = "${config.durationSeconds}"
            setTextColor(config.accentColor)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 64f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        countdownText = countdown

        content.addView(icon)
        content.addView(title)
        content.addView(subtitle)
        content.addView(countdown)

        val contentParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        )
        container.addView(content, contentParams)
        overlayView = container

        try {
            wm.addView(container, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to add overlay view", e)
            overlayView = null
            windowManager = null
            countdownText = null
            return
        }

        countDownTimer = object : CountDownTimer(config.durationSeconds * 1000L, 1000L) {
            override fun onTick(millisUntilFinished: Long) {
                val secondsLeft = (millisUntilFinished / 1000).toInt() + 1
                countdownText?.text = "$secondsLeft"
            }

            override fun onFinish() {
                countdownText?.text = "0"
                hide()
                onFinished()
            }
        }.start()

        Log.i(TAG, "Countdown overlay shown: ${config.title} for ${config.durationSeconds}s")
    }

    fun hide() {
        countDownTimer?.cancel()
        countDownTimer = null
        countdownText = null

        val view = overlayView ?: return
        try {
            windowManager?.removeView(view)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to remove overlay view", e)
        }
        overlayView = null
        windowManager = null
    }

    fun isShowing(): Boolean = overlayView != null

    companion object {
        private const val TAG = "CountdownOverlay"
    }
}
