package com.riyaz.rssliquidflowpro.update

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log
import java.io.File

class UpdateInstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE).orEmpty()
        if (status == PackageInstaller.STATUS_SUCCESS) {
            UpdatePreferences.clearPending(context)
            File(context.filesDir, UPDATE_FILE_NAME).delete()
            Log.i("RSSUpdate", "Device-owner update installed successfully")
        } else {
            Log.e("RSSUpdate", "Device-owner install failed: $status $message")
        }
    }
}
