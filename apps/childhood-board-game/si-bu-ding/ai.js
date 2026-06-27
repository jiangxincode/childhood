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
      CAPTURES_TO_WIN,
      INITIAL_POSITIONS_A,
      INITIAL_POSITIONS_B,
      DIRECTIONS,
      THREE_LINES,
      inBounds,
      getOpponent,
      createBoard,
      applyInitialLayout,
      createInitialState,
      countPieces,
      copyBoard,
      getValidMoves,
      hasValidMoves,
      movePiece,
      detectCaptures,
      applyCaptures,
      checkWin,
    } = deps;

    function evaluateBoard(board, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      var ai = countPieces(board, aiPlayer);
      var opp = countPieces(board, opponent);
      if (opp <= PIECES_EACH - CAPTURES_TO_WIN) return 100000;
      if (ai <= PIECES_EACH - CAPTURES_TO_WIN) return -100000;

      var score = (ai - opp) * 50;

      // Bonus for threats (any of our pieces adjacent to another own piece
      // with a third cell that could complete a capture line).
      for (var i = 0; i < THREE_LINES.length; i++) {
        var line = THREE_LINES[i];
        var cells = [
          board[line[0].y][line[0].x],
          board[line[1].y][line[1].x],
          board[line[2].y][line[2].x],
        ];
        var aiCount = 0;
        var oppCount = 0;
        for (var k = 0; k < 3; k++) {
          if (cells[k] === aiPlayer) aiCount++;
          else if (cells[k] === opponent) oppCount++;
        }
        if (aiCount === 2 && oppCount === 1) score += 12;
        if (oppCount === 2 && aiCount === 1) score -= 12;
      }
      return score;
    }

    function applyMoveWithCaptures(board, move, player) {
      var nb = movePiece(board, move.fromX, move.fromY, move.toX, move.toY);
      var caps = detectCaptures(nb, player, move.toX, move.toY);
      if (caps.length > 0) nb = applyCaptures(nb, caps);
      return { board: nb, captures: caps };
    }

    function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      if (checkWin(board, aiPlayer)) return 100000 + depth;
      if (checkWin(board, opponent)) return -100000 - depth;

      var nextPlayer = isMaximizing ? aiPlayer : opponent;
      if (!hasValidMoves(board, nextPlayer)) {
        // Side to move stuck: count it as a loss for that side.
        return isMaximizing ? -100000 - depth : 100000 + depth;
      }
      if (depth === 0) return evaluateBoard(board, aiPlayer);

      var moves = getValidMoves(board, nextPlayer);
      if (isMaximizing) {
        var best = -Infinity;
        for (var i = 0; i < moves.length; i++) {
          var nb = applyMoveWithCaptures(board, moves[i], aiPlayer).board;
          var s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
          if (s > best) best = s;
          if (best > alpha) alpha = best;
          if (beta <= alpha) break;
        }
        return best;
      }
      var worst = Infinity;
      for (var k = 0; k < moves.length; k++) {
        var nb2 = applyMoveWithCaptures(board, moves[k], opponent).board;
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

      // Quick win check
      for (var w = 0; w < moves.length; w++) {
        var afterAi = applyMoveWithCaptures(state.board, moves[w], aiPlayer).board;
        if (checkWin(afterAi, aiPlayer)) return moves[w];
      }

      var depth = 4;
      var bestScore = -Infinity;
      var bestMoves = [];
      for (var i = 0; i < moves.length; i++) {
        var next = applyMoveWithCaptures(state.board, moves[i], aiPlayer).board;
        var s = minimax(next, depth, -Infinity, Infinity, false, aiPlayer);
        if (s > bestScore) {
          bestScore = s;
          bestMoves = [moves[i]];
        } else if (s === bestScore) {
          bestMoves.push(moves[i]);
        }
      }
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    return { evaluateBoard, applyMoveWithCaptures, minimax, getBestAIMove };
  }
  return { createGameAI };
});
