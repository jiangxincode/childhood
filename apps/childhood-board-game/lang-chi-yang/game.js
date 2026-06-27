/* eslint-disable no-var, no-undef */
// ============================================================
// 狼吃羊 (Lang Chi Yang) - Wolf Eats Sheep
// 2 players, 5x5 grid, asymmetric: 3 wolves vs 15 sheep
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A"; // Sheep (羊) - 15 pieces
var PLAYER_B = "B"; // Wolf (狼) - 3 pieces
var EMPTY = null;
var ROW_COUNT = 5;
var COL_COUNT = 5;
var INITIAL_A = 15; // Sheep starts with 15 pieces
var INITIAL_B = 3; // Wolf starts with 3 pieces
var MIN_A_TO_LOSE = 4; // If sheep has fewer than 4 pieces (<=3), wolf wins

// SVG board rendering constants
var BOARD_PADDING = 40;
var CELL_SIZE = 100;
var BOARD_VIEW_W = BOARD_PADDING * 2 + (COL_COUNT - 1) * CELL_SIZE;
var BOARD_VIEW_H = BOARD_PADDING * 2 + (ROW_COUNT - 1) * CELL_SIZE;
var svgNS = "http://www.w3.org/2000/svg";

var DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function createBoard() {
  var board = [];
  for (var r = 0; r < ROW_COUNT; r++) {
    var row = [];
    for (var c = 0; c < COL_COUNT; c++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function getInitialBoard() {
  var board = createBoard();
  // Wolf (B): top row middle 3 positions (col 1,2,3)
  board[0][1] = PLAYER_B;
  board[0][2] = PLAYER_B;
  board[0][3] = PLAYER_B;
  // Sheep (A): rows 2-4, all 5 columns = 15 pieces
  // Row 2: all 5 columns
  board[2][0] = PLAYER_A;
  board[2][1] = PLAYER_A;
  board[2][2] = PLAYER_A;
  board[2][3] = PLAYER_A;
  board[2][4] = PLAYER_A;
  // Row 3: all 5 columns
  board[3][0] = PLAYER_A;
  board[3][1] = PLAYER_A;
  board[3][2] = PLAYER_A;
  board[3][3] = PLAYER_A;
  board[3][4] = PLAYER_A;
  // Row 4: all 5 columns
  board[4][0] = PLAYER_A;
  board[4][1] = PLAYER_A;
  board[4][2] = PLAYER_A;
  board[4][3] = PLAYER_A;
  board[4][4] = PLAYER_A;
  return board;
}

function createGameState(mode) {
  return {
    mode: mode,
    board: getInitialBoard(),
    currentPlayer: PLAYER_B, // Wolf (狼) always moves first
    playerTeam: null,
    aiTeam: null,
    piecesA: INITIAL_A,
    piecesB: INITIAL_B,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    lastJump: null,
  };
}

function inBounds(r, c) {
  return r >= 0 && r < ROW_COUNT && c >= 0 && c < COL_COUNT;
}

function countPieces(board, player) {
  var count = 0;
  for (var r = 0; r < ROW_COUNT; r++) {
    for (var c = 0; c < COL_COUNT; c++) {
      if (board[r][c] === player) count++;
    }
  }
  return count;
}

function getAdjacentCells(r, c) {
  var cells = [];
  for (var i = 0; i < DIRECTIONS.length; i++) {
    var nr = r + DIRECTIONS[i].dr;
    var nc = c + DIRECTIONS[i].dc;
    if (inBounds(nr, nc)) {
      cells.push({ r: nr, c: nc });
    }
  }
  return cells;
}

// Get valid step moves for a piece (one step to adjacent empty cell)
function getStepMoves(board, r, c) {
  var moves = [];
  var adj = getAdjacentCells(r, c);
  for (var i = 0; i < adj.length; i++) {
    if (board[adj[i].r][adj[i].c] === EMPTY) {
      moves.push({ fromR: r, fromC: c, toR: adj[i].r, toC: adj[i].c, type: "step" });
    }
  }
  return moves;
}

// Get valid jump capture moves for a wolf (B only)
// B at (r,c), empty at (r+dr, c+dc), sheep at (r+2*dr, c+2*dc)
function getJumpMoves(board, r, c) {
  var moves = [];
  for (var i = 0; i < DIRECTIONS.length; i++) {
    var mr = r + DIRECTIONS[i].dr;
    var mc = c + DIRECTIONS[i].dc;
    var tr = r + 2 * DIRECTIONS[i].dr;
    var tc = c + 2 * DIRECTIONS[i].dc;
    if (inBounds(tr, tc) && board[mr][mc] === EMPTY && board[tr][tc] === PLAYER_A) {
      moves.push({
        fromR: r,
        fromC: c,
        toR: tr,
        toC: tc,
        captureR: tr,
        captureC: tc,
        type: "jump",
      });
    }
  }
  return moves;
}

// Get all valid moves for a player
function getValidMoves(board, player) {
  var moves = [];
  for (var r = 0; r < ROW_COUNT; r++) {
    for (var c = 0; c < COL_COUNT; c++) {
      if (board[r][c] === player) {
        var stepMoves = getStepMoves(board, r, c);
        for (var i = 0; i < stepMoves.length; i++) {
          moves.push(stepMoves[i]);
        }
        // Only wolves (B) can jump
        if (player === PLAYER_B) {
          var jumpMoves = getJumpMoves(board, r, c);
          for (var j = 0; j < jumpMoves.length; j++) {
            moves.push(jumpMoves[j]);
          }
        }
      }
    }
  }
  return moves;
}

// Check win conditions: returns winner or null
function checkWin(board) {
  var countA = countPieces(board, PLAYER_A);
  var countB = countPieces(board, PLAYER_B);

  // Wolf (B) wins when sheep (A) pieces drop below threshold
  if (countA < MIN_A_TO_LOSE) {
    return PLAYER_B;
  }

  // Sheep (A) wins when wolf (B) has no valid moves
  if (countB === 0) {
    return PLAYER_A;
  }
  var bMoves = getValidMoves(board, PLAYER_B);
  if (bMoves.length === 0) {
    return PLAYER_A;
  }

  return null;
}

function cloneBoard(board) {
  var newBoard = [];
  for (var r = 0; r < ROW_COUNT; r++) {
    newBoard.push(board[r].slice());
  }
  return newBoard;
}

function applyMove(board, move) {
  var newBoard = cloneBoard(board);
  newBoard[move.toR][move.toC] = newBoard[move.fromR][move.fromC];
  newBoard[move.fromR][move.fromC] = EMPTY;
  if (move.type === "jump") {
    // Only clear capture position if it differs from landing position
    if (move.captureR !== move.toR || move.captureC !== move.toC) {
      newBoard[move.captureR][move.captureC] = EMPTY;
    }
  }
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

// AI for wolf (B): prioritize captures, then avoid traps, then random

// AI for sheep (A): try to surround wolf, avoid being captured

// ============================================================
// Module exports
// ============================================================
const createGameAI =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createGameAI
    : globalThis.GameAI.createGameAI;

const { getBestAIMove_B, getBestAIMove_A, getBestAIMove } = createGameAI({
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  ROW_COUNT,
  COL_COUNT,
  INITIAL_A,
  INITIAL_B,
  MIN_A_TO_LOSE,
  BOARD_PADDING,
  CELL_SIZE,
  BOARD_VIEW_W,
  BOARD_VIEW_H,
  svgNS,
  DIRECTIONS,
  createBoard,
  getInitialBoard,
  createGameState,
  inBounds,
  countPieces,
  getAdjacentCells,
  getStepMoves,
  getJumpMoves,
  getValidMoves,
  checkWin,
  cloneBoard,
  applyMove,
  getOpponent,
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    ROW_COUNT: ROW_COUNT,
    COL_COUNT: COL_COUNT,
    INITIAL_A: INITIAL_A,
    INITIAL_B: INITIAL_B,
    MIN_A_TO_LOSE: MIN_A_TO_LOSE,
    DIRECTIONS: DIRECTIONS,
    createBoard: createBoard,
    getInitialBoard: getInitialBoard,
    createGameState: createGameState,
    inBounds: inBounds,
    countPieces: countPieces,
    getAdjacentCells: getAdjacentCells,
    getStepMoves: getStepMoves,
    getJumpMoves: getJumpMoves,
    getValidMoves: getValidMoves,
    checkWin: checkWin,
    cloneBoard: cloneBoard,
    applyMove: applyMove,
    getOpponent: getOpponent,
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
  var boardFlipped = false; // true when player is wolf (bottom)

  // Online mode state
  var networkProtocol = null;
  var networkConnection = null;
  var roomUI = null;
  var localPlayerRole = null; // 'host' | 'guest'
  var localTeam = null;
  var remoteTeam = null;

  function nodeToPx(x, y) {
    return {
      cx: BOARD_PADDING + x * CELL_SIZE,
      cy: BOARD_PADDING + y * CELL_SIZE,
    };
  }

  // Convert screen coordinates to board coordinates (handle flip)
  function screenToBoard(sx, sy) {
    if (boardFlipped) {
      return { x: sx, y: ROW_COUNT - 1 - sy };
    }
    return { x: sx, y: sy };
  }

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + BOARD_VIEW_W + " " + BOARD_VIEW_H);
    svg.setAttribute("class", "board-svg");

    // Draw horizontal lines (one per row)
    for (var r = 0; r < ROW_COUNT; r++) {
      var p0 = nodeToPx(0, r);
      var p1 = nodeToPx(COL_COUNT - 1, r);
      var hLine = document.createElementNS(svgNS, "line");
      hLine.setAttribute("x1", p0.cx);
      hLine.setAttribute("y1", p0.cy);
      hLine.setAttribute("x2", p1.cx);
      hLine.setAttribute("y2", p1.cy);
      hLine.setAttribute("class", "board-line");
      svg.appendChild(hLine);
    }

    // Draw vertical lines (one per column)
    for (var c = 0; c < COL_COUNT; c++) {
      var q0 = nodeToPx(c, 0);
      var q1 = nodeToPx(c, ROW_COUNT - 1);
      var vLine = document.createElementNS(svgNS, "line");
      vLine.setAttribute("x1", q0.cx);
      vLine.setAttribute("y1", q0.cy);
      vLine.setAttribute("x2", q1.cx);
      vLine.setAttribute("y2", q1.cy);
      vLine.setAttribute("class", "board-line");
      svg.appendChild(vLine);
    }

    // Interactive intersection nodes
    for (var sy = 0; sy < ROW_COUNT; sy++) {
      for (var sx = 0; sx < COL_COUNT; sx++) {
        var boardPos = screenToBoard(sx, sy);
        var pt = nodeToPx(sx, sy);
        var g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "node");
        g.dataset.x = boardPos.x;
        g.dataset.y = boardPos.y;
        g.setAttribute("transform", "translate(" + pt.cx + "," + pt.cy + ")");

        // Wide invisible hit area for easier tapping
        var hit = document.createElementNS(svgNS, "circle");
        hit.setAttribute("r", CELL_SIZE / 2 - 2);
        hit.setAttribute("class", "node-hit");
        g.appendChild(hit);

        // Small dot showing the intersection when no piece is placed
        var dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("r", 4);
        dot.setAttribute("class", "node-dot");
        g.appendChild(dot);

        // Piece circle (hidden when empty)
        var circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", 22);
        circle.setAttribute("class", "node-circle");
        g.appendChild(circle);

        // Text label for the piece
        var text = document.createElementNS(svgNS, "text");
        text.setAttribute("class", "node-text");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central");
        g.appendChild(text);

        g.addEventListener(
          "click",
          (function (cx, cy) {
            return function () {
              handlePositionClick(cx, cy);
            };
          })(sx, sy)
        );
        svg.appendChild(g);
      }
    }

    boardEl.appendChild(svg);
  }

  function renderGame() {
    if (!state) return;
    var nodes = document.querySelectorAll("#board .node");
    nodes.forEach((g) => {
      var nx = Number.parseInt(g.dataset.x);
      var ny = Number.parseInt(g.dataset.y);
      var classes = ["node"];
      var label = "";
      if (state.board[ny][nx] === PLAYER_A) {
        classes.push("node-a");
        label = "羊";
      } else if (state.board[ny][nx] === PLAYER_B) {
        classes.push("node-b");
        label = "狼";
      } else {
        classes.push("node-empty");
      }
      if (selectedPiece && selectedPiece.r === ny && selectedPiece.c === nx) {
        classes.push("node-selected");
      }
      if (selectedPiece) {
        // Highlight step moves
        var stepMoves = getStepMoves(state.board, selectedPiece.r, selectedPiece.c);
        for (var i = 0; i < stepMoves.length; i++) {
          if (stepMoves[i].toR === ny && stepMoves[i].toC === nx) {
            classes.push("node-highlight");
          }
        }
        // Highlight jump moves for wolf
        if (state.currentPlayer === PLAYER_B) {
          var jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
          for (var j = 0; j < jumpMoves.length; j++) {
            if (jumpMoves[j].toR === ny && jumpMoves[j].toC === nx) {
              classes.push("node-highlight");
            }
          }
        }
      }
      // Highlight last jump capture
      if (state.lastJump && state.lastJump.captureR === ny && state.lastJump.captureC === nx) {
        classes.push("node-captured");
      }
      g.setAttribute("class", classes.join(" "));
      var text = g.querySelector(".node-text");
      if (text) text.textContent = label;
    });

    // Current acting side - shown as 玩家/电脑 (PVE), 玩家1/玩家2 (PVP), or 你/对方 (online)
    var label;
    if (state.mode === "online") {
      var isMyTurn = state.currentPlayer === localTeam;
      label = { text: isMyTurn ? "你" : "对方" };
    } else {
      label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.currentPlayer,
        playerSide: state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
          : [PLAYER_A, PLAYER_B],
      });
    }
    var playerClass = state.currentPlayer === PLAYER_A ? "team-a" : "team-b";
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className = "team-indicator " + playerClass;
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("pieces-a").textContent = state.piecesA;
    document.getElementById("pieces-b").textContent = state.piecesB;

    if (state.gameOver) {
      var winnerText;
      if (state.mode === "online") {
        winnerText = state.winner === localTeam ? "你" : "对方";
      } else {
        var winnerLabel = getCurrentPlayerLabel({
          mode: state.mode,
          currentSide: state.winner,
          playerSide: state.playerTeam,
          sidesOrder: state.firstPlayer
            ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
            : [PLAYER_A, PLAYER_B],
        });
        winnerText = winnerLabel.text;
      }
      document.getElementById("winner-text").textContent = winnerText + " 获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handlePositionClick(x, y) {
    if (!state || state.gameOver) return;
    if (state.mode === "online" && state.currentPlayer !== localTeam) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    // Convert screen coordinates to board coordinates
    var boardPos = screenToBoard(x, y);
    var r = boardPos.y;
    var c = boardPos.x;

    // Select own piece
    if (state.board[r][c] === state.currentPlayer) {
      selectedPiece = { r: r, c: c };
      renderGame();
      return;
    }

    // Try to move selected piece
    if (selectedPiece) {
      // Try step move
      var stepMoves = getStepMoves(state.board, selectedPiece.r, selectedPiece.c);
      for (var i = 0; i < stepMoves.length; i++) {
        if (stepMoves[i].toR === r && stepMoves[i].toC === c) {
          SoundManager.play("slide");
          if (state.currentPlayer === PLAYER_A) SoundManager.play("sheep");
          state.board = applyMove(state.board, stepMoves[i]);
          state.lastJump = null;
          if (state.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({
              a: "move",
              fx: selectedPiece.r,
              fy: selectedPiece.c,
              tx: r,
              ty: c,
              mt: "step",
            });
          }
          finishTurn();
          return;
        }
      }

      // Try jump move (wolf only)
      if (state.currentPlayer === PLAYER_B) {
        var jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
        for (var j = 0; j < jumpMoves.length; j++) {
          if (jumpMoves[j].toR === r && jumpMoves[j].toC === c) {
            SoundManager.play("wolf");
            state.board = applyMove(state.board, jumpMoves[j]);
            state.piecesA = countPieces(state.board, PLAYER_A);
            state.lastJump = { captureR: r, captureC: c };
            if (state.mode === "online" && networkProtocol) {
              networkProtocol.sendAction({
                a: "move",
                fx: selectedPiece.r,
                fy: selectedPiece.c,
                tx: r,
                ty: c,
                mt: "jump",
                cx: r,
                cy: c,
              });
            }
            finishTurn();
            return;
          }
        }
      }

      // Clicked on invalid position, deselect
      selectedPiece = null;
      renderGame();
    }
  }

  function finishTurn() {
    selectedPiece = null;

    var winner = checkWin(state.board);
    if (winner) {
      state.gameOver = true;
      state.winner = winner;
      var isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
      SoundManager.play(isPlayerWin ? "victory" : "lose");
    }

    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;
    renderGame();

    if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      triggerAI();
    }
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

      state.board = applyMove(state.board, aiMove);
      SoundManager.play(aiMove.type === "jump" ? "wolf" : "slide");
      if (aiMove.type === "jump") {
        state.piecesA = countPieces(state.board, PLAYER_A);
        state.lastJump = { captureR: aiMove.captureR, captureC: aiMove.captureC };
      } else {
        state.lastJump = null;
      }

      state.aiThinking = false;
      finishTurn();
    }, 600);
  }

  function startGame(mode, playerTeam) {
    state = createGameState(mode);
    state.currentPlayer = PLAYER_B; // Wolf always moves first
    state.firstPlayer = PLAYER_B;
    if (mode === "pve") {
      state.playerTeam = playerTeam;
      state.aiTeam = playerTeam === PLAYER_A ? PLAYER_B : PLAYER_A;
      // Flip board so player's pieces are at the bottom
      boardFlipped = playerTeam === PLAYER_B;
    } else {
      boardFlipped = false;
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
        resultDiv.innerHTML =
          "<p>你出" +
          getRPSName(choice) +
          "，电脑出" +
          getRPSName(aiChoice) +
          "，你赢了！你扮演狼（先手）。</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_B); // Winner plays as wolf
        }, 1500);
      } else if (result === -1) {
        SoundManager.play("lose");
        resultDiv.innerHTML =
          "<p>你出" +
          getRPSName(choice) +
          "，电脑出" +
          getRPSName(aiChoice) +
          "，你输了！电脑扮演狼（先手）。</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_A); // Loser plays as sheep
        }, 1500);
      } else {
        SoundManager.play("draw");
        resultDiv.innerHTML = "<p>平局！再来一次</p>";
      }
    }
  }

  // --- Restart (with online cleanup) ---

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
      onAction: function (actionData) {
        applyRemoteAction(actionData);
      },
      onRPSChoice: function (choice) {
        handleOnlineRPSReceived(choice);
      },
      onRPSResult: function (result) {
        handleOnlineRPSResult(result);
      },
      onRestart: function () {
        cleanupNetwork();
        document.getElementById("game-over").style.display = "none";
        document.getElementById("game-area").style.display = "none";
        document.getElementById("rps-online").style.display = "none";
        document.getElementById("mode-selection").style.display = "flex";
        state = null;
      },
      onDisconnect: function () {
        handleDisconnect();
      },
    });
  }

  var rpsChoices = { online: null, remote: null };

  function startOnlineRPS() {
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-online").style.display = "flex";
    rpsChoices = { online: null, remote: null };
    document.getElementById("rps-online-status").textContent = "请选择";
    document.getElementById("rps-online-result").textContent = "";
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
      btn.classList.remove("selected");
    });
  }

  function handleOnlineRPSChoice(choice, ev) {
    rpsChoices.online = choice;
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
      btn.classList.remove("selected");
    });
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
        document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
          btn.classList.remove("selected");
        });
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
      document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
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
      (iWin ? "，你赢了！你扮演狼（先手）。" : "，你输了！对方扮演狼（先手）。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    state = createGameState("online");

    // Winner plays as wolf (PLAYER_B), loser plays as sheep (PLAYER_A)
    var winnerPiece = PLAYER_B;
    var loserPiece = PLAYER_A;

    if (localPlayerRole === firstPlayerRole) {
      // I am the winner (first player), play as wolf
      localTeam = winnerPiece;
      remoteTeam = loserPiece;
    } else {
      // I am the loser, play as sheep
      localTeam = loserPiece;
      remoteTeam = winnerPiece;
    }

    state.currentPlayer = PLAYER_B; // Wolf always moves first
    state.firstPlayer = PLAYER_B;
    state.playerTeam = localTeam;
    // Flip board so player's pieces are at the bottom
    boardFlipped = localTeam === PLAYER_B;

    selectedPiece = null;
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
  }

  function applyRemoteAction(actionData) {
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== remoteTeam) return;
    // actionData = { a: "move", fx, fy, tx, ty, mt: "step"|"jump", cx?, cy? }
    var fromR = actionData.fx;
    var fromC = actionData.fy;
    var toR = actionData.tx;
    var toC = actionData.ty;

    // Find and apply the matching move
    var stepMoves = getStepMoves(state.board, fromR, fromC);
    for (var i = 0; i < stepMoves.length; i++) {
      if (stepMoves[i].toR === toR && stepMoves[i].toC === toC) {
        SoundManager.play("slide");
        if (state.currentPlayer === PLAYER_A) SoundManager.play("sheep");
        state.board = applyMove(state.board, stepMoves[i]);
        state.lastJump = null;
        finishTurn();
        return;
      }
    }

    if (state.currentPlayer === PLAYER_B) {
      var jumpMoves = getJumpMoves(state.board, fromR, fromC);
      for (var j = 0; j < jumpMoves.length; j++) {
        if (jumpMoves[j].toR === toR && jumpMoves[j].toC === toC) {
          SoundManager.play("wolf");
          state.board = applyMove(state.board, jumpMoves[j]);
          state.piecesA = countPieces(state.board, PLAYER_A);
          state.lastJump = { captureR: toR, captureC: toC };
          finishTurn();
          return;
        }
      }
    }
  }

  function handleDisconnect() {
    if (state && !state.gameOver) {
      state.gameOver = true;
      document.getElementById("winner-text").textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-pvp").addEventListener("click", () => {
      startGame("pvp", PLAYER_A);
    });
    document.getElementById("btn-pve").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
    });

    // Online mode button
    var btnOnline = document.getElementById("btn-online");
    if (btnOnline) {
      if (!RoomUI.isSupported()) {
        btnOnline.style.display = "none";
      } else {
        btnOnline.addEventListener("click", () => {
          roomUI = new RoomUI({
            onConnectionEstablished: function (connection, protocol, role) {
              networkConnection = connection;
              networkProtocol = protocol;
              localPlayerRole = role;
              setupNetworkHandlers();
              startOnlineRPS();
            },
            onError: function (msg) {
              document.getElementById("message").textContent = msg;
            },
            onCancel: function () {
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

    document.getElementById("rps-pve").style.display = "block";
    document.querySelectorAll("#rps-pve .btn-rps").forEach((btn) => {
      btn.addEventListener("click", function () {
        handleRPSChoice("human", this.dataset.choice);
      });
    });
    document.getElementById("btn-restart").addEventListener("click", restartGame);
  });
}
