/* eslint-disable no-var */
// ============================================================
// 散窑 (San Yao) - Mancala-style distribution game
// 2 players, 2 rows of 5 pits + 2 stores, 40 stones total
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";

var PITS_COUNT = 10;
var COLUMNS = 5;
var STORE_A = 10;
var STORE_B = 11;
var TOTAL_PITS = 12;
var INITIAL_STONES = 4;
var AI_DEPTH = 3;
var ANIMATION_DELAY = 200;

// ============================================================
// Core game logic
// ============================================================

function createGameState(mode) {
  var pits = [];
  for (var i = 0; i < TOTAL_PITS; i++) {
    pits.push(i < PITS_COUNT ? INITIAL_STONES : 0);
  }
  return {
    mode: mode,
    pits: pits,
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    extraTurn: false,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    scoreA: 0,
    scoreB: 0,
  };
}

function getStore(player) {
  return player === PLAYER_A ? STORE_A : STORE_B;
}

function getPlayerPits(player) {
  var start = player === PLAYER_A ? 0 : COLUMNS;
  var end = start + COLUMNS;
  var result = [];
  for (var i = start; i < end; i++) {
    result.push(i);
  }
  return result;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

function getOppositePit(pitIndex) {
  if (pitIndex >= PITS_COUNT) return -1;
  return PITS_COUNT - 1 - pitIndex;
}

function isValidMove(state, pitIndex) {
  if (state.gameOver) return false;
  if (pitIndex < 0 || pitIndex >= PITS_COUNT) return false;
  var ownPits = getPlayerPits(state.currentPlayer);
  if (ownPits.indexOf(pitIndex) === -1) return false;
  return state.pits[pitIndex] > 0;
}

function getValidMoves(state) {
  var moves = [];
  var ownPits = getPlayerPits(state.currentPlayer);
  for (var i = 0; i < ownPits.length; i++) {
    if (state.pits[ownPits[i]] > 0) {
      moves.push(ownPits[i]);
    }
  }
  return moves;
}

function sowStones(state, pitIndex) {
  var stones = state.pits[pitIndex];
  state.pits[pitIndex] = 0;
  var ownStore = getStore(state.currentPlayer);
  var opponentStore = getStore(getOpponent(state.currentPlayer));
  var currentIndex = pitIndex;
  var lastStoneIndex = -1;

  for (var i = 0; i < stones; i++) {
    currentIndex = (currentIndex + 1) % TOTAL_PITS;
    if (currentIndex === opponentStore) {
      currentIndex = (currentIndex + 1) % TOTAL_PITS;
    }
    state.pits[currentIndex]++;
    lastStoneIndex = currentIndex;
  }

  state.extraTurn = lastStoneIndex === ownStore;
  var ownPits = getPlayerPits(state.currentPlayer);
  if (
    lastStoneIndex >= ownPits[0] &&
    lastStoneIndex <= ownPits[ownPits.length - 1] &&
    state.pits[lastStoneIndex] === 1
  ) {
    var opposite = getOppositePit(lastStoneIndex);
    if (opposite >= 0 && state.pits[opposite] > 0) {
      state.pits[ownStore] += 1 + state.pits[opposite];
      state.pits[lastStoneIndex] = 0;
      state.pits[opposite] = 0;
    }
  }

  return state;
}

function isGameOver(state) {
  var ownPitsA = getPlayerPits(PLAYER_A);
  var ownPitsB = getPlayerPits(PLAYER_B);
  var emptyA = true;
  var emptyB = true;
  for (var i = 0; i < COLUMNS; i++) {
    if (state.pits[ownPitsA[i]] > 0) emptyA = false;
    if (state.pits[ownPitsB[i]] > 0) emptyB = false;
  }
  return emptyA || emptyB;
}

function endGame(state) {
  var ownPitsA = getPlayerPits(PLAYER_A);
  var ownPitsB = getPlayerPits(PLAYER_B);
  for (var i = 0; i < COLUMNS; i++) {
    state.pits[STORE_A] += state.pits[ownPitsA[i]];
    state.pits[ownPitsA[i]] = 0;
    state.pits[STORE_B] += state.pits[ownPitsB[i]];
    state.pits[ownPitsB[i]] = 0;
  }
  state.scoreA = state.pits[STORE_A];
  state.scoreB = state.pits[STORE_B];
  state.gameOver = true;
  if (state.scoreA > state.scoreB) {
    state.winner = PLAYER_A;
  } else if (state.scoreB > state.scoreA) {
    state.winner = PLAYER_B;
  } else {
    state.winner = null;
  }
  return state;
}

// ============================================================
// AI - minimax with alpha-beta pruning
// ============================================================

function evaluateState(pits, player) {
  var ownStore = getStore(player);
  var opponentStore = getStore(getOpponent(player));
  var score = pits[ownStore] - pits[opponentStore];

  var ownPits = getPlayerPits(player);
  var oppPits = getPlayerPits(getOpponent(player));
  for (var i = 0; i < COLUMNS; i++) {
    if (pits[ownPits[i]] === 0 && pits[oppPits[i]] > 0) {
      score += 3;
    }
  }
  return score;
}

function simulateMove(pits, pitIndex, player) {
  var simPits = pits.slice();
  var stones = simPits[pitIndex];
  simPits[pitIndex] = 0;
  var ownStore = getStore(player);
  var opponentStore = getStore(getOpponent(player));
  var currentIndex = pitIndex;
  var lastStoneIndex = -1;

  for (var i = 0; i < stones; i++) {
    currentIndex = (currentIndex + 1) % TOTAL_PITS;
    if (currentIndex === opponentStore) {
      currentIndex = (currentIndex + 1) % TOTAL_PITS;
    }
    simPits[currentIndex]++;
    lastStoneIndex = currentIndex;
  }

  var extraTurn = lastStoneIndex === ownStore;

  if (!extraTurn) {
    var ownPits = getPlayerPits(player);
    if (
      lastStoneIndex >= ownPits[0] &&
      lastStoneIndex <= ownPits[ownPits.length - 1] &&
      simPits[lastStoneIndex] === 1
    ) {
      var opposite = getOppositePit(lastStoneIndex);
      if (opposite >= 0 && simPits[opposite] > 0) {
        simPits[ownStore] += 1 + simPits[opposite];
        simPits[lastStoneIndex] = 0;
        simPits[opposite] = 0;
      }
    }
  }

  return { pits: simPits, extraTurn: extraTurn };
}

function isSideEmpty(pits, player) {
  var ownPits = getPlayerPits(player);
  for (var i = 0; i < COLUMNS; i++) {
    if (pits[ownPits[i]] > 0) return false;
  }
  return true;
}

function minimax(pits, depth, isMaximizing, aiPlayer, alpha, beta) {
  if (depth === 0) {
    return evaluateState(pits, aiPlayer);
  }

  var currentPlayer = isMaximizing ? aiPlayer : getOpponent(aiPlayer);
  var ownPits = getPlayerPits(currentPlayer);
  var moves = [];
  for (var i = 0; i < COLUMNS; i++) {
    if (pits[ownPits[i]] > 0) {
      moves.push(ownPits[i]);
    }
  }

  if (moves.length === 0 || isSideEmpty(pits, PLAYER_A) || isSideEmpty(pits, PLAYER_B)) {
    return evaluateState(pits, aiPlayer);
  }

  if (isMaximizing) {
    var maxEval = -Infinity;
    for (var j = 0; j < moves.length; j++) {
      var result = simulateMove(pits, moves[j], currentPlayer);
      var evalScore;
      if (result.extraTurn) {
        evalScore = minimax(result.pits, depth, true, aiPlayer, alpha, beta);
      } else {
        evalScore = minimax(result.pits, depth - 1, false, aiPlayer, alpha, beta);
      }
      if (evalScore > maxEval) maxEval = evalScore;
      if (evalScore > alpha) alpha = evalScore;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    var minEval = Infinity;
    for (var k = 0; k < moves.length; k++) {
      var result2 = simulateMove(pits, moves[k], currentPlayer);
      var evalScore2;
      if (result2.extraTurn) {
        evalScore2 = minimax(result2.pits, depth, false, aiPlayer, alpha, beta);
      } else {
        evalScore2 = minimax(result2.pits, depth - 1, true, aiPlayer, alpha, beta);
      }
      if (evalScore2 < minEval) minEval = evalScore2;
      if (evalScore2 < beta) beta = evalScore2;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(state) {
  var moves = getValidMoves(state);
  if (moves.length === 0) return -1;

  var aiPlayer = state.aiTeam;
  var bestScore = -Infinity;
  var bestMove = moves[0];
  var alpha = -Infinity;
  var beta = Infinity;

  for (var i = 0; i < moves.length; i++) {
    var result = simulateMove(state.pits, moves[i], aiPlayer);
    var score;
    if (result.extraTurn) {
      score = minimax(result.pits, AI_DEPTH, true, aiPlayer, alpha, beta);
    } else {
      score = minimax(result.pits, AI_DEPTH - 1, false, aiPlayer, alpha, beta);
    }
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[i];
    }
    if (score > alpha) alpha = score;
  }

  return bestMove;
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    PITS_COUNT: PITS_COUNT,
    COLUMNS: COLUMNS,
    STORE_A: STORE_A,
    STORE_B: STORE_B,
    TOTAL_PITS: TOTAL_PITS,
    INITIAL_STONES: INITIAL_STONES,
    createGameState: createGameState,
    getStore: getStore,
    getPlayerPits: getPlayerPits,
    getOppositePit: getOppositePit,
    isValidMove: isValidMove,
    getValidMoves: getValidMoves,
    sowStones: sowStones,
    isGameOver: isGameOver,
    endGame: endGame,
    evaluateState: evaluateState,
    simulateMove: simulateMove,
    isSideEmpty: isSideEmpty,
    minimax: minimax,
    getBestAIMove: getBestAIMove,
    getOpponent: getOpponent,
  };
}

// ============================================================
// Browser UI
// ============================================================
if (typeof document !== "undefined") {
  var gameState = null;
  var isAnimating = false;

  function showMessage(text, type) {
    var msgEl = document.getElementById("message");
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = type || "info";
    msgEl.style.display = "block";
    setTimeout(() => {
      msgEl.style.display = "none";
    }, 2000);
  }

  function renderBoard() {
    if (!gameState) return;
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    // Row B (opponent) - stores B pits in reverse for display
    var rowB = document.createElement("div");
    rowB.className = "board-row";
    var pitsB = getPlayerPits(PLAYER_B);
    for (var i = COLUMNS - 1; i >= 0; i--) {
      var pitB = createPitElement(pitsB[i]);
      rowB.appendChild(pitB);
    }

    // Row A (player)
    var rowA = document.createElement("div");
    rowA.className = "board-row";
    var pitsA = getPlayerPits(PLAYER_A);
    for (var j = 0; j < COLUMNS; j++) {
      var pitA = createPitElement(pitsA[j]);
      rowA.appendChild(pitA);
    }

    var storeAEl = createStoreElement(STORE_A, PLAYER_A);
    var storeBEl = createStoreElement(STORE_B, PLAYER_B);

    boardEl.appendChild(storeAEl);
    boardEl.appendChild(rowB);
    boardEl.appendChild(rowA);
    boardEl.appendChild(storeBEl);

    updateStatus();
  }

  function createPitElement(pitIndex) {
    var pit = document.createElement("div");
    pit.className = "pit";
    pit.dataset.index = pitIndex;
    var count = gameState.pits[pitIndex];
    var displayText = count > 0 ? String(count) : "";

    if (count > 0 && count <= 12) {
      var stonesContainer = document.createElement("div");
      stonesContainer.className = "stones-container";
      for (var s = 0; s < count; s++) {
        var stone = document.createElement("div");
        stone.className = "stone";
        stonesContainer.appendChild(stone);
      }
      pit.appendChild(stonesContainer);
      var countLabel = document.createElement("div");
      countLabel.className = "pit-count";
      countLabel.textContent = displayText;
      pit.appendChild(countLabel);
    } else {
      var countOnly = document.createElement("div");
      countOnly.className = "pit-count-big";
      countOnly.textContent = displayText;
      pit.appendChild(countOnly);
    }

    var isValid = isValidMove(gameState, pitIndex);
    if (isValid && !isAnimating) {
      pit.classList.add("pit-clickable");
    }

    pit.addEventListener("click", () => {
      handlePitClick(pitIndex);
    });

    return pit;
  }

  function createStoreElement(storeIndex, player) {
    var store = document.createElement("div");
    store.className = "store store-" + player.toLowerCase();
    var label = document.createElement("div");
    label.className = "store-label";
    label.textContent = player === PLAYER_A ? "A" : "B";
    var count = document.createElement("div");
    count.className = "store-count";
    count.textContent = String(gameState.pits[storeIndex]);
    var stonesContainer = document.createElement("div");
    stonesContainer.className = "store-stones";
    for (var s = 0; s < Math.min(gameState.pits[storeIndex], 20); s++) {
      var stone = document.createElement("div");
      stone.className = "stone stone-" + player.toLowerCase();
      stonesContainer.appendChild(stone);
    }
    store.appendChild(label);
    store.appendChild(stonesContainer);
    store.appendChild(count);
    return store;
  }

  function updateStatus() {
    var playerEl = document.getElementById("current-player");
    var turnEl = document.getElementById("turn-count");
    if (playerEl) {
      playerEl.textContent = gameState.currentPlayer;
      playerEl.className =
        "team-indicator " + (gameState.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    }
    if (turnEl) {
      turnEl.textContent = String(gameState.turnCount);
    }
  }

  function animateSowing(pitIndex, callback) {
    var stones = gameState.pits[pitIndex];
    gameState.pits[pitIndex] = 0;
    var opponentStore = getStore(getOpponent(gameState.currentPlayer));
    var path = [];
    var currentIndex = pitIndex;

    for (var i = 0; i < stones; i++) {
      currentIndex = (currentIndex + 1) % TOTAL_PITS;
      if (currentIndex === opponentStore) {
        currentIndex = (currentIndex + 1) % TOTAL_PITS;
      }
      path.push(currentIndex);
    }

    isAnimating = true;
    renderBoard();
    highlightPath(path, 0, path.length, () => {
      isAnimating = false;
      callback(path[path.length - 1]);
    });
  }

  function highlightPath(path, index, total, callback) {
    if (index >= total) {
      callback();
      return;
    }

    gameState.pits[path[index]]++;
    renderBoard();

    var pitEl = document.querySelector('[data-index="' + path[index] + '"]');
    if (pitEl) {
      pitEl.classList.add("pit-highlight");
    }

    setTimeout(() => {
      if (pitEl) {
        pitEl.classList.remove("pit-highlight");
      }
      highlightPath(path, index + 1, total, callback);
    }, ANIMATION_DELAY);
  }

  function executeMove(pitIndex, callback) {
    var lastStoneIndex = sowStones(gameState, pitIndex);

    if (lastStoneIndex === -1) {
      renderBoard();
      if (callback) callback();
      return;
    }

    var captured = false;
    var ownPits = getPlayerPits(gameState.currentPlayer);
    if (
      !gameState.extraTurn &&
      lastStoneIndex >= ownPits[0] &&
      lastStoneIndex <= ownPits[ownPits.length - 1] &&
      gameState.pits[lastStoneIndex] === 1
    ) {
      var opposite = getOppositePit(lastStoneIndex);
      if (opposite >= 0 && gameState.pits[opposite] > 0) {
        captured = true;
      }
    }

    renderBoard();

    if (captured) {
      var ownStore = getStore(gameState.currentPlayer);
      var oppositePit = getOppositePit(lastStoneIndex);
      var captureAmount = 1 + gameState.pits[oppositePit];
      gameState.pits[ownStore] += captureAmount;
      gameState.pits[lastStoneIndex] = 0;
      gameState.pits[oppositePit] = 0;
      var capturedMsg = gameState.currentPlayer === PLAYER_A ? "A" : "B";
      showMessage(capturedMsg + " captured " + String(captureAmount) + " stones!", "info");
    }

    renderBoard();

    if (gameState.extraTurn && !gameState.gameOver) {
      showMessage(
        (gameState.currentPlayer === PLAYER_A ? "A" : "B") + " gets another turn!",
        "info"
      );
    }

    if (isGameOver(gameState)) {
      endGame(gameState);
      renderBoard();
      showGameOver();
    }

    if (callback) callback();
  }

  function handlePitClick(pitIndex) {
    if (!gameState || gameState.gameOver || isAnimating) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (!isValidMove(gameState, pitIndex)) {
      showMessage("Invalid move!", "error");
      return;
    }

    gameState.turnCount++;
    animateSowing(pitIndex, () => {
      executeMove(pitIndex, () => {
        if (!gameState.gameOver && !gameState.extraTurn) {
          gameState.currentPlayer = getOpponent(gameState.currentPlayer);
        }
        renderBoard();
        if (
          !gameState.gameOver &&
          gameState.mode === "pve" &&
          gameState.currentPlayer === gameState.aiTeam
        ) {
          triggerAI();
        }
      });
    });
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderBoard();
    setTimeout(() => {
      var aiMove = getBestAIMove(gameState);
      gameState.aiThinking = false;

      if (aiMove === -1) {
        gameState.currentPlayer = getOpponent(gameState.currentPlayer);
        renderBoard();
        return;
      }

      gameState.turnCount++;
      var stones = gameState.pits[aiMove];
      gameState.pits[aiMove] = 0;
      var ownStore = getStore(gameState.currentPlayer);
      var opponentStore = getStore(getOpponent(gameState.currentPlayer));
      var currentIndex = aiMove;
      var lastStoneIndex = -1;

      for (var i = 0; i < stones; i++) {
        currentIndex = (currentIndex + 1) % TOTAL_PITS;
        if (currentIndex === opponentStore) {
          currentIndex = (currentIndex + 1) % TOTAL_PITS;
        }
        gameState.pits[currentIndex]++;
        lastStoneIndex = currentIndex;
      }

      gameState.extraTurn = lastStoneIndex === ownStore;

      if (!gameState.extraTurn) {
        var ownPits = getPlayerPits(gameState.currentPlayer);
        if (
          lastStoneIndex >= ownPits[0] &&
          lastStoneIndex <= ownPits[ownPits.length - 1] &&
          gameState.pits[lastStoneIndex] === 1
        ) {
          var opposite = getOppositePit(lastStoneIndex);
          if (opposite >= 0 && gameState.pits[opposite] > 0) {
            gameState.pits[ownStore] += 1 + gameState.pits[opposite];
            gameState.pits[lastStoneIndex] = 0;
            gameState.pits[opposite] = 0;
            var capturedMsg = gameState.currentPlayer === PLAYER_A ? "A" : "B";
            showMessage(
              capturedMsg + " captured " + String(1 + gameState.pits[opposite]) + " stones!",
              "info"
            );
          }
        }
      }

      renderBoard();

      if (gameState.extraTurn && !gameState.gameOver) {
        showMessage(
          (gameState.currentPlayer === PLAYER_A ? "A" : "B") + " gets another turn!",
          "info"
        );
      }

      if (isGameOver(gameState)) {
        endGame(gameState);
        renderBoard();
        showGameOver();
        return;
      }

      if (!gameState.extraTurn) {
        gameState.currentPlayer = getOpponent(gameState.currentPlayer);
      }
      renderBoard();
    }, 800);
  }

  function showGameOver() {
    var winnerText;
    if (gameState.winner === PLAYER_A) {
      winnerText = "A wins! (" + String(gameState.scoreA) + " - " + String(gameState.scoreB) + ")";
    } else if (gameState.winner === PLAYER_B) {
      winnerText = "B wins! (" + String(gameState.scoreB) + " - " + String(gameState.scoreA) + ")";
    } else {
      winnerText = "Draw! (" + String(gameState.scoreA) + " - " + String(gameState.scoreB) + ")";
    }
    document.getElementById("winner-text").textContent = winnerText;
    document.getElementById("game-over").style.display = "flex";
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      gameState.playerTeam = PLAYER_A;
      gameState.aiTeam = PLAYER_B;
    }
    isAnimating = false;
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("game-over").style.display = "none";
    renderBoard();
    if (mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function handleRPSChoice(player, choice) {
    if (player === "human") {
      var aiChoices = ["rock", "scissors", "paper"];
      var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
      var result = judgeRPS(choice, aiChoice);
      var resultDiv = document.getElementById("rps-result");
      if (result === 1) {
        resultDiv.innerHTML =
          "<p>You played " +
          getRPSName(choice) +
          ", AI played " +
          getRPSName(aiChoice) +
          ". You go first!</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_A);
        }, 1500);
      } else if (result === -1) {
        resultDiv.innerHTML =
          "<p>You played " +
          getRPSName(choice) +
          ", AI played " +
          getRPSName(aiChoice) +
          ". AI goes first!</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_B);
        }, 1500);
      } else {
        resultDiv.innerHTML = "<p>Draw! Try again</p>";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-pvp").addEventListener("click", () => {
      startGame("pvp", PLAYER_A);
    });
    document.getElementById("btn-pve").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
      document.getElementById("rps-pve").style.display = "block";
    });
    document.querySelectorAll("#rps-pve .btn-rps").forEach((btn) => {
      btn.addEventListener("click", function () {
        handleRPSChoice("human", this.dataset.choice);
      });
    });
    document.getElementById("btn-restart").addEventListener("click", () => {
      document.getElementById("game-over").style.display = "none";
      document.getElementById("mode-selection").style.display = "flex";
    });
  });
}
