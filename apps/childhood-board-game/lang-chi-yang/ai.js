/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      PLAYER_A,
      PLAYER_B,
      EMPTY,
      ROW_COUNT,
      COL_COUNT,
      INITIAL_A,
      INITIAL_B,
      MIN_A_TO_LOSE,
      BOARD_PADDING,
      CELL_SIZE,
      BOARD_VIEW_W,
      BOARD_VIEW_H,
      svgNS,
      DIRECTIONS,
      createBoard,
      getInitialBoard,
      createGameState,
      inBounds,
      countPieces,
      getAdjacentCells,
      getStepMoves,
      getJumpMoves,
      getValidMoves,
      checkWin,
      cloneBoard,
      applyMove,
      getOpponent,
    } = deps;

    function getBestAIMove_B(state) {
      var board = state.board;
      var moves = getValidMoves(board, PLAYER_B);
      if (moves.length === 0) return null;

      // Prioritize jump captures
      var jumpMoves = [];
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].type === "jump") jumpMoves.push(moves[i]);
      }
      if (jumpMoves.length > 0) {
        // Pick the jump that leaves the fewest escape routes for opponent
        var bestJump = jumpMoves[0];
        var bestScore = -1;
        for (var j = 0; j < jumpMoves.length; j++) {
          var testBoard = applyMove(board, jumpMoves[j]);
          var opponentMoves = getValidMoves(testBoard, PLAYER_A);
          if (opponentMoves.length > bestScore) {
            bestScore = opponentMoves.length;
            bestJump = jumpMoves[j];
          }
        }
        return bestJump;
      }

      // Try step moves: prefer moves that keep pieces alive
      var bestMove = moves[0];
      var bestMoveScore = -Infinity;
      for (var k = 0; k < moves.length; k++) {
        var testBoard2 = applyMove(board, moves[k]);
        // Score: more adjacent empty cells = safer
        var adj = getAdjacentCells(moves[k].toR, moves[k].toC);
        var emptyAdj = 0;
        for (var a = 0; a < adj.length; a++) {
          if (testBoard2[adj[a].r][adj[a].c] === EMPTY) emptyAdj++;
        }
        // Penalize if wolf piece has no step moves from new position
        var bMovesFromNew = getStepMoves(testBoard2, moves[k].toR, moves[k].toC);
        var score = emptyAdj * 10 + bMovesFromNew.length;
        // Bonus for moving toward sheep pieces (to potentially capture later)
        if (moves[k].type === "step") {
          var adjToA = 0;
          for (var aa = 0; aa < adj.length; aa++) {
            if (testBoard2[adj[aa].r][adj[aa].c] === PLAYER_A) adjToA++;
          }
          score += adjToA * 5;
        }
        if (score > bestMoveScore) {
          bestMoveScore = score;
          bestMove = moves[k];
        }
      }
      return bestMove;
    }

    function getBestAIMove_A(state) {
      var board = state.board;
      var moves = getValidMoves(board, PLAYER_A);
      if (moves.length === 0) return null;

      var bestMove = moves[0];
      var bestMoveScore = -Infinity;

      for (var i = 0; i < moves.length; i++) {
        var testBoard = applyMove(board, moves[i]);
        var score = 0;

        // Prefer moves that reduce wolf's mobility
        var bMovesAfter = getValidMoves(testBoard, PLAYER_B);
        score -= bMovesAfter.length * 10;

        // Prefer moves that get closer to wolf pieces
        for (var br = 0; br < ROW_COUNT; br++) {
          for (var bc = 0; bc < COL_COUNT; bc++) {
            if (testBoard[br][bc] === PLAYER_B) {
              var dist = Math.abs(moves[i].toR - br) + Math.abs(moves[i].toC - bc);
              score += (10 - dist) * 3;
            }
          }
        }

        // Penalize moves that put piece in jumpable position
        var adj = getAdjacentCells(moves[i].toR, moves[i].toC);
        for (var a = 0; a < adj.length; a++) {
          var dr = moves[i].toR - adj[a].r;
          var dc = moves[i].toC - adj[a].c;
          if (
            inBounds(moves[i].toR + 2 * dr, moves[i].toC + 2 * dc) &&
            testBoard[adj[a].r][adj[a].c] === PLAYER_B
          ) {
            var jumpTargetR = moves[i].toR + 2 * dr;
            var jumpTargetC = moves[i].toC + 2 * dc;
            if (testBoard[jumpTargetR][jumpTargetC] === EMPTY) {
              score -= 50; // Very dangerous, can be captured
            }
          }
        }

        // Prefer moves that block wolf's escape routes
        for (var br2 = 0; br2 < ROW_COUNT; br2++) {
          for (var bc2 = 0; bc2 < COL_COUNT; bc2++) {
            if (testBoard[br2][bc2] === PLAYER_B) {
              var bAdj = getAdjacentCells(br2, bc2);
              var blockedCount = 0;
              for (var ba = 0; ba < bAdj.length; ba++) {
                if (testBoard[bAdj[ba].r][bAdj[ba].c] !== EMPTY) blockedCount++;
              }
              score += blockedCount * 8;
            }
          }
        }

        if (score > bestMoveScore) {
          bestMoveScore = score;
          bestMove = moves[i];
        }
      }
      return bestMove;
    }

    function getBestAIMove(state) {
      if (state.aiTeam === PLAYER_B) return getBestAIMove_B(state);
      return getBestAIMove_A(state);
    }

    return { getBestAIMove_B, getBestAIMove_A, getBestAIMove };
  }
  return { createGameAI };
});
