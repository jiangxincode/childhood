/* eslint-disable no-var */
// ============================================================
// 蚂蚁搬家 (Ma Yi Ban Jia - Ants Moving House)
// 2 players, 7x5 grid, 4 pieces each, occupy opponent's home to win
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var BOARD_COLS = 7;
var BOARD_ROWS = 5;
var PIECES_EACH = 4;

// Starting positions (4 pieces each, evenly spaced)
var START_A = [
  { x: 0, y: 4 },
  { x: 2, y: 4 },
  { x: 4, y: 4 },
  { x: 6, y: 4 },
];
var START_B = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 4, y: 0 },
  { x: 6, y: 0 },
];

// Home rows for win condition
var HOME_ROW_A = 4; // Player B needs to reach here
var HOME_ROW_B = 0; // Player A needs to reach here

function createBoard() {
  var board = [];
  for (var y = 0; y < BOARD_ROWS; y++) {
    var row = [];
    for (var x = 0; x < BOARD_COLS; x++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function createGameState(mode) {
  var board = createBoard();
  // Place starting pieces
  for (var i = 0; i < PIECES_EACH; i++) {
    board[START_A[i].y][START_A[i].x] = PLAYER_A;
    board[START_B[i].y][START_B[i].x] = PLAYER_B;
  }
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
  };
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_COLS && y >= 0 && y < BOARD_ROWS;
}

function countPieces(board, player) {
  var count = 0;
  for (var y = 0; y < BOARD_ROWS; y++) {
    for (var x = 0; x < BOARD_COLS; x++) {
      if (board[y][x] === player) count++;
    }
  }
  return count;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

// Get orthogonal directions (up, down, left, right)
function getOrthogonalNeighbors(x, y) {
  var dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
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

// Get all valid moves for a player
// Includes: step moves (one orthogonal step to empty cell) AND jump moves (jump over any piece into empty cell beyond)
function getValidMoves(board, player) {
  var moves = [];
  for (var y = 0; y < BOARD_ROWS; y++) {
    for (var x = 0; x < BOARD_COLS; x++) {
      if (board[y][x] === player) {
        var neighbors = getOrthogonalNeighbors(x, y);
        for (var i = 0; i < neighbors.length; i++) {
          var nx = neighbors[i].x;
          var ny = neighbors[i].y;
          if (board[ny][nx] === EMPTY) {
            // Step move
            moves.push({ fromX: x, fromY: y, toX: nx, toY: ny, type: "step" });
          } else {
            // Try jump: if there's a piece (any player) adjacent, try jumping over it
            var jx = nx + (nx - x);
            var jy = ny + (ny - y);
            if (inBounds(jx, jy) && board[jy][jx] === EMPTY) {
              moves.push({ fromX: x, fromY: y, toX: jx, toY: jy, type: "jump" });
            }
          }
        }
      }
    }
  }
  return moves;
}

// Check if a player wins (all 4 pieces in opponent's home row)
function checkWin(board, player) {
  var homeRow = player === PLAYER_A ? HOME_ROW_B : HOME_ROW_A;
  var count = 0;
  for (var x = 0; x < BOARD_COLS; x++) {
    if (board[homeRow][x] === player) count++;
  }
  if (count >= PIECES_EACH) {
    return { winner: player };
  }
  return null;
}

function movePiece(board, fromX, fromY, toX, toY) {
  var newBoard = [];
  for (var row = 0; row < BOARD_ROWS; row++) {
    newBoard.push(board[row].slice());
  }
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

// Simple AI: prioritize winning moves, then advancing toward opponent's home, then random
function getBestAIMove(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;
  var opponent = getOpponent(aiPlayer);

  var moves = getValidMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  // Try winning move
  for (var i = 0; i < moves.length; i++) {
    var testBoard = movePiece(board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
    if (checkWin(testBoard, aiPlayer)) {
      return moves[i];
    }
  }

  // Block opponent winning move
  var oppMoves = getValidMoves(board, opponent);
  for (var j = 0; j < oppMoves.length; j++) {
    var testBoard2 = movePiece(
      board,
      oppMoves[j].fromX,
      oppMoves[j].fromY,
      oppMoves[j].toX,
      oppMoves[j].toY
    );
    if (checkWin(testBoard2, opponent)) {
      // Find a move that blocks: move our piece to the threatened cell
      for (var k = 0; k < moves.length; k++) {
        if (moves[k].toX === oppMoves[j].toX && moves[k].toY === oppMoves[j].toY) {
          return moves[k];
        }
      }
      // If we can't directly block, just make any move
    }
  }

  // Score moves: prefer jumps, prefer moving toward opponent's home
  var bestScore = -Infinity;
  var bestMoves = [];
  for (var m = 0; m < moves.length; m++) {
    var score = 0;
    var mv = moves[m];
    // Prefer jumps over steps
    if (mv.type === "jump") score += 3;
    // Prefer moving toward opponent's home row
    if (aiPlayer === PLAYER_A) {
      score -= mv.toY; // Lower y is closer to home row B
    } else {
      score += mv.toY; // Higher y is closer to home row A
    }
    // Prefer moving pieces that are already closer to goal
    var origDist = aiPlayer === PLAYER_A ? mv.fromY : BOARD_ROWS - 1 - mv.fromY;
    score += BOARD_ROWS - origDist;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [mv];
    } else if (score === bestScore) {
      bestMoves.push(mv);
    }
  }

  // Random among best
  var idx = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[idx];
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    BOARD_COLS: BOARD_COLS,
    BOARD_ROWS: BOARD_ROWS,
    PIECES_EACH: PIECES_EACH,
    HOME_ROW_A: HOME_ROW_A,
    HOME_ROW_B: HOME_ROW_B,
    createBoard: createBoard,
    createGameState: createGameState,
    inBounds: inBounds,
    countPieces: countPieces,
    getOpponent: getOpponent,
    getOrthogonalNeighbors: getOrthogonalNeighbors,
    getValidMoves: getValidMoves,
    checkWin: checkWin,
    movePiece: movePiece,
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
    for (var y = 0; y < BOARD_ROWS; y++) {
      for (var x = 0; x < BOARD_COLS; x++) {
        var cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;
        // Mark home rows
        if (y === HOME_ROW_B) cell.classList.add("home-row-b");
        if (y === HOME_ROW_A) cell.classList.add("home-row-a");
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
    var validMoves = selectedPiece
      ? getValidMovesForPiece(state.board, selectedPiece.x, selectedPiece.y, state.currentPlayer)
      : [];

    cells.forEach((cell) => {
      var x = parseInt(cell.dataset.x);
      var y = parseInt(cell.dataset.y);
      cell.textContent = "";
      cell.className = "cell";
      if (y === HOME_ROW_B) cell.classList.add("home-row-b");
      if (y === HOME_ROW_A) cell.classList.add("home-row-a");

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
      // Highlight valid move targets
      for (var i = 0; i < validMoves.length; i++) {
        if (validMoves[i].toX === x && validMoves[i].toY === y) {
          cell.classList.add(validMoves[i].type === "jump" ? "cell-jump" : "cell-highlight");
        }
      }
    });

    document.getElementById("current-player").textContent =
      state.currentPlayer === PLAYER_A ? "A" : "B";
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;

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

  function getValidMovesForPiece(board, px, py) {
    var moves = [];
    var neighbors = getOrthogonalNeighbors(px, py);
    for (var i = 0; i < neighbors.length; i++) {
      var nx = neighbors[i].x;
      var ny = neighbors[i].y;
      if (board[ny][nx] === EMPTY) {
        moves.push({ fromX: px, fromY: py, toX: nx, toY: ny, type: "step" });
      } else {
        var jx = nx + (nx - px);
        var jy = ny + (ny - py);
        if (inBounds(jx, jy) && board[jy][jx] === EMPTY) {
          moves.push({ fromX: px, fromY: py, toX: jx, toY: jy, type: "jump" });
        }
      }
    }
    return moves;
  }

  function handleCellClick(x, y) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    // If clicking own piece, select it
    if (state.board[y][x] === state.currentPlayer) {
      selectedPiece = { x: x, y: y };
      renderGame();
      return;
    }

    // If a piece is selected and clicking a valid target
    if (selectedPiece) {
      var moves = getValidMovesForPiece(state.board, selectedPiece.x, selectedPiece.y);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].toX === x && moves[i].toY === y) {
          state.board = movePiece(state.board, selectedPiece.x, selectedPiece.y, x, y);
          selectedPiece = null;

          var winResult = checkWin(state.board, state.currentPlayer);
          if (winResult) {
            state.gameOver = true;
            state.winner = state.currentPlayer;
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
      // Clicking elsewhere deselects
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

      state.board = movePiece(state.board, aiMove.fromX, aiMove.fromY, aiMove.toX, aiMove.toY);

      var winResult = checkWin(state.board, state.aiTeam);
      if (winResult) {
        state.gameOver = true;
        state.winner = state.aiTeam;
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
