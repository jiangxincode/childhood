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
      W_PAWN,
      W_KNIGHT,
      W_BISHOP,
      W_ROOK,
      W_QUEEN,
      PIECE_VALUES,
      W_KING,
      B_PAWN,
      B_KNIGHT,
      B_BISHOP,
      B_ROOK,
      B_QUEEN,
      B_KING,
      WHITE,
      BLACK,
      PIECE_SYMBOLS,
      PIECE_NAMES,
      PAWN_POS_WHITE,
      PAWN_POS_BLACK,
      KNIGHT_POS,
      BISHOP_POS,
      isWhite,
      isBlack,
      getOwner,
      getOpponent,
      getPlayerName,
      inBounds,
      isPawn,
      isKnight,
      isBishop,
      isRook,
      isQueen,
      isKing,
      createBoard,
      copyBoard,
      applyMove,
      getValidMoves,
      isInCheck,
      isSquareAttacked,
      getRawAttacks,
      getDiagonalAttacks,
      getOrthogonalAttacks,
      getKnightAttacks,
      getKingAttacks,
      getLineMoves,
      getDiagonalMoves,
      getRookMoves,
      getBishopMoves,
      getQueenMoves,
      getKnightMoves,
      getKingMoves,
      getPawnMoves,
      getAllMoves,
      checkGameOver,
      createGameState,
    } = deps;

    const AI_DEPTH = 3;

    function getPositionValue(piece, c, r) {
      if (piece === W_PAWN) return PAWN_POS_WHITE[c][r];
      if (piece === B_PAWN) return PAWN_POS_BLACK[c][r];
      if (piece === W_KNIGHT || piece === B_KNIGHT) return KNIGHT_POS[c][r];
      if (piece === W_BISHOP || piece === B_BISHOP) return BISHOP_POS[c][r];
      return 0;
    }

    function evaluateBoard(board, aiColor) {
      let aiScore = 0,
        oppScore = 0;
      for (let c = 0; c < BOARD_SIZE; c++) {
        for (let r = 0; r < BOARD_SIZE; r++) {
          const piece = board[c][r];
          if (piece === EMPTY) continue;
          const val = PIECE_VALUES[piece] + getPositionValue(piece, c, r);
          if (getOwner(piece) === aiColor) aiScore += val;
          else oppScore += val;
        }
      }
      return aiScore - oppScore;
    }

    function alphaBeta(board, depth, alpha, beta, aiColor, isAITurn, hasMoved) {
      const currentPlayer = isAITurn ? aiColor : getOpponent(aiColor);
      const gameOver = checkGameOver(board, currentPlayer, hasMoved);
      if (gameOver) {
        if (gameOver.winner === aiColor) return 99999 + depth;
        if (gameOver.winner === null) return 0; // Draw
        return -99999 - depth;
      }
      if (depth === 0) return evaluateBoard(board, aiColor);

      const moves = getAllMoves(board, currentPlayer, hasMoved);
      let bestScore = -Infinity;

      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, aiColor, !isAITurn, hasMoved);
        if (score > bestScore) bestScore = score;
        if (bestScore > alpha) alpha = bestScore;
        if (alpha >= beta) break;
      }
      return bestScore;
    }

    function getBestAIMove(board, aiColor, hasMoved) {
      const moves = getAllMoves(board, aiColor, hasMoved);
      if (moves.length === 0) return null;

      let bestMove = null;
      let bestScore = -Infinity;

      // Prioritize captures and promotions
      moves.sort((a, b) => {
        let scoreA;
        if (a.promotion) {
          scoreA = 800;
        } else if (board[a.toC][a.toR] === EMPTY) {
          scoreA = 0;
        } else {
          scoreA = PIECE_VALUES[board[a.toC][a.toR]];
        }
        let scoreB;
        if (b.promotion) {
          scoreB = 800;
        } else if (board[b.toC][b.toR] === EMPTY) {
          scoreB = 0;
        } else {
          scoreB = PIECE_VALUES[board[b.toC][b.toR]];
        }
        return scoreB - scoreA;
      });

      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = -alphaBeta(
          newBoard,
          AI_DEPTH - 1,
          -Infinity,
          Infinity,
          aiColor,
          false,
          hasMoved
        );
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }

    return { AI_DEPTH, getPositionValue, evaluateBoard, alphaBeta, getBestAIMove };
  }
  return { createGameAI };
});
