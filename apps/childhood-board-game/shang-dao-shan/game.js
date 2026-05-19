/* eslint-disable no-var */
// ============================================================
// Shang Dao Shan (上刀山) - Climb the Blade Mountain
// 2 players, linear track 0-19, peak at 10, race to peak and back
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var TRACK_LENGTH = 20; // positions 0-19
var PEAK_POSITION = 10; // the peak in the middle of the track

// ============================================================
// Core Game Logic
// ============================================================

function createGameState(mode) {
  return {
    mode: mode,
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    posA: 0,
    posB: 0,
    phaseA: "forward", // "forward" or "backward"
    phaseB: "forward",
    turnCount: 0,
    gameOver: false,
    winner: null,
    lastRoll: 0,
    extraTurn: false,
    aiThinking: false,
    scoreA: 0,
    scoreB: 0,
    moveLog: [],
  };
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

function getPlayerPos(state, player) {
  return player === PLAYER_A ? state.posA : state.posB;
}

function setPlayerPos(state, player, pos) {
  if (player === PLAYER_A) {
    state.posA = pos;
  } else {
    state.posB = pos;
  }
}

function getPlayerPhase(state, player) {
  return player === PLAYER_A ? state.phaseA : state.phaseB;
}

function setPlayerPhase(state, player, phase) {
  if (player === PLAYER_A) {
    state.phaseA = phase;
  } else {
    state.phaseB = phase;
  }
}

function movePiece(state, player) {
  var die = rollDie();
  var pos = getPlayerPos(state, player);
  var phase = getPlayerPhase(state, player);
  var bounced = false;

  if (phase === "forward") {
    pos += die;
    if (pos >= PEAK_POSITION) {
      // Bounce back from peak
      pos = PEAK_POSITION - (pos - PEAK_POSITION);
      phase = "backward";
      bounced = true;
    }
  } else {
    pos -= die;
    if (pos < 0) {
      // Overshoot: clamp to 0
      pos = 0;
    }
  }

  // Check landing on opponent (not at start position 0)
  var opponent = getOpponent(player);
  var opponentPos = getPlayerPos(state, opponent);
  if (pos === opponentPos && pos !== 0) {
    // Send opponent back to start
    setPlayerPos(state, opponent, 0);
    setPlayerPhase(state, opponent, "forward");
    state.moveLog.push(
      player +
        " landed on " +
        opponent +
        " at position " +
        pos +
        "! " +
        opponent +
        " sent back to start."
    );
  }

  setPlayerPos(state, player, pos);
  setPlayerPhase(state, player, phase);
  state.lastRoll = die;

  // Check win: player reached position 0 while in backward phase
  var won = false;
  if (phase === "backward" && pos === 0) {
    state.gameOver = true;
    state.winner = player;
    if (player === PLAYER_A) state.scoreA++;
    else state.scoreB++;
    won = true;
  }

  // Extra turn on rolling 6
  if (die === 6) {
    state.extraTurn = true;
  } else {
    state.extraTurn = false;
  }

  return {
    die: die,
    pos: pos,
    phase: phase,
    bounced: bounced,
    won: won,
  };
}

// AI: just rolls the die automatically (no strategy in dice-based game)
function getBestAIMove(state) {
  return { type: "roll" };
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    TRACK_LENGTH: TRACK_LENGTH,
    PEAK_POSITION: PEAK_POSITION,
    createGameState: createGameState,
    rollDie: rollDie,
    movePiece: movePiece,
    checkWin: function (state) {
      return state.gameOver ? state.winner : null;
    },
    getOpponent: getOpponent,
    getPlayerPos: getPlayerPos,
    setPlayerPos: setPlayerPos,
    getPlayerPhase: getPlayerPhase,
    setPlayerPhase: setPlayerPhase,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI
// ============================================================
if (typeof document !== "undefined") {
  var state = null;
  var isProcessing = false;

  // Dice face patterns (dots for 1-6)
  var DICE_DOTS = {
    1: [[1, 1]],
    2: [
      [0, 2],
      [2, 0],
    ],
    3: [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
    4: [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ],
    5: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
    ],
    6: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 2],
    ],
  };

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    // Create track container
    var trackContainer = document.createElement("div");
    trackContainer.className = "track-container";

    // Create the linear track with 20 positions
    var track = document.createElement("div");
    track.className = "track";

    for (var i = 0; i < TRACK_LENGTH; i++) {
      var cell = document.createElement("div");
      cell.className = "track-cell";
      cell.dataset.pos = i;

      if (i === 0) {
        cell.classList.add("cell-start");
      } else if (i === PEAK_POSITION) {
        cell.classList.add("cell-peak");
      }

      var label = document.createElement("span");
      label.className = "cell-label";
      label.textContent = i;
      cell.appendChild(label);

      // Player piece indicators
      var pieceA = document.createElement("div");
      pieceA.className = "piece piece-a";
      pieceA.dataset.player = "A";
      pieceA.style.display = "none";
      cell.appendChild(pieceA);

      var pieceB = document.createElement("div");
      pieceB.className = "piece piece-b";
      pieceB.dataset.player = "B";
      pieceB.style.display = "none";
      cell.appendChild(pieceB);

      track.appendChild(cell);
    }

    trackContainer.appendChild(track);

    // Arrow indicating forward direction
    var arrowUp = document.createElement("div");
    arrowUp.className = "direction-arrow arrow-up";
    arrowUp.textContent = "UP ↑";
    trackContainer.appendChild(arrowUp);

    var arrowDown = document.createElement("div");
    arrowDown.className = "direction-arrow arrow-down";
    arrowDown.textContent = "DOWN ↓";
    trackContainer.appendChild(arrowDown);

    boardEl.appendChild(trackContainer);

    // Create dice display area
    var diceArea = document.createElement("div");
    diceArea.className = "dice-area";

    var diceBox = document.createElement("div");
    diceBox.className = "dice-box";
    diceBox.id = "dice-display";

    var diceFace = document.createElement("div");
    diceFace.className = "dice-face";
    diceFace.id = "dice-face";
    renderDiceFace(diceFace, 0);
    diceBox.appendChild(diceFace);

    var diceLabel = document.createElement("div");
    diceLabel.className = "dice-label";
    diceLabel.id = "dice-label";
    diceLabel.textContent = "";
    diceBox.appendChild(diceLabel);

    diceArea.appendChild(diceBox);

    // Roll button
    var rollBtn = document.createElement("button");
    rollBtn.className = "btn btn-roll";
    rollBtn.id = "btn-roll";
    rollBtn.textContent = "Roll Dice";
    rollBtn.addEventListener("click", handleRollClick);
    diceArea.appendChild(rollBtn);

    boardEl.appendChild(diceArea);

    // Player info cards
    var infoArea = document.createElement("div");
    infoArea.className = "player-info-area";

    var infoA = document.createElement("div");
    infoA.className = "player-info info-a";
    infoA.innerHTML =
      '<div class="info-name">Player A</div>' +
      '<div class="info-pos">Position: <span id="info-pos-a">0</span></div>' +
      '<div class="info-phase">Direction: <span id="info-phase-a">↑ Forward</span></div>';
    infoArea.appendChild(infoA);

    var infoB = document.createElement("div");
    infoB.className = "player-info info-b";
    infoB.innerHTML =
      '<div class="info-name">Player B</div>' +
      '<div class="info-pos">Position: <span id="info-pos-b">0</span></div>' +
      '<div class="info-phase">Direction: <span id="info-phase-b">↑ Forward</span></div>';
    infoArea.appendChild(infoB);

    boardEl.appendChild(infoArea);
  }

  function renderDiceFace(faceEl, value) {
    faceEl.innerHTML = "";
    if (value === 0) {
      faceEl.textContent = "?";
      return;
    }

    var grid = document.createElement("div");
    grid.className = "dice-grid";
    var dots = DICE_DOTS[value];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        var cell = document.createElement("div");
        cell.className = "dice-cell";
        for (var d = 0; d < dots.length; d++) {
          if (dots[d][0] === r && dots[d][1] === c) {
            var dot = document.createElement("div");
            dot.className = "dice-dot";
            cell.appendChild(dot);
          }
        }
        grid.appendChild(cell);
      }
    }
    faceEl.appendChild(grid);
  }

  function renderGame() {
    if (!state) return;

    // Update track positions
    var cells = document.querySelectorAll("#board .track-cell");
    cells.forEach((cell) => {
      var pos = parseInt(cell.dataset.pos);
      var pieceA = cell.querySelector(".piece-a");
      var pieceB = cell.querySelector(".piece-b");

      pieceA.style.display = "none";
      pieceB.style.display = "none";
      cell.classList.remove("occupied-a", "occupied-b");

      if (state.posA === pos) {
        pieceA.style.display = "block";
        cell.classList.add("occupied-a");
      }
      if (state.posB === pos) {
        pieceB.style.display = "block";
        cell.classList.add("occupied-b");
      }
    });

    // Update status bar
    document.getElementById("current-player").textContent =
      state.currentPlayer === PLAYER_A ? "A" : "B";
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;

    var phaseTextA = state.phaseA === "forward" ? "↑ Forward" : "↓ Backward";
    var phaseTextB = state.phaseB === "forward" ? "↑ Forward" : "↓ Backward";
    document.getElementById("info-pos-a").textContent = state.posA;
    document.getElementById("info-pos-b").textContent = state.posB;
    document.getElementById("info-phase-a").textContent = phaseTextA;
    document.getElementById("info-phase-b").textContent = phaseTextB;

    // Update roll button state
    var rollBtn = document.getElementById("btn-roll");
    if (rollBtn) {
      if (state.gameOver || isProcessing) {
        rollBtn.disabled = true;
      } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
        rollBtn.disabled = true;
      } else {
        rollBtn.disabled = false;
      }
    }

    // Update message
    var msgEl = document.getElementById("message");
    if (state.gameOver) {
      var winnerText = state.winner === PLAYER_A ? "Player A wins!" : "Player B wins!";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    } else if (state.extraTurn) {
      var extraPlayer = state.currentPlayer === PLAYER_A ? "A" : "B";
      msgEl.textContent = extraPlayer + " rolled a 6! Extra turn!";
      msgEl.className = "info";
    } else if (state.lastRoll > 0) {
      msgEl.textContent = "";
      msgEl.className = "";
    }
  }

  function animateDiceRoll(finalValue, callback) {
    var faceEl = document.getElementById("dice-face");
    var diceBox = document.getElementById("dice-display");
    diceBox.classList.add("dice-rolling");

    var count = 0;
    var maxCount = 10;
    var interval = setInterval(() => {
      var randomVal = Math.floor(Math.random() * 6) + 1;
      renderDiceFace(faceEl, randomVal);
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        renderDiceFace(faceEl, finalValue);
        diceBox.classList.remove("dice-rolling");
        if (callback) callback();
      }
    }, 60);
  }

  function handleRollClick() {
    if (!state || state.gameOver || isProcessing) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    executeTurn();
  }

  function executeTurn() {
    if (!state || state.gameOver) return;
    isProcessing = true;
    renderGame();

    var result = movePiece(state, state.currentPlayer);

    animateDiceRoll(result.die, () => {
      document.getElementById("dice-label").textContent = "Rolled: " + result.die;
      state.turnCount++;

      renderGame();

      if (state.gameOver) {
        isProcessing = false;
        renderGame();
        return;
      }

      // Handle extra turn
      if (state.extraTurn) {
        isProcessing = false;
        renderGame();
        if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
          setTimeout(triggerAI, 800);
        }
        return;
      }

      // Switch player
      state.currentPlayer = getOpponent(state.currentPlayer);
      isProcessing = false;
      renderGame();

      // AI turn
      if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
        setTimeout(triggerAI, 800);
      }
    });
  }

  function triggerAI() {
    if (!state || state.gameOver) return;
    state.aiThinking = true;
    renderGame();

    setTimeout(() => {
      if (!state || state.gameOver) {
        state.aiThinking = false;
        return;
      }
      executeTurn();
    }, 400);
  }

  function startGame(mode, firstPlayer) {
    state = createGameState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      state.playerTeam = PLAYER_A;
      state.aiTeam = PLAYER_B;
    }
    isProcessing = false;
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("game-over").style.display = "none";
    document.getElementById("message").textContent = "";
    document.getElementById("message").className = "";
    document.getElementById("dice-label").textContent = "";
    var faceEl = document.getElementById("dice-face");
    if (faceEl) renderDiceFace(faceEl, 0);
    initBoard();
    renderGame();
    if (mode === "pve" && state.currentPlayer === state.aiTeam) {
      setTimeout(triggerAI, 800);
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
          "<p>You chose " +
          getRPSName(choice) +
          ", AI chose " +
          getRPSName(aiChoice) +
          ", you go first!</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_A);
        }, 1500);
      } else if (result === -1) {
        resultDiv.innerHTML =
          "<p>You chose " +
          getRPSName(choice) +
          ", AI chose " +
          getRPSName(aiChoice) +
          ", AI goes first!</p>";
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
    });
    document.getElementById("rps-pve").style.display = "block";
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
