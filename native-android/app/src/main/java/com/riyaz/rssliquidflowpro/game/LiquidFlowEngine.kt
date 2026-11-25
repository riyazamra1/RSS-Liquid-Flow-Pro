package com.riyaz.rssliquidflowpro.game

/**
 * Native Kotlin rules engine. Tube lists are bottom-to-top, matching the React game's
 * src/utils/levelGenerator.ts representation.
 */
object LiquidFlowEngine {
    data class Board(
        val tubes: List<List<Int>>,
        val capacity: Int = 5,
        val jarTargetColors: List<Int?> = List(tubes.size) { null }
    ) {
        init {
            require(capacity > 0)
            require(tubes.size == jarTargetColors.size)
            require(tubes.all { it.size <= capacity })
        }
    }

    data class MoveResult(val board: Board, val movedUnits: Int)

    fun isJarCompleteAndSealed(board: Board, index: Int): Boolean {
        val tube = board.tubes.getOrNull(index) ?: return false
        if (tube.size != board.capacity || tube.any { it != tube.first() }) return false
        val color = tube.first()
        val required = board.jarTargetColors[index]
        if (required != null) return color == required
        return board.jarTargetColors.indices.none { it != index && board.jarTargetColors[it] == color }
    }

    fun canPour(board: Board, from: Int, to: Int): Boolean {
        if (from == to) return false
        val src = board.tubes.getOrNull(from) ?: return false
        val dst = board.tubes.getOrNull(to) ?: return false
        if (src.isEmpty() || dst.size >= board.capacity) return false
        if (isJarCompleteAndSealed(board, from) || isJarCompleteAndSealed(board, to)) return false
        val color = src.last()
        val required = board.jarTargetColors[to]
        if (required != null && color != required) return false
        return dst.isEmpty() || dst.last() == color
    }

    /** Moves the complete contiguous top run, as in the web game's pour interaction. */
    fun pour(board: Board, from: Int, to: Int): MoveResult? {
        if (!canPour(board, from, to)) return null
        val next = board.tubes.map { it.toMutableList() }
        val src = next[from]
        val dst = next[to]
        val color = src.last()
        var count = 0
        while (src.isNotEmpty() && src.last() == color && dst.size < board.capacity) {
            dst.add(src.removeAt(src.lastIndex))
            count++
        }
        return MoveResult(board.copy(tubes = next.map { it.toList() }), count)
    }

    fun isSolved(board: Board): Boolean {
        val seen = mutableSetOf<Int>()
        board.tubes.forEachIndexed { index, tube ->
            val required = board.jarTargetColors[index]
            if (required != null && (tube.size != board.capacity || tube.any { it != required })) {
                return false
            }
            if (tube.isEmpty()) return@forEachIndexed
            if (tube.size != board.capacity || tube.any { it != tube.first() }) return false
            if (!seen.add(tube.first())) return false
        }
        return seen.isNotEmpty()
    }

    data class MoveAnalysis(val hasAnyLegalMove: Boolean, val hasProductiveMove: Boolean)

    fun analyzeMoves(board: Board): MoveAnalysis {
        var any = false
        for (from in board.tubes.indices) {
            val src = board.tubes[from]
            if (src.isEmpty()) continue
            val sourceIsMono = src.all { it == src.first() }
            for (to in board.tubes.indices) {
                if (!canPour(board, from, to)) continue
                any = true
                val destination = board.tubes[to]
                val destinationIsTarget = board.jarTargetColors[to] != null
                if (destination.isNotEmpty() || destinationIsTarget || !sourceIsMono) {
                    return MoveAnalysis(true, true)
                }
            }
        }
        return MoveAnalysis(any, false)
    }
}
