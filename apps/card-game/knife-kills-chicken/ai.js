/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(dependencies) {
    const {
      ROLES,
      BASE_DOMINANCE,
      IMAGE_MAP,
      getImagePath,
      canCapture,
      createGameState,
      getValidMoves,
      getValidCaptures,
      getCarryTargets,
      captureCard,
      carryWeapon,
      hasAnyLegalAction,
      checkGameOver,
      isMutualDestruction,
    } = dependencies;

    function pieceValue(card, _other, _role) {
      if (!card) return 0;
      switch (card.role) {
        case "火箭":
          return 12; // most decisive piece
        case "鸡":
          return 7; // beats wasp + base for knife synergy
        case "马蜂":
          return 6; // beats scaly
        case "老虎":
          return 6; // beats human
        case "人":
          // Carrying knife unlocks attacking chicken -> upgrade
          return card.carrying === "刀" ? 8 : 5;
        case "癞痢":
          // Carrying spear unlocks attacking tiger -> upgrade
          return card.carrying === "枪" ? 8 : 4;
        case "刀":
        case "枪":
          // Standalone weapons cannot move or attack -> low intrinsic value,
          // but high "potential" once an ally walks over.
          return 3;
        default:
          return 1;
      }
    }

    function aiDecide(state, aiTeam) {
      const board = state.board;
      const deps = {
        canCapture: canCapture,
        isMutualDestruction: isMutualDestruction,
        pieceValue: pieceValue,
        getValidCaptures: function (b, x, y, team) {
          return getValidCaptures(b, x, y, team);
        },
        getValidMoves: function (b, x, y) {
          return getValidMoves(b, x, y);
        },
      };

      // Priority 1: capture
      const cap = dependencies.chooseBestCapture(board, aiTeam, deps);
      if (cap) return cap;

      // Priority 2: carry weapon (rank by upgrade value gain)
      const carryPick = pickBestCarry(board, aiTeam);
      if (carryPick) return carryPick;

      // Priority 3: flip
      const flip = dependencies.chooseBestFlip(board, aiTeam, deps);
      if (flip) return flip;

      // Priority 4: move
      const mv = dependencies.chooseBestMove(board, aiTeam, deps);
      if (mv) return mv;

      return null;
    }

    /**
     * Pick the best carry-weapon move. Prefers carriers that are NOT already at
     * risk and prefers picking up the weapon that unlocks the most useful capture
     * next turn (knife on a chicken-rich board, spear on a tiger-rich board).
     * @param {(Card|null)[][]} board
     * @param {string} aiTeam
     * @returns {{type: 'carry', from: {x,y}, to: {x,y}}|null}
     */
    function pickBestCarry(board, aiTeam) {
      const candidates = [];
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const card = board[y][x];
          if (!card || !card.faceUp || card.team !== aiTeam) continue;
          const targets = getCarryTargets(board, x, y, aiTeam);
          for (const t of targets) {
            candidates.push({ from: { x, y }, to: t, carrier: card });
          }
        }
      }
      if (candidates.length === 0) return null;

      // Score each candidate
      for (const c of candidates) {
        // Synergy reward: count visible enemies the upgrade would unlock
        let unlockBonus = 0;
        if (c.carrier.role === "人") {
          // Human + knife -> can hunt chicken
          unlockBonus = countVisibleEnemyRole(board, aiTeam, "鸡") * 2;
        } else if (c.carrier.role === "癞痢") {
          // Scalper + spear -> can hunt tiger
          unlockBonus = countVisibleEnemyRole(board, aiTeam, "老虎") * 2;
        }
        // Penalty if carrier is currently safe but the destination is threatened
        const futureBoard = [];
        for (let y = 0; y < 4; y++) futureBoard.push(board[y].slice());
        futureBoard[c.to.y][c.to.x] = c.carrier;
        futureBoard[c.from.y][c.from.x] = null;
        const futureThreatened = isThreatened(futureBoard, c.to.x, c.to.y, aiTeam);
        c.score = unlockBonus + (futureThreatened ? -3 : 0);
      }
      candidates.sort((a, b) => b.score - a.score);
      return { type: "carry", from: candidates[0].from, to: candidates[0].to };
    }

    function countVisibleEnemyRole(board, aiTeam, role) {
      let n = 0;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const c = board[y][x];
          if (c && c.faceUp && c.team !== aiTeam && c.role === role) n++;
        }
      }
      return n;
    }

    function isThreatened(board, x, y, ownTeam) {
      const me = board[y][x];
      if (!me || !me.faceUp) return false;
      for (const { dx, dy } of dependencies.DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;
        if (!dependencies.inBounds(nx, ny)) continue;
        const enemy = board[ny][nx];
        if (!enemy || !enemy.faceUp || enemy.team === ownTeam) continue;
        if (canCapture(enemy, me)) return true;
      }
      return false;
    }

    return { pieceValue, aiDecide, pickBestCarry, countVisibleEnemyRole, isThreatened };
  }
  return { createGameAI };
});
