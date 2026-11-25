package com.riyaz.rssliquidflowpro.game

import android.content.Context
import android.graphics.Color as AndroidColor
import org.json.JSONObject

data class GameColor(val id: Int, val name: String, val hex: String, val argb: Int)

data class NativeGameSpec(
    val schemaVersion: Int,
    val capacity: Int,
    val colors: List<GameColor>,
    val defaultBoard: List<List<Int>>
) {
    fun newBoard() = LiquidFlowEngine.Board(defaultBoard, capacity)
}

object GameSpecLoader {
    fun load(context: Context): NativeGameSpec {
        val raw = context.assets.open("game-spec.json").bufferedReader().use { it.readText() }
        val json = JSONObject(raw)
        require(json.getInt("schemaVersion") == 1) { "Unsupported native game spec schema" }
        val capacity = json.getInt("capacity")
        require(capacity in 2..12) { "Game capacity must be between 2 and 12" }
        val colorsJson = json.getJSONArray("colors")
        val colors = (0 until colorsJson.length()).map { index ->
            val item = colorsJson.getJSONObject(index)
            val hex = item.getString("hex")
            GameColor(
                id = item.getInt("id"),
                name = item.getString("name"),
                hex = hex,
                argb = AndroidColor.parseColor(hex)
            )
        }.sortedBy { it.id }
        require(colors.isNotEmpty() && colors.map { it.id }.distinct().size == colors.size) {
            "Game colors must have unique IDs"
        }
        val boardJson = json.getJSONArray("defaultBoard")
        val board = (0 until boardJson.length()).map { tubeIndex ->
            val tube = boardJson.getJSONArray(tubeIndex)
            (0 until tube.length()).map { unitIndex -> tube.getInt(unitIndex) }
        }
        require(board.size >= 2 && board.all { it.size <= capacity }) { "Invalid default board" }
        require(board.flatten().all { colorId -> colors.any { it.id == colorId } }) {
            "Default board references an unknown color"
        }
        return NativeGameSpec(1, capacity, colors, board)
    }
}
