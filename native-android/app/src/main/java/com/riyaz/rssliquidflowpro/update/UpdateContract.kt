package com.riyaz.rssliquidflowpro.update

import android.content.Context
import org.json.JSONObject

internal const val UPDATE_MANIFEST_URL = "https://rssapps.net/games/liquid-flow-pro/update.json"
internal const val UPDATE_PREFS = "rss_liquid_flow_updates"
internal const val UPDATE_FILE_NAME = "rss-liquid-flow-pro-update.apk"

data class UpdateManifest(
    val versionCode: Long,
    val versionName: String,
    val apkUrl: String,
    val sha256: String,
    val notes: String
) {
    companion object {
        fun parse(raw: String): UpdateManifest {
            val json = JSONObject(raw)
            val versionCode = json.getLong("versionCode")
            val versionName = json.getString("versionName").trim()
            val apkUrl = json.getString("apkUrl").trim()
            val sha256 = json.getString("sha256").trim().lowercase()
            require(versionCode > 0) { "Invalid versionCode" }
            require(versionName.isNotBlank()) { "Missing versionName" }
            require(apkUrl.startsWith("https://rssapps.net/")) { "APK must be hosted on rssapps.net over HTTPS" }
            require(sha256.matches(Regex("[a-f0-9]{64}"))) { "Invalid SHA-256 checksum" }
            return UpdateManifest(versionCode, versionName, apkUrl, sha256, json.optString("notes"))
        }
    }
}

object UpdatePreferences {
    private fun prefs(context: Context) =
        context.getSharedPreferences(UPDATE_PREFS, Context.MODE_PRIVATE)

    fun autoUpdateEnabled(context: Context): Boolean =
        prefs(context).getBoolean("auto_update_enabled", true)

    fun setAutoUpdateEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean("auto_update_enabled", enabled).apply()
    }

    fun savePending(context: Context, manifest: UpdateManifest) {
        prefs(context).edit()
            .putLong("pending_version_code", manifest.versionCode)
            .putString("pending_version_name", manifest.versionName)
            .putString("pending_apk_url", manifest.apkUrl)
            .putString("pending_sha256", manifest.sha256)
            .putString("pending_notes", manifest.notes)
            .apply()
    }

    fun pending(context: Context): UpdateManifest? {
        val p = prefs(context)
        val code = p.getLong("pending_version_code", 0L)
        if (code <= 0L) return null
        return runCatching {
            UpdateManifest(
                code,
                p.getString("pending_version_name", "") ?: "",
                p.getString("pending_apk_url", "") ?: "",
                p.getString("pending_sha256", "") ?: "",
                p.getString("pending_notes", "") ?: ""
            )
        }.getOrNull()
    }

    fun clearPending(context: Context) {
        prefs(context).edit().remove("pending_version_code").remove("pending_version_name")
            .remove("pending_apk_url").remove("pending_sha256").remove("pending_notes").apply()
    }
}
