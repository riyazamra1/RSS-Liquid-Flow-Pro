package com.riyaz.rssliquidflowpro.update

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object UpdateScheduler {
    private const val PERIODIC_NAME = "rss-liquid-flow-periodic-update-check"
    private const val IMMEDIATE_NAME = "rss-liquid-flow-update-check"

    private val networkConstraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<AppUpdateWorker>(12, TimeUnit.HOURS)
            .setConstraints(networkConstraints)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    fun checkNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<AppUpdateWorker>()
            .setConstraints(networkConstraints)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            IMMEDIATE_NAME,
            ExistingWorkPolicy.KEEP,
            request
        )
    }

    /** Called only after the user explicitly chooses Download & install while Auto Update is off. */
    fun downloadPending(context: Context) {
        val request = OneTimeWorkRequestBuilder<AppUpdateWorker>()
            .setConstraints(networkConstraints)
            .setInputData(androidx.work.workDataOf("manual_download" to true))
            .build()
        WorkManager.getInstance(context).enqueue(request)
    }
}
