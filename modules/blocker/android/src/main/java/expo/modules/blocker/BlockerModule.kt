package expo.modules.blocker

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class BlockerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("BlockerModule")

        Function("getInstalledApps") {
            val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any?>>()
            val pm = context.packageManager

            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.queryIntentActivities(mainIntent, 0)
            }

            val ownPackage = context.packageName

            resolveInfos
                .filter { it.activityInfo.packageName != ownPackage }
                .distinctBy { it.activityInfo.packageName }
                .map { resolveInfo ->
                    val appInfo = resolveInfo.activityInfo.applicationInfo
                    val appName = pm.getApplicationLabel(appInfo).toString()
                    val iconBase64 = try {
                        val drawable = pm.getApplicationIcon(appInfo)
                        drawableToBase64(drawable)
                    } catch (e: Exception) {
                        null
                    }

                    mapOf(
                        "packageName" to resolveInfo.activityInfo.packageName,
                        "appName" to appName,
                        "icon" to iconBase64
                    )
                }
                .sortedBy { (it["appName"] as? String)?.lowercase() }
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val bitmap = Bitmap.createBitmap(
            drawable.intrinsicWidth.coerceAtLeast(1),
            drawable.intrinsicHeight.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)

        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 80, stream)
        bitmap.recycle()

        return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
    }
}
