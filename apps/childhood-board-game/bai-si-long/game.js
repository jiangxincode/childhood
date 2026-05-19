/* eslint-disable no-var */
// ============================================================
// 摆四龙 (Bai Si Long) - Place Four Dragons
// 2 players, 4x4 grid, 4 pieces each, form line of 4 to win
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var BOARD_SIZE = 4;
var PIECES_EACH = 4;

// All possible winning lines (4 in a row)
var WIN_LINES = [];
// Rows
for (var r = 0; r < BOARD_SIZE; r++) {
  var line = [];
  for (var c = 0; c < BOARD_SIZE; c++) {
    line.push({ x: c, y: r });
  }
  WIN_LINES.push(line);
}
// Columns
for (var c2 = 0; c2 < BOARD_SIZE; c2++) {
  var line2 = [];
  for (var r2 = 0; r2 < BOARD_SIZE; r2++) {
    line2.push({ x: c2, y: r2 });
  }
  WIN_LINES.push(line2);
}
// Diagonal top-left to bottom-right
WIN_LINES.push([
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 2 },
  { x: 3, y: 3 },
]);
// Diagonal top-right to bottom-left
WIN_LINES.push([
  { x: 3, y: 0 },
  { x: 2, y: 1 },
  { x: 1, y: 2 },
  { x: 0, y: 3 },
]);

function createBoard() {
  var board = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    var row = [];
    for (var x = 0; x < BOARD_SIZE; x++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function createGameState(mode) {
  return {
    mode: mode,
    board: createBoard(),
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    phase: "place", // "place" or "move"
    piecesA: 0,
    piecesB: 0,
    placedA: 0,
    placedB: 0,
    gameOver: false,
    winner: null,
    winLine: null,
    turnCount: 0,
    aiThinking: false,
    scoreA: 0,
    scoreB: 0,
  };
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function countPieces(board, player) {
  var count = 0;
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) count++;
    }
  }
  return count;
}

function getEmptyCells(board) {
  var cells = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === EMPTY) {
        cells.push({ x: x, y: y });
      }
    }
  }
  return cells;
}

function getAdjacentCells(x, y) {
  var dirs = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
  ];
  var cells = [];
  for (var i = 0; i < dirs.length; i++) {
    var nx = x + dirs[i].dx;
    var ny = y + dirs[i].dy;
    if (inBounds(nx, ny)) {
      cells.push({ x: nx, y: ny });
    }
  }
  return cells;
}

function getValidMoves(board, player) {
  var moves = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) {
        var adj = getAdjacentCells(x, y);
        for (var i = 0; i < adj.length; i++) {
          if (board[adj[i].y][adj[i].x] === EMPTY) {
            moves.push({ fromX: x, fromY: y, toX: adj[i].x, toY: adj[i].y });
          }
        }
      }
    }
  }
  return moves;
}

function checkWin(board, player) {
  for (var i = 0; i < WIN_LINES.length; i++) {
    var line = WIN_LINES[i];
    var win = true;
    for (var j = 0; j < line.length; j++) {
      if (board[line[j].y][line[j].x] !== player) {
        win = false;
        break;
      }
    }
    if (win) return { winner: player, line: line };
  }
  return null;
}

function placePiece(board, x, y, player) {
  var newBoard = [];
  for (var row = 0; row < BOARD_SIZE; row++) {
    newBoard.push(board[row].slice());
  }
  newBoard[y][x] = player;
  return newBoard;
}

function movePiece(board, fromX, fromY, toX, toY) {
  var newBoard = [];
  for (var row = 0; row < BOARD_SIZE; row++) {
    newBoard.push(board[row].slice());
  }
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

// Simple AI: prioritize winning moves, then blocking, then random
function getBestAIMove(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;
  var opponent = getOpponent(aiPlayer);

  if (state.phase === "place") {
    // Try to win by placing
    var emptyCells = getEmptyCells(board);
    for (var i = 0; i < emptyCells.length; i++) {
      var testBoard = placePiece(board, emptyCells[i].x, emptyCells[i].y, aiPlayer);
      if (checkWin(testBoard, aiPlayer)) {
        return { type: "place", x: emptyCells[i].x, y: emptyCells[i].y };
      }
    }
    // Block opponent winning move
    for (var j = 0; j < emptyCells.length; j++) {
      var testBoard2 = placePiece(board, emptyCells[j].x, emptyCells[j].y, opponent);
      if (checkWin(testBoard2, opponent)) {
        return { type: "place", x: emptyCells[j].x, y: emptyCells[j].y };
      }
    }
    // Random placement
    var idx = Math.floor(Math.random() * emptyCells.length);
    return { type: "place", x: emptyCells[idx].x, y: emptyCells[idx].y };
  }

  // Move phase
  var moves = getValidMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  // Try winning move
  for (var m = 0; m < moves.length; m++) {
    var testBoard3 = movePiece(board, moves[m].fromX, moves[m].fromY, moves[m].toX, moves[m].toY);
    if (checkWin(testBoard3, aiPlayer)) {
      return {
        type: "move",
        fromX: moves[m].fromX,
        fromY: moves[m].fromY,
        toX: moves[m].toX,
        toY: moves[m].toY,
      };
    }
  }

  // Block opponent winning move
  for (var m2 = 0; m2 < moves.length; m2++) {
    var testBoard4 = movePiece(
      board,
      moves[m2].fromX,
      moves[m2].fromY,
      moves[m2].toX,
      moves[m2].toY
    );
    if (checkWin(testBoard4, opponent)) {
      return {
        type: "move",
        fromX: moves[m2].fromX,
        fromY: moves[m2].fromY,
        toX: moves[m2].toX,
        toY: moves[m2].toY,
      };
    }
  }

  // Random move
  var idx2 = Math.floor(Math.random() * moves.length);
  var mv = moves[idx2];
  return { type: "move", fromX: mv.fromX, fromY: mv.fromY, toX: mv.toX, toY: mv.toY };
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    BOARD_SIZE: BOARD_SIZE,
    PIECES_EACH: PIECES_EACH,
    WIN_LINES: WIN_LINES,
    createBoard: createBoard,
    createGameState: createGameState,
    inBounds: inBounds,
    countPieces: countPieces,
    getEmptyCells: getEmptyCells,
    getAdjacentCells: getAdjacentCells,
    getValidMoves: getValidMoves,
    checkWin: checkWin,
    placePiece: placePiece,
    movePiece: movePiece,
    getOpponent: getOpponent,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI
// ============================================================
if (typeof document !== "undefined") {
  var state = null;
  var selectedPiece = null;

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        var cell = document.createElement("div");
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

  function renderGame() {
    if (!state) return;
    var cells = document.querySelectorAll("#board .cell");
    cells.forEach((cell) => {
      var x = parseInt(cell.dataset.x);
      var y = parseInt(cell.dataset.y);
      cell.textContent = "";
      cell.className = "cell";
      if (state.board[y][x] === PLAYER_A) {
        cell.classList.add("cell-a");
        cell.textContent = "A";
      } else if (state.board[y][x] === PLAYER_B) {
        cell.classList.add("cell-b");
        cell.textContent = "B";
      }
      if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
        cell.classList.add("cell-selected");
      }
      if (selectedPiece) {
        var adj = getAdjacentCells(selectedPiece.x, selectedPiece.y);
        for (var i = 0; i < adj.length; i++) {
          if (adj[i].x === x && adj[i].y === y && state.board[y][x] === EMPTY) {
            cell.classList.add("cell-highlight");
          }
        }
      }
    });

    document.getElementById("current-player").textContent =
      state.currentPlayer === PLAYER_A ? "A" : "B";
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("phase-text").textContent =
      state.phase === "place" ? "布子阶段" : "走子阶段";

    if (state.gameOver) {
      var winnerText = state.winner
        ? state.winner === PLAYER_A
          ? "A 获胜！"
          : "B 获胜！"
        : "平局！";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handleCellClick(x, y) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    if (state.phase === "place") {
      if (state.board[y][x] !== EMPTY) return;
      var player = state.currentPlayer;
      var placedCount = player === PLAYER_A ? state.placedA : state.placedB;
      if (placedCount >= PIECES_EACH) return;

      state.board = placePiece(state.board, x, y, player);
      if (player === PLAYER_A) state.placedA++;
      else state.placedB++;

      var winResult = checkWin(state.board, player);
      if (winResult) {
        state.gameOver = true;
        state.winner = player;
        state.winLine = winResult.line;
      } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
        state.phase = "move";
      }

      state.currentPlayer = getOpponent(state.currentPlayer);
      state.turnCount++;
      renderGame();
      if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
        triggerAI();
      }
      return;
    }

    // Move phase
    if (state.board[y][x] === state.currentPlayer) {
      selectedPiece = { x: x, y: y };
      renderGame();
      return;
    }

    if (selectedPiece && state.board[y][x] === EMPTY) {
      var adj2 = getAdjacentCells(selectedPiece.x, selectedPiece.y);
      for (var i = 0; i < adj2.length; i++) {
        if (adj2[i].x === x && adj2[i].y === y) {
          state.board = movePiece(state.board, selectedPiece.x, selectedPiece.y, x, y);
          selectedPiece = null;

          var winResult2 = checkWin(state.board, state.currentPlayer);
          if (winResult2) {
            state.gameOver = true;
            state.winner = state.currentPlayer;
            state.winLine = winResult2.line;
          }

          state.currentPlayer = getOpponent(state.currentPlayer);
          state.turnCount++;
          renderGame();
          if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
            triggerAI();
          }
          return;
        }
      }
      selectedPiece = null;
      renderGame();
    }
  }

  function triggerAI() {
    state.aiThinking = true;
    renderGame();
    setTimeout(() => {
      var aiMove = getBestAIMove(state);
      if (!aiMove) {
        state.aiThinking = false;
        renderGame();
        return;
      }

      if (aiMove.type === "place") {
        state.board = placePiece(state.board, aiMove.x, aiMove.y, state.aiTeam);
        if (state.aiTeam === PLAYER_A) state.placedA++;
        else state.placedB++;

        var winResult = checkWin(state.board, state.aiTeam);
        if (winResult) {
          state.gameOver = true;
          state.winner = state.aiTeam;
          state.winLine = winResult.line;
        } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
          state.phase = "move";
        }
      } else {
        state.board = movePiece(state.board, aiMove.fromX, aiMove.fromY, aiMove.toX, aiMove.toY);
        var winResult2 = checkWin(state.board, state.aiTeam);
        if (winResult2) {
          state.gameOver = true;
          state.winner = state.aiTeam;
          state.winLine = winResult2.line;
        }
      }

      state.currentPlayer = getOpponent(state.currentPlayer);
      state.turnCount++;
      state.aiThinking = false;
      renderGame();
    }, 600);
  }

  function startGame(mode, firstPlayer) {
    state = createGameState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      state.playerTeam = PLAYER_A;
      state.aiTeam = PLAYER_B;
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
    if (player === "human") {
      var aiChoices = ["rock", "scissors", "paper"];
      var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
      var result = judgeRPS(choice, aiChoice);
      var resultDiv = document.getElementById("rps-result");
      if (result === 1) {
        resultDiv.innerHTML =
          "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，你先手！</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_A);
        }, 1500);
      } else if (result === -1) {
        resultDiv.innerHTML =
          "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，AI先手！</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_B);
        }, 1500);
      } else {
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
    document.getElementById("btn-restart").addEventListener("click", () => {
      document.getElementById("game-over").style.display = "none";
      document.getElementById("mode-selection").style.display = "flex";
    });
  });
}
