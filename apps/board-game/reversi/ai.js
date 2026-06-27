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

    function getBestAIMove(board, aiPlayer, difficulty) {
      const validMoves = getValidMoves(board, aiPlayer);
      if (validMoves.length === 0) return null;
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      if (level === "easy") {
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        return { x: move.x, y: move.y };
      }

      let bestMove = validMoves[0];
      let bestScore = -Infinity;
      for (const move of validMoves) {
        let score = move.flipped.length;
        if (level !== "normal") {
          const isEdge =
            move.x === 0 || move.y === 0 || move.x === BOARD_SIZE - 1 || move.y === BOARD_SIZE - 1;
          const isCorner =
            (move.x === 0 || move.x === BOARD_SIZE - 1) &&
            (move.y === 0 || move.y === BOARD_SIZE - 1);
          score += isCorner ? 100 : isEdge ? 8 : 0;
        }
        if (level === "master") {
          const nextBoard = board.map((row) => row.slice());
          makeMove(nextBoard, move.x, move.y, aiPlayer);
          score -= getValidMoves(nextBoard, getOpponent(aiPlayer)).length * 2;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      return { x: bestMove.x, y: bestMove.y };
    }

    return { getBestAIMove };
  }
  return { createGameAI };
});
