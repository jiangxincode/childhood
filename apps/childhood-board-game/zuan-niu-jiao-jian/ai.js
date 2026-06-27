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
      INITIAL_POSITIONS_A,
      INITIAL_POSITIONS_B,
      TIP_POSITION,
      ROOT_POSITIONS,
      CONNECTIONS,
      POSITIONS,
      UPPER_ARC,
      LOWER_ARC,
      ARC_EDGE_KEYS,
      EDGES,
      DIST_TO_ROOT,
      createBoard,
      createInitialState,
      getOpponent,
      getConnections,
      countPieces,
      getValidMoves,
      hasValidMoves,
      movePiece,
      checkWin,
    } = deps;

    function evaluateBoard(board, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      var aiMoves = getValidMoves(board, aiPlayer).length;
      var oppMoves = getValidMoves(board, opponent).length;

      // Decisive positions
      for (var r = 0; r < ROOT_POSITIONS.length; r++) {
        if (board[ROOT_POSITIONS[r]] === PLAYER_B) {
          return aiPlayer === PLAYER_B ? 100000 : -100000;
        }
      }
      if (oppMoves === 0) return 100000;
      if (aiMoves === 0) return -100000;

      // Locate the runner (B). It must exist while the game is ongoing.
      var bPos = -1;
      for (var i = 0; i < TOTAL_POSITIONS; i++) {
        if (board[i] === PLAYER_B) {
          bPos = i;
          break;
        }
      }

      // Distance from B to the nearest root: smaller is better for B.
      var bDist = bPos >= 0 ? DIST_TO_ROOT[bPos] : 0;

      // Mobility component: own mobility positive, opponent mobility negative.
      var mobility = aiMoves * 5 - oppMoves * 25;

      // Crowding: bonus when neighbours of B are blocked (especially at the tip).
      var crowding = 0;
      if (bPos >= 0) {
        var nbrs = CONNECTIONS[bPos];
        var blocked = 0;
        for (var k = 0; k < nbrs.length; k++) {
          if (board[nbrs[k]] !== EMPTY) blocked++;
        }
        crowding = blocked * (bPos === TIP_POSITION ? 30 : 10);
      }

      // Distance component (positive = closer to root, good for B)
      var distScore = (5 - bDist) * 40;

      if (aiPlayer === PLAYER_B) {
        return mobility + distScore - crowding;
      }
      return mobility - distScore + crowding;
    }

    function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      var nextPlayer = isMaximizing ? aiPlayer : opponent;

      // Terminal checks: B at root or current side cannot move.
      for (var r = 0; r < ROOT_POSITIONS.length; r++) {
        if (board[ROOT_POSITIONS[r]] === PLAYER_B) {
          return aiPlayer === PLAYER_B ? 100000 + depth : -100000 - depth;
        }
      }
      if (!hasValidMoves(board, nextPlayer)) {
        return isMaximizing ? -100000 - depth : 100000 + depth;
      }
      if (depth === 0) return evaluateBoard(board, aiPlayer);

      var moves = getValidMoves(board, nextPlayer);
      if (isMaximizing) {
        var best = -Infinity;
        for (var i = 0; i < moves.length; i++) {
          var nb = movePiece(board, moves[i].from, moves[i].to);
          var s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
          if (s > best) best = s;
          if (best > alpha) alpha = best;
          if (beta <= alpha) break;
        }
        return best;
      }
      var worst = Infinity;
      for (var k = 0; k < moves.length; k++) {
        var nb2 = movePiece(board, moves[k].from, moves[k].to);
        var s2 = minimax(nb2, depth - 1, alpha, beta, true, aiPlayer);
        if (s2 < worst) worst = s2;
        if (worst < beta) beta = worst;
        if (beta <= alpha) break;
      }
      return worst;
    }

    function getBestAIMove(state) {
      var aiPlayer = state.aiTeam;
      var moves = getValidMoves(state.board, aiPlayer);
      if (moves.length === 0) return null;

      var depth = 6;
      var bestScore = -Infinity;
      var bestMoves = [];
      for (var i = 0; i < moves.length; i++) {
        var nb = movePiece(state.board, moves[i].from, moves[i].to);
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
