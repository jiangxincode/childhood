/* eslint-disable no-var */
// ============================================================
// 成龙成方 (Cheng Long Cheng Fang)
// 2 players, 4x4 grid, 8 pieces each
// Form 2x2 square or line of 4 to capture opponent piece
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
var PIECES_EACH = 8;
var MIN_PIECES_TO_WIN = 3;

// All possible 2x2 squares on a 4x4 grid (9 total)
var SQUARES = [];
for (var sy = 0; sy < BOARD_SIZE - 1; sy++) {
  for (var sx = 0; sx < BOARD_SIZE - 1; sx++) {
    SQUARES.push([
      { x: sx, y: sy },
      { x: sx + 1, y: sy },
      { x: sx, y: sy + 1 },
      { x: sx + 1, y: sy + 1 },
    ]);
  }
}

// All possible lines of 4 - horizontal and vertical (8 total)
var LINES = [];
for (var lr = 0; lr < BOARD_SIZE; lr++) {
  var hline = [];
  for (var lc = 0; lc < BOARD_SIZE; lc++) {
    hline.push({ x: lc, y: lr });
  }
  LINES.push(hline);
}
for (var lc2 = 0; lc2 < BOARD_SIZE; lc2++) {
  var vline = [];
  for (var lr2 = 0; lr2 < BOARD_SIZE; lr2++) {
    vline.push({ x: lc2, y: lr2 });
  }
  LINES.push(vline);
}

// All formations combined (squares + lines)
var FORMATIONS = SQUARES.concat(LINES);

// ============================================================
// Core game functions
// ============================================================

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
    phase: "place",
    placedA: 0,
    placedB: 0,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    capturing: false,
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

// Check if a player formed a new formation involving the given position
function checkCapture(board, x, y, player) {
  for (var i = 0; i < FORMATIONS.length; i++) {
    var formation = FORMATIONS[i];
    var includesPos = false;
    var allPlayer = true;
    for (var j = 0; j < formation.length; j++) {
      if (formation[j].x === x && formation[j].y === y) {
        includesPos = true;
      }
      if (board[formation[j].y][formation[j].x] !== player) {
        allPlayer = false;
        break;
      }
    }
    if (includesPos && allPlayer) {
      return true;
    }
  }
  return false;
}

// Get all formations for a player
function getFormations(board, player) {
  var result = [];
  for (var i = 0; i < FORMATIONS.length; i++) {
    var formation = FORMATIONS[i];
    var allPlayer = true;
    for (var j = 0; j < formation.length; j++) {
      if (board[formation[j].y][formation[j].x] !== player) {
        allPlayer = false;
        break;
      }
    }
    if (allPlayer) {
      result.push(formation);
    }
  }
  return result;
}

// Check if opponent has fewer than MIN_PIECES_TO_WIN pieces
// Only valid after opponent has placed at least MIN_PIECES_TO_WIN pieces
function checkWin(board, player, placedA, placedB) {
  var opponent = getOpponent(player);
  var opponentPlaced = opponent === PLAYER_A ? placedA : placedB;
  // Cannot win during placement phase until opponent has placed enough pieces
  if (opponentPlaced < MIN_PIECES_TO_WIN) {
    return null;
  }
  var opponentPieces = countPieces(board, opponent);
  if (opponentPieces < MIN_PIECES_TO_WIN) {
    return { winner: player, reason: "opponent_eliminated" };
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

function removePiece(board, x, y) {
  var newBoard = [];
  for (var row = 0; row < BOARD_SIZE; row++) {
    newBoard.push(board[row].slice());
  }
  newBoard[y][x] = EMPTY;
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

// ============================================================
// AI: evaluation and minimax with alpha-beta pruning
// ============================================================

function evaluateBoard(board, player) {
  var opponent = getOpponent(player);
  var score = 0;

  var playerPieces = countPieces(board, player);
  var opponentPieces = countPieces(board, opponent);
  score += (playerPieces - opponentPieces) * 10;

  var playerFormations = getFormations(board, player);
  var opponentFormations = getFormations(board, opponent);
  score += playerFormations.length * 8;
  score -= opponentFormations.length * 8;

  // Center control bonus
  var centers = [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ];
  for (var i = 0; i < centers.length; i++) {
    if (board[centers[i].y][centers[i].x] === player) score += 2;
    if (board[centers[i].y][centers[i].x] === opponent) score -= 2;
  }

  return score;
}

// Get all available moves for a player based on board state
function getAvailableMoves(board, player) {
  var moves = [];
  var playerPieces = countPieces(board, player);
  if (playerPieces < PIECES_EACH) {
    var emptyCells = getEmptyCells(board);
    for (var i = 0; i < emptyCells.length; i++) {
      moves.push({ type: "place", x: emptyCells[i].x, y: emptyCells[i].y });
    }
  } else {
    var validMoves = getValidMoves(board, player);
    for (var j = 0; j < validMoves.length; j++) {
      moves.push({
        type: "move",
        fromX: validMoves[j].fromX,
        fromY: validMoves[j].fromY,
        toX: validMoves[j].toX,
        toY: validMoves[j].toY,
      });
    }
  }
  return moves;
}

function applyMoveToBoard(board, move, player) {
  if (move.type === "place") {
    return placePiece(board, move.x, move.y, player);
  }
  return movePiece(board, move.fromX, move.fromY, move.toX, move.toY);
}

function minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
  var opponent = getOpponent(aiPlayer);

  var aiPieces = countPieces(board, aiPlayer);
  var opPieces = countPieces(board, opponent);
  if (opPieces < MIN_PIECES_TO_WIN) return 1000;
  if (aiPieces < MIN_PIECES_TO_WIN) return -1000;
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  var current = isMaximizing ? aiPlayer : opponent;
  var moves = getAvailableMoves(board, current);
  if (moves.length === 0) return isMaximizing ? -500 : 500;

  if (isMaximizing) {
    var maxEval = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var newBoard = applyMoveToBoard(board, moves[i], aiPlayer);
      var ev = minimax(newBoard, depth - 1, false, aiPlayer, alpha, beta);
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    var minEval = Infinity;
    for (var j = 0; j < moves.length; j++) {
      var newBoard2 = applyMoveToBoard(board, moves[j], opponent);
      var ev2 = minimax(newBoard2, depth - 1, true, aiPlayer, alpha, beta);
      if (ev2 < minEval) minEval = ev2;
      if (ev2 < beta) beta = ev2;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;

  if (state.capturing) {
    return getBestCapture(state);
  }

  var moves = getAvailableMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  // Check for immediate win (opponent < 3 pieces after move)
  for (var i = 0; i < moves.length; i++) {
    var testBoard = applyMoveToBoard(board, moves[i], aiPlayer);
    if (checkWin(testBoard, aiPlayer, state.placedA, state.placedB)) {
      return moves[i];
    }
  }

  // Check for immediate capture opportunity
  for (var j = 0; j < moves.length; j++) {
    var testBoard2 = applyMoveToBoard(board, moves[j], aiPlayer);
    var pos =
      moves[j].type === "place"
        ? { x: moves[j].x, y: moves[j].y }
        : { x: moves[j].toX, y: moves[j].toY };
    if (checkCapture(testBoard2, pos.x, pos.y, aiPlayer)) {
      return moves[j];
    }
  }

  // Check for opponent winning move to block
  var opponent = getOpponent(aiPlayer);
  for (var k = 0; k < moves.length; k++) {
    var opMoves = getAvailableMoves(board, opponent);
    for (var m = 0; m < opMoves.length; m++) {
      var opBoard = applyMoveToBoard(board, opMoves[m], opponent);
      if (checkWin(opBoard, opponent, state.placedA, state.placedB)) {
        // Try to block by making a move that prevents this
        // Find if any of our moves would block this
        for (var n = 0; n < moves.length; n++) {
          var blockBoard = applyMoveToBoard(board, moves[n], aiPlayer);
          var opMovesAfter = getAvailableMoves(blockBoard, opponent);
          var canBlock = true;
          for (var p = 0; p < opMovesAfter.length; p++) {
            var opBoardAfter = applyMoveToBoard(blockBoard, opMovesAfter[p], opponent);
            if (checkWin(opBoardAfter, opponent, state.placedA, state.placedB)) {
              canBlock = false;
              break;
            }
          }
          if (canBlock) {
            return moves[n];
          }
        }
      }
    }
  }

  // Minimax evaluation
  var bestMove = null;
  var bestScore = -Infinity;
  var depth = 2;

  for (var q = 0; q < moves.length; q++) {
    var newBoard3 = applyMoveToBoard(board, moves[q], aiPlayer);
    var score = minimax(newBoard3, depth - 1, false, aiPlayer, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[q];
    }
  }

  return bestMove || moves[0];
}

function getBestCapture(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;
  var opponent = getOpponent(aiPlayer);

  // Prefer capturing pieces that are part of opponent formations
  var opponentFormations = getFormations(board, opponent);
  if (opponentFormations.length > 0) {
    var formation = opponentFormations[0];
    for (var i = 0; i < formation.length; i++) {
      if (board[formation[i].y][formation[i].x] === opponent) {
        return { type: "capture", x: formation[i].x, y: formation[i].y };
      }
    }
  }

  // Otherwise capture any opponent piece
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === opponent) {
        return { type: "capture", x: x, y: y };
      }
    }
  }

  return null;
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
    MIN_PIECES_TO_WIN: MIN_PIECES_TO_WIN,
    SQUARES: SQUARES,
    LINES: LINES,
    FORMATIONS: FORMATIONS,
    createBoard: createBoard,
    createGameState: createGameState,
    inBounds: inBounds,
    countPieces: countPieces,
    getEmptyCells: getEmptyCells,
    getAdjacentCells: getAdjacentCells,
    getValidMoves: getValidMoves,
    checkCapture: checkCapture,
    getFormations: getFormations,
    checkWin: checkWin,
    placePiece: placePiece,
    movePiece: movePiece,
    removePiece: removePiece,
    getOpponent: getOpponent,
    evaluateBoard: evaluateBoard,
    getAvailableMoves: getAvailableMoves,
    applyMoveToBoard: applyMoveToBoard,
    minimax: minimax,
    getBestAIMove: getBestAIMove,
    getBestCapture: getBestCapture,
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
      if (selectedPiece && state.phase === "move") {
        var adj = getAdjacentCells(selectedPiece.x, selectedPiece.y);
        for (var i = 0; i < adj.length; i++) {
          if (adj[i].x === x && adj[i].y === y && state.board[y][x] === EMPTY) {
            cell.classList.add("cell-highlight");
          }
        }
      }
      if (state.capturing && state.board[y][x] === getOpponent(state.currentPlayer)) {
        cell.classList.add("cell-capturable");
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

    if (state.capturing) {
      document.getElementById("message").textContent = "请选一个对方棋子吃掉";
      document.getElementById("message").className = "info";
    } else {
      document.getElementById("message").textContent = "";
      document.getElementById("message").className = "";
    }

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

    // Capturing phase - select opponent piece to remove
    if (state.capturing) {
      if (state.board[y][x] === getOpponent(state.currentPlayer)) {
        state.board = removePiece(state.board, x, y);
        state.capturing = false;
        state.currentPlayer = getOpponent(state.currentPlayer);
        state.turnCount++;

        var winResult = checkWin(state.board, state.currentPlayer, state.placedA, state.placedB);
        if (winResult) {
          state.gameOver = true;
          state.winner = state.currentPlayer;
        }

        renderGame();
        if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
          triggerAI();
        }
      }
      return;
    }

    // Placement phase
    if (state.phase === "place") {
      if (state.board[y][x] !== EMPTY) return;
      var player = state.currentPlayer;
      var placedCount = player === PLAYER_A ? state.placedA : state.placedB;
      if (placedCount >= PIECES_EACH) return;

      state.board = placePiece(state.board, x, y, player);
      if (player === PLAYER_A) state.placedA++;
      else state.placedB++;

      if (checkCapture(state.board, x, y, player)) {
        state.capturing = true;
        renderGame();
        return;
      }

      var winResult2 = checkWin(state.board, player, state.placedA, state.placedB);
      if (winResult2) {
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

    // Move phase - select own piece
    if (state.board[y][x] === state.currentPlayer) {
      selectedPiece = { x: x, y: y };
      renderGame();
      return;
    }

    // Move phase - move to adjacent empty cell
    if (selectedPiece && state.board[y][x] === EMPTY) {
      var adj2 = getAdjacentCells(selectedPiece.x, selectedPiece.y);
      for (var i = 0; i < adj2.length; i++) {
        if (adj2[i].x === x && adj2[i].y === y) {
          state.board = movePiece(state.board, selectedPiece.x, selectedPiece.y, x, y);
          selectedPiece = null;

          if (checkCapture(state.board, x, y, state.currentPlayer)) {
            state.capturing = true;
            renderGame();
            return;
          }

          var winResult3 = checkWin(state.board, state.currentPlayer, state.placedA, state.placedB);
          if (winResult3) {
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

      if (aiMove.type === "capture") {
        state.board = removePiece(state.board, aiMove.x, aiMove.y);
        state.capturing = false;
        state.currentPlayer = getOpponent(state.currentPlayer);
        state.turnCount++;

        var winResult = checkWin(state.board, state.currentPlayer, state.placedA, state.placedB);
        if (winResult) {
          state.gameOver = true;
          state.winner = state.currentPlayer;
        }
      } else if (aiMove.type === "place") {
        state.board = placePiece(state.board, aiMove.x, aiMove.y, state.aiTeam);
        if (state.aiTeam === PLAYER_A) state.placedA++;
        else state.placedB++;

        if (checkCapture(state.board, aiMove.x, aiMove.y, state.aiTeam)) {
          state.capturing = true;
          state.aiThinking = false;
          renderGame();
          setTimeout(() => {
            triggerAI();
          }, 600);
          return;
        }

        var winResult2 = checkWin(state.board, state.aiTeam, state.placedA, state.placedB);
        if (winResult2) {
          state.gameOver = true;
          state.winner = state.aiTeam;
        } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
          state.phase = "move";
        }

        state.currentPlayer = getOpponent(state.currentPlayer);
        state.turnCount++;
      } else if (aiMove.type === "move") {
        state.board = movePiece(state.board, aiMove.fromX, aiMove.fromY, aiMove.toX, aiMove.toY);

        if (checkCapture(state.board, aiMove.toX, aiMove.toY, state.aiTeam)) {
          state.capturing = true;
          state.aiThinking = false;
          renderGame();
          setTimeout(() => {
            triggerAI();
          }, 600);
          return;
        }

        var winResult3 = checkWin(state.board, state.aiTeam, state.placedA, state.placedB);
        if (winResult3) {
          state.gameOver = true;
          state.winner = state.aiTeam;
        }

        state.currentPlayer = getOpponent(state.currentPlayer);
        state.turnCount++;
      }

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
