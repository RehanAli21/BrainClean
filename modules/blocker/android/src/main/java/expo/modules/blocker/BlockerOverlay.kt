package expo.modules.blocker

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

class BlockerOverlay {
    private var overlayView: FrameLayout? = null
    private var windowManager: WindowManager? = null

    fun show(context: Context) {
        if (overlayView != null) return

        if (!Settings.canDrawOverlays(context)) {
            Log.w(TAG, "Overlay permission not granted, cannot show blocker overlay")
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

        val lockIcon = TextView(context).apply {
            text = "\uD83D\uDD12"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 48f)
            gravity = Gravity.CENTER
        }

        val title = TextView(context).apply {
            text = LocalizedStrings.get(context, "blocker.overlayTitle")
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 16)
        }

        val customMessage = BlockerState.getInstance(context).getCustomMessage()
        val subtitle = TextView(context).apply {
            text = if (customMessage.isNotBlank()) customMessage else LocalizedStrings.get(context, "blocker.overlaySubtitle")
            setTextColor(Color.parseColor("#A1A1AA"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            gravity = Gravity.CENTER
        }

        content.addView(lockIcon)
        content.addView(title)
        content.addView(subtitle)

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
        }
    }

    fun hide() {
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
        private const val TAG = "BlockerOverlay"
    }
}
