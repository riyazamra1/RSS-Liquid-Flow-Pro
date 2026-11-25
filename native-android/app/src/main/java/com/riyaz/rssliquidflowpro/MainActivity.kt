package com.riyaz.rssliquidflowpro

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
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.riyaz.rssliquidflowpro.game.LiquidFlowEngine

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { LiquidFlowNativeApp() }
    }
}

@Composable
private fun LiquidFlowNativeApp() {
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
    val solved = LiquidFlowEngine.isSolved(board)

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
            }
        }
    }
}
