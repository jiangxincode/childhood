/* eslint-disable no-var */
// ============================================================
// 狼吃羊 (Lang Chi Yang) - Wolf Eats Sheep
// 2 players, 4x5 grid, asymmetric: 2 wolves vs 10 sheep
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A"; // Sheep (羊) - 10 pieces
var PLAYER_B = "B"; // Wolf (狼) - 2 pieces
var EMPTY = null;
var ROW_COUNT = 5;
var COL_COUNT = 4;
var INITIAL_A = 10; // Sheep starts with 10 pieces
var INITIAL_B = 2; // Wolf starts with 2 pieces
var MIN_A_TO_LOSE = 3; // If sheep has fewer than 3 pieces, wolf wins

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
  // Wolf (B): top row middle positions
  board[0][1] = PLAYER_B;
  board[0][2] = PLAYER_B;
  // Sheep (A): rows 2-4, all columns = 10 pieces
  // Row 2: only (2,0) and (2,3)
  board[2][0] = PLAYER_A;
  board[2][3] = PLAYER_A;
  // Row 3: all 4 columns
  board[3][0] = PLAYER_A;
  board[3][1] = PLAYER_A;
  board[3][2] = PLAYER_A;
  board[3][3] = PLAYER_A;
  // Row 4: all 4 columns
  board[4][0] = PLAYER_A;
  board[4][1] = PLAYER_A;
  board[4][2] = PLAYER_A;
  board[4][3] = PLAYER_A;
  return board;
}

function createGameState(mode) {
  return {
    mode: mode,
    board: getInitialBoard(),
    currentPlayer: PLAYER_A,
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
function getBestAIMove_B(state) {
  var board = state.board;
  var moves = getValidMoves(board, PLAYER_B);
  if (moves.length === 0) return null;

  // Prioritize jump captures
  var jumpMoves = [];
  for (var i = 0; i < moves.length; i++) {
    if (moves[i].type === "jump") jumpMoves.push(moves[i]);
  }
  if (jumpMoves.length > 0) {
    // Pick the jump that leaves the fewest escape routes for opponent
    var bestJump = jumpMoves[0];
    var bestScore = -1;
    for (var j = 0; j < jumpMoves.length; j++) {
      var testBoard = applyMove(board, jumpMoves[j]);
      var opponentMoves = getValidMoves(testBoard, PLAYER_A);
      if (opponentMoves.length > bestScore) {
        bestScore = opponentMoves.length;
        bestJump = jumpMoves[j];
      }
    }
    return bestJump;
  }

  // Try step moves: prefer moves that keep pieces alive
  var bestMove = moves[0];
  var bestMoveScore = -Infinity;
  for (var k = 0; k < moves.length; k++) {
    var testBoard2 = applyMove(board, moves[k]);
    // Score: more adjacent empty cells = safer
    var adj = getAdjacentCells(moves[k].toR, moves[k].toC);
    var emptyAdj = 0;
    for (var a = 0; a < adj.length; a++) {
      if (testBoard2[adj[a].r][adj[a].c] === EMPTY) emptyAdj++;
    }
    // Penalize if wolf piece has no step moves from new position
    var bMovesFromNew = getStepMoves(testBoard2, moves[k].toR, moves[k].toC);
    var score = emptyAdj * 10 + bMovesFromNew.length;
    // Bonus for moving toward sheep pieces (to potentially capture later)
    if (moves[k].type === "step") {
      var adjToA = 0;
      for (var aa = 0; aa < adj.length; aa++) {
        if (testBoard2[adj[aa].r][adj[aa].c] === PLAYER_A) adjToA++;
      }
      score += adjToA * 5;
    }
    if (score > bestMoveScore) {
      bestMoveScore = score;
      bestMove = moves[k];
    }
  }
  return bestMove;
}

// AI for sheep (A): try to surround wolf, avoid being captured
function getBestAIMove_A(state) {
  var board = state.board;
  var moves = getValidMoves(board, PLAYER_A);
  if (moves.length === 0) return null;

  var bestMove = moves[0];
  var bestMoveScore = -Infinity;

  for (var i = 0; i < moves.length; i++) {
    var testBoard = applyMove(board, moves[i]);
    var score = 0;

    // Prefer moves that reduce wolf's mobility
    var bMovesAfter = getValidMoves(testBoard, PLAYER_B);
    score -= bMovesAfter.length * 10;

    // Prefer moves that get closer to wolf pieces
    for (var br = 0; br < ROW_COUNT; br++) {
      for (var bc = 0; bc < COL_COUNT; bc++) {
        if (testBoard[br][bc] === PLAYER_B) {
          var dist = Math.abs(moves[i].toR - br) + Math.abs(moves[i].toC - bc);
          score += (10 - dist) * 3;
        }
      }
    }

    // Penalize moves that put piece in jumpable position
    var adj = getAdjacentCells(moves[i].toR, moves[i].toC);
    for (var a = 0; a < adj.length; a++) {
      var dr = moves[i].toR - adj[a].r;
      var dc = moves[i].toC - adj[a].c;
      if (
        inBounds(moves[i].toR + 2 * dr, moves[i].toC + 2 * dc) &&
        testBoard[adj[a].r][adj[a].c] === PLAYER_B
      ) {
        var jumpTargetR = moves[i].toR + 2 * dr;
        var jumpTargetC = moves[i].toC + 2 * dc;
        if (testBoard[jumpTargetR][jumpTargetC] === EMPTY) {
          score -= 50; // Very dangerous, can be captured
        }
      }
    }

    // Prefer moves that block wolf's escape routes
    for (var br2 = 0; br2 < ROW_COUNT; br2++) {
      for (var bc2 = 0; bc2 < COL_COUNT; bc2++) {
        if (testBoard[br2][bc2] === PLAYER_B) {
          var bAdj = getAdjacentCells(br2, bc2);
          var blockedCount = 0;
          for (var ba = 0; ba < bAdj.length; ba++) {
            if (testBoard[bAdj[ba].r][bAdj[ba].c] !== EMPTY) blockedCount++;
          }
          score += blockedCount * 8;
        }
      }
    }

    if (score > bestMoveScore) {
      bestMoveScore = score;
      bestMove = moves[i];
    }
  }
  return bestMove;
}

function getBestAIMove(state) {
  if (state.aiTeam === PLAYER_B) return getBestAIMove_B(state);
  return getBestAIMove_A(state);
}

// ============================================================
// Module exports
// ============================================================
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
  var state = null;
  var selectedPiece = null;

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    for (var r = 0; r < ROW_COUNT; r++) {
      for (var c = 0; c < COL_COUNT; c++) {
        var cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener(
          "click",
          (function (cr, cc) {
            return function () {
              handleCellClick(cr, cc);
            };
          })(r, c)
        );
        boardEl.appendChild(cell);
      }
    }
  }

  function renderGame() {
    if (!state) return;
    var cells = document.querySelectorAll("#board .cell");
    cells.forEach((cell) => {
      var r = Number.parseInt(cell.dataset.r);
      var c = Number.parseInt(cell.dataset.c);
      cell.textContent = "";
      cell.className = "cell";
      if (state.board[r][c] === PLAYER_A) {
        cell.classList.add("cell-a");
        cell.textContent = "羊";
      } else if (state.board[r][c] === PLAYER_B) {
        cell.classList.add("cell-b");
        cell.textContent = "狼";
      }
      if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
        cell.classList.add("cell-selected");
      }
      if (selectedPiece) {
        // Highlight step moves
        var stepMoves = getStepMoves(state.board, selectedPiece.r, selectedPiece.c);
        for (var i = 0; i < stepMoves.length; i++) {
          if (stepMoves[i].toR === r && stepMoves[i].toC === c) {
            cell.classList.add("cell-highlight");
          }
        }
        // Highlight jump moves for wolf
        if (state.currentPlayer === PLAYER_B) {
          var jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
          for (var j = 0; j < jumpMoves.length; j++) {
            if (jumpMoves[j].toR === r && jumpMoves[j].toC === c) {
              cell.classList.add("cell-jump");
            }
          }
        }
      }
      // Highlight last jump capture
      if (state.lastJump && state.lastJump.captureR === r && state.lastJump.captureC === c) {
        cell.classList.add("cell-captured");
      }
    });

    var playerLabel = state.currentPlayer === PLAYER_A ? "羊 (Sheep)" : "狼 (Wolf)";
    var playerClass = state.currentPlayer === PLAYER_A ? "team-a" : "team-b";
    document.getElementById("current-player").textContent = playerLabel;
    document.getElementById("current-player").className = "team-indicator " + playerClass;
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("pieces-a").textContent = state.piecesA;
    document.getElementById("pieces-b").textContent = state.piecesB;

    if (state.gameOver) {
      var winnerText = state.winner === PLAYER_A ? "羊群获胜！" : "狼群获胜！";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handleCellClick(r, c) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

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
          state.board = applyMove(state.board, stepMoves[i]);
          state.lastJump = null;
          finishTurn();
          return;
        }
      }

      // Try jump move (wolf only)
      if (state.currentPlayer === PLAYER_B) {
        var jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
        for (var j = 0; j < jumpMoves.length; j++) {
          if (jumpMoves[j].toR === r && jumpMoves[j].toC === c) {
            state.board = applyMove(state.board, jumpMoves[j]);
            state.piecesA = countPieces(state.board, PLAYER_A);
            state.lastJump = { captureR: r, captureC: c };
            finishTurn();
            return;
          }
        }
      }

      // Clicked on invalid cell, deselect
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
