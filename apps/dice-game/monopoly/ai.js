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

    function npcDecision(state, playerIndex, eventType, data) {
      const player = state.players[playerIndex];
      if (eventType === "buyOffer") {
        return player.money - data.value > 3000;
      }
      if (eventType === "upgradeOffer") {
        return player.money - data.cost > 2000;
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
