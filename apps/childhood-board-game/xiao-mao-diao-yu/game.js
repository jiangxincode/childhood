/* eslint-disable no-var */
// ============================================================
// 小猫钓鱼 (Xiao Mao Diao Yu - Cat Fishing)
// 2 players, cross-shaped board, 2 pieces each
// Win by blocking opponent so they have no valid moves
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;

// Cross-shaped board: 9 positions
// Vertical bar:  top(0) -- mid-top(1) -- center(2) -- mid-bottom(3) -- bottom(4)
// Horizontal bar: left(5) -- mid-left(6) -- center(2) -- mid-right(7) -- right(8)
// Center (pos 2) is shared between both bars.
//
// Grid layout (5x5):
//        .  .  0  .  .
//        .  .  1  .  .
//        5  6  2  7  8
//        .  .  3  .  .
//        .  .  4  .  .

var BOARD_POSITIONS = [
  { x: 2, y: 0 }, // 0: top
  { x: 2, y: 1 }, // 1: mid-top
  { x: 2, y: 2 }, // 2: center
  { x: 2, y: 3 }, // 3: mid-bottom
  { x: 2, y: 4 }, // 4: bottom
  { x: 0, y: 2 }, // 5: left
  { x: 1, y: 2 }, // 6: mid-left
  { x: 3, y: 2 }, // 7: mid-right
  { x: 4, y: 2 }, // 8: right
];

// Adjacency: which positions are connected (one step apart)
var ADJACENCY = [
  [1], // 0: top -> mid-top
  [0, 2], // 1: mid-top -> top, center
  [1, 3, 6, 7], // 2: center -> mid-top, mid-bottom, mid-left, mid-right
  [2, 4], // 3: mid-bottom -> center, bottom
  [3], // 4: bottom -> mid-bottom
  [6], // 5: left -> mid-left
  [5, 2], // 6: mid-left -> left, center
  [2, 8], // 7: mid-right -> center, right
  [7], // 8: right -> mid-right
];

var PIECES_EACH = 2;

// Player A starts on vertical bar ends: top(0) and bottom(4)
// Player B starts on horizontal bar ends: left(5) and right(8)
var INITIAL_POSITIONS_A = [0, 4];
var INITIAL_POSITIONS_B = [5, 8];

// Grid size for rendering
var GRID_COLS = 5;
var GRID_ROWS = 5;

function createBoard() {
  var board = [];
  for (var i = 0; i < BOARD_POSITIONS.length; i++) {
    board.push(EMPTY);
  }
  return board;
}

function createGameState(mode) {
  var board = createBoard();
  // Place initial pieces
  board[INITIAL_POSITIONS_A[0]] = PLAYER_A;
  board[INITIAL_POSITIONS_A[1]] = PLAYER_A;
  board[INITIAL_POSITIONS_B[0]] = PLAYER_B;
  board[INITIAL_POSITIONS_B[1]] = PLAYER_B;

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
    scoreA: 0,
    scoreB: 0,
  };
}

function getNeighbors(posIndex) {
  return ADJACENCY[posIndex];
}

function getPlayerPieces(board, player) {
  var pieces = [];
  for (var i = 0; i < board.length; i++) {
    if (board[i] === player) {
      pieces.push(i);
    }
  }
  return pieces;
}

function getValidMoves(board, player) {
  var moves = [];
  var pieces = getPlayerPieces(board, player);
  for (var p = 0; p < pieces.length; p++) {
    var from = pieces[p];
    var neighbors = ADJACENCY[from];
    for (var n = 0; n < neighbors.length; n++) {
      var to = neighbors[n];
      if (board[to] === EMPTY) {
        moves.push({ from: from, to: to });
      }
    }
  }
  return moves;
}

function hasValidMoves(board, player) {
  return getValidMoves(board, player).length > 0;
}

function checkWin(board, currentPlayer) {
  // Win condition: opponent has no valid moves
  var opponent = getOpponent(currentPlayer);
  if (!hasValidMoves(board, opponent)) {
    return { winner: currentPlayer, reason: "blocked" };
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

// ============================================================
// AI
// ============================================================

function evaluateBoard(board, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  var aiMoves = getValidMoves(board, aiPlayer);
  var oppMoves = getValidMoves(board, opponent);

  // Opponent blocked: win
  if (oppMoves.length === 0) return 1000;
  // AI blocked: lose
  if (aiMoves.length === 0) return -1000;

  // Heuristic: more mobility is better, opponent having fewer moves is better
  return aiMoves.length - oppMoves.length * 2;
}

function minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
  var opponent = getOpponent(aiPlayer);

  if (depth === 0) {
    return { score: evaluateBoard(board, aiPlayer), move: null };
  }

  var currentPlayer = isMaximizing ? aiPlayer : opponent;
  var moves = getValidMoves(board, currentPlayer);

  // No valid moves = current player loses
  if (moves.length === 0) {
    return {
      score: isMaximizing ? -1000 - depth : 1000 + depth,
      move: null,
    };
  }

  var bestMove = moves[0];

  if (isMaximizing) {
    var maxScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var newBoard = movePiece(board, moves[i].from, moves[i].to);
      var result = minimax(newBoard, depth - 1, false, aiPlayer, alpha, beta);
      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = moves[i];
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    var minScore = Infinity;
    for (var j = 0; j < moves.length; j++) {
      var newBoard2 = movePiece(board, moves[j].from, moves[j].to);
      var result2 = minimax(newBoard2, depth - 1, true, aiPlayer, alpha, beta);
      if (result2.score < minScore) {
        minScore = result2.score;
        bestMove = moves[j];
      }
      beta = Math.min(beta, result2.score);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

function getBestAIMove(state) {
  var aiPlayer = state.aiTeam;
  var moves = getValidMoves(state.board, aiPlayer);
  if (moves.length === 0) return null;

  // Try immediate win
  for (var i = 0; i < moves.length; i++) {
    var newBoard = movePiece(state.board, moves[i].from, moves[i].to);
    if (!hasValidMoves(newBoard, getOpponent(aiPlayer))) {
      return moves[i];
    }
  }

  // Use minimax for strategic play
  var depth = 6;
  var result = minimax(state.board, depth, true, aiPlayer, -Infinity, Infinity);
  return result.move || moves[0];
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    PIECES_EACH: PIECES_EACH,
    BOARD_POSITIONS: BOARD_POSITIONS,
    ADJACENCY: ADJACENCY,
    INITIAL_POSITIONS_A: INITIAL_POSITIONS_A,
    INITIAL_POSITIONS_B: INITIAL_POSITIONS_B,
    GRID_COLS: GRID_COLS,
    GRID_ROWS: GRID_ROWS,
    createBoard: createBoard,
    createGameState: createGameState,
    getNeighbors: getNeighbors,
    getPlayerPieces: getPlayerPieces,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    checkWin: checkWin,
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

    // Create a 5x5 grid, only render valid positions
    var posToIndex = {};
    for (var i = 0; i < BOARD_POSITIONS.length; i++) {
      var key = BOARD_POSITIONS[i].x + "," + BOARD_POSITIONS[i].y;
      posToIndex[key] = i;
    }

    for (var y = 0; y < GRID_ROWS; y++) {
      for (var x = 0; x < GRID_COLS; x++) {
        var cell = document.createElement("div");
        var cellKey = x + "," + y;

        if (posToIndex[cellKey] !== undefined) {
          cell.className = "cell cell-valid";
          cell.dataset.pos = posToIndex[cellKey];
          var posIdx = posToIndex[cellKey];
          cell.addEventListener(
            "click",
            (function (idx) {
              return function () {
                handleCellClick(idx);
              };
            })(posIdx)
          );
        } else {
          cell.className = "cell cell-empty";
        }

        boardEl.appendChild(cell);
      }
    }

    drawLines();
  }

  function drawLines() {
    var boardEl = document.getElementById("board");
    var existingLines = boardEl.querySelectorAll(".line");
    for (var l = 0; l < existingLines.length; l++) {
      existingLines[l].remove();
    }

    var cellSize = 70;
    var gap = 4;
    var unit = cellSize + gap;

    for (var i = 0; i < ADJACENCY.length; i++) {
      var neighbors = ADJACENCY[i];
      for (var n = 0; n < neighbors.length; n++) {
        var j = neighbors[n];
        if (j > i) {
          var p1 = BOARD_POSITIONS[i];
          var p2 = BOARD_POSITIONS[j];

          var x1 = p1.x * unit + cellSize / 2;
          var y1 = p1.y * unit + cellSize / 2;
          var x2 = p2.x * unit + cellSize / 2;
          var y2 = p2.y * unit + cellSize / 2;

          var dx = x2 - x1;
          var dy = y2 - y1;
          var length = Math.sqrt(dx * dx + dy * dy);
          var angle = Math.atan2(dy, dx) * (180 / Math.PI);

          var line = document.createElement("div");
          line.className = "line";
          line.style.position = "absolute";
          line.style.left = x1 + "px";
          line.style.top = y1 + "px";
          line.style.width = length + "px";
          line.style.height = "3px";
          line.style.background = "rgba(255,255,255,0.5)";
          line.style.transformOrigin = "0 50%";
          line.style.transform = "rotate(" + angle + "deg)";
          line.style.pointerEvents = "none";
          line.style.zIndex = "0";
          boardEl.appendChild(line);
        }
      }
    }
  }

  function renderGame() {
    if (!state) return;

    var cells = document.querySelectorAll("#board .cell-valid");
    cells.forEach((cell) => {
      var pos = parseInt(cell.dataset.pos);
      cell.textContent = "";
      cell.className = "cell cell-valid";

      if (state.board[pos] === PLAYER_A) {
        cell.classList.add("cell-a");
        cell.textContent = "A";
      } else if (state.board[pos] === PLAYER_B) {
        cell.classList.add("cell-b");
        cell.textContent = "B";
      }

      if (selectedPiece === pos) {
        cell.classList.add("cell-selected");
      }

      if (selectedPiece !== null) {
        var neighbors = ADJACENCY[selectedPiece];
        for (var n = 0; n < neighbors.length; n++) {
          if (neighbors[n] === pos && state.board[pos] === EMPTY) {
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

    if (state.aiThinking) {
      document.getElementById("message").textContent = "AI thinking...";
      document.getElementById("message").className = "info";
    } else {
      document.getElementById("message").textContent = "";
    }

    if (state.gameOver) {
      var winnerText = state.winner ? (state.winner === PLAYER_A ? "A wins!" : "B wins!") : "Draw!";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handleCellClick(pos) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    // Select own piece
    if (state.board[pos] === state.currentPlayer) {
      selectedPiece = pos;
      renderGame();
      return;
    }

    // Move selected piece to empty neighbor
    if (selectedPiece !== null && state.board[pos] === EMPTY) {
      var neighbors = ADJACENCY[selectedPiece];
      for (var n = 0; n < neighbors.length; n++) {
        if (neighbors[n] === pos) {
          state.board = movePiece(state.board, selectedPiece, pos);
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
      // Invalid destination, deselect
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
        state.gameOver = true;
        state.winner = getOpponent(state.aiTeam);
        state.aiThinking = false;
        renderGame();
        return;
      }

      state.board = movePiece(state.board, aiMove.from, aiMove.to);

      var winResult = checkWin(state.board, state.aiTeam);
      if (winResult) {
        state.gameOver = true;
        state.winner = state.aiTeam;
      }

      state.currentPlayer = getOpponent(state.currentPlayer);
      state.turnCount++;
      state.aiThinking = false;
      renderGame();
    }, 400);
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
