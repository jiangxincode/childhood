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
      BOARD_POSITIONS,
      ADJACENCY,
      PIECES_EACH,
      INITIAL_POSITIONS_A,
      INITIAL_POSITIONS_B,
      GRID_COLS,
      GRID_ROWS,
      MOVE_SINGLE,
      MOVE_TRIPLE,
      createBoard,
      createGameState,
      getOpponent,
      getNeighbors,
      getPlayerPieces,
      countPieces,
      isLandable,
      getSingleMovesForPiece,
      getTripleMovesForPiece,
      getValidMoves,
      hasValidMoves,
      applyMove,
      checkWin,
    } = deps;

    function evaluateBoard(board, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      var aiPieces = countPieces(board, aiPlayer);
      var oppPieces = countPieces(board, opponent);

      if (oppPieces === 0) return 100000;
      if (aiPieces === 0) return -100000;

      var aiMoves = getValidMoves(board, aiPlayer).length;
      var oppMoves = getValidMoves(board, opponent).length;

      if (oppMoves === 0) return 100000;
      if (aiMoves === 0) return -100000;

      // Material counts dominate; mobility breaks ties.
      return (aiPieces - oppPieces) * 1000 + (aiMoves - oppMoves);
    }

    function minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
      var opponent = getOpponent(aiPlayer);
      var winner = checkWin(board, isMaximizing ? aiPlayer : opponent);
      if (winner === aiPlayer) return { score: 100000 + depth, move: null };
      if (winner === opponent) return { score: -100000 - depth, move: null };
      if (depth === 0) return { score: evaluateBoard(board, aiPlayer), move: null };

      var currentPlayer = isMaximizing ? aiPlayer : opponent;
      var moves = getValidMoves(board, currentPlayer);
      if (moves.length === 0) {
        return { score: isMaximizing ? -100000 - depth : 100000 + depth, move: null };
      }

      var bestMove = moves[0];
      if (isMaximizing) {
        var maxScore = -Infinity;
        for (var i = 0; i < moves.length; i++) {
          var nb = applyMove(board, moves[i]);
          var r = minimax(nb, depth - 1, false, aiPlayer, alpha, beta);
          if (r.score > maxScore) {
            maxScore = r.score;
            bestMove = moves[i];
          }
          alpha = Math.max(alpha, r.score);
          if (beta <= alpha) break;
        }
        return { score: maxScore, move: bestMove };
      }
      var minScore = Infinity;
      for (var j = 0; j < moves.length; j++) {
        var nb2 = applyMove(board, moves[j]);
        var r2 = minimax(nb2, depth - 1, true, aiPlayer, alpha, beta);
        if (r2.score < minScore) {
          minScore = r2.score;
          bestMove = moves[j];
        }
        beta = Math.min(beta, r2.score);
        if (beta <= alpha) break;
      }
      return { score: minScore, move: bestMove };
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

      // Take an immediate capture-and-win if available
      for (var i = 0; i < moves.length; i++) {
        var nb = applyMove(state.board, moves[i]);
        if (countPieces(nb, getOpponent(aiPlayer)) === 0) return moves[i];
      }

      var depth = { normal: 4, hard: 5, master: 6 }[level] || 4;
      var result = minimax(state.board, depth, true, aiPlayer, -Infinity, Infinity);
      return result.move || moves[0];
    }

    return { evaluateBoard, minimax, getBestAIMove };
  }
  return { createGameAI };
});
