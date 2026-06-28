/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      BOARD_DATA,
      FATE_CARDS,
      COLOR_SCHEME,
      PLAYER_COLORS,
      PLAYER_COLOR_NAMES,
      BOARD_SIZE,
      createGameState,
      generateNum,
      rollDice,
      movePlayer,
      calculateRent,
      handleLanding,
      buyProperty,
      upgradeProperty,
      checkBankrupt,
      confiscateProperties,
      checkGameOver,
    } = deps;

    function npcDecision(state, playerIndex, eventType, data, difficulty) {
      const player = state.players[playerIndex];
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      const reserves = {
        easy: { buy: 6000, upgrade: 5000 },
        normal: { buy: 3000, upgrade: 2000 },
        hard: { buy: 1800, upgrade: 1200 },
        master: { buy: 800, upgrade: 500 },
      }[level] || { buy: 3000, upgrade: 2000 };
      if (eventType === "buyOffer") {
        return player.money - data.value > reserves.buy;
      }
      if (eventType === "upgradeOffer") {
        return player.money - data.cost > reserves.upgrade;
      }
      return false;
    }

    function advanceTurn(state) {
      const total = state.players.length;
      let next = state.currentPlayer;
      let safety = 0;
      while (safety < total + 1) {
        next = (next + 1) % total;
        if (next === 0) state.round++;
        const p = state.players[next];
        if (p.state === "active") {
          if (p.stop) {
            p.stop--;
            safety++;
            continue;
          }
          state.currentPlayer = next;
          return next;
        }
        safety++;
      }
      return -1;
    }

    return { npcDecision, advanceTurn };
  }
  return { createGameAI };
});
