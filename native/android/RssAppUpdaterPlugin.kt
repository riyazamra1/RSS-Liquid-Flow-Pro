package com.riyaz.rssliquidflowpro

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import com.getcapacitor.*
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

@CapacitorPlugin(name = "RssAppUpdater")
class RssAppUpdaterPlugin : Plugin() {
    private val releaseApi = "https://api.github.com/repos/riyazamra1/RSS-Liquid-Flow-Pro/releases/tags/rss-liquid-flow-pro-latest"
    private val prefs by lazy { context.getSharedPreferences("rss_app_updater", 0) }

    @PluginMethod
    fun checkForUpdate(call: PluginCall) {
        Thread {
            try {
                val releaseConnection = (URL(releaseApi).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 12000
                    readTimeout = 12000
                    setRequestProperty("Accept", "application/vnd.github+json")
                    setRequestProperty("User-Agent", "RSS-Liquid-Flow-Pro-Android")
                }
                val releaseText = releaseConnection.inputStream.bufferedReader().use { it.readText() }
                releaseConnection.disconnect()
                val assets = JSONObject(releaseText).getJSONArray("assets")
                var metadataUrl: String? = null
                for (i in 0 until assets.length()) {
                    val asset = assets.getJSONObject(i)
                    if (asset.optString("name") == "update.json") {
                        metadataUrl = asset.optString("browser_download_url")
                        break
                    }
                }
                if (metadataUrl.isNullOrBlank()) throw IllegalStateException("Update metadata is not published yet")
                val metadataConnection = (URL(metadataUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 12000
                    readTimeout = 12000
                    setRequestProperty("Cache-Control", "no-cache")
                }
                val metadata = JSONObject(metadataConnection.inputStream.bufferedReader().use { it.readText() })
                metadataConnection.disconnect()
                val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                val installedCode = if (Build.VERSION.SDK_INT >= 28) packageInfo.longVersionCode else packageInfo.versionCode.toLong()
                val remoteCode = metadata.optLong("versionCode", 0L)
                val result = JSObject()
                    .put("available", remoteCode > installedCode)
                    .put("versionCode", remoteCode)
                    .put("versionName", metadata.optString("versionName"))
                    .put("apkUrl", metadata.optString("apkUrl"))
                    .put("sha256", metadata.optString("sha256"))
                activity.runOnUiThread { call.resolve(result) }
            } catch (error: Exception) {
                activity.runOnUiThread { call.reject("Update check failed: ${error.message}", error) }
            }
        }.start()
    }

    @PluginMethod
    fun downloadAndInstall(call: PluginCall) {
        val apkUrl = call.getString("apkUrl")
        val expectedHash = call.getString("sha256")
        if (apkUrl.isNullOrBlank() || expectedHash.isNullOrBlank()) {
            call.reject("Missing APK URL or checksum")
            return
        }
        Thread {
            try {
                val directory = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.cacheDir
                if (!directory.exists()) directory.mkdirs()
                val apk = File(directory, "rss-liquid-flow-update.apk")
                val connection = (URL(apkUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 20000
                    readTimeout = 60000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "RSS-Liquid-Flow-Pro-Android")
                }
                connection.inputStream.use { input -> apk.outputStream().use { output -> input.copyTo(output) } }
                connection.disconnect()
                val digest = MessageDigest.getInstance("SHA-256")
                val actualHash = digest.digest(apk.readBytes()).joinToString("") { "%02x".format(it) }
                if (!actualHash.equals(expectedHash, ignoreCase = true)) {
                    apk.delete()
                    throw SecurityException("Downloaded APK checksum did not match")
                }
                activity.runOnUiThread {
                    call.resolve(JSObject().put("started", true))
                    openInstaller(apk)
                }
            } catch (error: Exception) {
                activity.runOnUiThread { call.reject("Update download failed: ${error.message}", error) }
            }
        }.start()
    }

    private fun openInstaller(apk: File) {
        if (Build.VERSION.SDK_INT >= 26 && !context.packageManager.canRequestPackageInstalls()) {
            prefs.edit().putString("pending_apk", apk.absolutePath).apply()
            val permissionIntent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}")
            )
            activity.startActivity(permissionIntent)
            return
        }
        launchPackageInstaller(apk)
    }

    private fun launchPackageInstaller(apk: File) {
        if (!apk.exists()) return
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(installIntent)
    }

    override fun handleOnResume() {
        super.handleOnResume()
        val pending = prefs.getString("pending_apk", null) ?: return
        if (Build.VERSION.SDK_INT < 26 || context.packageManager.canRequestPackageInstalls()) {
            prefs.edit().remove("pending_apk").apply()
            launchPackageInstaller(File(pending))
        }
    }
}
