package expo.modules.blocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val state = BlockerState.getInstance(context)
        if (state.isActive()) {
            Log.i(TAG, "Boot completed, restarting blocker service for session=${state.getSessionId()}")
            BlockerService.start(context)
        }

        val wellnessState = WellnessState.getInstance(context)
        if (wellnessState.isAnyFeatureEnabled()) {
            Log.i(TAG, "Boot completed, restarting wellness service")
            WellnessService.start(context)
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
