/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(dependencies) {
    const {
      ANIMAL_NAMES,
      RANK_MAP,
      getImagePath,
      getRank,
      canCapture,
      isMutualDestruction,
      createGameState,
      getValidCaptures,
      captureCard,
      hasAnyLegalAction,
      checkGameOver,
    } = dependencies;

    function pieceValue(rank) {
      if (rank === 1) return 10;
      if (rank === 8) return 5;
      return 9 - rank;
    }

    function aiDecide(state, aiTeam) {
      return dependencies.smartAiDecide(state, aiTeam, {
        canCapture: canCapture,
        isMutualDestruction: isMutualDestruction,
        pieceValue: pieceValue,
        getValidCaptures: getValidCaptures,
        getValidMoves: dependencies.getValidMoves,
      });
    }

    return { pieceValue, aiDecide };
  }
  return { createGameAI };
});
