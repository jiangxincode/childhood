/* eslint-disable no-var */
// ============================================================
// 钻牛角尖 / 牛角棋 (Zuan Niu Jiao Jian / Niu Jiao Qi)
// Asymmetric 2-vs-1 chase game on an 11-node bull-horn board.
// Player A (chasers / 公牛子, red): 2 pieces start at the wide root,
//   nodes 1 and 2 (idx 0, 1). Each turn moves exactly one piece.
// Player B (runner / 母牛子, green): 1 piece starts at the horn tip,
//   node 11 (idx 10).
// Each turn the side to move slides one piece along an edge to an empty
// adjacent node. Outcomes:
//   - A wins if B has no legal move (B is "drilled into the horn tip").
//   - B wins if B reaches node 1 or 2 (the wide root).
// If A has no legal move the game also ends with B winning.
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var TOTAL_POSITIONS = 11;

// Initial layout
var INITIAL_POSITIONS_A = [0, 1]; // node 1 and 2 (the wide root)
var INITIAL_POSITIONS_B = [10]; // node 11 (the horn tip)
var TIP_POSITION = 10; // node 11 (the horn tip)
var ROOT_POSITIONS = [0, 1]; // node 1 and 2 (B wins by reaching here)

// Adjacency: cross of upper arc, lower arc, left vertical and zig-zags.
//   upper arc:  2 - 4 - 6 - 8 - 10 - 11        (idx 1-3-5-7-9-10)
//   lower arc:  1 - 3 - 5 - 7 -  9 - 11        (idx 0-2-4-6-8-10)
//   left bar:   1 - 2                          (idx 0-1)
//   zig-zag:    2-3, 3-4, 4-5, 5-6, 6-7, 7-8, 8-9, 9-10
var CONNECTIONS = {
  0: [1, 2], //  1 -> 2, 3
  1: [0, 2, 3], //  2 -> 1, 3, 4
  2: [0, 1, 3, 4], //  3 -> 1, 2, 4, 5
  3: [1, 2, 4, 5], //  4 -> 2, 3, 5, 6
  4: [2, 3, 5, 6], //  5 -> 3, 4, 6, 7
  5: [3, 4, 6, 7], //  6 -> 4, 5, 7, 8
  6: [4, 5, 7, 8], //  7 -> 5, 6, 8, 9
  7: [5, 6, 8, 9], //  8 -> 6, 7, 9, 10
  8: [6, 7, 9, 10], //  9 -> 7, 8, 10, 11   (also direct to tip via long arc)
  9: [7, 8, 10], // 10 -> 8, 9, 11           (short edge to tip)
  10: [8, 9], // 11 -> 9, 10  (horn tip)
};

// SVG coordinates for each node (viewBox 880x500). Layout follows the classic
// 牛角棋 board: two smooth concave arcs (upper / lower) form the horn outline.
// The arcs share both endpoints (root cluster on the left, tip on the upper
// right). Internal zig-zag edges create the triangular bracing inside.
var POSITIONS = [
  { x: 75, y: 360 }, //  0  node 1   (lower root)
  { x: 75, y: 230 }, //  1  node 2   (upper root)
  { x: 195, y: 430 }, //  2  node 3   (lower arc)
  { x: 230, y: 250 }, //  3  node 4   (upper arc)
  { x: 360, y: 460 }, //  4  node 5   (lower arc, deepest dip)
  { x: 380, y: 270 }, //  5  node 6   (upper arc)
  { x: 520, y: 440 }, //  6  node 7   (lower arc, lifting)
  { x: 530, y: 240 }, //  7  node 8   (upper arc)
  { x: 660, y: 380 }, //  8  node 9   (lower arc, far from tip)
  { x: 700, y: 175 }, //  9  node 10  (upper arc, close to tip)
  { x: 820, y: 55 }, // 10  node 11  (horn tip)
];

// Node indices that lie on each smooth boundary arc, in drawing order.
// The two arcs are drawn as continuous SVG paths so they look like curves
// rather than piecewise line segments.
var UPPER_ARC = [1, 3, 5, 7, 9, 10]; // 2 - 4 - 6 - 8 - 10 - 11
var LOWER_ARC = [0, 2, 4, 6, 8, 10]; // 1 - 3 - 5 - 7 - 9 - 11

// Edges that are visually represented by the two smooth arcs above. We skip
// drawing them as straight line segments so the arcs are not doubled up.
var ARC_EDGE_KEYS = (function () {
  var keys = {};
  function addArc(arr) {
    for (var i = 0; i < arr.length - 1; i++) {
      var a = Math.min(arr[i], arr[i + 1]);
      var b = Math.max(arr[i], arr[i + 1]);
      keys[a + "-" + b] = true;
    }
  }
  addArc(UPPER_ARC);
  addArc(LOWER_ARC);
  return keys;
})();

// Build a deduplicated edge list (each undirected edge appears once with a < b)
var EDGES = [];
(function () {
  var seen = {};
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    var nbrs = CONNECTIONS[i];
    for (var k = 0; k < nbrs.length; k++) {
      var j = nbrs[k];
      var a = Math.min(i, j);
      var b = Math.max(i, j);
      var key = a + "-" + b;
      if (!seen[key]) {
        seen[key] = true;
        EDGES.push([a, b]);
      }
    }
  }
})();

// Pre-compute graph distance from each node to the nearest root node, used
// by the AI heuristic. Static because CONNECTIONS never changes at runtime.
var DIST_TO_ROOT = [];
(function () {
  for (var i = 0; i < TOTAL_POSITIONS; i++) DIST_TO_ROOT.push(Infinity);
  var queue = [];
  for (var r = 0; r < ROOT_POSITIONS.length; r++) {
    DIST_TO_ROOT[ROOT_POSITIONS[r]] = 0;
    queue.push(ROOT_POSITIONS[r]);
  }
  var head = 0;
  while (head < queue.length) {
    var u = queue[head++];
    var nbrs = CONNECTIONS[u];
    for (var k = 0; k < nbrs.length; k++) {
      var v = nbrs[k];
      if (DIST_TO_ROOT[v] === Infinity) {
        DIST_TO_ROOT[v] = DIST_TO_ROOT[u] + 1;
        queue.push(v);
      }
    }
  }
})();

function createBoard() {
  var board = [];
  for (var i = 0; i < TOTAL_POSITIONS; i++) board.push(EMPTY);
  return board;
}

function createInitialState(mode) {
  var board = createBoard();
  for (var i = 0; i < INITIAL_POSITIONS_A.length; i++) {
    board[INITIAL_POSITIONS_A[i]] = PLAYER_A;
  }
  for (var j = 0; j < INITIAL_POSITIONS_B.length; j++) {
    board[INITIAL_POSITIONS_B[j]] = PLAYER_B;
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
    lastMove: null,
  };
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

function getConnections(pos) {
  return CONNECTIONS[pos];
}

function countPieces(board, player) {
  var count = 0;
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    if (board[i] === player) count++;
  }
  return count;
}

function getValidMoves(board, player) {
  var moves = [];
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    if (board[i] !== player) continue;
    var nbrs = CONNECTIONS[i];
    for (var j = 0; j < nbrs.length; j++) {
      if (board[nbrs[j]] === EMPTY) {
        moves.push({ from: i, to: nbrs[j] });
      }
    }
  }
  return moves;
}

function hasValidMoves(board, player) {
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    if (board[i] !== player) continue;
    var nbrs = CONNECTIONS[i];
    for (var j = 0; j < nbrs.length; j++) {
      if (board[nbrs[j]] === EMPTY) return true;
    }
  }
  return false;
}

function movePiece(board, from, to) {
  var newBoard = board.slice();
  newBoard[to] = newBoard[from];
  newBoard[from] = EMPTY;
  return newBoard;
}

// Returns the winner if the game is decided, otherwise null.
// Should be called after a move is applied. `nextPlayer` is the side that is
// about to move next.
//   - B reaching the wide root (node 1 or 2) -> B wins immediately.
//   - The side that has no legal move loses.
function checkWin(board, nextPlayer) {
  for (var r = 0; r < ROOT_POSITIONS.length; r++) {
    if (board[ROOT_POSITIONS[r]] === PLAYER_B) return PLAYER_B;
  }
  if (!hasValidMoves(board, nextPlayer)) return getOpponent(nextPlayer);
  return null;
}

// ============================================================
// AI: minimax with alpha-beta pruning
// ============================================================

// Heuristic: A wants to crowd B (especially toward the tip and away from the
// root) and keep its own mobility; B wants the opposite.
function evaluateBoard(board, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  var aiMoves = getValidMoves(board, aiPlayer).length;
  var oppMoves = getValidMoves(board, opponent).length;

  // Decisive positions
  for (var r = 0; r < ROOT_POSITIONS.length; r++) {
    if (board[ROOT_POSITIONS[r]] === PLAYER_B) {
      return aiPlayer === PLAYER_B ? 100000 : -100000;
    }
  }
  if (oppMoves === 0) return 100000;
  if (aiMoves === 0) return -100000;

  // Locate the runner (B). It must exist while the game is ongoing.
  var bPos = -1;
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    if (board[i] === PLAYER_B) {
      bPos = i;
      break;
    }
  }

  // Distance from B to the nearest root: smaller is better for B.
  var bDist = bPos >= 0 ? DIST_TO_ROOT[bPos] : 0;

  // Mobility component: own mobility positive, opponent mobility negative.
  var mobility = aiMoves * 5 - oppMoves * 25;

  // Crowding: bonus when neighbours of B are blocked (especially at the tip).
  var crowding = 0;
  if (bPos >= 0) {
    var nbrs = CONNECTIONS[bPos];
    var blocked = 0;
    for (var k = 0; k < nbrs.length; k++) {
      if (board[nbrs[k]] !== EMPTY) blocked++;
    }
    crowding = blocked * (bPos === TIP_POSITION ? 30 : 10);
  }

  // Distance component (positive = closer to root, good for B)
  var distScore = (5 - bDist) * 40;

  if (aiPlayer === PLAYER_B) {
    return mobility + distScore - crowding;
  }
  return mobility - distScore + crowding;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  var nextPlayer = isMaximizing ? aiPlayer : opponent;

  // Terminal checks: B at root or current side cannot move.
  for (var r = 0; r < ROOT_POSITIONS.length; r++) {
    if (board[ROOT_POSITIONS[r]] === PLAYER_B) {
      return aiPlayer === PLAYER_B ? 100000 + depth : -100000 - depth;
    }
  }
  if (!hasValidMoves(board, nextPlayer)) {
    return isMaximizing ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  var moves = getValidMoves(board, nextPlayer);
  if (isMaximizing) {
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var nb = movePiece(board, moves[i].from, moves[i].to);
      var s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  var worst = Infinity;
  for (var k = 0; k < moves.length; k++) {
    var nb2 = movePiece(board, moves[k].from, moves[k].to);
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

  var depth = 6;
  var bestScore = -Infinity;
  var bestMoves = [];
  for (var i = 0; i < moves.length; i++) {
    var nb = movePiece(state.board, moves[i].from, moves[i].to);
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
    TOTAL_POSITIONS: TOTAL_POSITIONS,
    INITIAL_POSITIONS_A: INITIAL_POSITIONS_A,
    INITIAL_POSITIONS_B: INITIAL_POSITIONS_B,
    TIP_POSITION: TIP_POSITION,
    ROOT_POSITIONS: ROOT_POSITIONS,
    CONNECTIONS: CONNECTIONS,
    EDGES: EDGES,
    UPPER_ARC: UPPER_ARC,
    LOWER_ARC: LOWER_ARC,
    ARC_EDGE_KEYS: ARC_EDGE_KEYS,
    POSITIONS: POSITIONS,
    DIST_TO_ROOT: DIST_TO_ROOT,
    createBoard: createBoard,
    createInitialState: createInitialState,
    getOpponent: getOpponent,
    getConnections: getConnections,
    countPieces: countPieces,
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
// Browser UI
// ============================================================
if (typeof document !== "undefined") {
  var state = null;
  var selectedPiece = null;

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 940 530");
    svg.setAttribute("class", "board-svg");

    // 1) Draw the two smooth boundary arcs as Catmull-Rom-to-Bezier paths.
    function arcPath(indices) {
      // Convert a sequence of points into a smooth path. We emit the first
      // point with M, then a cubic segment for each interior pair, using
      // tangents derived from neighbouring points (Catmull-Rom alpha=0.5).
      var pts = indices.map((idx) => POSITIONS[idx]);
      if (pts.length < 2) return "";
      var d = "M " + pts[0].x + " " + pts[0].y;
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i];
        var p1 = pts[i];
        var p2 = pts[i + 1];
        var p3 = pts[i + 2] || p2;
        var c1x = p1.x + (p2.x - p0.x) / 6;
        var c1y = p1.y + (p2.y - p0.y) / 6;
        var c2x = p2.x - (p3.x - p1.x) / 6;
        var c2y = p2.y - (p3.y - p1.y) / 6;
        d += " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;
      }
      return d;
    }

    var upperPath = document.createElementNS(svgNS, "path");
    upperPath.setAttribute("d", arcPath(UPPER_ARC));
    upperPath.setAttribute("class", "board-arc");
    svg.appendChild(upperPath);

    var lowerPath = document.createElementNS(svgNS, "path");
    lowerPath.setAttribute("d", arcPath(LOWER_ARC));
    lowerPath.setAttribute("class", "board-arc");
    svg.appendChild(lowerPath);

    // 2) Draw the remaining (interior / bracing) edges as straight lines.
    for (var e = 0; e < EDGES.length; e++) {
      var ai = EDGES[e][0];
      var bi = EDGES[e][1];
      var key = ai + "-" + bi;
      if (ARC_EDGE_KEYS[key]) continue; // covered by the arc path
      var p1 = POSITIONS[ai];
      var p2 = POSITIONS[bi];
      var line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
      line.setAttribute("class", "board-edge");
      svg.appendChild(line);
    }

    // Decorative end labels
    var tip = POSITIONS[TIP_POSITION];
    var tipLabel = document.createElementNS(svgNS, "text");
    tipLabel.setAttribute("x", tip.x + 24);
    tipLabel.setAttribute("y", tip.y - 6);
    tipLabel.setAttribute("class", "tip-label");
    tipLabel.textContent = "牛角尖（逃兵起点）";
    svg.appendChild(tipLabel);

    var rootMid = POSITIONS[0];
    var rootLabel = document.createElementNS(svgNS, "text");
    rootLabel.setAttribute("x", rootMid.x - 30);
    rootLabel.setAttribute("y", rootMid.y + 60);
    rootLabel.setAttribute("class", "tip-label");
    rootLabel.textContent = "牛角根（追兵起点 / 逃兵目标）";
    svg.appendChild(rootLabel);

    // Nodes (interactive)
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "node");
      g.setAttribute("data-pos", i);
      g.setAttribute("transform", "translate(" + POSITIONS[i].x + "," + POSITIONS[i].y + ")");

      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", 22);
      circle.setAttribute("class", "node-circle");
      g.appendChild(circle);

      var text = document.createElementNS(svgNS, "text");
      text.setAttribute("class", "node-text");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      g.appendChild(text);

      var num = document.createElementNS(svgNS, "text");
      num.setAttribute("class", "node-num");
      num.setAttribute("text-anchor", "middle");
      num.setAttribute("y", 38);
      num.textContent = i + 1;
      g.appendChild(num);

      g.addEventListener(
        "click",
        (function (idx) {
          return function () {
            handlePositionClick(idx);
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
    var reachable = {};
    if (selectedPiece !== null) {
      var nbrs = CONNECTIONS[selectedPiece];
      for (var n = 0; n < nbrs.length; n++) {
        if (state.board[nbrs[n]] === EMPTY) reachable[nbrs[n]] = true;
      }
    }

    nodes.forEach((g) => {
      var pos = Number.parseInt(g.getAttribute("data-pos"));
      var classes = ["node"];
      var label = "";
      if (state.board[pos] === PLAYER_A) {
        classes.push("node-a");
        label = "追";
      } else if (state.board[pos] === PLAYER_B) {
        classes.push("node-b");
        label = "逃";
      } else {
        classes.push("node-empty");
      }
      if (selectedPiece === pos) classes.push("node-selected");
      if (reachable[pos]) classes.push("node-highlight");
      g.setAttribute("class", classes.join(" "));
      var text = g.querySelector(".node-text");
      if (text) text.textContent = label;
    });

    // Current acting side - shown as 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP)
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
        : [PLAYER_A, PLAYER_B],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("moves-a").textContent = getValidMoves(state.board, PLAYER_A).length;
    document.getElementById("moves-b").textContent = getValidMoves(state.board, PLAYER_B).length;

    if (state.aiThinking) {
      document.getElementById("message").textContent = "AI 思考中…";
      document.getElementById("message").className = "info";
    } else {
      document.getElementById("message").textContent = "";
      document.getElementById("message").className = "";
    }

    if (state.gameOver) {
      // Decide the win mode by looking at where B is on the board now.
      var bAtRoot = false;
      for (var ri = 0; ri < ROOT_POSITIONS.length; ri++) {
        if (state.board[ROOT_POSITIONS[ri]] === PLAYER_B) {
          bAtRoot = true;
          break;
        }
      }
      var winnerText;
      if (state.winner === PLAYER_B) {
        winnerText = bAtRoot ? "逃兵获胜！成功逃到牛角根。" : "逃兵获胜！追兵无路可走。";
      } else {
        winnerText = "追兵获胜！逃兵被困进牛角尖。";
      }
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handlePositionClick(pos) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    if (state.board[pos] === state.currentPlayer) {
      selectedPiece = pos;
      renderGame();
      return;
    }

    if (selectedPiece !== null && state.board[pos] === EMPTY) {
      var targets = CONNECTIONS[selectedPiece];
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] === pos) {
          commitMove({ from: selectedPiece, to: pos });
          return;
        }
      }
    }

    selectedPiece = null;
    renderGame();
  }

  function commitMove(move) {
    state.board = movePiece(state.board, move.from, move.to);
    state.lastMove = move;
    selectedPiece = null;
    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;
    var winner = checkWin(state.board, state.currentPlayer);
    if (winner) {
      state.gameOver = true;
      state.winner = winner;
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
    state.firstPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      // Default: human plays the chasers (A), AI plays the runner (B)
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

  function handleRPSChoice(choice) {
    var aiChoices = ["rock", "scissors", "paper"];
    var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
    var result = judgeRPS(choice, aiChoice);
    var resultDiv = document.getElementById("rps-result");
    if (result === 1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，你先手！</p>";
      setTimeout(() => startGame("pve", PLAYER_A), 1200);
    } else if (result === -1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，AI先手！</p>";
      setTimeout(() => startGame("pve", PLAYER_B), 1200);
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
