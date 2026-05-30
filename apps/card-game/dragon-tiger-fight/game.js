/* eslint-disable no-var, no-undef */
/* global DIRECTIONS:writable, inBounds:writable, getValidMoves:writable, smartAiDecide:writable, isStalemateDraw:writable, recordCaptureAction:writable, recordNonCaptureAction:writable */
// ============================================================
// Dragon Tiger Fight - Game Core Logic
// ============================================================

// ============================================================
// Shared module loading (Node.js test environment)
// ============================================================
if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var shuffleArray = _gameUtils.shuffleArray;
}
if (typeof DIRECTIONS === "undefined" && typeof require !== "undefined") {
  const _core = require("../../common/card-game-core.js");
  DIRECTIONS = _core.DIRECTIONS;
  inBounds = _core.inBounds;
  getValidMoves = _core.getValidMoves;
  smartAiDecide = _core.smartAiDecide;
  isStalemateDraw = _core.isStalemateDraw;
  recordCaptureAction = _core.recordCaptureAction;
  recordNonCaptureAction = _core.recordNonCaptureAction;
}

// Dragon team 8 pieces (rank 1-8, lower value = higher rank)
const DRAGON_PIECES = ["龙王", "神龙", "金龙", "青龙", "赤龙", "白龙", "风雨龙", "变形龙"];

// Tiger team 8 pieces (rank 1-8)
const TIGER_PIECES = ["虎王", "东北虎", "大头虎", "下山虎", "绿虎", "妖虎", "白虎", "小王虎"];

// Rank mapping: piece name -> rank value (1=highest, 8=lowest)
const RANK_MAP = {
  龙王: 1,
  神龙: 2,
  金龙: 3,
  青龙: 4,
  赤龙: 5,
  白龙: 6,
  风雨龙: 7,
  变形龙: 8,
  虎王: 1,
  东北虎: 2,
  大头虎: 3,
  下山虎: 4,
  绿虎: 5,
  妖虎: 6,
  白虎: 7,
  小王虎: 8,
};

// Image mapping: piece name -> image filename
const IMAGE_MAP = {
  龙王: "龙1.jpg",
  神龙: "龙2.jpg",
  金龙: "龙3.jpg",
  青龙: "龙4.jpg",
  赤龙: "龙5.jpg",
  白龙: "龙6.jpg",
  风雨龙: "龙7.jpg",
  变形龙: "龙8.jpg",
  虎王: "虎1.jpg",
  东北虎: "虎2.jpg",
  大头虎: "虎3.jpg",
  下山虎: "虎4.jpg",
  绿虎: "虎5.jpg",
  妖虎: "虎6.jpg",
  白虎: "虎7.jpg",
  小王虎: "虎8.jpg",
};

// Team mapping: piece name -> team
const TEAM_MAP = {};
DRAGON_PIECES.forEach((p) => {
  TEAM_MAP[p] = "dragon";
});
TIGER_PIECES.forEach((p) => {
  TEAM_MAP[p] = "tiger";
});

/**
 * Get piece image path
 * @param {string} piece - piece name
 * @returns {string} image path e.g. 'images/龙1.jpg'
 */
function getImagePath(piece) {
  return `images/${IMAGE_MAP[piece]}`;
}

/**
 * Get piece team
 * @param {string} piece - piece name
 * @returns {string} 'dragon' | 'tiger'
 */
function getTeam(piece) {
  return TEAM_MAP[piece];
}

/**
 * Get piece rank
 * @param {string} piece - piece name
 * @returns {number} rank value 1-8
 */
function getRank(piece) {
  return RANK_MAP[piece];
}

/**
 * Check if attacker piece can capture defender piece
 * Rules:
 * 1. Must be different teams
 * 2. Higher rank (lower value) captures lower rank (higher value)
 * 3. Same rank = mutual destruction (canCapture returns true, handled in captureCard)
 * 4. Reversal: rank 8 captures opponent rank 1
 * 5. Rank 1 cannot capture opponent rank 8 (countered by reversal)
 * @param {Card} attacker - attacker piece
 * @param {Card} defender - defender piece
 * @returns {boolean} whether can capture
 */
function canCapture(attacker, defender) {
  if (attacker.team === defender.team) return false;

  const attRank = attacker.rank;
  const defRank = defender.rank;

  // Reversal rule: rank 8 captures opponent rank 1
  if (attRank === 8 && defRank === 1) return true;

  // Rank 1 cannot capture opponent rank 8 (countered by reversal)
  if (attRank === 1 && defRank === 8) return false;

  // Higher rank (lower value) captures lower rank (higher value), or same rank
  if (attRank <= defRank) return true;

  return false;
}

/**
 * Check if capture results in mutual destruction
 * @param {Card} attacker - attacker piece
 * @param {Card} defender - defender piece
 * @returns {boolean} whether mutual destruction
 */
function isMutualDestruction(attacker, defender) {
  return attacker.rank === defender.rank;
}

/**
 * Create initial game state
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState}
 */
function createGameState(mode) {
  const cards = [];
  for (const piece of DRAGON_PIECES) {
    cards.push({ piece, team: "dragon", rank: RANK_MAP[piece], faceUp: false });
  }
  for (const piece of TIGER_PIECES) {
    cards.push({ piece, team: "tiger", rank: RANK_MAP[piece], faceUp: false });
  }
  shuffleArray(cards);
  // Place onto 4x4 board
  const board = [];
  for (let y = 0; y < 4; y++) {
    const row = [];
    for (let x = 0; x < 4; x++) {
      row.push(cards[y * 4 + x]);
    }
    board.push(row);
  }
  return {
    mode,
    board,
    currentTeam: null,
    playerTeam: null,
    aiTeam: null,
    teamAssigned: false,
    firstPlayer: null,
    turnCount: 0,
    capturedDragon: [],
    capturedTiger: [],
    selectedCell: null,
    gameOver: false,
    winner: null,
    aiThinking: false,
    aiFirst: false,
    // Stalemate tracking (anti-deadlock)
    noCaptureActions: 0,
    positionHistory: {},
  };
}

/**
 * Get valid capture targets
 * @param {Board} board - board
 * @param {number} x - piece x coordinate
 * @param {number} y - piece y coordinate
 * @param {string} team - current team 'dragon' | 'tiger'
 * @returns {Array<{x, y}>}
 */
function getValidCaptures(board, x, y, team) {
  const card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];
  const captures = [];
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const target = board[ny][nx];
    if (!target || !target.faceUp || target.team === team) continue;
    if (!canCapture(card, target)) continue;
    captures.push({ x: nx, y: ny });
  }
  return captures;
}

/**
 * Execute flip operation (modifies state in place)
 * @param {GameState} state
 * @param {number} x
 * @param {number} y
 * @returns {GameState|null}
 */
function flipCard(state, x, y) {
  if (!inBounds(x, y)) return null;
  const card = state.board[y][x];
  if (!card || card.faceUp) return null;

  card.faceUp = true;

  // First flip: determine team assignment
  if (!state.teamAssigned) {
    state.teamAssigned = true;
    if (state.mode === "pve") {
      if (state.aiFirst) {
        state.aiTeam = card.team;
        state.playerTeam = card.team === "dragon" ? "tiger" : "dragon";
      } else {
        state.playerTeam = card.team;
        state.aiTeam = card.team === "dragon" ? "tiger" : "dragon";
      }
    }
    // After first flip, switch to non-flipper team
    if (state.mode === "pve") {
      const flipperTeam = state.aiFirst ? state.aiTeam : state.playerTeam;
      state.currentTeam = flipperTeam === "dragon" ? "tiger" : "dragon";
    } else {
      state.currentTeam = state.currentTeam === "dragon" ? "tiger" : "dragon";
    }
  } else {
    state.currentTeam = state.currentTeam === "dragon" ? "tiger" : "dragon";
  }
  state.turnCount++;
  recordNonCaptureAction(state);
  return state;
}

/**
 * Execute move operation (modifies state in place)
 * @param {GameState} state
 * @param {{x,y}} from - start position
 * @param {{x,y}} to - target position
 * @returns {GameState|null}
 */
function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const card = state.board[from.y][from.x];
  if (!card || !card.faceUp || card.team !== state.currentTeam) return null;
  if (state.board[to.y][to.x] !== null) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;

  state.board[to.y][to.x] = card;
  state.board[from.y][from.x] = null;
  state.currentTeam = state.currentTeam === "dragon" ? "tiger" : "dragon";
  state.turnCount++;
  recordNonCaptureAction(state);
  return state;
}

/**
 * Execute capture operation (modifies state in place)
 * Handle mutual destruction: same-rank pieces both removed when meeting
 * @param {GameState} state
 * @param {{x,y}} from - attacker position
 * @param {{x,y}} to - defender position
 * @returns {GameState|null}
 */
function captureCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const attacker = state.board[from.y][from.x];
  const defender = state.board[to.y][to.x];
  if (!attacker || !attacker.faceUp || attacker.team !== state.currentTeam) return null;
  if (!defender || !defender.faceUp || defender.team === state.currentTeam) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;
  if (!canCapture(attacker, defender)) return null;

  // Add captured piece to corresponding team captured list
  if (defender.team === "dragon") {
    state.capturedDragon.push(defender.piece);
  } else {
    state.capturedTiger.push(defender.piece);
  }

  // Mutual destruction handling
  if (isMutualDestruction(attacker, defender)) {
    if (attacker.team === "dragon") {
      state.capturedDragon.push(attacker.piece);
    } else {
      state.capturedTiger.push(attacker.piece);
    }
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    // Normal capture
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  }

  state.currentTeam = state.currentTeam === "dragon" ? "tiger" : "dragon";
  state.turnCount++;
  recordCaptureAction(state);
  return state;
}

/**
 * Check if a team has any legal action (flip/move/capture)
 * @param {Board} board - board
 * @param {string} team - team 'dragon' | 'tiger'
 * @returns {boolean}
 */
function hasAnyLegalAction(board, team) {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      // Flip: any face-down card on board
      if (card && !card.faceUp) return true;
      // Move/capture: own face-up cards
      if (card && card.faceUp && card.team === team) {
        if (getValidMoves(board, x, y).length > 0) return true;
        if (getValidCaptures(board, x, y, team).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Check if game is over
 * @param {Board} board - board
 * @param {string} currentTeam - current team 'dragon' | 'tiger'
 * @param {Object} [state] - optional full game state for stalemate detection
 * @returns {{ended: boolean, winner: string|null}}
 */
function checkGameOver(board, currentTeam, state) {
  if (state && isStalemateDraw(state)) {
    return { ended: true, winner: "draw" };
  }
  let dragonCount = 0;
  let tigerCount = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card) {
        if (card.team === "dragon") dragonCount++;
        else tigerCount++;
      }
    }
  }
  // Both sides have no pieces (mutual destruction wiped out remaining pieces) -> draw
  if (dragonCount === 0 && tigerCount === 0) return { ended: true, winner: "draw" };
  if (dragonCount === 0) return { ended: true, winner: "tiger" };
  if (tigerCount === 0) return { ended: true, winner: "dragon" };
  if (!hasAnyLegalAction(board, currentTeam)) {
    return { ended: true, winner: currentTeam === "dragon" ? "tiger" : "dragon" };
  }
  return { ended: false, winner: null };
}

/**
 * Piece value for AI scoring.
 * Stronger pieces score higher; rank 8 (transformer dragon / king of small tigers)
 * gets reversal premium because it can capture rank 1.
 * @param {number} rank
 * @returns {number}
 */
function pieceValue(rank) {
  if (rank === 1) return 10;
  if (rank === 8) return 5;
  return 9 - rank;
}

/**
 * AI decision: smart one-step lookahead.
 * Priority: capture (highest expected score) > flip (least risky) > move (escape/approach).
 * @param {GameState} state
 * @param {string} aiTeam - AI team 'dragon' | 'tiger'
 * @returns {{type, from?, to?, x?, y?}|null}
 */
function aiDecide(state, aiTeam) {
  return smartAiDecide(state, aiTeam, {
    canCapture: canCapture,
    isMutualDestruction: isMutualDestruction,
    pieceValue: pieceValue,
    getValidCaptures: function (board, x, y, team) {
      return getValidCaptures(board, x, y, team);
    },
    getValidMoves: getValidMoves,
  });
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DRAGON_PIECES,
    TIGER_PIECES,
    RANK_MAP,
    IMAGE_MAP,
    TEAM_MAP,
    DIRECTIONS,
    getImagePath,
    getTeam,
    getRank,
    judgeRPS,
    inBounds,
    canCapture,
    isMutualDestruction,
    createGameState,
    getValidMoves,
    getValidCaptures,
    flipCard,
    moveCard,
    captureCard,
    hasAnyLegalAction,
    checkGameOver,
    aiDecide,
  };
}

// ============================================================
// UI controller (browser environment only)
// ============================================================
if (typeof document !== "undefined") {
  let gameState = null;

  // DOM elements
  const $modeSelection = document.getElementById("mode-selection");
  const $rpsSection = document.getElementById("rps-section");
  const $rpsPvp = document.getElementById("rps-pvp");
  const $rpsPve = document.getElementById("rps-pve");
  const $rpsResult = document.getElementById("rps-result");
  const $gameArea = document.getElementById("game-area");
  const $board = document.getElementById("board");
  const $currentTeam = document.getElementById("current-team");
  const $turnCount = document.getElementById("turn-count");
  const $dragonRemaining = document.getElementById("dragon-remaining");
  const $tigerRemaining = document.getElementById("tiger-remaining");
  const $capturedDragon = document.getElementById("captured-dragon");
  const $capturedTiger = document.getElementById("captured-tiger");
  const $message = document.getElementById("message");
  const $gameOver = document.getElementById("game-over");
  const $winnerText = document.getElementById("winner-text");
  const $btnRestart = document.getElementById("btn-restart");

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null;
  let remoteTeam = null;
  let localIsFirstPlayer = false;

  // --- Renderer functions ---

  function getCell(x, y) {
    return $board.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
  }

  function renderBoard(state) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = getCell(x, y);
        const card = state.board[y][x];
        cell.className = "cell";
        cell.innerHTML = "";
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (!card) {
          cell.classList.add("cell-empty");
        } else if (!card.faceUp) {
          const back = document.createElement("div");
          back.className = "cell-back";
          cell.appendChild(back);
        } else {
          cell.classList.add(card.team === "dragon" ? "cell-dragon" : "cell-tiger");
          const face = document.createElement("div");
          face.className = "cell-face";
          const img = document.createElement("img");
          img.src = getImagePath(card.piece);
          img.alt = card.piece;
          face.appendChild(img);
          cell.appendChild(face);
        }
      }
    }
    updateStatus(state);
  }

  function clearHighlights() {
    document.querySelectorAll(".cell").forEach((c) => {
      c.classList.remove(
        "cell-selected",
        "cell-target",
        "cell-capture-target",
        "cell-ai-highlight"
      );
    });
  }

  function highlightTargets(x, y, moveTargets, captureTargets) {
    clearHighlights();
    const selected = getCell(x, y);
    if (selected) selected.classList.add("cell-selected");
    for (const t of moveTargets) {
      const tc = getCell(t.x, t.y);
      if (tc) tc.classList.add("cell-target");
    }
    for (const t of captureTargets) {
      const tc = getCell(t.x, t.y);
      if (tc) tc.classList.add("cell-capture-target");
    }
  }

  function updateStatus(state) {
    // Current team
    if (state.mode === "online") {
      if (!state.teamAssigned) {
        $currentTeam.textContent = localIsFirstPlayer ? "你的回合" : "对方回合";
        $currentTeam.className = "team-indicator";
      } else {
        $currentTeam.textContent = state.currentTeam === localTeam ? "你的回合" : "对方回合";
        $currentTeam.className =
          "team-indicator " + (state.currentTeam === localTeam ? "dragon-text" : "tiger-text");
      }
    } else if (state.currentTeam) {
      const label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.currentTeam,
        playerSide: state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === "dragon" ? "tiger" : "dragon"]
          : ["dragon", "tiger"],
        assigned: state.teamAssigned,
        aiFirst: state.aiFirst,
      });
      $currentTeam.textContent = label.text;
      $currentTeam.className =
        "team-indicator " + (state.currentTeam === "dragon" ? "dragon-text" : "tiger-text");
    } else {
      $currentTeam.textContent = "—";
    }

    // Turn count
    $turnCount.textContent = state.turnCount;

    // Remaining pieces
    let dragonCount = 0,
      tigerCount = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        if (card) {
          if (card.team === "dragon") dragonCount++;
          else tigerCount++;
        }
      }
    }
    $dragonRemaining.textContent = dragonCount;
    $tigerRemaining.textContent = tigerCount;

    // Captured cards
    $capturedDragon.innerHTML = "";
    for (const piece of state.capturedDragon) {
      const div = document.createElement("div");
      div.className = "captured-card";
      const img = document.createElement("img");
      img.src = getImagePath(piece);
      img.alt = piece;
      div.appendChild(img);
      $capturedDragon.appendChild(div);
    }

    $capturedTiger.innerHTML = "";
    for (const piece of state.capturedTiger) {
      const div = document.createElement("div");
      div.className = "captured-card";
      const img = document.createElement("img");
      img.src = getImagePath(piece);
      img.alt = piece;
      div.appendChild(img);
      $capturedTiger.appendChild(div);
    }

    updateTeamLabels(state);
  }

  function updateTeamLabels(state) {
    const $dragonLabel = document.getElementById("dragon-label");
    const $tigerLabel = document.getElementById("tiger-label");
    if (state.mode === "pve" && state.teamAssigned) {
      if (state.playerTeam === "dragon") {
        $dragonLabel.textContent = "玩家（龙队）剩余：";
        $tigerLabel.textContent = "电脑（虎队）剩余：";
      } else {
        $dragonLabel.textContent = "电脑（龙队）剩余：";
        $tigerLabel.textContent = "玩家（虎队）剩余：";
      }
    } else if (state.mode === "online" && state.teamAssigned) {
      if (localTeam === "dragon") {
        $dragonLabel.textContent = "我方（龙队）剩余：";
        $tigerLabel.textContent = "对方（虎队）剩余：";
      } else {
        $dragonLabel.textContent = "对方（龙队）剩余：";
        $tigerLabel.textContent = "我方（虎队）剩余：";
      }
    } else {
      $dragonLabel.textContent = "龙队剩余：";
      $tigerLabel.textContent = "虎队剩余：";
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || "";
  }

  // ---- Online mode functions ----
  function cleanupNetwork() {
    if (networkProtocol) {
      networkProtocol.destroy();
      networkProtocol = null;
    }
    if (networkConnection) {
      networkConnection.close();
      networkConnection = null;
    }
    if (roomUI) {
      roomUI.destroy();
      roomUI = null;
    }
    localPlayerRole = null;
    localTeam = null;
    remoteTeam = null;
    localIsFirstPlayer = false;
  }

  function setupNetworkHandlers() {
    if (!networkProtocol) return;

    networkProtocol.onAction = (actionData) => {
      applyRemoteAction(actionData);
    };

    networkProtocol.onRPSChoice = (remoteChoice) => {
      handleOnlineRPSReceived(remoteChoice);
    };

    networkProtocol.onRPSResult = (result) => {
      handleOnlineRPSResult(result);
    };

    networkProtocol.onRestart = () => {
      cleanupNetwork();
      gameState = null;
      showModeSelection();
    };

    networkProtocol.onDisconnect = () => {
      handleDisconnect();
    };
  }

  function startOnlineRPS() {
    $modeSelection.style.display = "none";
    $rpsSection.style.display = "none";
    document.getElementById("rps-online").style.display = "flex";
    document.getElementById("rps-online-status").textContent = "请选择";
    document.getElementById("rps-online-result").textContent = "";
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((b) => {
      b.classList.remove("selected");
    });
  }

  function handleOnlineRPSChoice(choice, ev) {
    _onlineMyRPSChoice = choice;
    if (networkProtocol) {
      networkProtocol.sendRPSChoice(choice);
    }
    document.getElementById("rps-online-status").textContent = "已选择，等待对方...";
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((b) => {
      b.classList.remove("selected");
    });
    ev.target.classList.add("selected");
  }

  let _onlineMyRPSChoice = null;
  let _onlineRemoteRPSChoice = null;

  function handleOnlineRPSReceived(remoteChoice) {
    _onlineRemoteRPSChoice = remoteChoice;
    checkOnlineRPSComplete();
  }

  function checkOnlineRPSComplete() {
    if (!_onlineMyRPSChoice || !_onlineRemoteRPSChoice) return;
    if (localPlayerRole === "host") {
      const result = judgeRPS(_onlineMyRPSChoice, _onlineRemoteRPSChoice);
      if (result === 0) {
        if (networkProtocol) {
          networkProtocol.sendRPSResult({ result: "draw" });
        }
        handleOnlineRPSResult({ result: "draw" });
      } else {
        let winnerRole;
        if (result === 1) {
          winnerRole = localPlayerRole;
        } else {
          winnerRole = localPlayerRole === "host" ? "guest" : "host";
        }
        const rpsResult = { result: "win", winner: winnerRole };
        if (networkProtocol) {
          networkProtocol.sendRPSResult(rpsResult);
        }
        handleOnlineRPSResult(rpsResult);
      }
    }
  }

  function handleOnlineRPSResult(rpsResult) {
    const $rpsOnlineResult = document.getElementById("rps-online-result");

    if (rpsResult.result === "draw") {
      $rpsOnlineResult.textContent = "平局！重新选择";
      _onlineMyRPSChoice = null;
      _onlineRemoteRPSChoice = null;
      setTimeout(() => {
        startOnlineRPS();
      }, 1500);
      return;
    }

    const winnerRole = rpsResult.winner;
    const isFirst = winnerRole === localPlayerRole;
    $rpsOnlineResult.textContent = isFirst ? "你赢了！你先手" : "你输了！对方先手";

    setTimeout(() => {
      document.getElementById("rps-online").style.display = "none";
      startOnlineGame(isFirst ? "host" : "guest");
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");
    localIsFirstPlayer = firstPlayerRole === localPlayerRole;
    gameState.currentTeam = "dragon";
    showGameArea();
    renderBoard(gameState);

    if (localIsFirstPlayer) {
      showMessage("请翻开一张牌", "");
    } else {
      showMessage("等待对方操作...", "info");
    }
  }

  function applyRemoteAction(actionData) {
    if (!gameState || gameState.gameOver) return;

    if (actionData.a === "flip") {
      const flipResult = flipCard(gameState, actionData.x, actionData.y);
      if (flipResult) {
        if (!gameState.teamAssigned) {
          const flippedCard = gameState.board[actionData.y][actionData.x];
          remoteTeam = flippedCard.team;
          localTeam = remoteTeam === "dragon" ? "tiger" : "dragon";
          gameState.teamAssigned = true;
        }
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
    } else if (actionData.a === "move") {
      const moveResult = moveCard(
        gameState,
        { x: actionData.fx, y: actionData.fy },
        { x: actionData.tx, y: actionData.ty }
      );
      if (moveResult) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
    } else if (actionData.a === "capture") {
      const captureResult = captureCard(
        gameState,
        { x: actionData.fx, y: actionData.fy },
        { x: actionData.tx, y: actionData.ty }
      );
      if (captureResult) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
    }
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      $winnerText.textContent = "对方已断开连接，你获胜！";
      $gameOver.style.display = "flex";
    }
    cleanupNetwork();
  }

  function showModeSelection() {
    $modeSelection.style.display = "flex";
    $rpsSection.style.display = "none";
    document.getElementById("rps-online").style.display = "none";
    $gameArea.style.display = "none";
    $gameOver.style.display = "none";
  }

  function showRPSSelection(mode) {
    $modeSelection.style.display = "none";
    $rpsSection.style.display = "flex";
    $rpsResult.textContent = "";
    if (mode === "pvp") {
      $rpsPvp.style.display = "block";
      $rpsPve.style.display = "none";
      rpsP1Choice = null;
      rpsP2Choice = null;
      document.getElementById("rps-p1-status").textContent = "请选择";
      document.getElementById("rps-p2-status").textContent = "请选择";
      document.querySelectorAll("#rps-pvp .btn-rps").forEach((b) => {
        b.classList.remove("selected");
      });
    } else {
      $rpsPvp.style.display = "none";
      $rpsPve.style.display = "block";
      document.querySelectorAll("#rps-pve .btn-rps").forEach((b) => {
        b.classList.remove("selected");
      });
    }
  }

  function showGameArea() {
    $modeSelection.style.display = "none";
    $rpsSection.style.display = "none";
    $gameArea.style.display = "flex";
    document.getElementById("rule-pve").style.display = gameState.mode === "pve" ? "block" : "none";
    $gameOver.style.display = "none";
  }

  function showGameOverScreen(winner) {
    if (winner === "draw") {
      $winnerText.textContent = "平局！";
      $gameOver.style.display = "flex";
      return;
    }
    if (gameState.mode === "online") {
      $winnerText.textContent = winner === localTeam ? "你获胜了！" : "你失败了！";
    } else {
      // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of dragon/tiger
      const label = getCurrentPlayerLabel({
        mode: gameState.mode,
        currentSide: winner,
        playerSide: gameState.playerTeam,
        sidesOrder: gameState.firstPlayer
          ? [gameState.firstPlayer, gameState.firstPlayer === "dragon" ? "tiger" : "dragon"]
          : ["dragon", "tiger"],
      });
      $winnerText.textContent = label.text + " 获胜！";
    }
    $gameOver.style.display = "flex";
  }

  // --- Rock-Paper-Scissors logic ---
  let rpsP1Choice = null;
  let rpsP2Choice = null;

  function startGame(firstTeam) {
    showGameArea();
    gameState.currentTeam = firstTeam;
    gameState.firstPlayer = firstTeam;
    renderBoard(gameState);

    // In PVE mode, if AI goes first, trigger AI flip directly
    if (gameState.mode === "pve" && gameState.aiFirst) {
      triggerAI();
    } else {
      showMessage("请翻开一张牌", "");
    }
  }

  function handleRPSResult(choice1, choice2, mode) {
    const result = judgeRPS(choice1, choice2);
    const choiceNames = { rock: "石头", scissors: "剪刀", paper: "布" };

    if (result === 0) {
      $rpsResult.textContent = "双方都出了" + choiceNames[choice1] + "，平局！重新选择";
      setTimeout(() => {
        showRPSSelection(mode);
      }, 1500);
      return;
    }

    if (mode === "pvp") {
      const winner = result === 1 ? "玩家1" : "玩家2";
      $rpsResult.textContent = winner + " 获胜！" + winner + "先手";
      const firstTeam = result === 1 ? "dragon" : "tiger";
      setTimeout(() => {
        startGame(firstTeam);
      }, 1500);
    } else {
      // PVE
      const aiChoiceName = choiceNames[choice2];
      if (result === 1) {
        // Player won RPS -> player goes first
        $rpsResult.textContent = "电脑出了" + aiChoiceName + "，你赢了！你先手";
        gameState.aiFirst = false;
        setTimeout(() => {
          startGame("dragon");
        }, 1500);
      } else {
        // Computer won RPS -> computer goes first
        $rpsResult.textContent = "电脑出了" + aiChoiceName + "，电脑赢了！电脑先手";
        gameState.aiFirst = true;
        setTimeout(() => {
          startGame("dragon");
        }, 1500);
      }
    }
  }

  // PVP Rock-Paper-Scissors buttons
  document.querySelectorAll("#rps-pvp .btn-rps").forEach((btn) => {
    btn.addEventListener("click", () => {
      const player = btn.dataset.player;
      const choice = btn.dataset.choice;

      if (player === "1") {
        rpsP1Choice = choice;
        document.getElementById("rps-p1-status").textContent = "已选择";
        document.querySelectorAll("#rps-p1-buttons .btn-rps").forEach((b) => {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
      } else {
        rpsP2Choice = choice;
        document.getElementById("rps-p2-status").textContent = "已选择";
        document.querySelectorAll("#rps-p2-buttons .btn-rps").forEach((b) => {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
      }

      if (rpsP1Choice && rpsP2Choice) {
        handleRPSResult(rpsP1Choice, rpsP2Choice, "pvp");
      }
    });
  });

  // PVE Rock-Paper-Scissors buttons
  document.querySelectorAll("#rps-pve .btn-rps").forEach((btn) => {
    btn.addEventListener("click", () => {
      const playerChoice = btn.dataset.choice;
      const choices = ["rock", "scissors", "paper"];
      const aiChoice = choices[Math.floor(Math.random() * 3)];

      document.querySelectorAll("#rps-pve .btn-rps").forEach((b) => {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");

      handleRPSResult(playerChoice, aiChoice, "pve");
    });
  });

  // --- Mode selection ---
  document.getElementById("btn-pvp").addEventListener("click", () => {
    gameState = createGameState("pvp");
    showRPSSelection("pvp");
  });

  document.getElementById("btn-pve").addEventListener("click", () => {
    gameState = createGameState("pve");
    showRPSSelection("pve");
  });

  // Online mode button
  const btnOnline = document.getElementById("btn-online");
  if (btnOnline) {
    if (!RoomUI.isSupported()) {
      btnOnline.style.display = "none";
    } else {
      btnOnline.addEventListener("click", () => {
        roomUI = new RoomUI({
          onConnectionEstablished: (connection, protocol, role) => {
            networkConnection = connection;
            networkProtocol = protocol;
            localPlayerRole = role;
            setupNetworkHandlers();
            startOnlineRPS();
          },
          onError: (msg) => {
            showMessage(msg, "error");
          },
          onCancel: () => {
            cleanupNetwork();
          },
        });
        roomUI.show();
      });
    }
  }

  // Online RPS buttons
  document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((button) => {
    button.addEventListener("click", (ev) => {
      const choice = ev.target.dataset.choice;
      handleOnlineRPSChoice(choice, ev);
    });
  });

  // --- Restart ---
  $btnRestart.addEventListener("click", () => {
    if (gameState && gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    gameState = null;
    showModeSelection();
  });

  // --- Board click event handler ---
  $board.addEventListener("click", (e) => {
    if (!gameState || gameState.gameOver) return;
    if (gameState.aiThinking) return;

    // In PVE mode, only allow player to click on their turn
    if (
      gameState.mode === "pve" &&
      gameState.teamAssigned &&
      gameState.currentTeam === gameState.aiTeam
    )
      return;

    // In online mode, only allow click on local player's turn
    if (gameState.mode === "online") {
      if (gameState.teamAssigned && gameState.currentTeam !== localTeam) return;
      if (!gameState.teamAssigned && !localIsFirstPlayer) return;
    }

    const cell = e.target.closest(".cell");
    if (!cell) return;

    const x = Number.parseInt(cell.dataset.x);
    const y = Number.parseInt(cell.dataset.y);
    const card = gameState.board[y][x];
    const currentTeam = gameState.currentTeam;

    // Already have selected piece
    if (gameState.selectedCell) {
      const sel = gameState.selectedCell;

      // Click same cell to deselect
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      // Click opponent face-up card -> try capture
      if (card && card.faceUp && card.team !== currentTeam) {
        if (
          getValidCaptures(gameState.board, sel.x, sel.y, currentTeam).some(
            (t) => t.x === x && t.y === y
          )
        ) {
          const result = captureCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
          if (result) {
            gameState.selectedCell = null;
            clearHighlights();
            if (gameState.mode === "online" && networkProtocol) {
              networkProtocol.sendAction({ a: "capture", fx: sel.x, fy: sel.y, tx: x, ty: y });
            }
            renderBoard(gameState);
            afterAction();
            return;
          }
        }
        showMessage("无法吃掉该棋子", "error");
        return;
      }

      // Click empty cell -> try move
      if (!card) {
        const moveResult = moveCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
        if (moveResult) {
          gameState.selectedCell = null;
          clearHighlights();
          if (gameState.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({ a: "move", fx: sel.x, fy: sel.y, tx: x, ty: y });
          }
          renderBoard(gameState);
          afterAction();
          return;
        }
      }

      // Click own face-up card -> reselect
      if (card && card.faceUp && card.team === currentTeam) {
        selectCard(x, y);
        return;
      }

      // Invalid target
      gameState.selectedCell = null;
      clearHighlights();
      return;
    }

    // No piece selected

    // Click face-down card -> flip
    if (card && !card.faceUp) {
      const flipResult = flipCard(gameState, x, y);
      if (flipResult) {
        clearHighlights();
        // In online mode, assign teams on first flip
        if (gameState.mode === "online" && !gameState.teamAssigned) {
          // Note: dragon-tiger-fight's flipCard handles team assignment internally
          // We need to read the flipped card's team to determine local/remote teams
          const flippedCard = gameState.board[y][x];
          localTeam = flippedCard.team;
          remoteTeam = localTeam === "dragon" ? "tiger" : "dragon";
          // Mark team as assigned for online mode
          gameState.teamAssigned = true;
        }
        if (gameState.mode === "online" && networkProtocol) {
          networkProtocol.sendAction({ a: "flip", x: x, y: y });
        }
        renderBoard(gameState);
        afterAction();
        return;
      }
    }

    // Click own face-up card -> select
    if (card && card.faceUp && card.team === currentTeam) {
      selectCard(x, y);
      return;
    }

    // Click opponent face-up card (no selection)
    if (card && card.faceUp && card.team !== currentTeam) {
      showMessage("这不是你的棋子", "error");
    }
  });

  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    const currentTeam = gameState.currentTeam;

    const moves = getValidMoves(gameState.board, x, y);
    const captures = getValidCaptures(gameState.board, x, y, currentTeam);

    highlightTargets(x, y, moves, captures);
    showMessage("", "");
  }

  function afterAction() {
    // Check game over
    const result = checkGameOver(gameState.board, gameState.currentTeam, gameState);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      renderBoard(gameState);
      setTimeout(() => {
        showGameOverScreen(result.winner);
      }, 500);
      return;
    }

    // Update message
    if (gameState.mode === "pve") {
      if (gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) {
        // Team assigned, AI turn
        triggerAI();
      } else if (!gameState.teamAssigned && gameState.aiFirst) {
        // Team not assigned but computer first (player flips after first flip)
        showMessage("请翻开一张牌", "");
      } else if (!gameState.teamAssigned) {
        showMessage("请翻开一张牌", "");
      } else {
        showMessage("你的回合", "");
      }
    } else if (gameState.mode === "online") {
      if (!gameState.teamAssigned) {
        showMessage("请翻开一张牌", "");
      } else if (gameState.currentTeam === localTeam) {
        showMessage("你的回合", "");
      } else {
        showMessage("等待对方操作...", "info");
      }
    } else if (gameState.teamAssigned) {
      const sidesOrder = gameState.firstPlayer
        ? [gameState.firstPlayer, gameState.firstPlayer === "dragon" ? "tiger" : "dragon"]
        : ["dragon", "tiger"];
      const idx = sidesOrder.indexOf(gameState.currentTeam);
      const playerName = idx >= 0 ? "玩家" + (idx + 1) : "玩家";
      showMessage(playerName + "的回合", "");
    } else {
      // PVP - show 玩家1 / 玩家2 instead of dragon/tiger
      showMessage("请翻开一张牌", "");
    }
  }

  // --- AI action flow ---
  function triggerAI() {
    gameState.aiThinking = true;
    showMessage("电脑思考中...", "info");

    const delay = 500 + Math.random() * 1000;
    setTimeout(() => {
      const decision = aiDecide(gameState, gameState.aiTeam);
      if (!decision) {
        // AI has no legal action -> game should be over
        gameState.aiThinking = false;
        afterAction();
        return;
      }

      executeAIAction(decision);
    }, delay);
  }

  function executeAIAction(decision) {
    clearHighlights();

    if (decision.type === "flip") {
      const cell = getCell(decision.x, decision.y);
      cell.classList.add("cell-ai-highlight");

      flipCard(gameState, decision.x, decision.y);
      renderBoard(gameState);

      // Re-get cell and highlight after flip
      const cell2 = getCell(decision.x, decision.y);
      cell2.classList.add("cell-ai-highlight");

      setTimeout(() => {
        clearHighlights();
        gameState.aiThinking = false;
        afterAction();
      }, 500);
    } else if (decision.type === "move") {
      const fromCell = getCell(decision.from.x, decision.from.y);
      fromCell.classList.add("cell-ai-highlight");

      setTimeout(() => {
        moveCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        const toCell = getCell(decision.to.x, decision.to.y);
        toCell.classList.add("cell-ai-highlight");

        setTimeout(() => {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    } else if (decision.type === "capture") {
      const fromCellCap = getCell(decision.from.x, decision.from.y);
      const toCellCap = getCell(decision.to.x, decision.to.y);
      fromCellCap.classList.add("cell-ai-highlight");
      toCellCap.classList.add("cell-ai-highlight");

      setTimeout(() => {
        captureCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        const newCell = getCell(decision.to.x, decision.to.y);
        newCell.classList.add("cell-ai-highlight");

        setTimeout(() => {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    }
  }

  // Initialize: show mode selection
  showModeSelection();
}
