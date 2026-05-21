/* eslint-disable no-var */
// ============================================================
// 小猫钓鱼 / 鸡毛蒜皮 (Xiao Mao Diao Yu / Ji Mao Suan Pi)
// 2 players, cross-shaped board, 2 pieces each.
// Move: single step OR three steps along chant "鸡毛蒜皮"
//       (origin = 鸡, then 3 hops 毛 / 蒜 / 皮).
// Capture: any move whose final landing is on opponent piece.
// Win: capture all opponent pieces OR opponent has no legal move.
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;

// 12 nodes laid out on a 4x4 grid (corners empty)
//        0   1            (1,0) (2,0)
//    2   3   4   5        (0,1) (1,1) (2,1) (3,1)
//    6   7   8   9        (0,2) (1,2) (2,2) (3,2)
//       10  11            (1,3) (2,3)
var BOARD_POSITIONS = [
  { x: 1, y: 0 }, // 0
  { x: 2, y: 0 }, // 1
  { x: 0, y: 1 }, // 2
  { x: 1, y: 1 }, // 3
  { x: 2, y: 1 }, // 4
  { x: 3, y: 1 }, // 5
  { x: 0, y: 2 }, // 6
  { x: 1, y: 2 }, // 7
  { x: 2, y: 2 }, // 8
  { x: 3, y: 2 }, // 9
  { x: 1, y: 3 }, // 10
  { x: 2, y: 3 }, // 11
];

// Edges = sides of the five squares forming the cross
var ADJACENCY = [
  [1, 3], // 0
  [0, 4], // 1
  [3, 6], // 2
  [0, 2, 4, 7], // 3
  [1, 3, 5, 8], // 4
  [4, 9], // 5
  [2, 7], // 6
  [3, 6, 8, 10], // 7
  [4, 7, 9, 11], // 8
  [5, 8], // 9
  [7, 11], // 10
  [8, 10], // 11
];

var PIECES_EACH = 4;
var INITIAL_POSITIONS_A = [0, 1, 3, 4];
var INITIAL_POSITIONS_B = [7, 8, 10, 11];

// Grid size for rendering (4x4 with the four corners blank)
var GRID_COLS = 4;
var GRID_ROWS = 4;

// Move types
var MOVE_SINGLE = "single";
var MOVE_TRIPLE = "triple"; // 鸡毛蒜皮 (origin + 3 hops)

function createBoard() {
  var board = [];
  for (var i = 0; i < BOARD_POSITIONS.length; i++) {
    board.push(EMPTY);
  }
  return board;
}

function createGameState(mode) {
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

function countPieces(board, player) {
  var n = 0;
  for (var i = 0; i < board.length; i++) {
    if (board[i] === player) n++;
  }
  return n;
}

// Returns true if a node is a valid landing spot for `player`
// (empty, or occupied by the opponent so we can capture it).
function isLandable(board, node, player) {
  var v = board[node];
  return v === EMPTY || v === getOpponent(player);
}

// Get all single-step moves for one piece.
function getSingleMovesForPiece(board, from, player) {
  var moves = [];
  var neighbors = ADJACENCY[from];
  for (var i = 0; i < neighbors.length; i++) {
    var to = neighbors[i];
    if (isLandable(board, to, player)) {
      moves.push({
        type: MOVE_SINGLE,
        from: from,
        to: to,
        path: [from, to],
        capture: board[to] === getOpponent(player) ? to : null,
      });
    }
  }
  return moves;
}

// Get all "鸡毛蒜皮" triple moves for one piece. The origin counts as 鸡,
// then we take 3 connected hops (毛, 蒜, 皮). The final landing must be on
// an opponent piece (i.e. triple moves are *only* for capturing). Intermediate
// nodes can be anything (empty / own / opponent) as long as the path does not
// revisit a node.
function getTripleMovesForPiece(board, from, player) {
  var moves = [];
  var opponent = getOpponent(player);
  var visited = {};
  visited[from] = true;
  var step1Neighbors = ADJACENCY[from];
  for (var i = 0; i < step1Neighbors.length; i++) {
    var n1 = step1Neighbors[i];
    if (visited[n1]) continue;
    visited[n1] = true;
    var step2Neighbors = ADJACENCY[n1];
    for (var j = 0; j < step2Neighbors.length; j++) {
      var n2 = step2Neighbors[j];
      if (visited[n2]) continue;
      visited[n2] = true;
      var step3Neighbors = ADJACENCY[n2];
      for (var k = 0; k < step3Neighbors.length; k++) {
        var n3 = step3Neighbors[k];
        if (visited[n3]) continue;
        // Only valid if the final landing captures an opponent piece
        if (board[n3] !== opponent) continue;
        moves.push({
          type: MOVE_TRIPLE,
          from: from,
          to: n3,
          path: [from, n1, n2, n3],
          capture: n3,
        });
      }
      visited[n2] = false;
    }
    visited[n1] = false;
  }
  return moves;
}

function getValidMoves(board, player) {
  var moves = [];
  var pieces = getPlayerPieces(board, player);
  for (var p = 0; p < pieces.length; p++) {
    var single = getSingleMovesForPiece(board, pieces[p], player);
    for (var s = 0; s < single.length; s++) moves.push(single[s]);
    var triple = getTripleMovesForPiece(board, pieces[p], player);
    for (var t = 0; t < triple.length; t++) moves.push(triple[t]);
  }
  return moves;
}

function hasValidMoves(board, player) {
  var pieces = getPlayerPieces(board, player);
  for (var p = 0; p < pieces.length; p++) {
    if (getSingleMovesForPiece(board, pieces[p], player).length > 0) return true;
    if (getTripleMovesForPiece(board, pieces[p], player).length > 0) return true;
  }
  return false;
}

function applyMove(board, move) {
  var newBoard = board.slice();
  newBoard[move.from] = EMPTY;
  // capture happens to be the same node as `to`, so a single assignment
  // overwrites both the captured piece and lands the moving piece.
  newBoard[move.to] = board[move.from];
  return newBoard;
}

// Returns the winner code ("A" or "B") if the game is over for `nextPlayer`,
// otherwise null. Should be called after a move is applied, with `nextPlayer`
// being the side that is about to move.
function checkWin(board, nextPlayer) {
  if (countPieces(board, PLAYER_A) === 0) return PLAYER_B;
  if (countPieces(board, PLAYER_B) === 0) return PLAYER_A;
  if (!hasValidMoves(board, nextPlayer)) return getOpponent(nextPlayer);
  return null;
}

// ============================================================
// AI: minimax with alpha-beta pruning
// ============================================================

function evaluateBoard(board, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  var aiPieces = countPieces(board, aiPlayer);
  var oppPieces = countPieces(board, opponent);

  if (oppPieces === 0) return 100000;
  if (aiPieces === 0) return -100000;

  var aiMoves = getValidMoves(board, aiPlayer).length;
  var oppMoves = getValidMoves(board, opponent).length;

  if (oppMoves === 0) return 100000;
  if (aiMoves === 0) return -100000;

  // Material counts dominate; mobility breaks ties.
  return (aiPieces - oppPieces) * 1000 + (aiMoves - oppMoves);
}

function minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
  var opponent = getOpponent(aiPlayer);
  var winner = checkWin(board, isMaximizing ? aiPlayer : opponent);
  if (winner === aiPlayer) return { score: 100000 + depth, move: null };
  if (winner === opponent) return { score: -100000 - depth, move: null };
  if (depth === 0) return { score: evaluateBoard(board, aiPlayer), move: null };

  var currentPlayer = isMaximizing ? aiPlayer : opponent;
  var moves = getValidMoves(board, currentPlayer);
  if (moves.length === 0) {
    return { score: isMaximizing ? -100000 - depth : 100000 + depth, move: null };
  }

  var bestMove = moves[0];
  if (isMaximizing) {
    var maxScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var nb = applyMove(board, moves[i]);
      var r = minimax(nb, depth - 1, false, aiPlayer, alpha, beta);
      if (r.score > maxScore) {
        maxScore = r.score;
        bestMove = moves[i];
      }
      alpha = Math.max(alpha, r.score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  }
  var minScore = Infinity;
  for (var j = 0; j < moves.length; j++) {
    var nb2 = applyMove(board, moves[j]);
    var r2 = minimax(nb2, depth - 1, true, aiPlayer, alpha, beta);
    if (r2.score < minScore) {
      minScore = r2.score;
      bestMove = moves[j];
    }
    beta = Math.min(beta, r2.score);
    if (beta <= alpha) break;
  }
  return { score: minScore, move: bestMove };
}

function getBestAIMove(state) {
  var aiPlayer = state.aiTeam;
  var moves = getValidMoves(state.board, aiPlayer);
  if (moves.length === 0) return null;

  // Take an immediate capture-and-win if available
  for (var i = 0; i < moves.length; i++) {
    var nb = applyMove(state.board, moves[i]);
    if (countPieces(nb, getOpponent(aiPlayer)) === 0) return moves[i];
  }

  var depth = 4;
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
    MOVE_SINGLE: MOVE_SINGLE,
    MOVE_TRIPLE: MOVE_TRIPLE,
    createBoard: createBoard,
    createGameState: createGameState,
    getOpponent: getOpponent,
    getNeighbors: getNeighbors,
    getPlayerPieces: getPlayerPieces,
    countPieces: countPieces,
    isLandable: isLandable,
    getSingleMovesForPiece: getSingleMovesForPiece,
    getTripleMovesForPiece: getTripleMovesForPiece,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    applyMove: applyMove,
    checkWin: checkWin,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI
// ============================================================
if (typeof document !== "undefined") {
  var state = null;
  var selectedPiece = null;
  // Pending move type for the selected piece: MOVE_SINGLE or MOVE_TRIPLE
  var moveMode = MOVE_SINGLE;
  // Chant for the triple move. The game is named after this chant: 小→猫→钓→鱼.
  // Some regions instead chant 鸡→毛→蒜→皮; the rules are identical.
  var CHANT = ["小", "猫", "钓", "鱼"];

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    // Layout constants for the SVG board
    var pad = 30;
    var unit = 90; // distance between adjacent grid points
    var nodeR = 22;
    var width = pad * 2 + unit * 3;
    var height = pad * 2 + unit * 3;

    // Build SVG element
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("class", "board-svg");

    // Draw edges first (so nodes paint on top)
    for (var i = 0; i < ADJACENCY.length; i++) {
      var neighbors = ADJACENCY[i];
      for (var n = 0; n < neighbors.length; n++) {
        var j = neighbors[n];
        if (j <= i) continue;
        var p1 = BOARD_POSITIONS[i];
        var p2 = BOARD_POSITIONS[j];
        var line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", pad + p1.x * unit);
        line.setAttribute("y1", pad + p1.y * unit);
        line.setAttribute("x2", pad + p2.x * unit);
        line.setAttribute("y2", pad + p2.y * unit);
        line.setAttribute("class", "board-edge");
        svg.appendChild(line);
      }
    }

    // Draw nodes (interactive)
    for (var k = 0; k < BOARD_POSITIONS.length; k++) {
      var pos = BOARD_POSITIONS[k];
      var cx = pad + pos.x * unit;
      var cy = pad + pos.y * unit;

      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "node");
      g.setAttribute("data-pos", k);
      g.setAttribute("transform", "translate(" + cx + "," + cy + ")");

      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", nodeR);
      circle.setAttribute("class", "node-circle");
      g.appendChild(circle);

      var text = document.createElementNS(svgNS, "text");
      text.setAttribute("class", "node-text");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      g.appendChild(text);

      g.addEventListener(
        "click",
        (function (idx) {
          return function () {
            handleCellClick(idx);
          };
        })(k)
      );
      svg.appendChild(g);
    }

    boardEl.appendChild(svg);
  }

  function getReachableTargets(board, from, player, mode) {
    if (mode === MOVE_TRIPLE) return getTripleMovesForPiece(board, from, player);
    return getSingleMovesForPiece(board, from, player);
  }

  function renderGame() {
    if (!state) return;
    var nodes = document.querySelectorAll("#board .node");
    var reachableMap = {};
    if (selectedPiece !== null) {
      var reachable = getReachableTargets(
        state.board,
        selectedPiece,
        state.currentPlayer,
        moveMode
      );
      for (var r = 0; r < reachable.length; r++) {
        reachableMap[reachable[r].to] = reachable[r];
      }
    }

    nodes.forEach((g) => {
      var pos = parseInt(g.getAttribute("data-pos"));
      var classes = ["node"];
      var label = "";
      if (state.board[pos] === PLAYER_A) {
        classes.push("node-a");
        label = "猫";
      } else if (state.board[pos] === PLAYER_B) {
        classes.push("node-b");
        label = "鱼";
      } else {
        classes.push("node-empty");
      }
      if (selectedPiece === pos) classes.push("node-selected");
      var hit = reachableMap[pos];
      if (hit) {
        if (hit.capture !== null) classes.push("node-capture");
        else classes.push(moveMode === MOVE_TRIPLE ? "node-triple" : "node-highlight");
      }
      g.setAttribute("class", classes.join(" "));
      var text = g.querySelector(".node-text");
      if (text) text.textContent = label;
    });

    // Status bar
    document.getElementById("current-player").textContent =
      state.currentPlayer === PLAYER_A ? "猫" : "鱼";
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("pieces-a").textContent = countPieces(state.board, PLAYER_A);
    document.getElementById("pieces-b").textContent = countPieces(state.board, PLAYER_B);

    // Move-mode toggle highlight
    var btnSingle = document.getElementById("btn-mode-single");
    var btnTriple = document.getElementById("btn-mode-triple");
    if (btnSingle && btnTriple) {
      btnSingle.classList.toggle("active", moveMode === MOVE_SINGLE);
      btnTriple.classList.toggle("active", moveMode === MOVE_TRIPLE);
    }

    // Last-move chant trail
    var trailEl = document.getElementById("chant-trail");
    if (trailEl) {
      if (state.lastMove && state.lastMove.type === MOVE_TRIPLE) {
        trailEl.textContent =
          "上一步：" + state.lastMove.path.map((node, idx) => CHANT[idx]).join(" → ") + "（吃子）";
      } else if (state.lastMove && state.lastMove.type === MOVE_SINGLE) {
        trailEl.textContent =
          "上一步：一步移动" + (state.lastMove.capture !== null ? "（吃子）" : "");
      } else {
        trailEl.textContent = "";
      }
    }

    if (state.aiThinking) {
      document.getElementById("message").textContent = "AI 思考中…";
      document.getElementById("message").className = "info";
    } else {
      document.getElementById("message").textContent = "";
      document.getElementById("message").className = "";
    }

    if (state.gameOver) {
      var winnerText = state.winner === PLAYER_A ? "猫获胜！" : "鱼获胜！";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function setMoveMode(mode) {
    moveMode = mode;
    renderGame();
  }

  function commitMove(move) {
    state.board = applyMove(state.board, move);
    state.lastMove = move;
    selectedPiece = null;
    moveMode = MOVE_SINGLE;
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

  function handleCellClick(pos) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    // Click own piece -> select / re-select
    if (state.board[pos] === state.currentPlayer) {
      selectedPiece = pos;
      // Reset to single mode when (re-)selecting
      moveMode = MOVE_SINGLE;
      renderGame();
      return;
    }

    if (selectedPiece !== null) {
      var moves = getReachableTargets(state.board, selectedPiece, state.currentPlayer, moveMode);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].to === pos) {
          commitMove(moves[i]);
          return;
        }
      }
      // Click on a non-target empty / opponent cell: deselect
      selectedPiece = null;
      moveMode = MOVE_SINGLE;
      renderGame();
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
    state = createGameState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      state.playerTeam = PLAYER_A;
      state.aiTeam = PLAYER_B;
    }
    selectedPiece = null;
    moveMode = MOVE_SINGLE;
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
    var btnSingle = document.getElementById("btn-mode-single");
    var btnTriple = document.getElementById("btn-mode-triple");
    if (btnSingle) btnSingle.addEventListener("click", () => setMoveMode(MOVE_SINGLE));
    if (btnTriple) btnTriple.addEventListener("click", () => setMoveMode(MOVE_TRIPLE));
  });
}
