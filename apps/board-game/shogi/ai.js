/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      PIECE_TYPES,
      PIECE_SYMBOLS,
      PROMOTED_SYMBOLS,
      PIECE_VALUES,
      PROMOTED_VALUES,
      BOARD_SIZE,
      CELL_SIZE,
      BOARD_PADDING,
      SENTE,
      GOTE,
      isValidPosition,
      initializeBoard,
      getPieceName,
      canPromote,
      isGameOver,
      getKingMoves,
      getRookMoves,
      getBishopMoves,
      getGoldMoves,
      getSilverMoves,
      getKnightMoves,
      getLanceMoves,
      getPawnMoves,
      getDragonMoves,
      getHorseMoves,
      getValidMoves,
      hasKing,
      canDropOn,
      getAllMoves,
    } = deps;

    function evaluateBoard(board, player, capturedPieces) {
      let score = 0;
      const opponent = player === SENTE ? GOTE : SENTE;

      // Locate both kings first so we can score attacking pressure
      let playerKing = null;
      let oppKing = null;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col];
          if (piece && piece.type === PIECE_TYPES.KING) {
            if (piece.player === player) {
              playerKing = { row, col };
            } else {
              oppKing = { row, col };
            }
          }
        }
      }

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col];
          if (!piece) continue;

          let value = piece.promoted ? PROMOTED_VALUES[piece.type] : PIECE_VALUES[piece.type];

          if (piece.type !== PIECE_TYPES.KING) {
            // Position bonus: pieces in center are more valuable
            value += (4 - Math.abs(col - 4)) * 4 + (4 - Math.abs(row - 4)) * 4;

            // Promotion zone bonus
            if (!piece.promoted && canPromote(piece, row)) {
              value += 40;
            }

            // Aggression: reward pieces that crowd the enemy king
            const enemyKing = piece.player === player ? oppKing : playerKing;
            if (enemyKing) {
              const dist = Math.abs(row - enemyKing.row) + Math.abs(col - enemyKing.col);
              value += Math.max(0, 8 - dist) * 3;
            }
          }

          if (piece.player === player) {
            score += value;
          } else {
            score -= value;
          }
        }
      }

      // Pieces in hand are valuable in shogi since they can be dropped anywhere
      if (capturedPieces) {
        for (const p of capturedPieces[player] || []) {
          score += PIECE_VALUES[p.type] * 0.95;
        }
        for (const p of capturedPieces[opponent] || []) {
          score -= PIECE_VALUES[p.type] * 0.95;
        }
      }

      return score;
    }

    function applyMove(board, move, capturedPieces) {
      const newBoard = board.map((row) => [...row]);
      const newCaptured = {
        sente: [...(capturedPieces?.sente || [])],
        gote: [...(capturedPieces?.gote || [])],
      };

      if (move.type === "drop") {
        newBoard[move.to.row][move.to.col] = {
          type: move.piece.type,
          player: move.piece.player,
          promoted: false,
        };
        // Remove from captured pieces
        const idx = newCaptured[move.piece.player].findIndex((p) => p.type === move.piece.type);
        if (idx !== -1) {
          newCaptured[move.piece.player].splice(idx, 1);
        }
      } else {
        const piece = newBoard[move.from.row][move.from.col];
        const target = newBoard[move.to.row][move.to.col];

        // Capture
        if (target) {
          newCaptured[piece.player].push({
            type: target.type,
            promoted: false,
          });
        }

        // Move piece
        newBoard[move.to.row][move.to.col] = { ...piece };
        newBoard[move.from.row][move.from.col] = null;

        // Auto-promote if in promotion zone
        const movedPiece = newBoard[move.to.row][move.to.col];
        if (canPromote(movedPiece, move.to.row)) {
          // Auto-promote if entering or leaving promotion zone with non-king/gold
          if (move.to.row <= 2 || move.to.row >= 6) {
            movedPiece.promoted = true;
          }
        }
      }

      return { board: newBoard, capturedPieces: newCaptured };
    }

    const AI_TIME_LIMIT = 1500;

    function moveOrderScore(board, move) {
      if (move.type !== "move") return 0;
      const target = board[move.to.row][move.to.col];
      if (!target) return 0;
      return target.promoted ? PROMOTED_VALUES[target.type] : PIECE_VALUES[target.type];
    }

    function alphaBeta(
      board,
      capturedPieces,
      depth,
      alpha,
      beta,
      maximizingPlayer,
      aiPlayer,
      deadline
    ) {
      // Terminal: a king has been captured. Scale by remaining depth so the AI
      // prefers faster wins and delays losses (i.e. it defends its own king).
      if (isGameOver(board)) {
        const aiAlive = hasKing(board, aiPlayer);
        return { score: aiAlive ? 100000 + depth : -100000 - depth, move: null };
      }

      if (depth === 0) {
        return { score: evaluateBoard(board, aiPlayer, capturedPieces), move: null };
      }

      const currentPlayer = maximizingPlayer ? aiPlayer : aiPlayer === SENTE ? GOTE : SENTE;
      const moves = getAllMoves(board, currentPlayer, capturedPieces);

      if (moves.length === 0) {
        return { score: maximizingPlayer ? -99999 : 99999, move: null };
      }

      // Sort moves for better pruning (most valuable captures first)
      moves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));

      let bestMove = moves[0];

      if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
          const result = applyMove(board, move, capturedPieces);
          const evaluation = alphaBeta(
            result.board,
            result.capturedPieces,
            depth - 1,
            alpha,
            beta,
            false,
            aiPlayer,
            deadline
          );
          if (evaluation.score > maxEval) {
            maxEval = evaluation.score;
            bestMove = move;
          }
          alpha = Math.max(alpha, evaluation.score);
          if (beta <= alpha) break;
          if (deadline && Date.now() > deadline) break;
        }
        return { score: maxEval, move: bestMove };
      } else {
        let minEval = Infinity;
        for (const move of moves) {
          const result = applyMove(board, move, capturedPieces);
          const evaluation = alphaBeta(
            result.board,
            result.capturedPieces,
            depth - 1,
            alpha,
            beta,
            true,
            aiPlayer,
            deadline
          );
          if (evaluation.score < minEval) {
            minEval = evaluation.score;
            bestMove = move;
          }
          beta = Math.min(beta, evaluation.score);
          if (beta <= alpha) break;
          if (deadline && Date.now() > deadline) break;
        }
        return { score: minEval, move: bestMove };
      }
    }

    function findKing(board, player) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const p = board[row][col];
          if (p && p.type === PIECE_TYPES.KING && p.player === player) {
            return { row, col };
          }
        }
      }
      return null;
    }

    function isInCheck(board, player) {
      const king = findKing(board, player);
      if (!king) return false;
      const opponent = player === SENTE ? GOTE : SENTE;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col];
          if (!piece || piece.player !== opponent) continue;
          const moves = getValidMoves(row, col, piece, board);
          for (const m of moves) {
            if (m.row === king.row && m.col === king.col) return true;
          }
        }
      }
      return false;
    }

    function getLegalMoves(board, player, capturedPieces, skipUchifuzume) {
      const opponent = player === SENTE ? GOTE : SENTE;
      const legal = [];
      for (const move of getAllMoves(board, player, capturedPieces)) {
        const result = applyMove(board, move, capturedPieces);
        if (isInCheck(result.board, player)) continue;
        // Uchifuzume: a pawn drop may not deliver immediate checkmate
        if (!skipUchifuzume && move.type === "drop" && move.piece.type === PIECE_TYPES.PAWN) {
          if (
            isInCheck(result.board, opponent) &&
            getLegalMoves(result.board, opponent, result.capturedPieces, true).length === 0
          ) {
            continue;
          }
        }
        legal.push(move);
      }
      return legal;
    }

    function getGameStatus(board, player, capturedPieces) {
      const inCheck = isInCheck(board, player);
      const hasMove = getLegalMoves(board, player, capturedPieces).length > 0;
      return {
        inCheck: inCheck,
        checkmate: inCheck && !hasMove,
        stalemate: !inCheck && !hasMove,
        gameOver: !hasMove,
      };
    }

    function getBestAIMove(board, capturedPieces, aiPlayer, depth = 3, difficulty) {
      const rootMoves = getLegalMoves(board, aiPlayer, capturedPieces);
      if (rootMoves.length === 0) return null;
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      if (level === "easy") return rootMoves[Math.floor(Math.random() * rootMoves.length)];
      const profile = {
        normal: { depth: depth, time: AI_TIME_LIMIT },
        hard: { depth: depth + 1, time: 2200 },
        master: { depth: depth + 2, time: 3200 },
      }[level] || { depth: depth, time: AI_TIME_LIMIT };

      rootMoves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));

      const deadline = Date.now() + profile.time;
      let bestMove = rootMoves[0];

      for (let d = 1; d <= profile.depth; d++) {
        let localBest = null;
        let localBestScore = -Infinity;
        let alpha = -Infinity;

        for (const move of rootMoves) {
          const result = applyMove(board, move, capturedPieces);
          const evaluation = alphaBeta(
            result.board,
            result.capturedPieces,
            d - 1,
            alpha,
            Infinity,
            false,
            aiPlayer,
            deadline
          );
          if (evaluation.score > localBestScore) {
            localBestScore = evaluation.score;
            localBest = move;
          }
          if (evaluation.score > alpha) alpha = evaluation.score;
          if (Date.now() > deadline) break;
        }

        // Adopt this iteration's result only if it finished inside the time budget
        if (localBest && Date.now() <= deadline) {
          bestMove = localBest;
        }
        if (Date.now() > deadline) break;
      }

      return bestMove;
    }

    return {
      evaluateBoard,
      applyMove,
      AI_TIME_LIMIT,
      moveOrderScore,
      alphaBeta,
      findKing,
      isInCheck,
      getLegalMoves,
      getGameStatus,
      getBestAIMove,
    };
  }
  return { createGameAI };
});
