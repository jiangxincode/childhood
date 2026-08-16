/* eslint-disable no-var, no-undef */
// ============================================================
// 憋茅坑 (Bie Mao Keng) - Block the Well
// 2 players, "区"-shaped board with a well, 2 pieces each
// Win by blocking opponent from moving
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var TOTAL_POSITIONS = 5;
var PIECES_EACH = 2;

// Board: Square with center point + well on right side
// The well replaces the right edge (1-3)
// Pieces cannot move diagonally across two spaces - must go through center
// Positions arranged as:
//   0 ---- 1
//   | \  / |
//   |  4   |  (well on right)
//   | /  \ |
//   2 ---- 3
//
// Edges: square perimeter (0-1, 0-2, 2-3) + center connections (0-4, 1-4, 2-4, 3-4)
// Note: 1-3 edge is replaced by the well
var EDGES = [
  [0, 1], // top
  [0, 2], // left
  [2, 3], // bottom
  [0, 4], // top-left to center
  [1, 4], // top-right to center
  [2, 4], // bottom-left to center
  [3, 4], // bottom-right to center
];

// Position coordinates for SVG rendering
var POSITIONS = [
  { x: 120, y: 60 }, // 0: top-left
  { x: 320, y: 60 }, // 1: top-right
  { x: 120, y: 340 }, // 2: bottom-left
  { x: 320, y: 340 }, // 3: bottom-right
  { x: 220, y: 200 }, // 4: center
];

// Display names for positions
var POSITION_NAMES = ["top-left", "top-right", "bottom-left", "bottom-right", "center"];

// Build adjacency list from edges
var ADJACENCY = [];
for (var i = 0; i < TOTAL_POSITIONS; i++) {
  ADJACENCY.push([]);
}
for (var e = 0; e < EDGES.length; e++) {
  ADJACENCY[EDGES[e][0]].push(EDGES[e][1]);
  ADJACENCY[EDGES[e][1]].push(EDGES[e][0]);
}

function createBoard() {
  var board = [];
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    board.push(EMPTY);
  }
  return board;
}

function createInitialState(mode) {
  var board = createBoard();
  // Default: A at top (0 and 1), B at bottom (2 and 3)
  board[0] = PLAYER_A;
  board[1] = PLAYER_A;
  board[2] = PLAYER_B;
  board[3] = PLAYER_B;
  // Position 4 (center) is empty

  return {
    mode: mode,
    board: board,
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    isFirstTurn: true,
  };
}

function getNeighbors(pos) {
  return ADJACENCY[pos];
}

function getValidMovesForPiece(board, pos) {
  var neighbors = ADJACENCY[pos];
  var moves = [];
  for (var i = 0; i < neighbors.length; i++) {
    if (board[neighbors[i]] === EMPTY) {
      moves.push(neighbors[i]);
    }
  }
  return moves;
}

function getAllValidMoves(board, player) {
  var moves = [];
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    if (board[i] === player) {
      var targets = getValidMovesForPiece(board, i);
      for (var j = 0; j < targets.length; j++) {
        moves.push({ from: i, to: targets[j] });
      }
    }
  }
  return moves;
}

function canMove(board, player) {
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    if (board[i] === player) {
      if (getValidMovesForPiece(board, i).length > 0) {
        return true;
      }
    }
  }
  return false;
}

function checkWin(board) {
  if (!canMove(board, PLAYER_A)) {
    return PLAYER_B;
  }
  if (!canMove(board, PLAYER_B)) {
    return PLAYER_A;
  }
  return null;
}

function movePiece(board, from, to) {
  var newBoard = board.slice();
  newBoard[to] = newBoard[from];
  newBoard[from] = EMPTY;
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

// Check if a move on the first turn would leave the opponent with no moves.
// This prevents the first player from winning immediately on the first move.
function isMoveLegalOnFirstTurn(board, from, to, currentPlayer) {
  var newBoard = movePiece(board, from, to);
  var opponent = getOpponent(currentPlayer);
  return canMove(newBoard, opponent);
}

function countPieces(board, player) {
  var count = 0;
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    if (board[i] === player) count++;
  }
  return count;
}

// ============================================================
// AI: Minimax with alpha-beta pruning (depth-limited)
// ============================================================

// ============================================================
// Module exports
// ============================================================
const createGameAI =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createGameAI
    : globalThis.GameAI.createGameAI;

const { evaluateBoard, minimax, getBestAIMove } = createGameAI({
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  TOTAL_POSITIONS,
  PIECES_EACH,
  EDGES,
  POSITIONS,
  POSITION_NAMES,
  ADJACENCY,
  createBoard,
  createInitialState,
  getNeighbors,
  getValidMovesForPiece,
  getAllValidMoves,
  canMove,
  checkWin,
  movePiece,
  getOpponent,
  isMoveLegalOnFirstTurn,
  countPieces,
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    TOTAL_POSITIONS: TOTAL_POSITIONS,
    PIECES_EACH: PIECES_EACH,
    EDGES: EDGES,
    POSITIONS: POSITIONS,
    POSITION_NAMES: POSITION_NAMES,
    ADJACENCY: ADJACENCY,
    createBoard: createBoard,
    createInitialState: createInitialState,
    getNeighbors: getNeighbors,
    getValidMovesForPiece: getValidMovesForPiece,
    getAllValidMoves: getAllValidMoves,
    canMove: canMove,
    checkWin: checkWin,
    movePiece: movePiece,
    getOpponent: getOpponent,
    isMoveLegalOnFirstTurn: isMoveLegalOnFirstTurn,
    countPieces: countPieces,
    evaluateBoard: evaluateBoard,
    minimax: minimax,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI
// ============================================================
if (typeof document !== "undefined") {
  // Initialize sound manager
  SoundManager.init("../../audio");
  var state = null;
  var selectedPiece = null;
  var rpsChoices = { player1: null, player2: null, human: null };
  var networkProtocol = null;
  var networkConnection = null;
  var roomUI = null;
  var localPlayerRole = null; // 'host' | 'guest'
  var localTeam = null; // PLAYER_A or PLAYER_B
  var remoteTeam = null; // PLAYER_A or PLAYER_B

  function getPlayerName(player) {
    if (state && state.mode === "online") {
      return player === localTeam ? "你" : "对方";
    }
    if (state && state.mode === "pve") {
      return player === PLAYER_A ? "电脑" : "玩家";
    }
    return player === PLAYER_A ? "玩家1" : "玩家2";
  }

  function getPieceLabel(player) {
    if (state && state.mode === "online") {
      return player === localTeam ? "我" : "敌";
    }
    if (state && state.mode === "pve") {
      return player === PLAYER_A ? "电" : "玩";
    }
    return player === PLAYER_A ? "1" : "2";
  }

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 440 420");
    svg.setAttribute("width", "100%");
    svg.setAttribute("style", "max-width: 440px; height: auto;");

    // Shared board theme: glossy stone gradients for pieces.
    if (window.ChildhoodBoardTheme) {
      window.ChildhoodBoardTheme.addGradients(svg);
    }

    // Draw well circle on the right side (replaces the 1-3 edge)
    var wellCircle = document.createElementNS(svgNS, "circle");
    wellCircle.setAttribute("cx", 380);
    wellCircle.setAttribute("cy", 200);
    wellCircle.setAttribute("r", "40");
    wellCircle.setAttribute("class", "well-circle");
    svg.appendChild(wellCircle);

    // Draw well label
    var wellLabel = document.createElementNS(svgNS, "text");
    wellLabel.setAttribute("x", 380);
    wellLabel.setAttribute("y", 155);
    wellLabel.setAttribute("class", "well-label");
    wellLabel.textContent = "茅坑";
    svg.appendChild(wellLabel);

    // Draw edges
    for (var e = 0; e < EDGES.length; e++) {
      var from = EDGES[e][0];
      var to = EDGES[e][1];
      var line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", POSITIONS[from].x);
      line.setAttribute("y1", POSITIONS[from].y);
      line.setAttribute("x2", POSITIONS[to].x);
      line.setAttribute("y2", POSITIONS[to].y);
      line.setAttribute("class", "board-edge");
      svg.appendChild(line);
    }

    // Draw position nodes (click targets)
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "node");
      g.dataset.pos = i;
      g.setAttribute("transform", "translate(" + POSITIONS[i].x + "," + POSITIONS[i].y + ")");

      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", "28");
      circle.setAttribute("class", "node-circle");
      g.appendChild(circle);

      var text = document.createElementNS(svgNS, "text");
      text.setAttribute("class", "node-text");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      g.appendChild(text);

      g.addEventListener(
        "click",
        (function (pos) {
          return function () {
            handlePositionClick(pos);
          };
        })(i)
      );
      svg.appendChild(g);
    }

    boardEl.appendChild(svg);
  }

  function renderGame() {
    if (!state) return;

    var nodes = document.querySelectorAll("#board .node");
    var texts = document.querySelectorAll("#board .node-text");

    nodes.forEach((node) => {
      var pos = Number.parseInt(node.dataset.pos);
      node.setAttribute("class", "node");

      if (state.board[pos] === PLAYER_A) {
        node.classList.add("node-a");
      } else if (state.board[pos] === PLAYER_B) {
        node.classList.add("node-b");
      }

      if (selectedPiece === pos) {
        node.classList.add("node-selected");
      }

      if (selectedPiece !== null) {
        var targets = getValidMovesForPiece(state.board, selectedPiece);
        for (var i = 0; i < targets.length; i++) {
          if (targets[i] === pos) {
            node.classList.add("node-highlight");
          }
        }
      }
    });

    texts.forEach((text) => {
      var pos = Number.parseInt(text.parentElement.dataset.pos);
      text.textContent = "";
      if (state.board[pos] === PLAYER_A) {
        text.textContent = getPieceLabel(PLAYER_A);
      } else if (state.board[pos] === PLAYER_B) {
        text.textContent = getPieceLabel(PLAYER_B);
      }
    });

    document.getElementById("current-player").textContent = getPlayerName(state.currentPlayer);
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;

    var movesA = getAllValidMoves(state.board, PLAYER_A).length;
    var movesB = getAllValidMoves(state.board, PLAYER_B).length;
    document.getElementById("label-a").textContent = getPlayerName(PLAYER_A) + " 可走：";
    document.getElementById("moves-a").textContent = movesA;
    document.getElementById("label-b").textContent = getPlayerName(PLAYER_B) + " 可走：";
    document.getElementById("moves-b").textContent = movesB;

    document.getElementById("message").textContent = "";

    if (state.gameOver) {
      var winnerText = getPlayerName(state.winner) + " 获胜！";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handlePositionClick(pos) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;
    if (state.mode === "online" && state.currentPlayer !== localTeam) return;

    var player = state.currentPlayer;

    if (state.board[pos] === player) {
      selectedPiece = pos;
      renderGame();
      return;
    }

    if (selectedPiece !== null && state.board[pos] === EMPTY) {
      var targets = getValidMovesForPiece(state.board, selectedPiece);
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] === pos) {
          // First-turn rule: cannot block opponent completely on first move
          if (
            state.isFirstTurn &&
            !isMoveLegalOnFirstTurn(state.board, selectedPiece, pos, player)
          ) {
            selectedPiece = null;
            renderGame();
            document.getElementById("message").textContent =
              "首回合不能一步将对方憋死，请选择其他走法！";
            return;
          }
          var fromPos = selectedPiece;
          SoundManager.play("slide");
          state.board = movePiece(state.board, selectedPiece, pos);
          selectedPiece = null;

          var winner = checkWin(state.board);
          if (winner) {
            state.gameOver = true;
            state.winner = winner;
            SoundManager.play("block");
            var isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
            SoundManager.play(isPlayerWin ? "victory" : "lose");
          }

          state.currentPlayer = getOpponent(state.currentPlayer);
          state.turnCount++;
          state.isFirstTurn = false;
          renderGame();

          if (state.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({ a: "move", from: fromPos, to: pos });
          }

          if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
            triggerAI();
          }
          return;
        }
      }
    }

    selectedPiece = null;
    renderGame();
  }

  function triggerAI() {
    state.aiThinking = true;
    renderGame();
    setTimeout(() => {
      var aiMove = getBestAIMove(state);
      if (!aiMove) {
        state.aiThinking = false;
        state.gameOver = true;
        state.winner = getOpponent(state.aiTeam);
        renderGame();
        return;
      }

      state.board = movePiece(state.board, aiMove.from, aiMove.to);
      SoundManager.play("slide");

      var winner = checkWin(state.board);
      if (winner) {
        state.gameOver = true;
        state.winner = winner;
        SoundManager.play("block");
        var isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
        SoundManager.play(isPlayerWin ? "victory" : "lose");
      }

      state.currentPlayer = getOpponent(state.currentPlayer);
      state.turnCount++;
      state.isFirstTurn = false;
      state.aiThinking = false;
      renderGame();
    }, 400);
  }

  function restartGame() {
    if (state && state.mode === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    document.getElementById("game-over").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("mode-selection").style.display = "flex";
    state = null;
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
        state = null;
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
      var winner = judgeRPS(rpsChoices.online, rpsChoices.remote);
      var firstPlayer;
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
    var resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document
        .querySelectorAll("#rps-online-buttons .btn-rps")
        .forEach((btn) => btn.classList.remove("selected"));
      return;
    }

    var myChoice = rpsChoices.online;
    var theirChoice = rpsChoices.remote;
    var iWin = result.firstPlayer === localPlayerRole;

    resultEl.textContent =
      "你选择了" +
      getRPSName(myChoice) +
      "，对方选择了" +
      getRPSName(theirChoice) +
      (iWin ? "，你赢了！你先手。" : "，你输了！对方先手。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    state = createInitialState("online");

    var hostPiece = PLAYER_A;
    var guestPiece = PLAYER_B;

    if (localPlayerRole === "host") {
      localTeam = firstPlayerRole === "host" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "host" ? guestPiece : hostPiece;
    } else {
      localTeam = firstPlayerRole === "guest" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "guest" ? guestPiece : hostPiece;
    }

    state.currentPlayer = firstPlayerRole === "host" ? hostPiece : guestPiece;
    state.localTeam = localTeam;
    state.remoteTeam = remoteTeam;

    selectedPiece = null;
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = "none";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
  }

  function applyRemoteAction(actionData) {
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== remoteTeam) return;
    SoundManager.play("slide");
    state.board = movePiece(state.board, actionData.from, actionData.to);
    selectedPiece = null;

    var winner = checkWin(state.board);
    if (winner) {
      state.gameOver = true;
      state.winner = winner;
      SoundManager.play("block");
      var isPlayerWin = state.mode === "online" ? state.winner === localTeam : true;
      SoundManager.play(isPlayerWin ? "victory" : "lose");
    }

    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;
    state.isFirstTurn = false;
    renderGame();
  }

  function handleDisconnect() {
    if (state && !state.gameOver) {
      state.gameOver = true;
      document.getElementById("winner-text").textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

  function startGame(mode, firstPlayer) {
    state = createInitialState(mode);
    if (mode === "pve") {
      // A is at top (0,1) = AI, B is at bottom (2,3) = Player
      // No swap needed — player (B) is already at bottom
      state.playerTeam = PLAYER_B;
      state.aiTeam = PLAYER_A;
      state.currentPlayer = firstPlayer || PLAYER_A;
    } else {
      state.currentPlayer = firstPlayer || PLAYER_A;
    }
    selectedPiece = null;
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
    if (mode === "pve" && state.currentPlayer === state.aiTeam) {
      triggerAI();
    }
  }

  function handleRPSChoice(player, choice) {
    SoundManager.play("click");
    if (player === "human") {
      var aiChoices = ["rock", "scissors", "paper"];
      var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
      var result = judgeRPS(choice, aiChoice);
      var resultDiv = document.getElementById("rps-result");
      if (result === 1) {
        SoundManager.play("victory");
        // Player wins RPS, player goes first (player is B in PvE)
        resultDiv.innerHTML =
          "<p>你出" + getRPSName(choice) + "，电脑出" + getRPSName(aiChoice) + "，你先手！</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_B);
        }, 1500);
      } else if (result === -1) {
        SoundManager.play("lose");
        // AI wins RPS, AI goes first (AI is A in PvE)
        resultDiv.innerHTML =
          "<p>你出" + getRPSName(choice) + "，电脑出" + getRPSName(aiChoice) + "，电脑先手！</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_A);
        }, 1500);
      } else {
        SoundManager.play("draw");
        resultDiv.innerHTML = "<p>平局！再来一次</p>";
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

    // Online mode button
    var btnOnline = document.getElementById("btn-online");
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
              document.getElementById("message").textContent = msg;
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
        var choice = ev.target.dataset.choice;
        handleOnlineRPSChoice(choice, ev);
      });
    });

    document.getElementById("btn-restart").addEventListener("click", restartGame);
  });
}
