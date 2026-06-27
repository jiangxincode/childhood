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
      TOTAL_POSITIONS,
      PIECES_EACH,
      EDGES,
      POSITIONS,
      POSITION_NAMES,
      ADJACENCY,
      createBoard,
      createInitialState,
      getNeighbors,
      getValidMovesForPiece,
      getAllValidMoves,
      canMove,
      checkWin,
      movePiece,
      getOpponent,
      isMoveLegalOnFirstTurn,
      countPieces,
    } = deps;

    function evaluateBoard(board, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      var winner = checkWin(board);
      if (winner === aiPlayer) return 1000;
      if (winner === opponent) return -1000;

      var score = 0;

      // Mobility score
      var aiMoves = getAllValidMoves(board, aiPlayer).length;
      var oppMoves = getAllValidMoves(board, opponent).length;
      score += (aiMoves - oppMoves) * 5;

      // Center control is valuable (position 4)
      for (var i = 0; i < TOTAL_POSITIONS; i++) {
        if (board[i] === aiPlayer) {
          if (i === 4) score += 5; // center is good
        }
        if (board[i] === opponent) {
          if (i === 4) score -= 5;
        }
      }

      return score;
    }

    function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
      var winner = checkWin(board);
      if (winner === aiPlayer) return 1000 + depth;
      if (winner !== null) return -1000 - depth;
      if (depth === 0) return evaluateBoard(board, aiPlayer);

      var currentPlayer = maximizing ? aiPlayer : getOpponent(aiPlayer);
      var moves = getAllValidMoves(board, currentPlayer);

      if (moves.length === 0) {
        return maximizing ? -1000 - depth : 1000 + depth;
      }

      if (maximizing) {
        var maxEval = -Infinity;
        for (var i = 0; i < moves.length; i++) {
          var newBoard = movePiece(board, moves[i].from, moves[i].to);
          var evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
          if (evalScore > maxEval) maxEval = evalScore;
          if (maxEval > alpha) alpha = maxEval;
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        var minEval = Infinity;
        for (var i2 = 0; i2 < moves.length; i2++) {
          var newBoard2 = movePiece(board, moves[i2].from, moves[i2].to);
          var evalScore2 = minimax(newBoard2, depth - 1, alpha, beta, true, aiPlayer);
          if (evalScore2 < minEval) minEval = evalScore2;
          if (minEval < beta) beta = minEval;
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }

    function getBestAIMove(state, difficulty) {
      var board = state.board;
      var aiPlayer = state.aiTeam;
      var moves = getAllValidMoves(board, aiPlayer);

      // First-turn rule: filter out moves that would block opponent completely
      if (state.isFirstTurn) {
        moves = moves.filter((m) => isMoveLegalOnFirstTurn(board, m.from, m.to, aiPlayer));
      }

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
        var newBoard = movePiece(board, moves[i].from, moves[i].to);
        var score = minimax(newBoard, depth, -Infinity, Infinity, false, aiPlayer);
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [moves[i]];
        } else if (score === bestScore) {
          bestMoves.push(moves[i]);
        }
      }

      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    return { evaluateBoard, minimax, getBestAIMove };
  }
  return { createGameAI };
});
