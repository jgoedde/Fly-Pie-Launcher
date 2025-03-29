package com.pielauncher

import android.content.Context
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

        return drawableToBase64(drawable)
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val bitmap = drawableToBitmap(drawable)
        val outputStream = ByteArrayOutputStream()

        // Compress the bitmap to a PNG (or JPEG if needed)
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)

        val byteArray = outputStream.toByteArray()

        // Encode to Base64
        val base64String = Base64.encodeToString(byteArray, Base64.DEFAULT)

        // Return the data URL format
        return "data:image/png;base64,$base64String"
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
}

class ShortcutPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ShortcutModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}