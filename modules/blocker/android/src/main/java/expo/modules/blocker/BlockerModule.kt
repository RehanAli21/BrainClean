package expo.modules.blocker

import android.annotation.SuppressLint
import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class BlockerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("BlockerModule")

        Events("onBlockedAppDetected", "onServiceStopped")

        OnCreate {
            appContext.reactContext?.let {
                LegacyScheduleCleanup.run(it)
                BlockerState.getInstance(it).clearLegacyAuth()
            }
        }

        AsyncFunction("getInstalledApps") {
            val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any?>>()
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

        Function("startBlocking") { packageNames: List<String>, sessionId: String, maxBlockTimeMs: Long, notificationBlockMode: Int, minimumDurationMs: Long, customMessage: String ->
            val context = appContext.reactContext ?: return@Function Unit
            val state = BlockerState.getInstance(context)
            state.startSession(packageNames, sessionId, maxBlockTimeMs, notificationBlockMode, minimumDurationMs, customMessage)
            BlockerService.start(context)
            ServiceGuardReceiver.scheduleIfNeeded(context)
        }

        // Returns false (and keeps blocking) if the session's minimum duration
        // hasn't elapsed yet.
        Function("stopBlocking") {
            val context = appContext.reactContext ?: return@Function false
            val state = BlockerState.getInstance(context)
            if (!state.hasMetMinimumDuration()) {
                Log.w("BlockerModule", "stopBlocking refused: minimum duration not reached")
                return@Function false
            }
            state.stopSession()
            BlockerService.stop(context)
            true
        }

        Function("isBlocking") {
            val context = appContext.reactContext ?: return@Function false
            BlockerState.getInstance(context).isActive()
        }

        Function("getBlockedApps") {
            val context = appContext.reactContext ?: return@Function emptyList<String>()
            BlockerState.getInstance(context).getBlockedPackages().toList()
        }

        Function("getActiveSessionId") {
            val context = appContext.reactContext ?: return@Function null
            val sessionId = BlockerState.getInstance(context).getSessionId()
            if (sessionId.isEmpty()) null else sessionId
        }

        Function("hasRequiredPermissions") {
            val context = appContext.reactContext ?: return@Function mapOf(
                "usageStats" to false,
                "overlay" to false,
                "batteryOptimization" to false
            )

            val appOps = context.getSystemService(AppOpsManager::class.java)
            val usageStatsGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                ) == AppOpsManager.MODE_ALLOWED
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                ) == AppOpsManager.MODE_ALLOWED
            }

            val overlayGranted = Settings.canDrawOverlays(context)

            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val batteryOptimizationIgnored = pm.isIgnoringBatteryOptimizations(context.packageName)

            mapOf(
                "usageStats" to usageStatsGranted,
                "overlay" to overlayGranted,
                "batteryOptimization" to batteryOptimizationIgnored
            )
        }

        Function("requestUsageStatsPermission") {
            val context = appContext.reactContext ?: return@Function Unit
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        Function("requestOverlayPermission") {
            val context = appContext.reactContext ?: return@Function Unit
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        Function("isBatteryOptimizationIgnored") {
            val context = appContext.reactContext ?: return@Function false
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(context.packageName)
        }

        @SuppressLint("BatteryLife")
        Function("requestBatteryOptimizationExemption") {
            val context = appContext.reactContext ?: return@Function Unit
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (pm.isIgnoringBatteryOptimizations(context.packageName)) return@Function Unit

            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        Function("isNotificationListenerEnabled") {
            val context = appContext.reactContext ?: return@Function false
            // Some OEMs store the abbreviated component form in the raw
            // settings string, so a contains() check on the full class name
            // fails there — NotificationManagerCompat handles both forms.
            androidx.core.app.NotificationManagerCompat
                .getEnabledListenerPackages(context)
                .contains(context.packageName)
        }

        Function("requestNotificationListenerPermission") {
            val context = appContext.reactContext ?: return@Function Unit
            val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        Function("getDeviceManufacturer") {
            Build.MANUFACTURER?.lowercase() ?: ""
        }

        Function("setEyeBlinkerConfig") { enabled: Boolean, intervalMinutes: Int, durationSeconds: Int ->
            val context = appContext.reactContext ?: return@Function Unit
            val state = WellnessState.getInstance(context)
            state.setEyeBlinkerConfig(enabled, intervalMinutes, durationSeconds)
            if (state.isAnyFeatureEnabled()) {
                WellnessService.start(context)
            } else {
                WellnessService.stop(context)
            }
            ServiceGuardReceiver.scheduleIfNeeded(context)
        }

        Function("setAutoBlockConfig") { enabled: Boolean, usageLimitMinutes: Int, durationSeconds: Int, apps: List<String> ->
            val context = appContext.reactContext ?: return@Function Unit
            val state = WellnessState.getInstance(context)
            state.setAutoBlockConfig(enabled, usageLimitMinutes, durationSeconds, apps)
            if (state.isAnyFeatureEnabled()) {
                WellnessService.start(context)
            } else {
                WellnessService.stop(context)
            }
            ServiceGuardReceiver.scheduleIfNeeded(context)
        }

        Function("getWellnessConfig") {
            val context = appContext.reactContext ?: return@Function mapOf(
                "eyeBlinkerEnabled" to false,
                "eyeBlinkerIntervalMinutes" to 20,
                "eyeBlinkerDurationSeconds" to 20,
                "autoBlockEnabled" to false,
                "autoBlockUsageLimitMinutes" to 15,
                "autoBlockDurationSeconds" to 30,
                "autoBlockApps" to emptyList<String>()
            )
            val state = WellnessState.getInstance(context)
            mapOf(
                "eyeBlinkerEnabled" to state.isEyeBlinkerEnabled(),
                "eyeBlinkerIntervalMinutes" to state.getEyeBlinkerIntervalMinutes(),
                "eyeBlinkerDurationSeconds" to state.getEyeBlinkerDurationSeconds(),
                "autoBlockEnabled" to state.isAutoBlockEnabled(),
                "autoBlockUsageLimitMinutes" to state.getAutoBlockUsageLimitMinutes(),
                "autoBlockDurationSeconds" to state.getAutoBlockDurationSeconds(),
                "autoBlockApps" to state.getAutoBlockApps().toList()
            )
        }

        Function("isWellnessServiceRunning") {
            val context = appContext.reactContext ?: return@Function false
            WellnessState.getInstance(context).isAnyFeatureEnabled()
        }

        Function("openAutoStartSettings") {
            val context = appContext.reactContext ?: return@Function false
            val manufacturer = Build.MANUFACTURER?.lowercase() ?: ""

            // OEM-specific AutoStart/AppLaunch settings screens. The OS blocks our
            // foreground service unless the user enables auto-launch here — there is
            // no public API to toggle this programmatically, so we deep-link instead.
            val candidates: List<ComponentName> = when {
                manufacturer.contains("infinix") || manufacturer.contains("tecno") ||
                manufacturer.contains("itel") || manufacturer.contains("transsion") -> listOf(
                    ComponentName("com.transsion.phonemaster", "com.transsion.phonemaster.applicationmanager.activity.AppManagerActivity"),
                    ComponentName("com.transsion.phonemaster", "com.transsion.phonemaster.appmanager.view.AppLaunchActivity"),
                    ComponentName("com.transsion.phonemaster", "com.cyin.himgr.applicationmanager.view.activity.AppLaunchActivity"),
                    ComponentName("com.transsion.phonemanager", "com.transsion.phonemanager.entry.MainActivity"),
                )
                manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> listOf(
                    ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
                )
                manufacturer.contains("oppo") || manufacturer.contains("realme") -> listOf(
                    ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
                    ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
                    ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
                )
                manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> listOf(
                    ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
                    ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
                )
                manufacturer.contains("huawei") || manufacturer.contains("honor") -> listOf(
                    ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
                    ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
                )
                manufacturer.contains("samsung") -> listOf(
                    ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"),
                )
                else -> emptyList()
            }

            for (component in candidates) {
                try {
                    val intent = Intent().apply {
                        this.component = component
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    Log.i("BlockerModule", "Opened AutoStart settings via ${component.flattenToShortString()}")
                    return@Function true
                } catch (e: Exception) {
                    Log.w("BlockerModule", "Failed to open ${component.flattenToShortString()}: ${e.message}")
                }
            }

            // Fallback: open this app's App Info page. On most XOS/MIUI/ColorOS
            // versions, the AutoStart toggle is reachable from there.
            val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                context.startActivity(fallback)
                Log.i("BlockerModule", "Opened App Info as AutoStart fallback")
                return@Function false
            } catch (e: Exception) {
                Log.e("BlockerModule", "Failed to open App Info fallback", e)
                return@Function false
            }
        }

        Function("syncLocalizedStrings") { strings: Map<String, String> ->
            val context = appContext.reactContext ?: return@Function
            LocalizedStrings.sync(context, strings)
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val size = 96
        val fullBitmap = Bitmap.createBitmap(
            drawable.intrinsicWidth.coerceAtLeast(1),
            drawable.intrinsicHeight.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(fullBitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)

        val scaled = if (fullBitmap.width > size || fullBitmap.height > size) {
            val result = Bitmap.createScaledBitmap(fullBitmap, size, size, true)
            fullBitmap.recycle()
            result
        } else {
            fullBitmap
        }

        val stream = ByteArrayOutputStream()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            scaled.compress(Bitmap.CompressFormat.WEBP_LOSSY, 75, stream)
        } else {
            @Suppress("DEPRECATION")
            scaled.compress(Bitmap.CompressFormat.WEBP, 75, stream)
        }
        scaled.recycle()

        return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
    }
}
