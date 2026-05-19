/* eslint-disable no-var */
// ============================================================
// 四步钉 (Si Bu Ding) - Four Step Nail
// 2 players, 3x3 grid, 4 pieces each, capture by 2+1 line
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var BOARD_SIZE = 3;
var PIECES_EACH = 4;

// All possible capture lines (3 in a row, horizontal/vertical only)
var CAPTURE_LINES = [];
// Rows
for (var r = 0; r < BOARD_SIZE; r++) {
  var line = [];
  for (var c = 0; c < BOARD_SIZE; c++) {
    line.push({ x: c, y: r });
  }
  CAPTURE_LINES.push(line);
}
// Columns
for (var c2 = 0; c2 < BOARD_SIZE; c2++) {
  var line2 = [];
  for (var r2 = 0; r2 < BOARD_SIZE; r2++) {
    line2.push({ x: c2, y: r2 });
  }
  CAPTURE_LINES.push(line2);
}

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
    piecesA: PIECES_EACH,
    piecesB: PIECES_EACH,
    placedA: 0,
    placedB: 0,
    gameOver: false,
    winner: null,
    lastCaptures: [],
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

// Get orthogonal neighbors only (no diagonals)
function getOrthogonalNeighbors(x, y) {
  var dirs = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
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
        var neighbors = getOrthogonalNeighbors(x, y);
        for (var i = 0; i < neighbors.length; i++) {
          if (board[neighbors[i].y][neighbors[i].x] === EMPTY) {
            moves.push({
              fromX: x,
              fromY: y,
              toX: neighbors[i].x,
              toY: neighbors[i].y,
            });
          }
        }
      }
    }
  }
  return moves;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

// Deep copy board
function copyBoard(board) {
  var newBoard = [];
  for (var row = 0; row < BOARD_SIZE; row++) {
    newBoard.push(board[row].slice());
  }
  return newBoard;
}

function placePiece(board, x, y, player) {
  var newBoard = copyBoard(board);
  newBoard[y][x] = player;
  return newBoard;
}

function movePiece(board, fromX, fromY, toX, toY) {
  var newBoard = copyBoard(board);
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

// Detect captures: when 2 of player's pieces and 1 opponent piece
// form a straight line (horizontal/vertical), with the 2 pieces adjacent.
// Pattern: [player, player, opponent] or [opponent, player, player]
function detectCaptures(board, player) {
  var captures = [];
  var opponent = getOpponent(player);

  for (var i = 0; i < CAPTURE_LINES.length; i++) {
    var line = CAPTURE_LINES[i];
    var cells = [
      board[line[0].y][line[0].x],
      board[line[1].y][line[1].x],
      board[line[2].y][line[2].x],
    ];

    // Pattern: [player, player, opponent]
    if (cells[0] === player && cells[1] === player && cells[2] === opponent) {
      captures.push({ x: line[2].x, y: line[2].y });
    }
    // Pattern: [opponent, player, player]
    if (cells[0] === opponent && cells[1] === player && cells[2] === player) {
      captures.push({ x: line[0].x, y: line[0].y });
    }
  }

  // Deduplicate
  var seen = {};
  var unique = [];
  for (var j = 0; j < captures.length; j++) {
    var key = captures[j].x + "," + captures[j].y;
    if (!seen[key]) {
      seen[key] = true;
      unique.push(captures[j]);
    }
  }
  return unique;
}

// Apply captures to board, return new board and list of captured positions
function applyCaptures(board, captures) {
  var newBoard = copyBoard(board);
  for (var i = 0; i < captures.length; i++) {
    newBoard[captures[i].y][captures[i].x] = EMPTY;
  }
  return newBoard;
}

// Check if player has won (opponent has <= 1 piece)
function checkWin(board, player) {
  var opponent = getOpponent(player);
  var opponentPieces = countPieces(board, opponent);
  if (opponentPieces <= 1) {
    return { winner: player };
  }
  return null;
}

// Check if player has any valid moves
function hasValidMoves(board, player) {
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) {
        var neighbors = getOrthogonalNeighbors(x, y);
        for (var i = 0; i < neighbors.length; i++) {
          if (board[neighbors[i].y][neighbors[i].x] === EMPTY) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// ============================================================
// AI
// ============================================================

// Evaluate board position for a player
function evaluateBoard(board, player) {
  var opponent = getOpponent(player);
  var myPieces = countPieces(board, player);
  var oppPieces = countPieces(board, opponent);

  // Win/lose conditions
  if (oppPieces <= 1) return 1000;
  if (myPieces <= 1) return -1000;

  var score = (myPieces - oppPieces) * 10;

  // Bonus for pieces that can form capture lines
  for (var i = 0; i < CAPTURE_LINES.length; i++) {
    var line = CAPTURE_LINES[i];
    var cells = [
      board[line[0].y][line[0].x],
      board[line[1].y][line[1].x],
      board[line[2].y][line[2].x],
    ];

    // Count pieces in line
    var myCount = 0;
    var oppCount = 0;
    for (var j = 0; j < 3; j++) {
      if (cells[j] === player) myCount++;
      if (cells[j] === opponent) oppCount++;
    }

    // My pieces adjacent in line with opponent (threatening)
    if (myCount === 2 && oppCount === 1) {
      if (
        (cells[0] === player && cells[1] === player && cells[2] === opponent) ||
        (cells[0] === opponent && cells[1] === player && cells[2] === player)
      ) {
        score += 30;
      }
    }

    // Opponent threatening me
    if (oppCount === 2 && myCount === 1) {
      if (
        (cells[0] === opponent && cells[1] === opponent && cells[2] === player) ||
        (cells[0] === player && cells[1] === opponent && cells[2] === opponent)
      ) {
        score -= 25;
      }
    }
  }

  return score;
}

// Simple minimax with depth limit
function minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
  var opponent = getOpponent(aiPlayer);

  // Check terminal states
  var winA = checkWin(board, aiPlayer);
  if (winA) return 1000;
  var winB = checkWin(board, opponent);
  if (winB) return -1000;
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  if (isMaximizing) {
    var maxEval = -Infinity;
    var moves = getValidMoves(board, aiPlayer);
    for (var i = 0; i < moves.length; i++) {
      var newBoard = movePiece(board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
      // Check captures after move
      var caps = detectCaptures(newBoard, aiPlayer);
      if (caps.length > 0) {
        newBoard = applyCaptures(newBoard, caps);
      }
      var eval_ = minimax(newBoard, depth - 1, false, aiPlayer, alpha, beta);
      if (eval_ > maxEval) maxEval = eval_;
      if (eval_ > alpha) alpha = eval_;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    var minEval = Infinity;
    var moves2 = getValidMoves(board, opponent);
    for (var j = 0; j < moves2.length; j++) {
      var newBoard2 = movePiece(
        board,
        moves2[j].fromX,
        moves2[j].fromY,
        moves2[j].toX,
        moves2[j].toY
      );
      var caps2 = detectCaptures(newBoard2, opponent);
      if (caps2.length > 0) {
        newBoard2 = applyCaptures(newBoard2, caps2);
      }
      var eval2 = minimax(newBoard2, depth - 1, true, aiPlayer, alpha, beta);
      if (eval2 < minEval) minEval = eval2;
      if (eval2 < beta) beta = eval2;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;
  var opponent = getOpponent(aiPlayer);

  if (state.phase === "place") {
    // Try to win by placing
    var emptyCells = getEmptyCells(board);
    for (var i = 0; i < emptyCells.length; i++) {
      var testBoard = placePiece(board, emptyCells[i].x, emptyCells[i].y, aiPlayer);
      // Check if this creates a capture
      var caps = detectCaptures(testBoard, aiPlayer);
      if (caps.length > 0) {
        testBoard = applyCaptures(testBoard, caps);
      }
      if (checkWin(testBoard, aiPlayer)) {
        return { type: "place", x: emptyCells[i].x, y: emptyCells[i].y };
      }
    }
    // Block opponent winning move
    for (var j = 0; j < emptyCells.length; j++) {
      var testBoard2 = placePiece(board, emptyCells[j].x, emptyCells[j].y, opponent);
      var caps2 = detectCaptures(testBoard2, opponent);
      if (caps2.length > 0) {
        testBoard2 = applyCaptures(testBoard2, caps2);
      }
      if (checkWin(testBoard2, opponent)) {
        return { type: "place", x: emptyCells[j].x, y: emptyCells[j].y };
      }
    }
    // Try capture placement
    for (var k = 0; k < emptyCells.length; k++) {
      var testBoard3 = placePiece(board, emptyCells[k].x, emptyCells[k].y, aiPlayer);
      var caps3 = detectCaptures(testBoard3, aiPlayer);
      if (caps3.length > 0) {
        return { type: "place", x: emptyCells[k].x, y: emptyCells[k].y };
      }
    }
    // Random placement
    var idx = Math.floor(Math.random() * emptyCells.length);
    return { type: "place", x: emptyCells[idx].x, y: emptyCells[idx].y };
  }

  // Move phase - use minimax
  var moves = getValidMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  // Try winning move first
  for (var m = 0; m < moves.length; m++) {
    var testBoard4 = movePiece(board, moves[m].fromX, moves[m].fromY, moves[m].toX, moves[m].toY);
    var caps4 = detectCaptures(testBoard4, aiPlayer);
    if (caps4.length > 0) {
      testBoard4 = applyCaptures(testBoard4, caps4);
    }
    if (checkWin(testBoard4, aiPlayer)) {
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
    var testBoard5 = movePiece(
      board,
      moves[m2].fromX,
      moves[m2].fromY,
      moves[m2].toX,
      moves[m2].toY
    );
    var caps5 = detectCaptures(testBoard5, aiPlayer);
    if (caps5.length > 0) {
      testBoard5 = applyCaptures(testBoard5, caps5);
    }
    if (checkWin(testBoard5, opponent)) {
      return {
        type: "move",
        fromX: moves[m2].fromX,
        fromY: moves[m2].fromY,
        toX: moves[m2].toX,
        toY: moves[m2].toY,
      };
    }
  }

  // Use minimax for best move
  var bestScore = -Infinity;
  var bestMove = null;
  for (var m3 = 0; m3 < moves.length; m3++) {
    var newBoard = movePiece(board, moves[m3].fromX, moves[m3].fromY, moves[m3].toX, moves[m3].toY);
    var caps6 = detectCaptures(newBoard, aiPlayer);
    if (caps6.length > 0) {
      newBoard = applyCaptures(newBoard, caps6);
    }
    var score = minimax(newBoard, 2, false, aiPlayer, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[m3];
    }
  }

  if (bestMove) {
    return {
      type: "move",
      fromX: bestMove.fromX,
      fromY: bestMove.fromY,
      toX: bestMove.toX,
      toY: bestMove.toY,
    };
  }

  // Fallback random
  var idx2 = Math.floor(Math.random() * moves.length);
  var mv = moves[idx2];
  return {
    type: "move",
    fromX: mv.fromX,
    fromY: mv.fromY,
    toX: mv.toX,
    toY: mv.toY,
  };
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
    CAPTURE_LINES: CAPTURE_LINES,
    createBoard: createBoard,
    createGameState: createGameState,
    inBounds: inBounds,
    countPieces: countPieces,
    getEmptyCells: getEmptyCells,
    getOrthogonalNeighbors: getOrthogonalNeighbors,
    getValidMoves: getValidMoves,
    getOpponent: getOpponent,
    copyBoard: copyBoard,
    placePiece: placePiece,
    movePiece: movePiece,
    detectCaptures: detectCaptures,
    applyCaptures: applyCaptures,
    checkWin: checkWin,
    hasValidMoves: hasValidMoves,
    evaluateBoard: evaluateBoard,
    minimax: minimax,
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
      // Highlight captured cells
      if (state.lastCaptures) {
        for (var i = 0; i < state.lastCaptures.length; i++) {
          if (state.lastCaptures[i].x === x && state.lastCaptures[i].y === y) {
            cell.classList.add("cell-captured");
          }
        }
      }
      if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
        cell.classList.add("cell-selected");
      }
      if (selectedPiece) {
        var neighbors = getOrthogonalNeighbors(selectedPiece.x, selectedPiece.y);
        for (var j = 0; j < neighbors.length; j++) {
          if (neighbors[j].x === x && neighbors[j].y === y && state.board[y][x] === EMPTY) {
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

    var piecesA = countPieces(state.board, PLAYER_A);
    var piecesB = countPieces(state.board, PLAYER_B);
    document.getElementById("pieces-a").textContent = piecesA;
    document.getElementById("pieces-b").textContent = piecesB;

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

      // Check captures
      var caps = detectCaptures(state.board, player);
      state.lastCaptures = [];
      if (caps.length > 0) {
        state.board = applyCaptures(state.board, caps);
        state.lastCaptures = caps;
        if (player === PLAYER_A) {
          state.piecesB -= caps.length;
        } else {
          state.piecesA -= caps.length;
        }
      }

      // Check win
      var winResult = checkWin(state.board, player);
      if (winResult) {
        state.gameOver = true;
        state.winner = player;
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
      var neighbors = getOrthogonalNeighbors(selectedPiece.x, selectedPiece.y);
      for (var i = 0; i < neighbors.length; i++) {
        if (neighbors[i].x === x && neighbors[i].y === y) {
          state.board = movePiece(state.board, selectedPiece.x, selectedPiece.y, x, y);
          selectedPiece = null;

          // Check captures
          var caps2 = detectCaptures(state.board, state.currentPlayer);
          state.lastCaptures = [];
          if (caps2.length > 0) {
            state.board = applyCaptures(state.board, caps2);
            state.lastCaptures = caps2;
            if (state.currentPlayer === PLAYER_A) {
              state.piecesB -= caps2.length;
            } else {
              state.piecesA -= caps2.length;
            }
          }

          // Check win
          var winResult2 = checkWin(state.board, state.currentPlayer);
          if (winResult2) {
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

        // Check captures
        var caps = detectCaptures(state.board, state.aiTeam);
        state.lastCaptures = [];
        if (caps.length > 0) {
          state.board = applyCaptures(state.board, caps);
          state.lastCaptures = caps;
          if (state.aiTeam === PLAYER_A) {
            state.piecesB -= caps.length;
          } else {
            state.piecesA -= caps.length;
          }
        }

        var winResult = checkWin(state.board, state.aiTeam);
        if (winResult) {
          state.gameOver = true;
          state.winner = state.aiTeam;
        } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
          state.phase = "move";
        }
      } else {
        state.board = movePiece(state.board, aiMove.fromX, aiMove.fromY, aiMove.toX, aiMove.toY);

        // Check captures
        var caps2 = detectCaptures(state.board, state.aiTeam);
        state.lastCaptures = [];
        if (caps2.length > 0) {
          state.board = applyCaptures(state.board, caps2);
          state.lastCaptures = caps2;
          if (state.aiTeam === PLAYER_A) {
            state.piecesB -= caps2.length;
          } else {
            state.piecesA -= caps2.length;
          }
        }

        var winResult2 = checkWin(state.board, state.aiTeam);
        if (winResult2) {
          state.gameOver = true;
          state.winner = state.aiTeam;
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
