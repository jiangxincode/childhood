/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      EMPTY,
      RED,
      BLUE,
      GREEN,
      YELLOW,
      PURPLE,
      ORANGE,
      PLAYER_COLORS,
      BOARD_ROWS,
      POS_REGIONS,
      TOTAL_POSITIONS,
      ROW_COLS,
      positions,
      posKey,
      initBoard,
      DIRECTION_VECTORS,
      START_POSITIONS,
      TARGET_POSITIONS,
      initPlayerPositions,
      createBoard,
      placePieces,
      getAdjacentMoves,
      getJumpMoves,
      getLegalMoves,
      makeMove,
      checkWin,
      checkGameOver,
      PLAYER_SETS,
      createGameState,
      initGame,
    } = deps;

    const AI_WEIGHTS = {
      PROGRESS: 100, // Progress score weight
      JUMP_EFFICIENCY: 30, // Jump efficiency weight (per cell)
      TARGET_ENTRY: 500, // Target area entry bonus
      TARGET_DEPTH: 200, // Target area depth bonus
      BLOCKING: 80, // Blocking opponent weight
      FORMATION: 20, // Formation cooperation weight
      RETREAT_PENALTY: -150, // Retreat penalty
    };

    let ADJACENT = [];

    function getPosKey(x, y) {
      return x + "-" + y;
    }

    function isValidPos(x, y) {
      return posKey[getPosKey(x, y)] !== undefined;
    }

    function initAdjacency() {
      ADJACENT = [];
      for (let i = 0; i < TOTAL_POSITIONS; i++) {
        ADJACENT[i] = [];
      }

      for (let i = 0; i < TOTAL_POSITIONS; i++) {
        const p = positions[i];
        for (let d = 0; d < DIRECTION_VECTORS.length; d++) {
          const nx = p.x + DIRECTION_VECTORS[d].x;
          const ny = p.y + DIRECTION_VECTORS[d].y;
          const nKey = getPosKey(nx, ny);
          if (posKey[nKey] !== undefined) {
            ADJACENT[i].push(posKey[nKey]);
          }
        }
      }
    }

    initAdjacency();

    const POSITION_SCORES = {};

    function initPositionScores() {
      for (let player = RED; player <= ORANGE; player++) {
        POSITION_SCORES[player] = [];
        const targets = TARGET_POSITIONS[player];
        const targetSet = {};
        for (const t of targets) {
          targetSet[t] = true;
        }

        // Calculate target area centroid
        let cx = 0,
          cy = 0;
        for (const t of targets) {
          cx += positions[t].x;
          cy += positions[t].y;
        }
        cx /= targets.length;
        cy /= targets.length;

        // Calculate target area depth reference point (farthest vertex)
        let maxDistFromCenter = 0;
        let tipIdx = targets[0];
        for (const t of targets) {
          const dx = positions[t].x - cx;
          const dy = positions[t].y - cy;
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist > maxDistFromCenter) {
            maxDistFromCenter = dist;
            tipIdx = t;
          }
        }
        const tipPos = positions[tipIdx];

        for (let cell = 0; cell < TOTAL_POSITIONS; cell++) {
          const pos = positions[cell];
          if (targetSet[cell]) {
            // Inside target area: high base score + depth bonus
            const depthDist = Math.abs(pos.x - tipPos.x) + Math.abs(pos.y - tipPos.y);
            POSITION_SCORES[player][cell] = 2000 + (maxDistFromCenter - depthDist) * 100;
          } else {
            // Outside target area: based on distance to target centroid
            const distToTarget = Math.abs(pos.x - cx) + Math.abs(pos.y - cy);
            POSITION_SCORES[player][cell] = 1000 - distToTarget * 50;
          }
        }
      }
    }

    initPositionScores();

    function isInTargetArea(cell, player) {
      const targets = TARGET_POSITIONS[player];
      for (const t of targets) {
        if (t === cell) return true;
      }
      return false;
    }

    function calculateBlockingScore(board, player, position) {
      let score = 0;
      const neighbors = ADJACENT[position];
      for (const neighborCell of neighbors) {
        if (board[neighborCell] !== EMPTY && board[neighborCell] !== player) {
          // Opponent piece next to target position, forming a block
          const opponent = board[neighborCell];
          if (!isInTargetArea(position, opponent)) {
            score += 1;
          }
        }
      }
      return score;
    }

    function calculateFormationScore(board, player, position) {
      let score = 0;
      const neighbors = ADJACENT[position];
      for (const n of neighbors) {
        if (board[n] === player) {
          score += 1;
        }
      }
      return score;
    }

    function evaluateMove(board, player, from, to, allPlayers) {
      let score = 0;
      const fromPos = positions[from];
      const toPos = positions[to];

      // Factor 1: Progress score (based on pre-computed position scores)
      const progressScore = POSITION_SCORES[player][to] - POSITION_SCORES[player][from];
      score += progressScore * AI_WEIGHTS.PROGRESS;

      // Factor 2: Jump efficiency
      const xDiff = Math.abs(toPos.x - fromPos.x);
      const yDiff = Math.abs(toPos.y - fromPos.y);
      const jumpDistance = Math.max(xDiff, yDiff);
      if (jumpDistance > 1) {
        score += jumpDistance * AI_WEIGHTS.JUMP_EFFICIENCY;
      }

      // Factor 3: Target area entry bonus
      const wasInTarget = isInTargetArea(from, player);
      const nowInTarget = isInTargetArea(to, player);
      if (!wasInTarget && nowInTarget) {
        score += AI_WEIGHTS.TARGET_ENTRY;
      }

      // Factor 4: Target area depth bonus
      if (nowInTarget) {
        const depthBefore = POSITION_SCORES[player][from];
        const depthAfter = POSITION_SCORES[player][to];
        if (depthAfter > depthBefore) {
          score += AI_WEIGHTS.TARGET_DEPTH;
        }
      }

      // Factor 5: Blocking opponents
      const blockingScore = calculateBlockingScore(board, player, to);
      score += blockingScore * AI_WEIGHTS.BLOCKING;

      // Factor 6: Formation cooperation
      const formationScore = calculateFormationScore(board, player, to);
      score += formationScore * AI_WEIGHTS.FORMATION;

      // Factor 7: Retreat penalty
      if (progressScore < 0) {
        score += AI_WEIGHTS.RETREAT_PENALTY;
      }

      return score;
    }

    function getBestAIMove(board, player, allPlayers, difficulty) {
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      let bestScore = -Infinity;
      let bestMove = null;
      const legalMoves = [];

      for (let cell = 0; cell < TOTAL_POSITIONS; cell++) {
        if (board[cell] === player) {
          const moves = getLegalMoves(board, cell);
          for (const m of moves) {
            legalMoves.push({ from: cell, to: m });
            let score = evaluateMove(board, player, cell, m, allPlayers);
            if (level === "hard" || level === "master") {
              score += POSITION_SCORES[player][m] * 0.1;
            }
            if (level === "master") {
              const nextBoard = board.slice();
              nextBoard[m] = player;
              nextBoard[cell] = EMPTY;
              let futureBest = -Infinity;
              for (let next = 0; next < TOTAL_POSITIONS; next++) {
                if (nextBoard[next] !== player) continue;
                for (const destination of getLegalMoves(nextBoard, next)) {
                  futureBest = Math.max(
                    futureBest,
                    evaluateMove(nextBoard, player, next, destination, allPlayers)
                  );
                }
              }
              if (futureBest > -Infinity) score += futureBest * 0.2;
            }
            if (score > bestScore) {
              bestScore = score;
              bestMove = { from: cell, to: m };
            }
          }
        }
      }

      if (level === "easy" && legalMoves.length > 0) {
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
      return bestMove;
    }

    return {
      AI_WEIGHTS,
      ADJACENT,
      getPosKey,
      isValidPos,
      initAdjacency,
      POSITION_SCORES,
      initPositionScores,
      isInTargetArea,
      calculateBlockingScore,
      calculateFormationScore,
      evaluateMove,
      getBestAIMove,
    };
  }
  return { createGameAI };
});
