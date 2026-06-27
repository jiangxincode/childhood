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
      CENTER_X,
      CENTER_Y,
      TIAN_YUAN,
      START_A,
      START_B,
      HOME_OF_A,
      HOME_OF_B,
      DIRECTIONS,
      inBounds,
      isTianYuan,
      getOpponent,
      createBoard,
      applyInitialLayout,
      createInitialState,
      countPieces,
      getValidMoves,
      hasValidMoves,
      movePiece,
      checkWin,
    } = deps;

    function distanceToHome(board, player) {
      var home = player === PLAYER_A ? HOME_OF_B : HOME_OF_A;
      var pieces = [];
      for (var y = 0; y < BOARD_SIZE; y++) {
        for (var x = 0; x < BOARD_SIZE; x++) {
          if (board[y][x] === player) pieces.push({ x: x, y: y });
        }
      }
      // Greedy assignment: for each home slot, take the closest unassigned
      // own piece. This is a cheap proxy for "how far from victory".
      var taken = {};
      var total = 0;
      for (var h = 0; h < home.length; h++) {
        var target = home[h];
        if (board[target.y][target.x] === player) continue;
        var bestIdx = -1;
        var bestDist = Infinity;
        for (var p = 0; p < pieces.length; p++) {
          if (taken[p]) continue;
          var dist = Math.abs(pieces[p].x - target.x) + Math.abs(pieces[p].y - target.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
          }
        }
        if (bestIdx >= 0) {
          taken[bestIdx] = true;
          total += bestDist;
        } else {
          total += BOARD_SIZE * 2;
        }
      }
      return total;
    }

    function evaluateBoard(board, aiPlayer) {
      var opponent = getOpponent(aiPlayer);
      if (checkWin(board, aiPlayer)) return 100000;
      if (checkWin(board, opponent)) return -100000;
      // Lower distance is better; flip sign so larger = better for AI.
      var aiDist = distanceToHome(board, aiPlayer);
      var oppDist = distanceToHome(board, opponent);
      return (oppDist - aiDist) * 10;
    }

    function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
      var opponent = getOpponent(aiPlayer);

      if (checkWin(board, aiPlayer)) return 100000 + depth;
      if (checkWin(board, opponent)) return -100000 - depth;

      var nextPlayer = isMaximizing ? aiPlayer : opponent;
      if (!hasValidMoves(board, nextPlayer)) {
        // Side to move is stuck: count it as a loss for that side.
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

    function getBestAIMove(state) {
      var aiPlayer = state.aiTeam;
      var moves = getValidMoves(state.board, aiPlayer);
      if (moves.length === 0) return null;

      // Quick win check
      for (var w = 0; w < moves.length; w++) {
        var nb = movePiece(state.board, moves[w].fromX, moves[w].fromY, moves[w].toX, moves[w].toY);
        if (checkWin(nb, aiPlayer)) return moves[w];
      }

      var depth = 3; // 9x9 with jumps has a high branching factor; keep modest
      var bestScore = -Infinity;
      var bestMoves = [];
      for (var i = 0; i < moves.length; i++) {
        var next = movePiece(
          state.board,
          moves[i].fromX,
          moves[i].fromY,
          moves[i].toX,
          moves[i].toY
        );
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

    return { distanceToHome, evaluateBoard, minimax, getBestAIMove };
  }
  return { createGameAI };
});
