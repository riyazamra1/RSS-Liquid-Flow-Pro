package com.riyaz.rssliquidflowpro

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.riyaz.rssliquidflowpro.game.LiquidFlowEngine
import com.riyaz.rssliquidflowpro.update.UPDATE_FILE_NAME
import com.riyaz.rssliquidflowpro.update.UpdateInstallActivity
import com.riyaz.rssliquidflowpro.update.UpdatePreferences
import com.riyaz.rssliquidflowpro.update.UpdateScheduler
import java.io.File
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7001)
        }
        UpdateScheduler.schedule(this)
        UpdateScheduler.checkNow(this)
        setContent { LiquidFlowNativeApp() }
    }
}

@Composable
private fun LiquidFlowNativeApp() {
    val context = LocalContext.current
    val colors = listOf(Color(0xFFE01E37), Color(0xFF12A850), Color(0xFFFFD200), Color(0xFF7E2CE8))
    var board by remember {
        mutableStateOf(
            LiquidFlowEngine.Board(
                tubes = listOf(
                    listOf(0, 1, 2, 3, 0),
                    listOf(1, 2, 3, 0, 1),
                    listOf(2, 3, 0, 1, 2),
                    listOf(3, 0, 1, 2, 3),
                    emptyList(),
                    emptyList()
                )
            )
        )
    }
    var selected by remember { mutableStateOf<Int?>(null) }
    var moves by remember { mutableIntStateOf(0) }
    var autoUpdates by remember { mutableStateOf(UpdatePreferences.autoUpdateEnabled(context)) }
    var updateStatus by remember { mutableStateOf("Checking for updates in the background") }
    var pendingAvailable by remember { mutableStateOf(UpdatePreferences.pending(context) != null) }
    var apkReady by remember { mutableStateOf(File(context.filesDir, UPDATE_FILE_NAME).isFile) }
    val solved = LiquidFlowEngine.isSolved(board)

    LaunchedEffect(Unit) {
        repeat(12) {
            delay(1500)
            pendingAvailable = UpdatePreferences.pending(context) != null
            apkReady = File(context.filesDir, UPDATE_FILE_NAME).isFile
            updateStatus = when {
                apkReady -> "An update is downloaded and ready for installation"
                pendingAvailable -> "An update is available"
                else -> "Automatic update checks are active"
            }
        }
    }

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFFFAF6EC)) {
            Column(
                modifier = Modifier.fillMaxSize().padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("RSS LIQUID FLOW PRO", style = MaterialTheme.typography.headlineSmall, color = Color(0xFF245B3B))
                Spacer(Modifier.height(8.dp))
                Text(if (solved) "Puzzle completed!" else "Select a jar, then select a destination")
                Text("Moves: $moves")
                Spacer(Modifier.height(28.dp))
                board.tubes.chunked(3).forEachIndexed { rowIndex, row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        row.forEachIndexed { colIndex, tube ->
                            val index = rowIndex * 3 + colIndex
                            Column(
                                modifier = Modifier.width(82.dp).padding(5.dp)
                                    .background(
                                        if (selected == index) Color(0xFFDDEBD9) else Color.Transparent,
                                        RoundedCornerShape(14.dp)
                                    )
                                    .clickable {
                                        val from = selected
                                        if (from == null) {
                                            if (tube.isNotEmpty()) selected = index
                                        } else {
                                            val result = LiquidFlowEngine.pour(board, from, index)
                                            if (result != null) {
                                                board = result.board
                                                moves++
                                                selected = null
                                            } else if (tube.isNotEmpty()) {
                                                selected = index
                                            } else {
                                                selected = null
                                            }
                                        }
                                    }.padding(7.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Bottom
                            ) {
                                (0 until board.capacity).reversed().forEach { slot ->
                                    val colorIndex = tube.getOrNull(slot)
                                    Spacer(
                                        Modifier.fillMaxWidth().height(22.dp).padding(vertical = 1.dp)
                                            .background(
                                                colorIndex?.let { colors[it % colors.size] } ?: Color(0xFFE8E4D9),
                                                RoundedCornerShape(5.dp)
                                            )
                                    )
                                }
                                Text("Jar ${index + 1}", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
                Spacer(Modifier.weight(1f))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = {
                        board = LiquidFlowEngine.Board(
                            listOf(listOf(0,1,2,3,0), listOf(1,2,3,0,1), listOf(2,3,0,1,2),
                                listOf(3,0,1,2,3), emptyList(), emptyList())
                        )
                        selected = null
                        moves = 0
                    }) { Text("Restart") }
                    Button(onClick = { selected = null }) { Text("Deselect") }
                }
                Spacer(Modifier.height(18.dp))
                Column(
                    modifier = Modifier.fillMaxWidth().background(Color(0xFFFFFFFF), RoundedCornerShape(16.dp)).padding(14.dp)
                ) {
                    Text("APP UPDATES", style = MaterialTheme.typography.titleSmall, color = Color(0xFF245B3B))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Auto Update")
                            Text("Checks continue when this is OFF", style = MaterialTheme.typography.bodySmall)
                        }
                        Switch(checked = autoUpdates, onCheckedChange = {
                            autoUpdates = it
                            UpdatePreferences.setAutoUpdateEnabled(context, it)
                            UpdateScheduler.checkNow(context)
                        })
                    }
                    Text(updateStatus, style = MaterialTheme.typography.bodySmall)
                    if (pendingAvailable && !autoUpdates && !apkReady) {
                        Button(onClick = {
                            updateStatus = "Downloading update..."
                            UpdateScheduler.downloadPending(context)
                        }, modifier = Modifier.fillMaxWidth()) {
                            Text("Download & install update")
                        }
                    }
                    if (apkReady) {
                        Button(
                            onClick = {
                                context.startActivity(Intent(context, UpdateInstallActivity::class.java))
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Approve installation") }
                    }
                    Button(onClick = {
                        updateStatus = "Checking for updates..."
                        UpdateScheduler.checkNow(context)
                    }, modifier = Modifier.fillMaxWidth()) { Text("Check for updates now") }
                }
            }
        }
    }
}
