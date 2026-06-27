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
      KOMI,
      DIRECTIONS,
      createBoard,
      getOpponent,
      getPlayerName,
      isValidPosition,
      getGroup,
      getLiberties,
      removeGroup,
      copyBoard,
      playMove,
      isLegalMove,
      getLegalMoves,
      calculateScore,
      createGameState,
    } = deps;

    function getBestAIMove(board, aiPlayer, koPoint, capturesBlack, capturesWhite) {
      const legalMoves = getLegalMoves(board, aiPlayer, koPoint);

      if (legalMoves.length === 0) {
        return null; // No legal moves, pass
      }

      // If only one legal move, return directly
      if (legalMoves.length === 1) {
        return legalMoves[0];
      }

      const simulations = 20; // Reduced for performance on 19x19 board
      let bestMove = null;
      let bestScore = -Infinity;

      // Heuristic pruning: only consider positions near existing stones
      const candidateMoves = filterCandidateMoves(board, legalMoves);

      // Score candidates by heuristic first, keep top N
      const scored = [];
      for (const cm of candidateMoves) {
        const h = evaluateMove(board, cm, aiPlayer);
        scored.push({ move: cm, heuristic: h });
      }
      scored.sort((a, b) => b.heuristic - a.heuristic);
      const topCandidates = scored.slice(0, 12);

      for (const candidate of topCandidates) {
        const move = candidate.move;
        let wins = 0;

        for (let s = 0; s < simulations; s++) {
          const result = simulateGame(board, move, aiPlayer, koPoint, capturesBlack, capturesWhite);
          if (result === aiPlayer) wins++;
        }

        const winRate = wins / simulations;
        const score = winRate * 100 + candidate.heuristic;

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      return bestMove;
    }

    function filterCandidateMoves(board, legalMoves) {
      const filtered = [];
      const radius = 2;

      for (const move of legalMoves) {
        let nearStone = false;

        // Check if there are stones nearby
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = move.x + dx;
            const ny = move.y + dy;
            if (isValidPosition(nx, ny) && board[ny][nx] !== EMPTY) {
              nearStone = true;
              break;
            }
          }
          if (nearStone) break;
        }

        // When board is empty, consider center area
        if (!nearStone && isNearCenter(move.x, move.y)) {
          nearStone = true;
        }

        if (nearStone) {
          filtered.push(move);
        }
      }

      // If no candidates after filtering, return all legal moves
      return filtered.length > 0 ? filtered : legalMoves;
    }

    function isNearCenter(x, y) {
      const center = Math.floor(BOARD_SIZE / 2);
      return Math.abs(x - center) <= 3 && Math.abs(y - center) <= 3;
    }

    function evaluateMove(board, move, player) {
      let score = 0;
      const opponent = getOpponent(player);

      // 1. Center control
      const center = Math.floor(BOARD_SIZE / 2);
      const distToCenter = Math.abs(move.x - center) + Math.abs(move.y - center);
      score += (BOARD_SIZE - distToCenter) * 0.5;

      // 2. Capture threat
      const newBoard = copyBoard(board);
      newBoard[move.y][move.x] = player;

      for (const dir of DIRECTIONS) {
        const nx = move.x + dir.dx;
        const ny = move.y + dir.dy;

        if (isValidPosition(nx, ny) && newBoard[ny][nx] === opponent) {
          const group = getGroup(newBoard, nx, ny);
          const liberties = getLiberties(newBoard, group.stones);
          if (liberties.length === 1) {
            score += group.stones.length * 5; // Capture threat
          }
        }
      }

      // 3. Own liberties
      const selfGroup = getGroup(newBoard, move.x, move.y);
      const selfLiberties = getLiberties(newBoard, selfGroup.stones);
      score += selfLiberties.length * 2;

      return score;
    }

    function simulateGame(board, firstMove, aiPlayer, koPoint, capturesBlack, capturesWhite) {
      let simBoard = copyBoard(board);
      let current = aiPlayer;
      let simKo;
      let simCapturesBlack = capturesBlack;
      let simCapturesWhite = capturesWhite;
      let passCount = 0;
      const maxMoves = 60;
      let moveCount = 0;
      let lastMoveX = firstMove.x;
      let lastMoveY = firstMove.y;

      // Place first stone
      const result = playMove(simBoard, firstMove.x, firstMove.y, current);
      if (result === null) return getOpponent(aiPlayer);

      simBoard = result.board;
      simKo = result.koPoint;
      if (current === BLACK) simCapturesBlack += result.captures;
      else simCapturesWhite += result.captures;

      current = getOpponent(current);
      moveCount++;

      // Fast random play
      while (moveCount < maxMoves) {
        const moves = getQuickMoves(simBoard, current, simKo, lastMoveX, lastMoveY);

        if (moves.length === 0) {
          passCount++;
          if (passCount >= 2) break;
          current = getOpponent(current);
          simKo = null;
          moveCount++;
          continue;
        }

        passCount = 0;

        // Pick a random move
        const idx = Math.floor(Math.random() * moves.length);
        const chosenMove = moves[idx];
        const moveResult = playMove(simBoard, chosenMove.x, chosenMove.y, current);

        if (moveResult === null) {
          current = getOpponent(current);
          moveCount++;
          continue;
        }

        simBoard = moveResult.board;
        simKo = moveResult.koPoint;
        lastMoveX = chosenMove.x;
        lastMoveY = chosenMove.y;
        if (current === BLACK) simCapturesBlack += moveResult.captures;
        else simCapturesWhite += moveResult.captures;

        current = getOpponent(current);
        moveCount++;
      }

      const score = calculateScore(simBoard);
      const blackScore = score.black + simCapturesBlack;
      const whiteScore = score.white + simCapturesWhite + KOMI;

      if (aiPlayer === BLACK) {
        return blackScore > whiteScore ? BLACK : WHITE;
      } else {
        return whiteScore > blackScore ? WHITE : BLACK;
      }
    }

    function getQuickMoves(board, player, koPoint, lastX, lastY) {
      const moves = [];
      const nearMoves = [];
      const radius = 1;

      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (board[y][x] !== EMPTY) continue;
          if (koPoint && koPoint.x === x && koPoint.y === y) continue;

          const dist = Math.abs(x - lastX) + Math.abs(y - lastY);
          if (dist <= radius) {
            nearMoves.push({ x: x, y: y });
          }
          moves.push({ x: x, y: y });
        }
      }

      // Prefer near moves, fall back to all moves
      const pool = nearMoves.length > 0 ? nearMoves : moves;

      // If pool is still large, sample a subset
      if (pool.length > 20) {
        const sampled = [];
        for (let i = 0; i < 20; i++) {
          sampled.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        return sampled;
      }

      return pool;
    }

    return {
      getBestAIMove,
      filterCandidateMoves,
      isNearCenter,
      evaluateMove,
      simulateGame,
      getQuickMoves,
    };
  }
  return { createGameAI };
});
