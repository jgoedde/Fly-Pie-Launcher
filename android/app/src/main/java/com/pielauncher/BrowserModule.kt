package com.pielauncher

import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.net.toUri
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class BrowserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "BrowserUtils"
    }

    /**
     * Returns the package name of the default browser.
     */
    @Suppress("unused")
    @ReactMethod
    fun getDefaultBrowser(promise: Promise) {
        val context = reactApplicationContext
        val intent = Intent(Intent.ACTION_VIEW, "http://".toUri())
        val resolveInfo =
            context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        promise.resolve(resolveInfo?.activityInfo?.packageName ?: "")
    }
}

class BrowserPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(BrowserModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}