/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(dependencies) {
    const {
      DRAGON_PIECES,
      TIGER_PIECES,
      RANK_MAP,
      IMAGE_MAP,
      TEAM_MAP,
      getImagePath,
      getTeam,
      getRank,
      canCapture,
      isMutualDestruction,
      createGameState,
      getValidCaptures,
      flipCard,
      moveCard,
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
        getValidCaptures: function (board, x, y, team) {
          return getValidCaptures(board, x, y, team);
        },
        getValidMoves: dependencies.getValidMoves,
      });
    }

    return { pieceValue, aiDecide };
  }
  return { createGameAI };
});
