/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      COLS,
      ROWS,
      EMPTY,
      RAT,
      CAT,
      DOG,
      WOLF,
      LEOPARD,
      TIGER,
      LION,
      ELEPHANT,
      RED,
      BLACK,
      PIECE_NAMES,
      PIECE_VALUES,
      TERRAIN_LAND,
      TERRAIN_RIVER,
      TERRAIN_TRAP_RED,
      TERRAIN_TRAP_BLACK,
      TERRAIN_DEN_RED,
      TERRAIN_DEN_BLACK,
      QUIESCENCE_MAX_DEPTH,
      createTerrain,
      isRiver,
      isTrap,
      isDen,
      isOpponentDen,
      createPiece,
      createBoard,
      copyBoard,
      applyMove,
      applyMoveForAI,
      getOwner,
      getOpponent,
      getPlayerName,
      inBounds,
      canCapture,
      isMutualDestruction,
      canMoveTo,
      canJumpRiver,
      getValidMoves,
      getAllMoves,
      checkGameOver,
      createGameState,
    } = deps;

    const AI_DEPTH = 4;

    const AI_MAX_DEPTH = 8;

    const AI_TIME_BUDGET_MS = 2000;

    function evaluateBoard(board, aiColor) {
      let aiScore = 0;
      let oppScore = 0;

      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const piece = board[c][r];
          if (!piece) continue;

          let val = PIECE_VALUES[piece.type];

          // Positional bonus: center control
          const centerDist = Math.abs(c - 3) + Math.abs(r - 4);
          val += Math.max(0, 10 - centerDist * 2);

          // Distance to opponent's den is the winning objective:
          // reward pieces for advancing toward the enemy den (graduated).
          const denR = piece.team === RED ? 0 : 8;
          const denDist = Math.abs(c - 3) + Math.abs(r - denR);
          val += Math.max(0, 16 - denDist) * 4;
          // Strong reward when a piece is right next to the enemy den
          if (denDist <= 2) val += 60;

          // Bonus for rat near opponent elephant (threatening reversal capture)
          if (piece.type === RAT) {
            for (let dc = -2; dc <= 2; dc++) {
              for (let dr = -2; dr <= 2; dr++) {
                const nc = c + dc;
                const nr = r + dr;
                if (inBounds(nc, nr)) {
                  const nearby = board[nc][nr];
                  if (nearby && nearby.type === ELEPHANT && nearby.team !== piece.team) {
                    val += 30;
                  }
                }
              }
            }
          }

          const owner = piece.team;
          if (owner === aiColor) aiScore += val;
          else oppScore += val;
        }
      }

      return aiScore - oppScore;
    }

    let searchDeadline = 0;

    const TIME_ABORT = { abort: true };

    let killerMoves = [];

    let historyTable = {};

    function sameMove(a, b) {
      return a.fromC === b.fromC && a.fromR === b.fromR && a.toC === b.toC && a.toR === b.toR;
    }

    function historyKey(move) {
      return move.fromC + "," + move.fromR + "," + move.toC + "," + move.toR;
    }

    function recordKiller(depth, move) {
      let slot = killerMoves[depth];
      if (!slot) {
        slot = [];
        killerMoves[depth] = slot;
      }
      if (slot[0] && sameMove(slot[0], move)) return;
      slot[1] = slot[0];
      slot[0] = move;
    }

    function recordHistory(move, depth) {
      const key = historyKey(move);
      historyTable[key] = (historyTable[key] || 0) + depth * depth;
    }

    const transpositionTable = new Map();

    const TT_MAX_SIZE = 50000;

    const TT_EXACT = 0;

    const TT_LOWER = 1;

    const TT_UPPER = 2;

    function ttLookup(hash, depth, alpha, beta) {
      const entry = transpositionTable.get(hash);
      if (!entry || entry.depth < depth) return null;
      if (entry.flag === TT_EXACT) return entry.score;
      if (entry.flag === TT_LOWER && entry.score >= beta) return entry.score;
      if (entry.flag === TT_UPPER && entry.score <= alpha) return entry.score;
      return null;
    }

    function ttStore(hash, depth, score, flag, bestMove) {
      const existing = transpositionTable.get(hash);
      if (!existing || existing.depth <= depth) {
        if (transpositionTable.size >= TT_MAX_SIZE) {
          const keys = Array.from(transpositionTable.keys());
          for (let i = 0; i < keys.length / 2; i++) {
            transpositionTable.delete(keys[i]);
          }
        }
        transpositionTable.set(hash, {
          score,
          depth,
          flag,
          bestMove: bestMove || null,
        });
      }
    }

    function computeHash(board, sideToMove) {
      let hash = 0;
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const piece = board[c][r];
          if (piece) {
            hash =
              (hash * 31 + c * 100 + r * 10 + piece.type + (piece.team === RED ? 1000 : 2000)) | 0;
          }
        }
      }
      if (sideToMove === BLACK) hash = (hash * 31 + 999) | 0;
      return hash;
    }

    function orderMoves(board, moves, preferred, killers) {
      const scored = [];
      for (const move of moves) {
        let score = 0;
        if (
          preferred &&
          move.fromC === preferred.fromC &&
          move.fromR === preferred.fromR &&
          move.toC === preferred.toC &&
          move.toR === preferred.toR
        ) {
          score = 1000000;
        } else {
          const victim = board[move.toC][move.toR];
          if (victim) {
            const attacker = board[move.fromC][move.fromR];
            // Check if mutual destruction
            if (attacker.rank === victim.rank) {
              // Mutual destruction: count remaining enemy pieces after removal
              let enemyCount = 0;
              for (let c = 0; c < COLS; c++) {
                for (let r = 0; r < ROWS; r++) {
                  const p = board[c][r];
                  if (p && p.team === victim.team && !(c === move.toC && r === move.toR)) {
                    enemyCount++;
                  }
                }
              }
              // If mutual destruction wins the game (no enemy pieces left), high priority
              if (enemyCount === 0) {
                score = 500000;
              } else {
                // Equal trade: moderate priority
                score = PIECE_VALUES[victim.type] * 5;
              }
            } else {
              score = PIECE_VALUES[victim.type] * 10 - PIECE_VALUES[attacker.type];
            }
          } else {
            // Quiet move: use killer-move and history heuristics
            if (killers) {
              if (killers[0] && sameMove(killers[0], move)) score += 9000;
              else if (killers[1] && sameMove(killers[1], move)) score += 8000;
            }
            const h = historyTable[historyKey(move)];
            if (h) score += Math.min(h, 7000);
          }
          // Bonus for moving toward opponent's den
          const piece = board[move.fromC][move.fromR];
          if (piece.team === RED && move.toR < move.fromR) score += 5;
          if (piece.team === BLACK && move.toR > move.fromR) score += 5;
        }
        scored.push({ move, score });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.map((s) => s.move);
    }

    function quickTerminalWinner(board) {
      let redCount = 0;
      let blackCount = 0;
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const piece = board[c][r];
          if (!piece) continue;
          if (isOpponentDen(c, r, piece.team)) return piece.team;
          if (piece.team === RED) redCount++;
          else blackCount++;
        }
      }
      if (redCount === 0) return BLACK;
      if (blackCount === 0) return RED;
      return null;
    }

    function quiescence(board, alpha, beta, sideToMove, qdepth) {
      if (searchDeadline && Date.now() > searchDeadline) throw TIME_ABORT;

      const winner = quickTerminalWinner(board);
      if (winner) return winner === sideToMove ? 99999 : -99999;

      // Stand-pat: the side to move may choose not to capture.
      const standPat = evaluateBoard(board, sideToMove);
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
      if (qdepth <= 0) return alpha;

      const allMoves = getAllMoves(board, sideToMove);
      const captures = [];
      for (const m of allMoves) {
        if (board[m.toC][m.toR]) captures.push(m);
      }
      if (captures.length === 0) return alpha;

      const ordered = orderMoves(board, captures, null, null);
      const opponent = getOpponent(sideToMove);
      for (const move of ordered) {
        const newBoard = applyMoveForAI(board, move);
        const score = -quiescence(newBoard, -beta, -alpha, opponent, qdepth - 1);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    }

    function alphaBeta(board, depth, alpha, beta, aiColor, isAITurn) {
      if (searchDeadline && Date.now() > searchDeadline) throw TIME_ABORT;

      const sideToMove = isAITurn ? aiColor : getOpponent(aiColor);

      // Check terminal state (score is relative to the side to move, for negamax)
      const gameOver = checkGameOver(board, sideToMove);
      if (gameOver) {
        if (gameOver.winner === sideToMove) return 99999 + depth;
        return -99999 - depth;
      }

      // At the search horizon, run a capture-only quiescence search to avoid
      // the horizon effect (e.g. moving a piece next to a stronger enemy).
      if (depth === 0) {
        return quiescence(board, alpha, beta, sideToMove, QUIESCENCE_MAX_DEPTH);
      }

      const hash = computeHash(board, sideToMove);
      const ttScore = ttLookup(hash, depth, alpha, beta);
      if (ttScore !== null) return ttScore;
      const ttEntry = transpositionTable.get(hash);

      const moves = getAllMoves(board, sideToMove);
      if (moves.length === 0) return -99999 - depth;

      const orderedMoves = orderMoves(
        board,
        moves,
        ttEntry ? ttEntry.bestMove : null,
        killerMoves[depth]
      );
      let bestScore = -Infinity;
      let bestMove = null;
      const origAlpha = alpha;

      for (const move of orderedMoves) {
        const newBoard = applyMoveForAI(board, move);
        const score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, aiColor, !isAITurn);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        if (bestScore > alpha) alpha = bestScore;
        if (alpha >= beta) {
          // Beta cutoff: remember quiet moves that cause cutoffs (killer/history)
          if (!board[move.toC][move.toR]) {
            recordKiller(depth, move);
            recordHistory(move, depth);
          }
          break;
        }
      }

      let flag;
      if (bestScore <= origAlpha) flag = TT_UPPER;
      else if (bestScore >= beta) flag = TT_LOWER;
      else flag = TT_EXACT;
      ttStore(hash, depth, bestScore, flag, bestMove);
      return bestScore;
    }

    function getBestAIMove(board, aiColor) {
      transpositionTable.clear();
      killerMoves = [];
      historyTable = {};

      const rootMoves = getAllMoves(board, aiColor);
      if (rootMoves.length === 0) return null;
      if (rootMoves.length === 1) return rootMoves[0];

      searchDeadline = Date.now() + AI_TIME_BUDGET_MS;
      let bestMove = rootMoves[0];
      let prevBest = null;

      try {
        // Iterative deepening
        for (let depth = 1; depth <= AI_MAX_DEPTH; depth++) {
          let iterBest = null;
          let iterBestScore = -Infinity;
          let alpha = -Infinity;
          let completed = true;

          const ordered = orderMoves(board, rootMoves, prevBest);
          for (const move of ordered) {
            let score;
            try {
              const newBoard = applyMoveForAI(board, move);
              score = -alphaBeta(newBoard, depth - 1, -Infinity, -alpha, aiColor, false);
            } catch (e) {
              if (e === TIME_ABORT) {
                completed = false;
                break;
              }
              throw e;
            }
            if (score > iterBestScore) {
              iterBestScore = score;
              iterBest = move;
            }
            if (score > alpha) alpha = score;
          }

          if (completed && iterBest) {
            bestMove = iterBest;
            prevBest = iterBest;
            if (iterBestScore > 90000) break;
          } else {
            break;
          }

          if (Date.now() > searchDeadline) break;
        }
      } finally {
        searchDeadline = 0;
      }

      return bestMove;
    }

    return {
      AI_DEPTH,
      AI_MAX_DEPTH,
      AI_TIME_BUDGET_MS,
      evaluateBoard,
      searchDeadline,
      TIME_ABORT,
      killerMoves,
      historyTable,
      sameMove,
      historyKey,
      recordKiller,
      recordHistory,
      transpositionTable,
      TT_MAX_SIZE,
      TT_EXACT,
      TT_LOWER,
      TT_UPPER,
      ttLookup,
      ttStore,
      computeHash,
      orderMoves,
      quickTerminalWinner,
      quiescence,
      alphaBeta,
      getBestAIMove,
    };
  }
  return { createGameAI };
});
