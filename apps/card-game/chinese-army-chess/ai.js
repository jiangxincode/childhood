/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(dependencies) {
    const {
      NORMAL_PIECE_NAMES,
      BOMB_NAME,
      MINE_NAME,
      FLAG_NAME,
      TEAM_PIECE_NAMES,
      RANK_MAP,
      isNormalPiece,
      isBomb,
      isMine,
      isFlag,
      isMovable,
      getImagePath,
      getRank,
      inBounds,
      canCapture,
      resolveCombat,
      createGameState,
      getLowestNormalPiece,
      canCaptureFlag,
      getValidMoves,
      getValidCaptures,
      flipCard,
      moveCard,
      captureCard,
      hasAnyLegalAction,
      checkGameOver,
      isMutualDestruction,
      approachFlagMove,
    } = dependencies;

    function pieceValue(piece, _other, _role) {
      if (!piece) return 0;
      if (isFlag(piece.name)) return 100; // flag is the win condition
      if (isBomb(piece.name)) return 7; // bombs trade for any non-flag piece
      if (isMine(piece.name)) return 4; // mines block lanes; only engineers can clear
      if (!isNormalPiece(piece.name)) return 1;
      // Normal pieces: rank 1 (司令) is most valuable, rank 10 (工兵) is mine sweeper
      if (piece.rank === 1) return 12;
      if (piece.rank === 10) return 6; // engineer reversal premium (vs mine)
      return 11 - piece.rank; // rank 2..9 -> value 9..2
    }

    function aiDecide(state, aiTeam, difficulty) {
      const board = state.board;
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");

      // Priority 1: capture flag (highest priority, game-winning move)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const piece = board[y][x];
          if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
          const flagResult = canCaptureFlag(board, x, y, aiTeam);
          if (flagResult) {
            return {
              type: "move",
              from: { x, y },
              to: { x: flagResult.flagX, y: flagResult.flagY },
            };
          }
        }
      }

      // Build deps for the shared smart helpers. The 5x5 board needs a custom
      // inBounds; getValidMoves needs to drop flag targets so smart move scoring
      // does not treat the (possibly unreachable) flag tile as a normal target.
      const deps = {
        canCapture: canCapture,
        isMutualDestruction: isMutualDestruction,
        pieceValue: pieceValue,
        inBounds: inBounds,
        getValidCaptures: function (b, x, y, team) {
          return getValidCaptures(b, x, y, team);
        },
        getValidMoves: function (b, x, y) {
          // Smart move scoring assumes empty target cells. The flag-capture branch
          // already runs above as a preempt; here we filter out flag targets so
          // simulateMove won't write onto the flag tile.
          const moves = [];
          const piece = b[y][x];
          if (!piece || !piece.faceUp) return moves;
          const list = getValidMoves(b, x, y, piece.team);
          for (const t of list) {
            if (t.type !== "capture_flag") moves.push({ x: t.x, y: t.y });
          }
          return moves;
        },
      };

      // Priority 2: capture
      const cap = dependencies.chooseBestCapture(board, aiTeam, deps, 5, level);
      if (cap) return cap;

      // Priority 3: approach the revealed flag with our smallest normal piece.
      // This is the dominant winning condition in chinese-army-chess: legacy AI
      // wins ~96% of its games via flag capture, so the smart AI must actively
      // pursue the flag rather than just react to threats.
      const approachFlag = approachFlagMove(board, aiTeam);
      if (approachFlag) return approachFlag;

      // Priority 4: flip
      const flip = dependencies.chooseBestFlip(board, aiTeam, deps, 5, level);
      if (flip) return flip;

      // Priority 5: move
      const mv = dependencies.chooseBestMove(board, aiTeam, deps, 5, level);
      if (mv) return mv;

      return null;
    }

    return { pieceValue, aiDecide };
  }
  return { createGameAI };
});
