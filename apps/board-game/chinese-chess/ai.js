/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      PIECE_VALUES,
      COLS,
      ROWS,
      EMPTY,
      R_GENERAL,
      R_ADVISOR,
      R_ELEPHANT,
      R_HORSE,
      R_CHARIOT,
      R_CANNON,
      R_PAWN,
      B_GENERAL,
      B_ADVISOR,
      B_ELEPHANT,
      B_HORSE,
      B_CHARIOT,
      B_CANNON,
      B_PAWN,
      RED,
      BLACK,
      QUIESCENCE_MAX_PLY,
      PIECE_NAMES,
      FLEX_VALUES,
      SOLDIER_POS_RED,
      SOLDIER_POS_BLACK,
      CHARIOT_POS,
      HORSE_POS,
      CANNON_POS,
      ADVISOR_POS_RED,
      ADVISOR_POS_BLACK,
      ELEPHANT_POS_RED,
      ELEPHANT_POS_BLACK,
      createBoard,
      isRed,
      isBlack,
      getOwner,
      getOpponent,
      getPlayerName,
      inBounds,
      isGeneral,
      isChariot,
      isHorse,
      isCannon,
      isAdvisor,
      isElephant,
      isPawn,
      copyBoard,
      applyMove,
      getValidMoves,
      isGeneralFacing,
      getLineMoves,
      getChariotMoves,
      getCannonMoves,
      getHorseMoves,
      getElephantMoves,
      getAdvisorMoves,
      getGeneralMoves,
      getPawnMoves,
      getAllMoves,
      isInCheck,
      checkGameOver,
      createGameState,
    } = deps;

    const AI_DEPTH = 4;

    const AI_MAX_DEPTH = 6;

    const AI_TIME_BUDGET_MS = 1500;

    function evaluateBoard(board, aiColor) {
      let aiScore = 0,
        oppScore = 0;

      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const piece = board[c][r];
          if (piece === EMPTY) continue;
          let val = PIECE_VALUES[piece];

          // Add positional bonus based on piece type
          if (piece === R_PAWN) val += SOLDIER_POS_RED[c][r];
          else if (piece === B_PAWN) val += SOLDIER_POS_BLACK[c][r];
          else if (piece === R_CHARIOT || piece === B_CHARIOT) val += CHARIOT_POS[c][r];
          else if (piece === R_HORSE || piece === B_HORSE) val += HORSE_POS[c][r];
          else if (piece === R_CANNON || piece === B_CANNON) val += CANNON_POS[c][r];
          else if (piece === R_ADVISOR) val += ADVISOR_POS_RED[c][r];
          else if (piece === B_ADVISOR) val += ADVISOR_POS_BLACK[c][r];
          else if (piece === R_ELEPHANT) val += ELEPHANT_POS_RED[c][r];
          else if (piece === B_ELEPHANT) val += ELEPHANT_POS_BLACK[c][r];

          const owner = getOwner(piece);
          if (owner === aiColor) aiScore += val;
          else oppScore += val;
        }
      }
      return aiScore - oppScore;
    }

    function create2DArray(cols, rows, defaultVal) {
      const arr = [];
      for (let c = 0; c < cols; c++) {
        const row = [];
        for (let r = 0; r < rows; r++) row.push(defaultVal);
        arr.push(row);
      }
      return arr;
    }

    function orderMoves(board, moves, preferred) {
      // Score each move: captures get high score based on victim value.
      // The "preferred" move (from a previous search iteration / transposition
      // table) is searched first to maximize alpha-beta cutoffs.
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
          if (victim !== EMPTY) {
            // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
            score = PIECE_VALUES[victim] * 10 - PIECE_VALUES[board[move.fromC][move.fromR]];
          }
        }
        scored.push({ move: move, score: score });
      }
      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);
      return scored.map((s) => s.move);
    }

    const zobristKeys = {};

    let zobristSideKey = 0;

    let zobristInitDone = false;

    function initZobrist() {
      if (zobristInitDone) return;
      // Use a simple pseudo-random generator (seeded for reproducibility)
      let seed = 12345;
      function pseudoRandom() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed;
      }
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          zobristKeys[c + "," + r] = {};
          for (let p = 1; p <= 14; p++) {
            zobristKeys[c + "," + r][p] = pseudoRandom();
          }
        }
      }
      // Distinct key mixed in when it is Black's turn, so positions that share the
      // same piece layout but differ in side-to-move never collide.
      zobristSideKey = pseudoRandom();
      zobristInitDone = true;
    }

    function computeHash(board, sideToMove) {
      let hash = 0;
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const piece = board[c][r];
          if (piece !== EMPTY) {
            hash ^= zobristKeys[c + "," + r][piece];
          }
        }
      }
      if (sideToMove === BLACK) hash ^= zobristSideKey;
      return hash;
    }

    const TT_EXACT = 0;

    const TT_LOWER = 1;

    const TT_UPPER = 2;

    const transpositionTable = new Map();

    const TT_MAX_SIZE = 100000;

    function ttLookup(hash, depth, alpha, beta) {
      const entry = transpositionTable.get(hash);
      if (!entry || entry.depth < depth) return null;
      if (entry.flag === TT_EXACT) return entry.score;
      if (entry.flag === TT_LOWER && entry.score >= beta) return entry.score;
      if (entry.flag === TT_UPPER && entry.score <= alpha) return entry.score;
      return null;
    }

    function ttStore(hash, depth, score, flag, bestMove) {
      // Replace if deeper or table not full
      const existing = transpositionTable.get(hash);
      if (!existing || existing.depth <= depth) {
        if (transpositionTable.size >= TT_MAX_SIZE) {
          // Clear half the table when full (simple eviction)
          const keys = Array.from(transpositionTable.keys());
          for (let i = 0; i < keys.length / 2; i++) {
            transpositionTable.delete(keys[i]);
          }
        }
        transpositionTable.set(hash, {
          score: score,
          depth: depth,
          flag: flag,
          bestMove: bestMove || null,
        });
      }
    }

    let searchDeadline = 0;

    const TIME_ABORT = { abort: true };

    function generalsPresent(board) {
      let red = false,
        black = false;
      for (let c = 3; c <= 5; c++) {
        for (let r = 0; r <= 2; r++) {
          if (board[c][r] === B_GENERAL) black = true;
        }
        for (let r = 7; r <= 9; r++) {
          if (board[c][r] === R_GENERAL) red = true;
        }
      }
      return { red: red, black: black };
    }

    function quiescence(board, alpha, beta, sideToMove, ply) {
      if (searchDeadline && Date.now() > searchDeadline) throw TIME_ABORT;

      const standPat = evaluateBoard(board, sideToMove);
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
      if (ply >= QUIESCENCE_MAX_PLY) return alpha;

      const moves = getAllMoves(board, sideToMove);
      const captures = [];
      for (const m of moves) {
        if (board[m.toC][m.toR] !== EMPTY) captures.push(m);
      }
      if (captures.length === 0) return alpha;

      const ordered = orderMoves(board, captures, null);
      for (const move of ordered) {
        const newBoard = applyMove(board, move);
        const score = -quiescence(newBoard, -beta, -alpha, getOpponent(sideToMove), ply + 1);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    }

    function alphaBeta(board, depth, alpha, beta, aiColor, isAITurn) {
      if (searchDeadline && Date.now() > searchDeadline) throw TIME_ABORT;

      const sideToMove = isAITurn ? aiColor : getOpponent(aiColor);

      // Terminal by capture of a general.
      const g = generalsPresent(board);
      if (!g.red) return sideToMove === RED ? -99999 - depth : 99999 + depth;
      if (!g.black) return sideToMove === BLACK ? -99999 - depth : 99999 + depth;

      if (depth === 0) return quiescence(board, alpha, beta, sideToMove, 0);

      const hash = computeHash(board, sideToMove);
      const ttScore = ttLookup(hash, depth, alpha, beta);
      if (ttScore !== null) return ttScore;
      const ttEntry = transpositionTable.get(hash);

      const moves = getAllMoves(board, sideToMove);
      // No legal moves => side to move is checkmated/stalemated (a loss in Xiangqi).
      if (moves.length === 0) return -99999 - depth;

      const orderedMoves = orderMoves(board, moves, ttEntry ? ttEntry.bestMove : null);
      let bestScore = -Infinity;
      let bestMove = null;
      const origAlpha = alpha;

      for (const move of orderedMoves) {
        const newBoard = applyMove(board, move);
        const score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, aiColor, !isAITurn);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        if (bestScore > alpha) alpha = bestScore;
        if (alpha >= beta) break;
      }

      let flag;
      if (bestScore <= origAlpha) flag = TT_UPPER;
      else if (bestScore >= beta) flag = TT_LOWER;
      else flag = TT_EXACT;
      ttStore(hash, depth, bestScore, flag, bestMove);
      return bestScore;
    }

    function getBestAIMove(board, aiColor, difficulty) {
      // Initialize Zobrist keys on first call
      initZobrist();
      // Clear transposition table for each new move computation
      transpositionTable.clear();

      const rootMoves = getAllMoves(board, aiColor);
      if (rootMoves.length === 0) return null;
      if (rootMoves.length === 1) return rootMoves[0];

      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      if (level === "easy") return rootMoves[Math.floor(Math.random() * rootMoves.length)];
      const profile = {
        normal: {
          startDepth: Math.max(1, AI_DEPTH - 2),
          maxDepth: AI_MAX_DEPTH,
          time: AI_TIME_BUDGET_MS,
        },
        hard: { startDepth: Math.max(2, AI_DEPTH - 1), maxDepth: AI_MAX_DEPTH + 1, time: 2200 },
        master: { startDepth: AI_DEPTH, maxDepth: AI_MAX_DEPTH + 2, time: 3200 },
      }[level] || {
        startDepth: Math.max(1, AI_DEPTH - 2),
        maxDepth: AI_MAX_DEPTH,
        time: AI_TIME_BUDGET_MS,
      };

      searchDeadline = Date.now() + profile.time;
      let bestMove = rootMoves[0];
      let prevBest = null;

      try {
        // Iterative deepening: search depth 1..AI_MAX_DEPTH, reusing the previous
        // iteration's best move for ordering. Stops when the time budget is hit and
        // falls back to the best move from the last fully completed depth.
        for (let depth = profile.startDepth; depth <= profile.maxDepth; depth++) {
          let iterBest = null;
          let iterBestScore = -Infinity;
          let alpha = -Infinity;
          let completed = true;

          const ordered = orderMoves(board, rootMoves, prevBest);
          for (const move of ordered) {
            let score;
            try {
              const newBoard = applyMove(board, move);
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
            // A forced mate has been found; deeper search cannot improve on it.
            if (iterBestScore > 90000) break;
          } else {
            // Ran out of time mid-iteration: keep the last completed depth's result.
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
      create2DArray,
      orderMoves,
      zobristKeys,
      zobristSideKey,
      zobristInitDone,
      initZobrist,
      computeHash,
      TT_EXACT,
      TT_LOWER,
      TT_UPPER,
      transpositionTable,
      TT_MAX_SIZE,
      ttLookup,
      ttStore,
      searchDeadline,
      TIME_ABORT,
      generalsPresent,
      quiescence,
      alphaBeta,
      getBestAIMove,
    };
  }
  return { createGameAI };
});
