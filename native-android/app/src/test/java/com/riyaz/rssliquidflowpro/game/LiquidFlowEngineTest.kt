package com.riyaz.rssliquidflowpro.game

import org.junit.Assert.*
import org.junit.Test

class LiquidFlowEngineTest {
    @Test fun poursOnlyMatchingTopColorAndMovesContiguousRun() {
        val board = LiquidFlowEngine.Board(
            tubes = listOf(listOf(1, 2, 2), listOf(2), emptyList())
        )
        val result = LiquidFlowEngine.pour(board, 0, 1)
        assertNotNull(result)
        assertEquals(2, result!!.movedUnits)
        assertEquals(listOf(1), result.board.tubes[0])
        assertEquals(listOf(2, 2, 2), result.board.tubes[1])
    }

    @Test fun rejectsDifferentColorAndSelfPour() {
        val board = LiquidFlowEngine.Board(listOf(listOf(1), listOf(2), emptyList()))
        assertFalse(LiquidFlowEngine.canPour(board, 0, 1))
        assertFalse(LiquidFlowEngine.canPour(board, 0, 0))
    }

    @Test fun dedicatedTargetJarRejectsOtherColors() {
        val board = LiquidFlowEngine.Board(
            tubes = listOf(listOf(1), emptyList()),
            jarTargetColors = listOf(null, 2)
        )
        assertFalse(LiquidFlowEngine.canPour(board, 0, 1))
    }

    @Test fun solvedBoardRequiresUniqueFullColorTubesAndTargetMatch() {
        val solved = LiquidFlowEngine.Board(
            tubes = listOf(List(5) { 1 }, List(5) { 2 }, emptyList())
        )
        assertTrue(LiquidFlowEngine.isSolved(solved))

        val duplicate = LiquidFlowEngine.Board(
            tubes = listOf(List(5) { 1 }, List(5) { 1 }, emptyList())
        )
        assertFalse(LiquidFlowEngine.isSolved(duplicate))
    }

    @Test fun completedJarIsSealed() {
        val board = LiquidFlowEngine.Board(
            tubes = listOf(List(5) { 3 }, listOf(3), emptyList())
        )
        assertFalse(LiquidFlowEngine.canPour(board, 0, 2))
        assertFalse(LiquidFlowEngine.canPour(board, 1, 0))
    }
}
