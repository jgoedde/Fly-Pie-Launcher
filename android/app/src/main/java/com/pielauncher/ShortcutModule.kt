package com.pielauncher

import android.content.Context
import android.content.Intent
import android.content.pm.LauncherApps
import android.content.pm.ShortcutInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Process
import android.util.Base64
import androidx.annotation.RequiresApi
import androidx.core.graphics.createBitmap
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import java.io.ByteArrayOutputStream


class ShortcutModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "ShortcutUtils"
    }

    @Suppress("unused")
    @ReactMethod
    @RequiresApi(Build.VERSION_CODES.N_MR1)
    fun launchShortcut(packageName: String, shortcutId: String, promise: Promise) {
        try {
            val launcherApps =
                reactApplicationContext.getSystemService(Context.LAUNCHER_APPS_SERVICE) as LauncherApps

            launcherApps.startShortcut(packageName, shortcutId, null, null, Process.myUserHandle())

            promise.resolve("Shortcut launched successfully")
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to launch shortcut: ${e.message}")
        }
    }

    /**
     * Returns a list of shortcuts for a provided package.
     */
    @Suppress("unused")
    @ReactMethod
    @RequiresApi(Build.VERSION_CODES.N_MR1)
    fun getShortcuts(packageName: String, promise: Promise) {
        try {
            val launcherApps =
                reactApplicationContext.getSystemService(Context.LAUNCHER_APPS_SERVICE) as LauncherApps
            val shortcutQuery = LauncherApps.ShortcutQuery()

            shortcutQuery.setQueryFlags(
                LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC or
                        LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST or
                        LauncherApps.ShortcutQuery.FLAG_MATCH_PINNED
            )
            shortcutQuery.setPackage(packageName)

            val shortcutInfos: List<ShortcutInfo>? =
                launcherApps.getShortcuts(shortcutQuery, Process.myUserHandle())

            if (shortcutInfos.isNullOrEmpty()) {
                promise.resolve(Arguments.createArray())
                return
            }

            val resultArray = Arguments.createArray()

            for (shortcut in shortcutInfos.take(6)) { // Limit to 6 shortcuts
                val shortcutMap = Arguments.createMap().apply {
                    putString("id", shortcut.id)
                    putString("label", shortcut.shortLabel?.toString() ?: "")
                    putString("package", shortcut.`package`)
                    putString("icon", getShortcutIconBase64(launcherApps, shortcut)) // Add icon
                }
                resultArray.pushMap(shortcutMap)
            }

            promise.resolve(resultArray)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get shortcuts: ${e.message}")
        }
    }

    /*
     * Converts shortcut icon to Base64 string
     */
    @RequiresApi(Build.VERSION_CODES.N_MR1)
    private fun getShortcutIconBase64(launcherApps: LauncherApps, shortcut: ShortcutInfo): String {
        val drawable: Drawable = launcherApps.getShortcutIconDrawable(shortcut, 0) ?: return ""

        val (pair,_) = drawableToBase64(drawable)
        return pair
    }

    private fun drawableToBase64(drawable: Drawable): Pair<String, Boolean> {
        // Adaptive Icon Handling (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && drawable is android.graphics.drawable.AdaptiveIconDrawable) {
            val monochrome = drawable.monochrome
            if (monochrome != null) {
                val baseSize = 192
                val scale = 1.5f
                val size = (baseSize * scale).toInt()
                val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                canvas.drawARGB(0, 0, 0, 0) // Transparent
                monochrome.colorFilter = android.graphics.PorterDuffColorFilter(android.graphics.Color.WHITE, android.graphics.PorterDuff.Mode.SRC_IN)
                // Zentriert und skaliert zeichnen
                val iconSize = (baseSize * scale).toInt()
                val left = (size - iconSize) / 2
                val top = (size - iconSize) / 2
                monochrome.setBounds(left, top, left + iconSize, top + iconSize)
                monochrome.draw(canvas)
                monochrome.colorFilter = null // Reset für spätere Nutzung
                val outputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                val byteArray = outputStream.toByteArray()
                val base64String = Base64.encodeToString(byteArray, Base64.DEFAULT)
                return Pair("data:image/png;base64,$base64String", true)
            }
        }
        // Fallback: Standard-Icon
        val bitmap = drawableToBitmap(drawable)
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val byteArray = outputStream.toByteArray()
        val base64String = Base64.encodeToString(byteArray, Base64.DEFAULT)
        return Pair("data:image/png;base64,$base64String", false)
    }

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable) {
            return drawable.bitmap
        }

        // Create a blank bitmap with the drawable's dimensions
        val bitmap = createBitmap(drawable.intrinsicWidth, drawable.intrinsicHeight)

        // Draw the drawable onto the bitmap
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)

        return bitmap
    }

    private fun getMonetColor(context: Context, name: String): String? {
        val resId = context.resources.getIdentifier(name, "color", "android")
        if (resId != 0) {
            val colorInt = context.getColor(resId)
            return String.format("#%06X", 0xFFFFFF and colorInt)
        }
        return null
    }

    private fun getAccentAndBackgroundColor(context: Context): Pair<String, String> {
        // Foreground: system_accent1_500, Fallback: system_accent1_600, Fallback: colorPrimary
        // Background: system_accent1_100, Fallback: system_accent1_200, Fallback: colorBackground
        val accentNames = listOf("system_accent1_500", "system_accent1_600")
        val backgroundNames = listOf("system_accent1_100", "system_accent1_200")
        var accentColor: String? = null
        var backgroundColor: String? = null
        for (name in accentNames) {
            accentColor = getMonetColor(context, name)
            if (accentColor != null) break
        }
        for (name in backgroundNames) {
            backgroundColor = getMonetColor(context, name)
            if (backgroundColor != null) break
        }
        // Fallbacks
        if (accentColor == null) {
            val typedValue = android.util.TypedValue()
            val theme = context.theme
            val attr = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) android.R.attr.colorPrimary else android.R.attr.colorAccent
            theme.resolveAttribute(attr, typedValue, true)
            val colorInt = typedValue.data
            accentColor = String.format("#%06X", 0xFFFFFF and colorInt)
        }
        if (backgroundColor == null) {
            val typedValue = android.util.TypedValue()
            val theme = context.theme
            theme.resolveAttribute(android.R.attr.colorBackground, typedValue, true)
            val colorInt = typedValue.data
            backgroundColor = String.format("#%06X", 0xFFFFFF and colorInt)
        }
        return Pair(accentColor!!, backgroundColor!!)
    }

    /**
     * Gibt eine Liste aller ausführbaren Apps mit Label, PackageName, Icon (Base64), Version und optionaler Akzentfarbe zurück.
     */
    @Suppress("unused")
    @ReactMethod
    fun getRunnableApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val resultArray = Arguments.createArray()
            val installedPackages = pm.getInstalledPackages(0)
            val (accentColor, backgroundColor) = getAccentAndBackgroundColor(reactApplicationContext)
            val activities = pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
            val sortedActivities = activities.sortedBy { it.activityInfo.packageName }
            for (resolveInfo in sortedActivities) {
                val appInfo = resolveInfo.activityInfo
                val packageName = appInfo.packageName
                val label = pm.getApplicationLabel(appInfo.applicationInfo).toString()
                val iconDrawable = pm.getApplicationIcon(packageName)
                val (iconBase64, isMonochromeIcon) = drawableToBase64(iconDrawable)
                val version = installedPackages.find { it.packageName == packageName }?.versionName ?: ""
                val appMap = Arguments.createMap().apply {
                    putString("label", label)
                    putString("packageName", packageName)
                    putString("icon", iconBase64)
                    putString("version", version)
                    putString("accentColor", accentColor)
                    putString("backgroundColor", backgroundColor)
                    putBoolean("isMonochromeIcon", isMonochromeIcon)
                }
                resultArray.pushMap(appMap)
            }
            promise.resolve(resultArray)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get runnable apps: ${e.message}")
        }
    }
}

class ShortcutPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ShortcutModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}