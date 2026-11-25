package com.riyaz.rssliquidflowpro.update

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.riyaz.rssliquidflowpro.MainActivity
import com.riyaz.rssliquidflowpro.R
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

class AppUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        val manifest = fetchManifest()
        val currentVersion = if (Build.VERSION.SDK_INT >= 28) {
            applicationContext.packageManager.getPackageInfo(applicationContext.packageName, 0).longVersionCode
        } else {
            @Suppress("DEPRECATION")
            applicationContext.packageManager.getPackageInfo(applicationContext.packageName, 0).versionCode.toLong()
        }
        if (manifest.versionCode <= currentVersion) {
            UpdatePreferences.clearPending(applicationContext)
            return Result.success()
        }

        UpdatePreferences.savePending(applicationContext, manifest)
        val manualDownload = inputData.getBoolean("manual_download", false)
        if (!UpdatePreferences.autoUpdateEnabled(applicationContext) && !manualDownload) {
            notifyUpdateAvailable(manifest, downloaded = false)
            return Result.success()
        }

        val apk = downloadAndVerify(manifest)
        val devicePolicy = applicationContext.getSystemService(DevicePolicyManager::class.java)
        if (devicePolicy?.isDeviceOwnerApp(applicationContext.packageName) == true) {
            installForDeviceOwner(apk)
        } else {
            notifyUpdateAvailable(manifest, downloaded = true)
        }
        Result.success()
    } catch (error: Exception) {
        android.util.Log.e("RSSUpdate", "Update check failed", error)
        Result.retry()
    }

    private fun fetchManifest(): UpdateManifest {
        val connection = (URL(UPDATE_MANIFEST_URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 15_000
            instanceFollowRedirects = false
            requestMethod = "GET"
        }
        try {
            check(connection.responseCode == HttpURLConnection.HTTP_OK) { "Update manifest HTTP ${connection.responseCode}" }
            return UpdateManifest.parse(connection.inputStream.bufferedReader().use { it.readText() })
        } finally {
            connection.disconnect()
        }
    }

    private fun downloadAndVerify(manifest: UpdateManifest): File {
        val destination = File(applicationContext.filesDir, UPDATE_FILE_NAME)
        val connection = (URL(manifest.apkUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000
            readTimeout = 60_000
            instanceFollowRedirects = false
        }
        try {
            check(connection.responseCode == HttpURLConnection.HTTP_OK) { "APK download HTTP ${connection.responseCode}" }
            connection.inputStream.use { input ->
                destination.outputStream().use { output -> input.copyTo(output) }
            }
        } finally {
            connection.disconnect()
        }
        val digest = MessageDigest.getInstance("SHA-256")
        val actual = destination.inputStream().use { input ->
            val buffer = ByteArray(16 * 1024)
            while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                digest.update(buffer, 0, read)
            }
            digest.digest().joinToString("") { "%02x".format(it) }
        }
        check(actual.equals(manifest.sha256, ignoreCase = true)) { "Downloaded APK SHA-256 mismatch" }
        return destination
    }

    private fun installForDeviceOwner(apk: File) {
        val installer = applicationContext.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        params.setAppPackageName(applicationContext.packageName)
        if (Build.VERSION.SDK_INT >= 31) {
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            apk.inputStream().use { input ->
                session.openWrite("rss-liquid-flow-update", 0, apk.length()).use { output ->
                    input.copyTo(output)
                    session.fsync(output)
                }
            }
            val callback = Intent(applicationContext, UpdateInstallReceiver::class.java)
            val pending = PendingIntent.getBroadcast(
                applicationContext, sessionId, callback,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            session.commit(pending.intentSender)
        }
    }

    private fun notifyUpdateAvailable(manifest: UpdateManifest, downloaded: Boolean) {
        val manager = applicationContext.getSystemService(NotificationManager::class.java)
        val channelId = "rss_app_updates"
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(
                NotificationChannel(channelId, "App updates", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_update_settings", true)
        }
        val content = PendingIntent.getActivity(
            applicationContext, 4001, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val title = if (downloaded) "RSS Liquid Flow update ready" else "RSS Liquid Flow update available"
        val message = if (downloaded) {
            "Version ${manifest.versionName} is downloaded. Open the app to approve installation."
        } else {
            "Version ${manifest.versionName} is available. Open Settings to download it."
        }
        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(R.drawable.ic_update_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setContentIntent(content)
            .setAutoCancel(true)
            .build()
        manager.notify(4001, notification)
    }
}
