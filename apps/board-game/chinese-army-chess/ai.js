/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      NORMAL_PIECE_NAMES,
      BOMB_NAME,
      MINE_NAME,
      FLAG_NAME,
      RANK_MAP,
      PIECE_COUNTS,
      COLS,
      ROWS,
      RED,
      BLUE,
      STATE_FACE_UP,
      STATE_FACE_DOWN,
      CAMPS,
      BASE_CAMPS,
      H_RAILWAYS,
      V_RAILWAY_LEFT_RIGHT,
      V_RAILWAY_MIDDLE,
      isNormalPiece,
      isBomb,
      isMine,
      isFlag,
      isMovable,
      getRank,
      inBounds,
      isCamp,
      isBaseCamp,
      getBoardRow,
      hasDiagonalEligibility,
      isOnHRailway,
      isOnVRailway,
      isOnRailway,
      areOnSameRailway,
      getImagePath,
      canCapture,
      resolveCombat,
      createGameState,
      placePiecesForTeam,
      placePiecesRandom,
      shuffle,
      createSeededRandom,
      shuffleSeeded,
      getValidMoves,
      getNormalMoves,
      getEngineerMoves,
      getDiagonalMoves,
      moveCard,
      flipPiece,
      revealFlag,
      addCaptured,
      hasAnyLegalAction,
      checkGameOver,
    } = deps;

    function aiDecide(state, aiTeam) {
      const board = state.board;
      const gameType = state.gameType;

      // Flip mode: prioritize flipping pieces
      if (gameType === "flip") {
        const faceDown = [];
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const p = board[y][x];
            if (p && p.state === STATE_FACE_DOWN) {
              faceDown.push({ x: x, y: y });
            }
          }
        }
        if (faceDown.length > 0) {
          // Prioritize flipping near own pieces, or flip randomly
          const pick = faceDown[Math.floor(Math.random() * faceDown.length)];
          return { type: "flip", from: { x: pick.x, y: pick.y }, to: { x: pick.x, y: pick.y } };
        }
      }

      // Priority 1: engineer captures flag
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const piece = board[y][x];
          if (!piece || piece.team !== aiTeam || piece.name !== "工兵") continue;
          if (piece.state === STATE_FACE_DOWN) continue;
          const moves = getValidMoves(board, x, y, aiTeam, gameType);
          for (const m of moves) {
            if (m.type === "capture_flag") {
              return { type: "move", from: { x: x, y: y }, to: { x: m.x, y: m.y } };
            }
          }
        }
      }

      // Priority 2: favorable captures
      let bestCapture = null;
      let bestScore = -999;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const piece = board[y][x];
          if (!piece || piece.team !== aiTeam || !isMovable(piece)) continue;
          if (piece.state === STATE_FACE_DOWN) continue;
          const moves = getValidMoves(board, x, y, aiTeam, gameType);
          for (const m of moves) {
            if (m.type !== "capture") continue;
            const target = board[m.y][m.x];
            if (target.state === STATE_FACE_DOWN) continue;
            const result = resolveCombat(piece, target);
            let score = 0;
            if (result === "attacker_wins") {
              score = (target.rank !== null ? target.rank : 10) + 5;
            } else if (result === "mutual_destruction") {
              score =
                (target.rank !== null ? target.rank : 10) - (piece.rank !== null ? piece.rank : 10);
            }
            if (score > bestScore) {
              bestScore = score;
              bestCapture = { from: { x: x, y: y }, to: { x: m.x, y: m.y } };
            }
          }
        }
      }
      if (bestCapture && bestScore > 0) {
        return { type: "move", from: bestCapture.from, to: bestCapture.to };
      }

      // Priority 3: normal moves
      const allMoves = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const piece = board[y][x];
          if (!piece || piece.team !== aiTeam || !isMovable(piece)) continue;
          if (piece.state === STATE_FACE_DOWN) continue;
          const moves = getValidMoves(board, x, y, aiTeam, gameType);
          for (const m of moves) {
            if (m.type === "move") {
              allMoves.push({ from: { x: x, y: y }, to: { x: m.x, y: m.y } });
            }
          }
        }
      }
      // Railway moves preferred
      const railwayMoves = [];
      const normalMoves = [];
      for (const m of allMoves) {
        if (isOnRailway(m.from.x, m.from.y)) {
          railwayMoves.push(m);
        } else {
          normalMoves.push(m);
        }
      }
      let pool = railwayMoves.length > 0 ? railwayMoves : normalMoves;
      if (pool.length === 0) pool = allMoves;
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return { type: "move", from: pick.from, to: pick.to };
      }

      // Priority 4: mutual destruction captures
      if (bestCapture) {
        return { type: "move", from: bestCapture.from, to: bestCapture.to };
      }

      return null;
    }

    return { aiDecide };
  }
  return { createGameAI };
});
