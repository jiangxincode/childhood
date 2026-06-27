/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      BOARD_SIZE,
      EMPTY,
      BLACK,
      WHITE,
      WIN_COUNT,
      WIN_LINES,
      WINS_MAP,
      initWinLines,
      createBoard,
      getOpponent,
      getPlayerName,
      checkWinAt,
      checkDraw,
      makeMove,
      createGameState,
    } = deps;

    const SCORE_HUMAN = [0, 200, 400, 2000, 10000];

    const SCORE_AI = [0, 220, 420, 2100, 20000];

    function getBestAIMove(board, aiPlayer) {
      const humanPlayer = getOpponent(aiPlayer);
      const scoreAI = [];
      const scoreHuman = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        scoreAI[i] = [];
        scoreHuman[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
          scoreAI[i][j] = 0;
          scoreHuman[i][j] = 0;
        }
      }

      // Iterate all winning lines, calculate score for each empty position
      for (let lid = 0; lid < WIN_LINES.length; lid++) {
        const line = WIN_LINES[lid];
        let aiCount = 0;
        let humanCount = 0;
        for (let k = 0; k < line.length; k++) {
          const val = board[line[k].y][line[k].x];
          if (val === aiPlayer) aiCount++;
          else if (val === humanPlayer) humanCount++;
        }

        // Only consider if this line is not occupied by both sides
        if (aiCount > 0 && humanCount > 0) continue;

        if (aiCount > 0 && humanCount === 0) {
          // AI's line, add score to empty positions
          for (const point of line) {
            if (board[point.y][point.x] === EMPTY) {
              scoreAI[point.x][point.y] += SCORE_AI[aiCount];
            }
          }
        } else if (humanCount > 0 && aiCount === 0) {
          // Human's line, add score to empty positions (defense score)
          for (const point of line) {
            if (board[point.y][point.x] === EMPTY) {
              scoreHuman[point.x][point.y] += SCORE_HUMAN[humanCount];
            }
          }
        }
      }

      let maxScore = -1;
      let bestX = -1;
      let bestY = -1;

      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (board[y][x] !== EMPTY) continue;
          if (scoreAI[x][y] === 0 && scoreHuman[x][y] === 0) continue;

          const s = scoreAI[x][y] + scoreHuman[x][y];
          if (s > maxScore) {
            maxScore = s;
            bestX = x;
            bestY = y;
          } else if (s === maxScore) {
            // On tie, prefer offense (higher AI score)
            if (scoreAI[x][y] > scoreAI[bestX][bestY]) {
              bestX = x;
              bestY = y;
            }
          }
        }
      }

      // Play center when board is empty
      if (bestX === -1) {
        const center = Math.floor(BOARD_SIZE / 2);
        return { x: center, y: center };
      }

      return { x: bestX, y: bestY };
    }

    return { SCORE_HUMAN, SCORE_AI, getBestAIMove };
  }
  return { createGameAI };
});
