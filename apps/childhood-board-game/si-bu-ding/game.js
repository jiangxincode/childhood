/* eslint-disable no-var */
// ============================================================
// 四步钉 (Si Bu Ding - "Four Step Nail" / 四子棋)
// Two players on a 4x4 intersection board (4 lines each direction).
// Each side starts with 4 pieces lined up on its back rank:
//   A (top)    on row 0 (y = 0), all 4 columns
//   B (bottom) on row 3 (y = 3), all 4 columns
// On each turn the side to move slides one piece one orthogonal step
// (no diagonals) onto an empty adjacent intersection.
// Capture rule: after a move, if the just-moved piece together with one
// of its allies forms a line of three "AAO" or "OAA" (two own pieces
// adjacent + one opponent piece) along a row or column, the opponent
// piece is captured. The first player to capture 3 opponent pieces
// (leaving the opponent with only 1 piece) wins.
// In PvE mode the human always plays the bottom side (B); AI plays A.
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var BOARD_SIZE = 4; // 4 lines each direction -> 4x4 = 16 intersections
var PIECES_EACH = 4;
var CAPTURES_TO_WIN = 3; // first to capture 3 opponent pieces wins

// Fixed opening: each side fills its back rank.
// A on the top row (y = 0), B on the bottom row (y = 3).
var INITIAL_POSITIONS_A = (function () {
  var arr = [];
  for (var x = 0; x < BOARD_SIZE; x++) arr.push({ x: x, y: 0 });
  return arr;
})();
var INITIAL_POSITIONS_B = (function () {
  var arr = [];
  for (var x = 0; x < BOARD_SIZE; x++) arr.push({ x: x, y: BOARD_SIZE - 1 });
  return arr;
})();

// Orthogonal directions only (no diagonals).
var DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
];

// All possible "lines of three" - 3 consecutive intersections in a row
// or column. With BOARD_SIZE = 4 there are 4*2 = 8 starts per row * 2 = 16.
var THREE_LINES = (function () {
  var lines = [];
  // Horizontal triplets
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x <= BOARD_SIZE - 3; x++) {
      lines.push([
        { x: x, y: y },
        { x: x + 1, y: y },
        { x: x + 2, y: y },
      ]);
    }
  }
  // Vertical triplets
  for (var x2 = 0; x2 < BOARD_SIZE; x2++) {
    for (var y2 = 0; y2 <= BOARD_SIZE - 3; y2++) {
      lines.push([
        { x: x2, y: y2 },
        { x: x2, y: y2 + 1 },
        { x: x2, y: y2 + 2 },
      ]);
    }
  }
  return lines;
})();

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

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
    turnCount: 0,
    aiThinking: false,
    lastMove: null,
    lastCaptures: [],
    capturedByA: 0, // pieces of B captured by A
    capturedByB: 0, // pieces of A captured by B
  };
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

function copyBoard(board) {
  var newBoard = [];
  for (var y = 0; y < BOARD_SIZE; y++) newBoard.push(board[y].slice());
  return newBoard;
}

function getValidMoves(board, player) {
  var moves = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue;
      for (var d = 0; d < DIRECTIONS.length; d++) {
        var nx = x + DIRECTIONS[d].dx;
        var ny = y + DIRECTIONS[d].dy;
        if (inBounds(nx, ny) && board[ny][nx] === EMPTY) {
          moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
        }
      }
    }
  }
  return moves;
}

function hasValidMoves(board, player) {
  return getValidMoves(board, player).length > 0;
}

function movePiece(board, fromX, fromY, toX, toY) {
  var newBoard = copyBoard(board);
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

// Detect captures triggered by `player` moving to (toX, toY).
// Only triplets that contain the just-moved piece count as captures,
// matching the traditional "active capture" convention so that a player
// cannot accidentally lose a piece by walking next to two enemy pieces
// on their opponent's turn.
function detectCaptures(board, player, toX, toY) {
  var opponent = getOpponent(player);
  var captures = [];
  var seen = {};

  for (var i = 0; i < THREE_LINES.length; i++) {
    var line = THREE_LINES[i];
    // Skip lines that do not include the moved cell.
    var hit = false;
    for (var h = 0; h < 3; h++) {
      if (line[h].x === toX && line[h].y === toY) {
        hit = true;
        break;
      }
    }
    if (!hit) continue;

    var c0 = board[line[0].y][line[0].x];
    var c1 = board[line[1].y][line[1].x];
    var c2 = board[line[2].y][line[2].x];

    // AAO -> capture line[2]
    if (c0 === player && c1 === player && c2 === opponent) {
      var k1 = line[2].x + "," + line[2].y;
      if (!seen[k1]) {
        seen[k1] = true;
        captures.push({ x: line[2].x, y: line[2].y });
      }
    }
    // OAA -> capture line[0]
    if (c0 === opponent && c1 === player && c2 === player) {
      var k2 = line[0].x + "," + line[0].y;
      if (!seen[k2]) {
        seen[k2] = true;
        captures.push({ x: line[0].x, y: line[0].y });
      }
    }
  }
  return captures;
}

function applyCaptures(board, captures) {
  var newBoard = copyBoard(board);
  for (var i = 0; i < captures.length; i++) {
    newBoard[captures[i].y][captures[i].x] = EMPTY;
  }
  return newBoard;
}

// `player` wins when its captured count for the opponent reaches
// CAPTURES_TO_WIN, which is equivalent to the opponent having only
// PIECES_EACH - CAPTURES_TO_WIN = 1 piece left.
function checkWin(board, player) {
  var opponent = getOpponent(player);
  if (countPieces(board, opponent) <= PIECES_EACH - CAPTURES_TO_WIN) {
    return { winner: player };
  }
  return null;
}

// ============================================================
// AI: minimax with alpha-beta pruning
// ============================================================

function evaluateBoard(board, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  var ai = countPieces(board, aiPlayer);
  var opp = countPieces(board, opponent);
  if (opp <= PIECES_EACH - CAPTURES_TO_WIN) return 100000;
  if (ai <= PIECES_EACH - CAPTURES_TO_WIN) return -100000;

  var score = (ai - opp) * 50;

  // Bonus for threats (any of our pieces adjacent to another own piece
  // with a third cell that could complete a capture line).
  for (var i = 0; i < THREE_LINES.length; i++) {
    var line = THREE_LINES[i];
    var cells = [
      board[line[0].y][line[0].x],
      board[line[1].y][line[1].x],
      board[line[2].y][line[2].x],
    ];
    var aiCount = 0;
    var oppCount = 0;
    for (var k = 0; k < 3; k++) {
      if (cells[k] === aiPlayer) aiCount++;
      else if (cells[k] === opponent) oppCount++;
    }
    if (aiCount === 2 && oppCount === 1) score += 12;
    if (oppCount === 2 && aiCount === 1) score -= 12;
  }
  return score;
}

function applyMoveWithCaptures(board, move, player) {
  var nb = movePiece(board, move.fromX, move.fromY, move.toX, move.toY);
  var caps = detectCaptures(nb, player, move.toX, move.toY);
  if (caps.length > 0) nb = applyCaptures(nb, caps);
  return { board: nb, captures: caps };
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  if (checkWin(board, aiPlayer)) return 100000 + depth;
  if (checkWin(board, opponent)) return -100000 - depth;

  var nextPlayer = isMaximizing ? aiPlayer : opponent;
  if (!hasValidMoves(board, nextPlayer)) {
    // Side to move stuck: count it as a loss for that side.
    return isMaximizing ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  var moves = getValidMoves(board, nextPlayer);
  if (isMaximizing) {
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var nb = applyMoveWithCaptures(board, moves[i], aiPlayer).board;
      var s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  var worst = Infinity;
  for (var k = 0; k < moves.length; k++) {
    var nb2 = applyMoveWithCaptures(board, moves[k], opponent).board;
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

  // Quick win check
  for (var w = 0; w < moves.length; w++) {
    var afterAi = applyMoveWithCaptures(state.board, moves[w], aiPlayer).board;
    if (checkWin(afterAi, aiPlayer)) return moves[w];
  }

  var depth = 4;
  var bestScore = -Infinity;
  var bestMoves = [];
  for (var i = 0; i < moves.length; i++) {
    var next = applyMoveWithCaptures(state.board, moves[i], aiPlayer).board;
    var s = minimax(next, depth, -Infinity, Infinity, false, aiPlayer);
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
    CAPTURES_TO_WIN: CAPTURES_TO_WIN,
    INITIAL_POSITIONS_A: INITIAL_POSITIONS_A,
    INITIAL_POSITIONS_B: INITIAL_POSITIONS_B,
    DIRECTIONS: DIRECTIONS,
    THREE_LINES: THREE_LINES,
    inBounds: inBounds,
    getOpponent: getOpponent,
    createBoard: createBoard,
    applyInitialLayout: applyInitialLayout,
    createInitialState: createInitialState,
    countPieces: countPieces,
    copyBoard: copyBoard,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    movePiece: movePiece,
    detectCaptures: detectCaptures,
    applyCaptures: applyCaptures,
    applyMoveWithCaptures: applyMoveWithCaptures,
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

  // Board geometry: 4x4 intersection grid in an SVG viewBox.
  var BOARD_VIEW = 480;
  var BOARD_PADDING = 60;
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

    // 4 horizontal + 4 vertical lines forming the grid of intersections
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

        var hit = document.createElementNS(svgNS, "circle");
        hit.setAttribute("r", CELL_SIZE / 2 - 2);
        hit.setAttribute("class", "node-hit");
        g.appendChild(hit);

        var dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("r", 4);
        dot.setAttribute("class", "node-dot");
        g.appendChild(dot);

        var circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", 22);
        circle.setAttribute("class", "node-circle");
        g.appendChild(circle);

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

  function reachableTargets() {
    var map = {};
    if (!selectedPiece) return map;
    var moves = getValidMoves(state.board, state.currentPlayer);
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      if (m.fromX === selectedPiece.x && m.fromY === selectedPiece.y) {
        map[m.toX + "," + m.toY] = m;
      }
    }
    return map;
  }

  function renderGame() {
    if (!state) return;
    var reachable = reachableTargets();

    var nodes = document.querySelectorAll("#board .node");
    nodes.forEach((g) => {
      var nx = Number.parseInt(g.getAttribute("data-x"));
      var ny = Number.parseInt(g.getAttribute("data-y"));
      var classes = ["node"];
      if (state.board[ny][nx] === PLAYER_A) classes.push("node-a");
      else if (state.board[ny][nx] === PLAYER_B) classes.push("node-b");
      else classes.push("node-empty");
      if (selectedPiece && selectedPiece.x === nx && selectedPiece.y === ny) {
        classes.push("node-selected");
      }
      if (reachable[nx + "," + ny]) classes.push("node-highlight");
      g.setAttribute("class", classes.join(" "));
    });

    document.getElementById("current-player").textContent =
      state.currentPlayer === PLAYER_A ? "上方 (A)" : "下方 (B)";
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("captured-by-a").textContent = state.capturedByA;
    document.getElementById("captured-by-b").textContent = state.capturedByB;

    var msg = document.getElementById("message");
    if (state.aiThinking) {
      msg.textContent = "AI 思考中…";
      msg.className = "info";
    } else if (state.lastCaptures && state.lastCaptures.length > 0) {
      msg.textContent = "吃掉对方 " + state.lastCaptures.length + " 子！";
      msg.className = "info";
    } else {
      msg.textContent = "";
      msg.className = "";
    }

    if (state.gameOver) {
      var winnerText;
      if (state.winner === PLAYER_A) winnerText = "上方 (A) 吃掉对方 3 子，获胜！";
      else if (state.winner === PLAYER_B) winnerText = "下方 (B) 吃掉对方 3 子，获胜！";
      else winnerText = "平局";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handlePositionClick(x, y) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    if (state.board[y][x] === state.currentPlayer) {
      selectedPiece = { x: x, y: y };
      // Picking a new piece clears any stale capture banner.
      state.lastCaptures = [];
      renderGame();
      return;
    }

    if (selectedPiece) {
      var moves = getValidMoves(state.board, state.currentPlayer);
      for (var i = 0; i < moves.length; i++) {
        var m = moves[i];
        if (
          m.fromX === selectedPiece.x &&
          m.fromY === selectedPiece.y &&
          m.toX === x &&
          m.toY === y
        ) {
          commitMove(m);
          return;
        }
      }
    }

    selectedPiece = null;
    renderGame();
  }

  function commitMove(move) {
    var result = applyMoveWithCaptures(state.board, move, state.currentPlayer);
    state.board = result.board;
    state.lastMove = move;
    state.lastCaptures = result.captures;
    if (result.captures.length > 0) {
      if (state.currentPlayer === PLAYER_A) state.capturedByA += result.captures.length;
      else state.capturedByB += result.captures.length;
    }
    selectedPiece = null;

    var winResult = checkWin(state.board, state.currentPlayer);
    if (winResult) {
      state.gameOver = true;
      state.winner = winResult.winner;
      renderGame();
      return;
    }

    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;

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
      // Human always plays the bottom side (B); AI plays the top (A).
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
