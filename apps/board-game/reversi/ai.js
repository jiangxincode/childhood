/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      BOARD_SIZE,
      PLAYER_BLACK,
      PLAYER_WHITE,
      DIRECTIONS,
      inBounds,
      getOpponent,
      checkDirection,
      isValidMove,
      getValidMoves,
      makeMove,
      countPieces,
      isGameOver,
      getWinner,
      createGameState,
      aiTurn,
      gameState,
      networkProtocol,
      networkConnection,
      roomUI,
      localPlayerRole,
      localTeam,
      remoteTeam,
      initBoard,
      renderGame,
      updateMessage,
      showGameOver,
      handleCellClick,
      startGame,
      restartGame,
      cleanupNetwork,
      setupNetworkHandlers,
      startOnlineRPS,
      handleOnlineRPSChoice,
      handleOnlineRPSReceived,
      checkOnlineRPSComplete,
      handleOnlineRPSResult,
      startOnlineGame,
      applyRemoteAction,
      handleDisconnect,
      rpsChoices,
      handleRPSChoice,
    } = deps;

    function getBestAIMove(board, aiPlayer) {
      const validMoves = getValidMoves(board, aiPlayer);
      if (validMoves.length === 0) return null;

      // Select position that flips the most pieces
      let bestMove = validMoves[0];
      for (const move of validMoves) {
        if (move.flipped.length > bestMove.flipped.length) {
          bestMove = move;
        }
      }

      return { x: bestMove.x, y: bestMove.y };
    }

    return { getBestAIMove };
  }
  return { createGameAI };
});
