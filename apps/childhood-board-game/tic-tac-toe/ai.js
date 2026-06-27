/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      PLAYER_X,
      PLAYER_O,
      BOARD_PADDING,
      CELL_SIZE,
      BOARD_VIEW_W,
      BOARD_VIEW_H,
      svgNS,
      WIN_LINES,
      createGameState,
      checkWin,
      checkDraw,
      getValidMoves,
      makeMove,
      getOpponent,
    } = deps;

    function minimax(board, depth, isMaximizing, aiPlayer) {
      const result = checkWin(board);
      if (result) {
        return result.winner === aiPlayer ? 10 - depth : depth - 10;
      }
      if (checkDraw(board)) return 0;

      const moves = getValidMoves(board);
      if (isMaximizing) {
        let best = -100;
        for (const move of moves) {
          const newBoard = makeMove(board, move.x, move.y, aiPlayer);
          const score = minimax(newBoard, depth + 1, false, aiPlayer);
          if (score > best) best = score;
        }
        return best;
      } else {
        let best = 100;
        const opponent = getOpponent(aiPlayer);
        for (const move of moves) {
          const newBoard = makeMove(board, move.x, move.y, opponent);
          const score = minimax(newBoard, depth + 1, true, aiPlayer);
          if (score < best) best = score;
        }
        return best;
      }
    }

    function getBestAIMove(board, aiPlayer) {
      const moves = getValidMoves(board);
      if (moves.length === 0) return null;

      // First check if AI can win immediately
      for (const move of moves) {
        const newBoard = makeMove(board, move.x, move.y, aiPlayer);
        if (checkWin(newBoard)) return move;
      }

      // Then check if opponent can win immediately (need to block)
      const opponent = getOpponent(aiPlayer);
      for (const move of moves) {
        const newBoard = makeMove(board, move.x, move.y, opponent);
        if (checkWin(newBoard)) return move;
      }

      // Minimax selects optimal move
      let bestScore = -100;
      let bestMove = moves[0];
      for (const move of moves) {
        const newBoard = makeMove(board, move.x, move.y, aiPlayer);
        const score = minimax(newBoard, 0, false, aiPlayer);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }

    return { minimax, getBestAIMove };
  }
  return { createGameAI };
});
