package com.riyaz.rssliquidflowpro;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

@CapacitorPlugin(name = "RssAppUpdater")
public class RssAppUpdaterPlugin extends Plugin {
    private static final String RELEASE_API =
        "https://api.github.com/repos/riyazamra1/RSS-Liquid-Flow-Pro/releases/tags/rss-liquid-flow-pro-latest";
    private static final String PREFS = "rss_app_updater";

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        new Thread(() -> {
            try {
                HttpURLConnection releaseConnection = (HttpURLConnection) new URL(RELEASE_API).openConnection();
                releaseConnection.setConnectTimeout(12000);
                releaseConnection.setReadTimeout(12000);
                releaseConnection.setRequestProperty("Accept", "application/vnd.github+json");
                releaseConnection.setRequestProperty("User-Agent", "RSS-Liquid-Flow-Pro-Android");
                String releaseText = readStream(releaseConnection.getInputStream());
                releaseConnection.disconnect();

                JSONArray assets = new JSONObject(releaseText).getJSONArray("assets");
                String metadataUrl = null;
                for (int i = 0; i < assets.length(); i++) {
                    JSONObject asset = assets.getJSONObject(i);
                    if ("update.json".equals(asset.optString("name"))) {
                        metadataUrl = asset.optString("browser_download_url");
                        break;
                    }
                }
                if (metadataUrl == null || metadataUrl.isEmpty()) {
                    throw new IllegalStateException("Update metadata is not published yet");
                }

                HttpURLConnection metadataConnection = (HttpURLConnection) new URL(metadataUrl).openConnection();
                metadataConnection.setConnectTimeout(12000);
                metadataConnection.setReadTimeout(12000);
                metadataConnection.setRequestProperty("Cache-Control", "no-cache");
                JSONObject metadata = new JSONObject(readStream(metadataConnection.getInputStream()));
                metadataConnection.disconnect();

                PackageInfo packageInfo = getContext().getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);
                long installedCode = Build.VERSION.SDK_INT >= 28
                    ? packageInfo.getLongVersionCode() : packageInfo.versionCode;
                long remoteCode = metadata.optLong("versionCode", 0L);

                JSObject result = new JSObject();
                result.put("available", remoteCode > installedCode);
                result.put("versionCode", remoteCode);
                result.put("versionName", metadata.optString("versionName"));
                result.put("apkUrl", metadata.optString("apkUrl"));
                result.put("sha256", metadata.optString("sha256"));
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Update check failed: " + error.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("apkUrl");
        String expectedHash = call.getString("sha256");
        if (apkUrl == null || apkUrl.isEmpty() || expectedHash == null || expectedHash.isEmpty()) {
            call.reject("Missing APK URL or checksum");
            return;
        }

        new Thread(() -> {
            try {
                File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (directory == null) directory = getContext().getCacheDir();
                if (!directory.exists()) directory.mkdirs();
                File apk = new File(directory, "rss-liquid-flow-update.apk");

                HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(60000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "RSS-Liquid-Flow-Pro-Android");
                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                }
                connection.disconnect();

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] bytes = new byte[8192];
                try (InputStream input = new java.io.FileInputStream(apk)) {
                    int count;
                    while ((count = input.read(bytes)) != -1) digest.update(bytes, 0, count);
                }
                StringBuilder actualHash = new StringBuilder();
                for (byte value : digest.digest()) actualHash.append(String.format("%02x", value));
                if (!actualHash.toString().equalsIgnoreCase(expectedHash)) {
                    apk.delete();
                    throw new SecurityException("Downloaded APK checksum did not match");
                }

                getActivity().runOnUiThread(() -> {
                    JSObject result = new JSObject();
                    result.put("started", true);
                    call.resolve(result);
                    openInstaller(apk);
                });
            } catch (Exception error) {
                call.reject("Update download failed: " + error.getMessage());
            }
        }).start();
    }

    private static String readStream(InputStream input) throws Exception {
        StringBuilder output = new StringBuilder();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) != -1) {
            output.append(new String(buffer, 0, count, java.nio.charset.StandardCharsets.UTF_8));
        }
        input.close();
        return output.toString();
    }

    private void openInstaller(File apk) {
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            getContext().getSharedPreferences(PREFS, 0).edit()
                .putString("pending_apk", apk.getAbsolutePath()).apply();
            Intent permissionIntent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            getActivity().startActivity(permissionIntent);
            return;
        }
        launchPackageInstaller(apk);
    }

    private void launchPackageInstaller(File apk) {
        if (!apk.exists()) return;
        Uri uri = FileProvider.getUriForFile(
            getContext(), getContext().getPackageName() + ".fileprovider", apk
        );
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(uri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(installIntent);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        String pending = getContext().getSharedPreferences(PREFS, 0).getString("pending_apk", null);
        if (pending == null) return;
        if (Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls()) {
            getContext().getSharedPreferences(PREFS, 0).edit().remove("pending_apk").apply();
            launchPackageInstaller(new File(pending));
        }
    }
}
