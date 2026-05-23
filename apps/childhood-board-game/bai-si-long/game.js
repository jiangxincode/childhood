/* eslint-disable no-var */
// ============================================================
// 摆四龙 (Bai Si Long) - Form a Dragon of Four
// Two players, 5x5 intersection board (横竖各5条线 = 25 points),
// each side has 4 pieces fixed at the bottom rank (excluding the
// centre column). Players take turns moving one piece to any of the
// 8 adjacent empty intersections (orthogonal or diagonal, one step).
// Winner: the first to align their 4 pieces in a row of 4 consecutive
// intersections - horizontal, vertical, or diagonal.
// In PvE mode the human plays the bottom side (B), AI plays the top (A).
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var BOARD_SIZE = 4; // 4 lines each direction -> 4x4 intersections
var PIECES_EACH = 4;

// Fixed opening: pieces of both sides interleave on the back ranks.
// Top row    (y=0): B A B A  (我方 敌方 我方 敌方)
// Bottom row (y=3): A B A B  (敌方 我方 敌方 我方)
// Each side ends up with 2 pieces on top and 2 on bottom.
var INITIAL_POSITIONS_A = [
  { x: 1, y: 0 },
  { x: 3, y: 0 },
  { x: 0, y: 3 },
  { x: 2, y: 3 },
];
var INITIAL_POSITIONS_B = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 1, y: 3 },
  { x: 3, y: 3 },
];

// Eight movement directions: orthogonal + diagonal, one step each.
var DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: 1 },
];

// Pre-compute every winning line: 4 consecutive intersections in a row,
// column, or diagonal direction. With BOARD_SIZE = 5 and PIECES_EACH = 4
// this yields 28 lines total.
var WIN_LINES = (function () {
  var lines = [];
  // Horizontal
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x <= BOARD_SIZE - PIECES_EACH; x++) {
      var hLine = [];
      for (var i = 0; i < PIECES_EACH; i++) hLine.push({ x: x + i, y: y });
      lines.push(hLine);
    }
  }
  // Vertical
  for (var x2 = 0; x2 < BOARD_SIZE; x2++) {
    for (var y2 = 0; y2 <= BOARD_SIZE - PIECES_EACH; y2++) {
      var vLine = [];
      for (var j = 0; j < PIECES_EACH; j++) vLine.push({ x: x2, y: y2 + j });
      lines.push(vLine);
    }
  }
  // Diagonal "\"
  for (var y3 = 0; y3 <= BOARD_SIZE - PIECES_EACH; y3++) {
    for (var x3 = 0; x3 <= BOARD_SIZE - PIECES_EACH; x3++) {
      var dLine = [];
      for (var k = 0; k < PIECES_EACH; k++) dLine.push({ x: x3 + k, y: y3 + k });
      lines.push(dLine);
    }
  }
  // Diagonal "/"
  for (var y4 = 0; y4 <= BOARD_SIZE - PIECES_EACH; y4++) {
    for (var x4 = PIECES_EACH - 1; x4 < BOARD_SIZE; x4++) {
      var aLine = [];
      for (var l = 0; l < PIECES_EACH; l++) aLine.push({ x: x4 - l, y: y4 + l });
      lines.push(aLine);
    }
  }
  return lines;
})();

function createBoard() {
  var board = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    var row = [];
    for (var x = 0; x < BOARD_SIZE; x++) row.push(EMPTY);
    board.push(row);
  }
  return board;
}

function applyInitialLayout(board) {
  for (var i = 0; i < INITIAL_POSITIONS_A.length; i++) {
    var pa = INITIAL_POSITIONS_A[i];
    board[pa.y][pa.x] = PLAYER_A;
  }
  for (var j = 0; j < INITIAL_POSITIONS_B.length; j++) {
    var pb = INITIAL_POSITIONS_B[j];
    board[pb.y][pb.x] = PLAYER_B;
  }
  return board;
}

function createInitialState(mode) {
  return {
    mode: mode,
    board: applyInitialLayout(createBoard()),
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    winLine: null,
    turnCount: 0,
    aiThinking: false,
    lastMove: null,
  };
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
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

// Eight one-step adjacencies, clipped to the board.
function getAdjacentCells(x, y) {
  var cells = [];
  for (var i = 0; i < DIRECTIONS.length; i++) {
    var nx = x + DIRECTIONS[i].dx;
    var ny = y + DIRECTIONS[i].dy;
    if (inBounds(nx, ny)) cells.push({ x: nx, y: ny });
  }
  return cells;
}

function getValidMoves(board, player) {
  var moves = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue;
      var adj = getAdjacentCells(x, y);
      for (var i = 0; i < adj.length; i++) {
        if (board[adj[i].y][adj[i].x] === EMPTY) {
          moves.push({ fromX: x, fromY: y, toX: adj[i].x, toY: adj[i].y });
        }
      }
    }
  }
  return moves;
}

function hasValidMoves(board, player) {
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue;
      var adj = getAdjacentCells(x, y);
      for (var i = 0; i < adj.length; i++) {
        if (board[adj[i].y][adj[i].x] === EMPTY) return true;
      }
    }
  }
  return false;
}

function movePiece(board, fromX, fromY, toX, toY) {
  var newBoard = [];
  for (var y = 0; y < BOARD_SIZE; y++) newBoard.push(board[y].slice());
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

// Returns { winner, line } if `player` has formed a dragon, otherwise null.
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

// ============================================================
// AI: minimax with alpha-beta pruning over the move-only game.
// ============================================================

// For each line, count pieces of each player. A line where both players
// share intersections is dead (cannot be completed by either side).
function evaluateBoard(board, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  var score = 0;
  for (var i = 0; i < WIN_LINES.length; i++) {
    var line = WIN_LINES[i];
    var ai = 0;
    var opp = 0;
    for (var j = 0; j < line.length; j++) {
      var cell = board[line[j].y][line[j].x];
      if (cell === aiPlayer) ai++;
      else if (cell === opponent) opp++;
    }
    if (ai > 0 && opp > 0) continue; // blocked line, no value
    if (ai > 0) score += [0, 1, 8, 64, 100000][ai];
    else if (opp > 0) score -= [0, 1, 8, 64, 100000][opp];
  }
  return score;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
  var opponent = getOpponent(aiPlayer);

  // Terminal: someone already has a dragon.
  var aiWin = checkWin(board, aiPlayer);
  if (aiWin) return 100000 + depth;
  var oppWin = checkWin(board, opponent);
  if (oppWin) return -100000 - depth;

  var nextPlayer = isMaximizing ? aiPlayer : opponent;
  if (!hasValidMoves(board, nextPlayer)) {
    // The side to move is stalemated: count it as a loss for that side.
    return isMaximizing ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  var moves = getValidMoves(board, nextPlayer);
  if (isMaximizing) {
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var nb = movePiece(board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
      var s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  var worst = Infinity;
  for (var k = 0; k < moves.length; k++) {
    var nb2 = movePiece(board, moves[k].fromX, moves[k].fromY, moves[k].toX, moves[k].toY);
    var s2 = minimax(nb2, depth - 1, alpha, beta, true, aiPlayer);
    if (s2 < worst) worst = s2;
    if (worst < beta) beta = worst;
    if (beta <= alpha) break;
  }
  return worst;
}

function getBestAIMove(state) {
  var aiPlayer = state.aiTeam;
  var moves = getValidMoves(state.board, aiPlayer);
  if (moves.length === 0) return null;

  var depth = 4;
  var bestScore = -Infinity;
  var bestMoves = [];
  for (var i = 0; i < moves.length; i++) {
    var nb = movePiece(state.board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
    // Quick win shortcut
    if (checkWin(nb, aiPlayer)) return moves[i];
    var s = minimax(nb, depth, -Infinity, Infinity, false, aiPlayer);
    if (s > bestScore) {
      bestScore = s;
      bestMoves = [moves[i]];
    } else if (s === bestScore) {
      bestMoves.push(moves[i]);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
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
    INITIAL_POSITIONS_A: INITIAL_POSITIONS_A,
    INITIAL_POSITIONS_B: INITIAL_POSITIONS_B,
    DIRECTIONS: DIRECTIONS,
    WIN_LINES: WIN_LINES,
    createBoard: createBoard,
    applyInitialLayout: applyInitialLayout,
    createInitialState: createInitialState,
    inBounds: inBounds,
    getOpponent: getOpponent,
    countPieces: countPieces,
    getAdjacentCells: getAdjacentCells,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    movePiece: movePiece,
    checkWin: checkWin,
    evaluateBoard: evaluateBoard,
    minimax: minimax,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI (SVG board with intersections)
// ============================================================
if (typeof document !== "undefined") {
  var state = null;
  var selectedPiece = null;

  // Board geometry: a square grid of intersections inside an SVG viewBox.
  var BOARD_VIEW = 500; // viewBox size (square)
  var BOARD_PADDING = 50; // padding from edge to outermost line
  var CELL_SIZE = (BOARD_VIEW - BOARD_PADDING * 2) / (BOARD_SIZE - 1);

  function nodeToPx(x, y) {
    return {
      cx: BOARD_PADDING + x * CELL_SIZE,
      cy: BOARD_PADDING + y * CELL_SIZE,
    };
  }

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + BOARD_VIEW + " " + BOARD_VIEW);
    svg.setAttribute("class", "board-svg");

    // 5 horizontal + 5 vertical lines forming the grid of intersections
    for (var i = 0; i < BOARD_SIZE; i++) {
      var p0 = nodeToPx(0, i);
      var p1 = nodeToPx(BOARD_SIZE - 1, i);
      var hLine = document.createElementNS(svgNS, "line");
      hLine.setAttribute("x1", p0.cx);
      hLine.setAttribute("y1", p0.cy);
      hLine.setAttribute("x2", p1.cx);
      hLine.setAttribute("y2", p1.cy);
      hLine.setAttribute("class", "board-line");
      svg.appendChild(hLine);

      var q0 = nodeToPx(i, 0);
      var q1 = nodeToPx(i, BOARD_SIZE - 1);
      var vLine = document.createElementNS(svgNS, "line");
      vLine.setAttribute("x1", q0.cx);
      vLine.setAttribute("y1", q0.cy);
      vLine.setAttribute("x2", q1.cx);
      vLine.setAttribute("y2", q1.cy);
      vLine.setAttribute("class", "board-line");
      svg.appendChild(vLine);
    }

    // Interactive intersection nodes
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        var pt = nodeToPx(x, y);
        var g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "node");
        g.setAttribute("data-x", x);
        g.setAttribute("data-y", y);
        g.setAttribute("transform", "translate(" + pt.cx + "," + pt.cy + ")");

        // Wide invisible hit area for easier tapping
        var hit = document.createElementNS(svgNS, "circle");
        hit.setAttribute("r", CELL_SIZE / 2 - 2);
        hit.setAttribute("class", "node-hit");
        g.appendChild(hit);

        // Small dot showing the intersection when no piece is placed.
        var dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("r", 4);
        dot.setAttribute("class", "node-dot");
        g.appendChild(dot);

        var circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", 22);
        circle.setAttribute("class", "node-circle");
        g.appendChild(circle);

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
          })(x, y)
        );
        svg.appendChild(g);
      }
    }

    boardEl.appendChild(svg);
  }

  function renderGame() {
    if (!state) return;

    // Build a lookup of cells that are part of the winning dragon, if any.
    var winSet = {};
    if (state.winLine) {
      for (var w = 0; w < state.winLine.length; w++) {
        winSet[state.winLine[w].x + "," + state.winLine[w].y] = true;
      }
    }

    // Highlight reachable destinations from the selected piece.
    var reachable = {};
    if (selectedPiece) {
      var adj = getAdjacentCells(selectedPiece.x, selectedPiece.y);
      for (var i = 0; i < adj.length; i++) {
        if (state.board[adj[i].y][adj[i].x] === EMPTY) {
          reachable[adj[i].x + "," + adj[i].y] = true;
        }
      }
    }

    var nodes = document.querySelectorAll("#board .node");
    nodes.forEach((g) => {
      var nx = Number.parseInt(g.getAttribute("data-x"));
      var ny = Number.parseInt(g.getAttribute("data-y"));
      var classes = ["node"];
      var label = "";
      if (state.board[ny][nx] === PLAYER_A) {
        classes.push("node-a");
        label = "";
      } else if (state.board[ny][nx] === PLAYER_B) {
        classes.push("node-b");
        label = "";
      } else {
        classes.push("node-empty");
      }
      if (selectedPiece && selectedPiece.x === nx && selectedPiece.y === ny) {
        classes.push("node-selected");
      }
      if (reachable[nx + "," + ny]) classes.push("node-highlight");
      if (winSet[nx + "," + ny]) classes.push("node-win");
      g.setAttribute("class", classes.join(" "));
      var text = g.querySelector(".node-text");
      if (text) text.textContent = label;
    });

    document.getElementById("current-player").textContent =
      state.currentPlayer === PLAYER_A ? "上方 (A)" : "下方 (B)";
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("moves-a").textContent = getValidMoves(state.board, PLAYER_A).length;
    document.getElementById("moves-b").textContent = getValidMoves(state.board, PLAYER_B).length;

    var msg = document.getElementById("message");
    if (state.aiThinking) {
      msg.textContent = "AI 思考中…";
      msg.className = "info";
    } else {
      msg.textContent = "";
      msg.className = "";
    }

    if (state.gameOver) {
      var winnerText;
      if (state.winner === PLAYER_A) winnerText = "上方 (A) 摆出四龙获胜！";
      else if (state.winner === PLAYER_B) winnerText = "下方 (B) 摆出四龙获胜！";
      else winnerText = "平局";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handlePositionClick(x, y) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    // Click on own piece: select / re-select
    if (state.board[y][x] === state.currentPlayer) {
      selectedPiece = { x: x, y: y };
      renderGame();
      return;
    }

    // Click on a reachable empty intersection: commit move
    if (selectedPiece && state.board[y][x] === EMPTY) {
      var adj = getAdjacentCells(selectedPiece.x, selectedPiece.y);
      for (var i = 0; i < adj.length; i++) {
        if (adj[i].x === x && adj[i].y === y) {
          commitMove({
            fromX: selectedPiece.x,
            fromY: selectedPiece.y,
            toX: x,
            toY: y,
          });
          return;
        }
      }
    }

    // Otherwise clear selection
    selectedPiece = null;
    renderGame();
  }

  function commitMove(move) {
    state.board = movePiece(state.board, move.fromX, move.fromY, move.toX, move.toY);
    state.lastMove = move;
    selectedPiece = null;

    var winResult = checkWin(state.board, state.currentPlayer);
    if (winResult) {
      state.gameOver = true;
      state.winner = winResult.winner;
      state.winLine = winResult.line;
      renderGame();
      return;
    }

    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;

    // Stalemate: side to move has no legal moves -> the other side wins.
    if (!hasValidMoves(state.board, state.currentPlayer)) {
      state.gameOver = true;
      state.winner = getOpponent(state.currentPlayer);
      renderGame();
      return;
    }

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
      state.aiThinking = false;
      if (!aiMove) {
        state.gameOver = true;
        state.winner = getOpponent(state.aiTeam);
        renderGame();
        return;
      }
      commitMove(aiMove);
    }, 400);
  }

  function startGame(mode, firstPlayer) {
    state = createInitialState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      // Human always plays the bottom side (B), AI plays the top (A).
      state.playerTeam = PLAYER_B;
      state.aiTeam = PLAYER_A;
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

  function handleRPSChoice(choice) {
    var aiChoices = ["rock", "scissors", "paper"];
    var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
    var result = judgeRPS(choice, aiChoice);
    var resultDiv = document.getElementById("rps-result");
    if (result === 1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，你先手！</p>";
      // Player wins RPS -> human (B) goes first.
      setTimeout(() => startGame("pve", PLAYER_B), 1200);
    } else if (result === -1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，AI先手！</p>";
      // AI wins RPS -> AI (A) goes first.
      setTimeout(() => startGame("pve", PLAYER_A), 1200);
    } else {
      resultDiv.innerHTML = "<p>平局！再来一次</p>";
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
        handleRPSChoice(this.dataset.choice);
      });
    });
    document.getElementById("btn-restart").addEventListener("click", () => {
      document.getElementById("game-over").style.display = "none";
      document.getElementById("mode-selection").style.display = "flex";
    });
  });
}
