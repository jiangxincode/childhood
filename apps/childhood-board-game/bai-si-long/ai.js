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
      BOARD_SIZE,
      PIECES_EACH,
      INITIAL_POSITIONS_A,
      INITIAL_POSITIONS_B,
      DIRECTIONS,
      WIN_LINES,
      createBoard,
      applyInitialLayout,
      createInitialState,
      inBounds,
      getOpponent,
      countPieces,
      getAdjacentCells,
      getValidMoves,
      hasValidMoves,
      movePiece,
      checkWin,
    } = deps;

    function evaluateBoard(board, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      var score = 0;
      for (var i = 0; i < WIN_LINES.length; i++) {
        var line = WIN_LINES[i];
        var ai = 0;
        var opp = 0;
        for (var j = 0; j < line.length; j++) {
          var cell = board[line[j].y][line[j].x];
          if (cell === aiPlayer) ai++;
          else if (cell === opponent) opp++;
        }
        if (ai > 0 && opp > 0) continue; // blocked line, no value
        if (ai > 0) score += [0, 1, 8, 64, 100000][ai];
        else if (opp > 0) score -= [0, 1, 8, 64, 100000][opp];
      }
      return score;
    }

    function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
      var opponent = getOpponent(aiPlayer);

      // Terminal: someone already has a dragon.
      var aiWin = checkWin(board, aiPlayer);
      if (aiWin) return 100000 + depth;
      var oppWin = checkWin(board, opponent);
      if (oppWin) return -100000 - depth;

      var nextPlayer = isMaximizing ? aiPlayer : opponent;
      if (!hasValidMoves(board, nextPlayer)) {
        // The side to move is stalemated: count it as a loss for that side.
        return isMaximizing ? -100000 - depth : 100000 + depth;
      }
      if (depth === 0) return evaluateBoard(board, aiPlayer);

      var moves = getValidMoves(board, nextPlayer);
      if (isMaximizing) {
        var best = -Infinity;
        for (var i = 0; i < moves.length; i++) {
          var nb = movePiece(board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
          var s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
          if (s > best) best = s;
          if (best > alpha) alpha = best;
          if (beta <= alpha) break;
        }
        return best;
      }
      var worst = Infinity;
      for (var k = 0; k < moves.length; k++) {
        var nb2 = movePiece(board, moves[k].fromX, moves[k].fromY, moves[k].toX, moves[k].toY);
        var s2 = minimax(nb2, depth - 1, alpha, beta, true, aiPlayer);
        if (s2 < worst) worst = s2;
        if (worst < beta) beta = worst;
        if (beta <= alpha) break;
      }
      return worst;
    }

    function getBestAIMove(state, difficulty) {
      var aiPlayer = state.aiTeam;
      var moves = getValidMoves(state.board, aiPlayer);
      if (moves.length === 0) return null;

      var level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      if (level === "easy") return moves[Math.floor(Math.random() * moves.length)];

      var depth = { normal: 4, hard: 5, master: 6 }[level] || 4;
      var bestScore = -Infinity;
      var bestMoves = [];
      for (var i = 0; i < moves.length; i++) {
        var nb = movePiece(state.board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
        // Quick win shortcut
        if (checkWin(nb, aiPlayer)) return moves[i];
        var s = minimax(nb, depth, -Infinity, Infinity, false, aiPlayer);
        if (s > bestScore) {
          bestScore = s;
          bestMoves = [moves[i]];
        } else if (s === bestScore) {
          bestMoves.push(moves[i]);
        }
      }
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    return { evaluateBoard, minimax, getBestAIMove };
  }
  return { createGameAI };
});
