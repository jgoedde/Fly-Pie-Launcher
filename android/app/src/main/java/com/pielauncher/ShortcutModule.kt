package com.pielauncher

import android.content.Context
import android.content.pm.LauncherApps
import android.content.pm.ShortcutInfo
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Process
import android.util.Base64
import androidx.annotation.RequiresApi
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
        val drawable: Drawable? = launcherApps.getShortcutIconDrawable(shortcut, 0)
        if (drawable is BitmapDrawable) {
            val bitmap = drawable.bitmap
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
            return Base64.encodeToString(outputStream.toByteArray(), Base64.DEFAULT)
        }
        return ""
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