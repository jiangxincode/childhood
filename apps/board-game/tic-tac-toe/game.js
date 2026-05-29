/* eslint-disable no-var, no-undef */
// ============================================================
// Tic-Tac-Toe - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const PLAYER_X = "X";
const PLAYER_O = "O";

const WIN_LINES = [
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ], // Row 1
  [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ], // Row 2
  [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ], // Row 3
  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
  ], // Column 1
  [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
  ], // Column 2
  [
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
  ], // Column 3
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ], // Diagonal
  [
    { x: 2, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
  ], // Anti-diagonal
];

function createGameState(mode) {
  const board = [];
  for (let y = 0; y < 3; y++) {
    const row = [];
    for (let x = 0; x < 3; x++) {
      row.push(null);
    }
    board.push(row);
  }
  return {
    mode: mode,
    board: board,
    currentPlayer: PLAYER_X,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    winLine: null,
    turnCount: 0,
    aiThinking: false,
    scoreX: 0,
    scoreO: 0,
  };
}

function checkWin(board) {
  for (let i = 0; i < WIN_LINES.length; i++) {
    const line = WIN_LINES[i];
    const a = board[line[0].y][line[0].x];
    const b = board[line[1].y][line[1].x];
    const c = board[line[2].y][line[2].x];
    if (a && a === b && b === c) {
      return { winner: a, line: line };
    }
  }
  return null;
}

function checkDraw(board) {
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (board[y][x] === null) return false;
    }
  }
  return checkWin(board) === null;
}

function getValidMoves(board) {
  const moves = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (board[y][x] === null) {
        moves.push({ x: x, y: y });
      }
    }
  }
  return moves;
}

function makeMove(board, x, y, player) {
  const newBoard = [];
  for (let r = 0; r < 3; r++) {
    newBoard.push(board[r].slice());
  }
  newBoard[y][x] = player;
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_X ? PLAYER_O : PLAYER_X;
}

// ============================================================
// AI: Minimax Algorithm
// ============================================================

function minimax(board, depth, isMaximizing, aiPlayer) {
  const result = checkWin(board);
  if (result) {
    return result.winner === aiPlayer ? 10 - depth : depth - 10;
  }
  if (checkDraw(board)) return 0;

  const moves = getValidMoves(board);
  if (isMaximizing) {
    var best = -100;
    for (var i = 0; i < moves.length; i++) {
      var newBoard = makeMove(board, moves[i].x, moves[i].y, aiPlayer);
      var score = minimax(newBoard, depth + 1, false, aiPlayer);
      if (score > best) best = score;
    }
    return best;
  } else {
    var best = 100;
    const opponent = getOpponent(aiPlayer);
    for (var i = 0; i < moves.length; i++) {
      var newBoard = makeMove(board, moves[i].x, moves[i].y, opponent);
      var score = minimax(newBoard, depth + 1, true, aiPlayer);
      if (score < best) best = score;
    }
    return best;
  }
}

function getBestAIMove(board, aiPlayer) {
  const moves = getValidMoves(board);
  if (moves.length === 0) return null;

  // First check if AI can win immediately
  for (var i = 0; i < moves.length; i++) {
    var newBoard = makeMove(board, moves[i].x, moves[i].y, aiPlayer);
    if (checkWin(newBoard)) return moves[i];
  }

  // Then check if opponent can win immediately (need to block)
  const opponent = getOpponent(aiPlayer);
  for (var i = 0; i < moves.length; i++) {
    var newBoard = makeMove(board, moves[i].x, moves[i].y, opponent);
    if (checkWin(newBoard)) return moves[i];
  }

  // Minimax selects optimal move
  let bestScore = -100;
  let bestMove = moves[0];
  for (var i = 0; i < moves.length; i++) {
    var newBoard = makeMove(board, moves[i].x, moves[i].y, aiPlayer);
    const score = minimax(newBoard, 0, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[i];
    }
  }
  return bestMove;
}

// ============================================================
// Export for testing
// ============================================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_X: PLAYER_X,
    PLAYER_O: PLAYER_O,
    WIN_LINES: WIN_LINES,
    createGameState: createGameState,
    checkWin: checkWin,
    checkDraw: checkDraw,
    getValidMoves: getValidMoves,
    makeMove: makeMove,
    getOpponent: getOpponent,
    getBestAIMove: getBestAIMove,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName,
  };
}

// ============================================================
// Browser UI
// ============================================================

if (typeof document !== "undefined") {
  let gameState = null;
  let rpsChoices = { player1: null, player2: null, human: null };

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // 'X' or 'O'
  let remoteTeam = null;

  function initBoard() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.addEventListener(
          "click",
          (function (cx, cy) {
            return function () {
              handleCellClick(cx, cy);
            };
          })(x, y)
        );
        boardEl.appendChild(cell);
      }
    }
  }

  function renderGame(state) {
    // Current acting side - shown as 玩家/电脑 (PVE), 玩家1/玩家2 (PVP), or 你/对方 (online)
    let label;
    if (state.mode === "online") {
      const isMyTurn = state.currentPlayer === state.localTeam;
      label = { text: isMyTurn ? "你" : "对方" };
    } else {
      label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.currentPlayer,
        playerSide: state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === PLAYER_X ? PLAYER_O : PLAYER_X]
          : [PLAYER_X, PLAYER_O],
      });
    }
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_X ? "text-x" : "text-o");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("score-x").textContent = state.scoreX;
    document.getElementById("score-o").textContent = state.scoreO;

    const cells = document.querySelectorAll("#board .cell");
    cells.forEach((cell) => {
      const cx = Number.parseInt(cell.dataset.x);
      const cy = Number.parseInt(cell.dataset.y);
      const val = state.board[cy][cx];
      cell.className = "cell";
      cell.textContent = "";
      if (val === PLAYER_X) {
        cell.textContent = "X";
        cell.classList.add("cell-x");
      } else if (val === PLAYER_O) {
        cell.textContent = "O";
        cell.classList.add("cell-o");
      }
    });

    // Highlight winning line
    if (state.winLine) {
      for (let i = 0; i < state.winLine.length; i++) {
        const pos = state.winLine[i];
        const sel = '.cell[data-x="' + pos.x + '"][data-y="' + pos.y + '"]';
        const winCell = document.querySelector(sel);
        if (winCell) winCell.classList.add("cell-win");
      }
    }

    if (state.gameOver) {
      updateMessage("游戏结束！", "info");
    } else if (state.aiThinking) {
      updateMessage("AI正在思考...", "info");
    } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      updateMessage("轮到AI行动", "info");
    } else {
      updateMessage("轮到 " + state.currentPlayer + " 落子", "info");
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
    if (state.winner === "draw") {
      winnerText.textContent = "平局！";
    } else {
      let labelText;
      if (state.mode === "online") {
        labelText = state.winner === state.localTeam ? "你" : "对方";
      } else {
        // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of X/O
        const label = getCurrentPlayerLabel({
          mode: state.mode,
          currentSide: state.winner,
          playerSide: state.playerTeam,
          sidesOrder: state.firstPlayer
            ? [state.firstPlayer, state.firstPlayer === PLAYER_X ? PLAYER_O : PLAYER_X]
            : [PLAYER_X, PLAYER_O],
        });
        labelText = label.text;
      }
      winnerText.textContent = labelText + " 获胜！";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  function handleCellClick(x, y) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.mode === "online" && gameState.currentPlayer !== localTeam) return;
    if (gameState.board[y][x] !== null) {
      updateMessage("此处已有棋子！", "error");
      return;
    }
    doMove(x, y);

    if (gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendAction({ a: "place", x: x, y: y });
    }
  }

  function doMove(x, y) {
    gameState.board = makeMove(gameState.board, x, y, gameState.currentPlayer);
    gameState.turnCount++;

    const result = checkWin(gameState.board);
    if (result) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      gameState.winLine = result.line;
      if (result.winner === PLAYER_X) gameState.scoreX++;
      else gameState.scoreO++;
      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }
    if (checkDraw(gameState.board)) {
      gameState.gameOver = true;
      gameState.winner = "draw";
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
    }, 600);
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || PLAYER_X;
    gameState.firstPlayer = firstPlayer || PLAYER_X;

    if (mode === "pve") {
      if (firstPlayer === PLAYER_X) {
        gameState.playerTeam = PLAYER_X;
        gameState.aiTeam = PLAYER_O;
      } else {
        gameState.playerTeam = PLAYER_O;
        gameState.aiTeam = PLAYER_X;
      }
    }

    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = mode === "pve" ? "block" : "none";
    document.getElementById("game-over").style.display = "none";

    initBoard();
    renderGame(gameState);

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
      (iWin ? "，你赢了！你先手(X)。" : "，你输了！对方先手(X)。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");

    const hostPiece = PLAYER_X;
    const guestPiece = PLAYER_O;

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
    if (player === "human") {
      rpsChoices.human = choice;
      document.querySelectorAll("#rps-player-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      ev.target.classList.add("selected");

      const choices = ["rock", "scissors", "paper"];
      const aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      var resultEl = document.getElementById("rps-result");
      const humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，AI选择了" +
          getRPSName(aiChoice) +
          "，你赢了！你先手(X)。";
        setTimeout(() => {
          startGame("pve", PLAYER_X);
        }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，AI选择了" +
          getRPSName(aiChoice) +
          "，你输了！AI先手(X)。";
        setTimeout(() => {
          startGame("pve", PLAYER_O);
        }, 1500);
      } else {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，AI选择了" +
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
        var resultEl = document.getElementById("rps-result");
        const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，玩家1赢了！玩家1先手(X)。";
          setTimeout(() => {
            startGame("pvp", PLAYER_X);
          }, 1500);
        } else if (winner === -1) {
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，玩家2赢了！玩家2先手(X)。";
          setTimeout(() => {
            startGame("pvp", PLAYER_O);
          }, 1500);
        } else {
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
