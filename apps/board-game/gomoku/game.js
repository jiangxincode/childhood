/* eslint-disable no-var, no-undef */
// ============================================================
// Gomoku (Five in a Row) - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1; // First player
const WHITE = 2; // Second player
const WIN_COUNT = 5;

// Pre-compute all winning lines (572 total)
let WIN_LINES = [];
let WINS_MAP = []; // WINS_MAP[x][y] = [line ID array]

function initWinLines() {
  WIN_LINES = [];
  WINS_MAP = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    WINS_MAP[i] = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      WINS_MAP[i][j] = [];
    }
  }
  let lineId = 0;

  // Horizontal
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x <= BOARD_SIZE - WIN_COUNT; x++) {
      const line = [];
      for (let k = 0; k < WIN_COUNT; k++) {
        const pos = { x: x + k, y: y };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }

  // Vertical
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y <= BOARD_SIZE - WIN_COUNT; y++) {
      const line = [];
      for (let k = 0; k < WIN_COUNT; k++) {
        const pos = { x: x, y: y + k };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }

  // Down-right diagonal (\) (\)
  for (let x = 0; x <= BOARD_SIZE - WIN_COUNT; x++) {
    for (let y = 0; y <= BOARD_SIZE - WIN_COUNT; y++) {
      const line = [];
      for (let k = 0; k < WIN_COUNT; k++) {
        const pos = { x: x + k, y: y + k };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }

  // Down-left diagonal (/) (/)
  for (let x = WIN_COUNT - 1; x < BOARD_SIZE; x++) {
    for (let y = 0; y <= BOARD_SIZE - WIN_COUNT; y++) {
      const line = [];
      for (let k = 0; k < WIN_COUNT; k++) {
        const pos = { x: x - k, y: y + k };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }
}

// Initialize winning lines
initWinLines();

function createBoard() {
  const board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function getOpponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

function getPlayerName(player) {
  return player === BLACK ? "黑棋" : "白棋";
}

/**
 * Check for win after placing a stone on the board
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @param {number} player
 * @returns {Array|null} Winning line coordinate array, or null
 */
function checkWinAt(board, x, y, player) {
  const lines = WINS_MAP[x][y];
  for (const lineId of lines) {
    const line = WIN_LINES[lineId];
    let count = 0;
    for (const pos of line) {
      if (board[pos.y][pos.x] === player) {
        count++;
      }
    }
    if (count === WIN_COUNT) {
      return line;
    }
  }
  return null;
}

function checkDraw(board) {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === EMPTY) return false;
    }
  }
  return true;
}

function makeMove(board, x, y, player) {
  const newBoard = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    newBoard.push(board[r].slice());
  }
  newBoard[y][x] = player;
  return newBoard;
}

// ============================================================
// AI: Greedy Scoring Strategy (based on AiringGo)
// ============================================================

const SCORE_HUMAN = [0, 200, 400, 2000, 10000];
const SCORE_AI = [0, 220, 420, 2100, 20000];

function getBestAIMove(board, aiPlayer) {
  const humanPlayer = getOpponent(aiPlayer);
  const scoreAI = [];
  const scoreHuman = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    scoreAI[i] = [];
    scoreHuman[i] = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      scoreAI[i][j] = 0;
      scoreHuman[i][j] = 0;
    }
  }

  // Iterate all winning lines, calculate score for each empty position
  for (let lid = 0; lid < WIN_LINES.length; lid++) {
    const line = WIN_LINES[lid];
    let aiCount = 0;
    let humanCount = 0;
    for (let k = 0; k < line.length; k++) {
      const val = board[line[k].y][line[k].x];
      if (val === aiPlayer) aiCount++;
      else if (val === humanPlayer) humanCount++;
    }

    // Only consider if this line is not occupied by both sides
    if (aiCount > 0 && humanCount > 0) continue;

    if (aiCount > 0 && humanCount === 0) {
      // AI's line, add score to empty positions
      for (const point of line) {
        if (board[point.y][point.x] === EMPTY) {
          scoreAI[point.x][point.y] += SCORE_AI[aiCount];
        }
      }
    } else if (humanCount > 0 && aiCount === 0) {
      // Human's line, add score to empty positions (defense score)
      for (const point of line) {
        if (board[point.y][point.x] === EMPTY) {
          scoreHuman[point.x][point.y] += SCORE_HUMAN[humanCount];
        }
      }
    }
  }

  let maxScore = -1;
  let bestX = -1;
  let bestY = -1;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== EMPTY) continue;
      if (scoreAI[x][y] === 0 && scoreHuman[x][y] === 0) continue;

      const s = scoreAI[x][y] + scoreHuman[x][y];
      if (s > maxScore) {
        maxScore = s;
        bestX = x;
        bestY = y;
      } else if (s === maxScore) {
        // On tie, prefer offense (higher AI score)
        if (scoreAI[x][y] > scoreAI[bestX][bestY]) {
          bestX = x;
          bestY = y;
        }
      }
    }
  }

  // Play center when board is empty
  if (bestX === -1) {
    const center = Math.floor(BOARD_SIZE / 2);
    return { x: center, y: center };
  }

  return { x: bestX, y: bestY };
}

// ============================================================
// Game state
// ============================================================

function createGameState(mode) {
  return {
    mode: mode,
    board: createBoard(),
    currentPlayer: BLACK,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    winLine: null,
    turnCount: 0,
    aiThinking: false,
    scoreBlack: 0,
    scoreWhite: 0,
    lastMove: null,
  };
}

// ============================================================
// Export for testing
// ============================================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    BLACK: BLACK,
    WHITE: WHITE,
    WIN_COUNT: WIN_COUNT,
    WIN_LINES: WIN_LINES,
    WINS_MAP: WINS_MAP,
    initWinLines: initWinLines,
    createBoard: createBoard,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    checkWinAt: checkWinAt,
    checkDraw: checkDraw,
    makeMove: makeMove,
    getBestAIMove: getBestAIMove,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName,
    createGameState: createGameState,
  };
}

// ============================================================
// Browser UI
// ============================================================

if (typeof document !== "undefined") {
  // Initialize sound manager
  SoundManager.init("../../audio");

  let gameState = null;
  let rpsChoices = { player1: null, player2: null, human: null };
  let canvas, context;

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // BLACK or WHITE
  let remoteTeam = null; // BLACK or WHITE
  const CELL_SIZE = 30;
  const MARGIN = 15;
  const STONE_RADIUS = 13;
  const canvasSize = MARGIN * 2 + (BOARD_SIZE - 1) * CELL_SIZE;

  function initBoard() {
    canvas = document.getElementById("board-canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    context = canvas.getContext("2d");
    drawBoard();
  }

  function drawBoard() {
    // Background
    context.fillStyle = "#f0d9b5";
    context.fillRect(0, 0, canvasSize, canvasSize);

    // Grid lines
    context.strokeStyle = "#8b7355";
    context.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = MARGIN + i * CELL_SIZE;
      // Vertical lines
      context.beginPath();
      context.moveTo(pos, MARGIN);
      context.lineTo(pos, MARGIN + (BOARD_SIZE - 1) * CELL_SIZE);
      context.stroke();
      // Horizontal lines
      context.beginPath();
      context.moveTo(MARGIN, pos);
      context.lineTo(MARGIN + (BOARD_SIZE - 1) * CELL_SIZE, pos);
      context.stroke();
    }

    // Center and star points
    const starPoints = [
      { x: 3, y: 3 },
      { x: 3, y: 11 },
      { x: 7, y: 7 },
      { x: 11, y: 3 },
      { x: 11, y: 11 },
    ];
    context.fillStyle = "#8b7355";
    for (const sp of starPoints) {
      const sx = MARGIN + sp.x * CELL_SIZE;
      const sy = MARGIN + sp.y * CELL_SIZE;
      context.beginPath();
      context.arc(sx, sy, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawStone(x, y, player) {
    const cx = MARGIN + x * CELL_SIZE;
    const cy = MARGIN + y * CELL_SIZE;
    const gradient = context.createRadialGradient(cx + 2, cy - 2, 2, cx, cy, STONE_RADIUS);
    if (player === BLACK) {
      gradient.addColorStop(0, "#636766");
      gradient.addColorStop(1, "#0A0A0A");
    } else {
      gradient.addColorStop(0, "#F9F9F9");
      gradient.addColorStop(1, "#D1D1D1");
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  function drawLastMoveMarker(x, y) {
    const cx = MARGIN + x * CELL_SIZE;
    const cy = MARGIN + y * CELL_SIZE;
    context.strokeStyle = "#e53935";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, 5, 0, Math.PI * 2);
    context.stroke();
  }

  function drawWinLine(line) {
    context.strokeStyle = "#e53935";
    context.lineWidth = 3;
    context.beginPath();
    const sx = MARGIN + line[0].x * CELL_SIZE;
    const sy = MARGIN + line[0].y * CELL_SIZE;
    context.moveTo(sx, sy);
    for (let i = 1; i < line.length; i++) {
      const ex = MARGIN + line[i].x * CELL_SIZE;
      const ey = MARGIN + line[i].y * CELL_SIZE;
      context.lineTo(ex, ey);
    }
    context.stroke();
  }

  function renderGame(state) {
    drawBoard();

    // Draw all stones
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (state.board[y][x] !== EMPTY) {
          drawStone(x, y, state.board[y][x]);
        }
      }
    }

    // Mark last move
    if (state.lastMove) {
      drawLastMoveMarker(state.lastMove.x, state.lastMove.y);
    }

    // Draw winning line
    if (state.winLine) {
      drawWinLine(state.winLine);
    }

    // Update status bar
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === BLACK ? WHITE : BLACK]
        : [BLACK, WHITE],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === BLACK ? "text-black" : "text-white-stone");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("score-black").textContent = state.scoreBlack;
    document.getElementById("score-white").textContent = state.scoreWhite;

    if (state.mode === "pve") {
      const blackLabel = state.playerTeam === BLACK ? "玩家（黑棋）：" : "电脑（黑棋）：";
      const whiteLabel = state.playerTeam === WHITE ? "玩家（白棋）：" : "电脑（白棋）：";
      document.getElementById("label-black").textContent = blackLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else if (state.mode === "online") {
      const blackLabel = state.localTeam === BLACK ? "你（黑棋）：" : "对方（黑棋）：";
      const whiteLabel = state.localTeam === WHITE ? "你（白棋）：" : "对方（白棋）：";
      document.getElementById("label-black").textContent = blackLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else {
      document.getElementById("label-black").textContent = "黑棋：";
      document.getElementById("label-white").textContent = "白棋：";
    }

    if (state.gameOver) {
      updateMessage("游戏结束！", "info");
    } else if (state.aiThinking) {
      updateMessage("电脑正在思考...", "info");
    } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      updateMessage("轮到电脑行动", "info");
    } else {
      updateMessage("轮到 " + label.text + " 落子", "info");
    }
  }

  function updateMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    if (type === "error") {
      el.className = "error";
    } else if (type === "info") {
      el.className = "info";
    } else {
      el.className = "";
    }
  }

  function showGameOver(state) {
    const winnerText = document.getElementById("winner-text");
    if (state.winner) {
      // Play victory/lose sound
      const isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
      SoundManager.play(isPlayerWin ? "victory" : "lose");

      const label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.winner,
        playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === BLACK ? WHITE : BLACK]
          : [BLACK, WHITE],
      });
      winnerText.textContent = label.text + " 获胜！";
    } else {
      SoundManager.play("draw");
      winnerText.textContent = "平局！";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.mode === "online" && gameState.currentPlayer !== localTeam) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const x = Math.round((px - MARGIN) / CELL_SIZE);
    const y = Math.round((py - MARGIN) / CELL_SIZE);

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
    if (gameState.board[y][x] !== EMPTY) {
      updateMessage("此处已有棋子！", "error");
      return;
    }

    doMove(x, y);

    if (gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendAction({ a: "place", x: x, y: y });
    }
  }

  function doMove(x, y) {
    // Play place sound
    SoundManager.play("place");

    gameState.board = makeMove(gameState.board, x, y, gameState.currentPlayer);
    gameState.lastMove = { x: x, y: y };
    gameState.turnCount++;

    const winLine = checkWinAt(gameState.board, x, y, gameState.currentPlayer);
    if (winLine) {
      gameState.gameOver = true;
      gameState.winner = gameState.currentPlayer;
      gameState.winLine = winLine;
      if (gameState.currentPlayer === BLACK) gameState.scoreBlack++;
      else gameState.scoreWhite++;
      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }
    if (checkDraw(gameState.board)) {
      gameState.gameOver = true;
      gameState.winner = null;
      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    renderGame(gameState);

    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(() => {
      const move = getBestAIMove(gameState.board, gameState.aiTeam);
      gameState.aiThinking = false;
      if (move) doMove(move.x, move.y);
    }, 500);
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || BLACK;
    gameState.firstPlayer = firstPlayer || BLACK;

    if (mode === "pve") {
      if (firstPlayer === BLACK) {
        gameState.playerTeam = BLACK;
        gameState.aiTeam = WHITE;
      } else {
        gameState.playerTeam = WHITE;
        gameState.aiTeam = BLACK;
      }
    }

    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = mode === "pve" ? "block" : "none";
    document.getElementById("game-over").style.display = "none";

    initBoard();
    renderGame(gameState);

    canvas.onclick = handleCanvasClick;

    if (mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function restartGame() {
    if (gameState && gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    document.getElementById("game-over").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("mode-selection").style.display = "flex";
    gameState = null;
  }

  // --- Online mode functions ---

  function cleanupNetwork() {
    if (networkProtocol) {
      networkProtocol.destroy();
      networkProtocol = null;
    }
    if (networkConnection) {
      networkConnection.close();
      networkConnection = null;
    }
    localPlayerRole = null;
    localTeam = null;
    remoteTeam = null;
  }

  function setupNetworkHandlers() {
    networkProtocol.setCallbacks({
      onAction: (actionData) => {
        applyRemoteAction(actionData);
      },
      onRPSChoice: (choice) => {
        handleOnlineRPSReceived(choice);
      },
      onRPSResult: (result) => {
        handleOnlineRPSResult(result);
      },
      onRestart: () => {
        cleanupNetwork();
        document.getElementById("game-over").style.display = "none";
        document.getElementById("game-area").style.display = "none";
        document.getElementById("rps-online").style.display = "none";
        document.getElementById("mode-selection").style.display = "flex";
        gameState = null;
      },
      onDisconnect: () => {
        handleDisconnect();
      },
      onError: (err) => {
        console.error("Network error:", err);
      },
    });
  }

  function startOnlineRPS() {
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-online").style.display = "flex";
    rpsChoices = {
      player1: null,
      player2: null,
      human: null,
      online: null,
      remote: null,
    };
    document.getElementById("rps-online-status").textContent = "请选择";
    document.getElementById("rps-online-result").textContent = "";
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
  }

  function handleOnlineRPSChoice(choice, ev) {
    rpsChoices.online = choice;
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
    ev.target.classList.add("selected");
    document.getElementById("rps-online-status").textContent =
      "已选择：" + getRPSName(choice) + "，等待对方...";
    networkProtocol.sendRPSChoice(choice);
  }

  function handleOnlineRPSReceived(remoteChoice) {
    rpsChoices.remote = remoteChoice;
    checkOnlineRPSComplete();
  }

  function checkOnlineRPSComplete() {
    if (!rpsChoices.online || !rpsChoices.remote) return;

    if (localPlayerRole === "host") {
      const winner = judgeRPS(rpsChoices.online, rpsChoices.remote);
      let firstPlayer;
      if (winner === 1) {
        firstPlayer = "host";
      } else if (winner === -1) {
        firstPlayer = "guest";
      } else {
        networkProtocol.sendRPSResult(null, null);
        rpsChoices.online = null;
        rpsChoices.remote = null;
        document.getElementById("rps-online-status").textContent = "平局！请重新选择";
        document
          .querySelectorAll("#rps-online-buttons .btn-rps")
          .forEach((btn) => btn.classList.remove("selected"));
        return;
      }
      networkProtocol.sendRPSResult(
        {
          host: localPlayerRole === "host" ? rpsChoices.online : rpsChoices.remote,
          guest: localPlayerRole === "host" ? rpsChoices.remote : rpsChoices.online,
        },
        firstPlayer
      );
    }
  }

  function handleOnlineRPSResult(result) {
    const resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document
        .querySelectorAll("#rps-online-buttons .btn-rps")
        .forEach((btn) => btn.classList.remove("selected"));
      return;
    }

    const myChoice = rpsChoices.online;
    const theirChoice = rpsChoices.remote;
    const iWin = result.firstPlayer === localPlayerRole;

    resultEl.textContent =
      "你选择了" +
      getRPSName(myChoice) +
      "，对方选择了" +
      getRPSName(theirChoice) +
      (iWin ? "，你赢了！你先手(黑棋)。" : "，你输了！对方先手(黑棋)。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");

    const hostPiece = BLACK;
    const guestPiece = WHITE;

    if (localPlayerRole === "host") {
      localTeam = firstPlayerRole === "host" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "host" ? guestPiece : hostPiece;
    } else {
      localTeam = firstPlayerRole === "guest" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "guest" ? guestPiece : hostPiece;
    }

    gameState.currentPlayer = firstPlayerRole === "host" ? hostPiece : guestPiece;
    gameState.firstPlayer = gameState.currentPlayer;
    gameState.localTeam = localTeam;
    gameState.remoteTeam = remoteTeam;

    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = "none";
    document.getElementById("game-over").style.display = "none";

    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;
  }

  function applyRemoteAction(actionData) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.currentPlayer !== remoteTeam) return;
    doMove(actionData.x, actionData.y);
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      updateMessage("对方已断开连接", "error");
      const winnerText = document.getElementById("winner-text");
      winnerText.textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

  function handleRPSChoice(player, choice, ev) {
    SoundManager.play("click");
    if (player === "human") {
      rpsChoices.human = choice;
      document.querySelectorAll("#rps-player-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      ev.target.classList.add("selected");

      const choices = ["rock", "scissors", "paper"];
      const aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      const resultEl = document.getElementById("rps-result");
      const humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        SoundManager.play("victory");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你赢了！你先手(黑棋)。";
        setTimeout(() => {
          startGame("pve", BLACK);
        }, 1500);
      } else if (humanWins === -1) {
        SoundManager.play("lose");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你输了！电脑先手(黑棋)。";
        setTimeout(() => {
          startGame("pve", WHITE);
        }, 1500);
      } else {
        SoundManager.play("draw");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，平局！重新选择。";
        rpsChoices.human = null;
        rpsChoices.player2 = null;
      }
    } else {
      rpsChoices["player" + player] = choice;
      document.querySelectorAll("#rps-p" + player + "-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      event.target.classList.add("selected");

      const statusEl = document.getElementById("rps-p" + player + "-status");
      statusEl.textContent = "已选择：" + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        const resultEl = document.getElementById("rps-result");
        const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          SoundManager.play("victory");
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，玩家1赢了！玩家1先手(黑棋)。";
          setTimeout(() => {
            startGame("pvp", BLACK);
          }, 1500);
        } else if (winner === -1) {
          SoundManager.play("victory");
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，玩家2赢了！玩家2先手(黑棋)。";
          setTimeout(() => {
            startGame("pvp", WHITE);
          }, 1500);
        } else {
          SoundManager.play("draw");
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，平局！重新选择。";
          rpsChoices.player1 = null;
          rpsChoices.player2 = null;
          document.getElementById("rps-p1-status").textContent = "请选择";
          document.getElementById("rps-p2-status").textContent = "请选择";
          document.querySelectorAll(".btn-rps").forEach((btn) => {
            btn.classList.remove("selected");
          });
        }
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-pvp").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
      document.getElementById("rps-pvp").style.display = "block";
      document.getElementById("rps-pve").style.display = "none";
      rpsChoices = { player1: null, player2: null, human: null };
    });

    document.getElementById("btn-pve").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
      document.getElementById("rps-pvp").style.display = "none";
      document.getElementById("rps-pve").style.display = "block";
      rpsChoices = { player1: null, player2: null, human: null };
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
              updateMessage(msg, "error");
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

    document.querySelectorAll(".btn-rps").forEach((button) => {
      button.addEventListener("click", (ev) => {
        const player = ev.target.dataset.player;
        const choice = ev.target.dataset.choice;
        handleRPSChoice(player, choice, ev);
      });
    });

    document.getElementById("btn-restart").addEventListener("click", restartGame);

    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
  });
}
