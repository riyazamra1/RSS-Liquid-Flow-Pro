package com.riyaz.rssliquidflowpro.update

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.core.content.FileProvider
import java.io.File

/** System installer hand-off for ordinary (non-Device-Owner) customer devices. */
class UpdateInstallActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val apk = File(filesDir, UPDATE_FILE_NAME)
        if (!apk.isFile) {
            finish()
            return
        }
        val uri = FileProvider.getUriForFile(this, "${packageName}.updates", apk)
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        try {
            startActivity(installIntent)
        } finally {
            finish()
        }
    }
}
