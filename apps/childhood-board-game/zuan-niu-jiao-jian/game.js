/* eslint-disable no-var */
// ============================================================
// 钻牛角尖 (Zuan Niu Jiao Jian) - Drill the Horn Tip
// Asymmetric 2-player strategy game (2 vs 1)
// Player A: 2 big pieces, try to trap B
// Player B: 1 small piece, try to reach the wide end
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var TOTAL_POSITIONS = 10;

// Wide end positions (B wins by reaching here)
var WIDE_END = [0, 3];

// Board adjacency map (0-indexed)
//   Row 0 (wide):  0---1---2---3
//                   \ / \ / \ /
//   Row 1:          4---5---6
//                    \ / \ /
//   Row 2:            7---8
//                     \ /
//   Row 3 (tip):        9
var CONNECTIONS = {
  0: [1, 4],
  1: [0, 2, 5],
  2: [1, 3, 6],
  3: [2, 6],
  4: [0, 5, 7],
  5: [1, 4, 6, 8],
  6: [2, 3, 5, 7, 9],
  7: [4, 6, 8],
  8: [5, 7, 9],
  9: [6, 8],
};

// Position coordinates for SVG rendering (narrowing left to right)
var POSITIONS = [
  { x: 50, y: 35 }, // 0: wide end top
  { x: 50, y: 115 }, // 1
  { x: 50, y: 195 }, // 2
  { x: 50, y: 275 }, // 3: wide end bottom
  { x: 165, y: 75 }, // 4
  { x: 165, y: 155 }, // 5
  { x: 165, y: 235 }, // 6
  { x: 280, y: 115 }, // 7
  { x: 280, y: 195 }, // 8
  { x: 395, y: 155 }, // 9: tip
];

// Build unique edges from connections
var EDGES = [];
var edgeSet = {};
for (var i = 0; i < TOTAL_POSITIONS; i++) {
  var neighbors = CONNECTIONS[i];
  for (var j = 0; j < neighbors.length; j++) {
    var key = Math.min(i, neighbors[j]) + "-" + Math.max(i, neighbors[j]);
    if (!edgeSet[key]) {
      edgeSet[key] = true;
      EDGES.push([i, neighbors[j]]);
    }
  }
}

function createBoard() {
  var board = [];
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    board.push(EMPTY);
  }
  return board;
}

function createInitialState(mode) {
  var board = createBoard();
  // Player A starts at wide end (positions 0, 3)
  board[0] = PLAYER_A;
  board[3] = PLAYER_A;
  // Player B starts at tip (position 9)
  board[9] = PLAYER_B;

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
    if (board[i] === player) {
      var nbrs = CONNECTIONS[i];
      for (var j = 0; j < nbrs.length; j++) {
        if (board[nbrs[j]] === EMPTY) {
          moves.push({ from: i, to: nbrs[j] });
        }
      }
    }
  }
  return moves;
}

function checkWin(board) {
  // A wins if B has no valid moves (stuck)
  var bMoves = getValidMoves(board, PLAYER_B);
  if (bMoves.length === 0) {
    return PLAYER_A;
  }
  // B wins if at wide end
  if (board[0] === PLAYER_B || board[3] === PLAYER_B) {
    return PLAYER_B;
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
// AI: Minimax with alpha-beta pruning (depth-limited)
// ============================================================
function evaluateBoard(board, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  var winner = checkWin(board);
  if (winner === aiPlayer) return 1000;
  if (winner === opponent) return -1000;

  var score = 0;
  var i, j;

  if (aiPlayer === PLAYER_A) {
    // A wants to trap B: penalize B being near wide end
    if (board[0] === PLAYER_B) score -= 500;
    if (board[3] === PLAYER_B) score -= 500;

    // Find B position
    var bPos = -1;
    for (i = 0; i < TOTAL_POSITIONS; i++) {
      if (board[i] === PLAYER_B) bPos = i;
    }

    // Closer to wide end = worse for A
    if (bPos === 0 || bPos === 3) score -= 200;
    else if (bPos === 1 || bPos === 2) score -= 100;
    else if (bPos === 4 || bPos === 5 || bPos === 6) score -= 30;

    // Count A pieces adjacent to B (surrounding is good for A)
    for (j = 0; j < TOTAL_POSITIONS; j++) {
      if (board[j] === PLAYER_B) {
        var adjA = 0;
        var nbrs = CONNECTIONS[j];
        for (var k = 0; k < nbrs.length; k++) {
          if (board[nbrs[k]] === PLAYER_A) adjA++;
        }
        score += adjA * 30;
        // Bonus if all neighbors are A (B is trapped next turn)
        if (adjA === nbrs.length) score += 50;
      }
    }

    // A mobility
    var aMoves = getValidMoves(board, PLAYER_A).length;
    score += aMoves * 3;
  } else {
    // B wants to reach wide end
    var bPos2 = -1;
    for (i = 0; i < TOTAL_POSITIONS; i++) {
      if (board[i] === PLAYER_B) bPos2 = i;
    }

    // Reward being close to wide end
    if (bPos2 === 0 || bPos2 === 3) score += 500;
    else if (bPos2 === 1 || bPos2 === 2) score += 200;
    else if (bPos2 === 4 || bPos2 === 5 || bPos2 === 6) score += 50;

    // B mobility (more escape routes = better)
    var bMoves = getValidMoves(board, PLAYER_B).length;
    score += bMoves * 5;

    // Penalize A pieces adjacent to B
    for (j = 0; j < TOTAL_POSITIONS; j++) {
      if (board[j] === PLAYER_B) {
        var adjA2 = 0;
        var nbrs2 = CONNECTIONS[j];
        for (var k2 = 0; k2 < nbrs2.length; k2++) {
          if (board[nbrs2[k2]] === PLAYER_A) adjA2++;
        }
        score -= adjA2 * 40;
      }
    }
  }

  return score;
}

function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
  var winner = checkWin(board);
  if (winner === aiPlayer) return 1000 + depth;
  if (winner !== null) return -1000 - depth;
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  var currentPlayer = maximizing ? aiPlayer : getOpponent(aiPlayer);
  var moves = getValidMoves(board, currentPlayer);

  if (moves.length === 0) {
    return maximizing ? -1000 - depth : 1000 + depth;
  }

  var i, newBoard, evalScore;
  if (maximizing) {
    var maxEval = -Infinity;
    for (i = 0; i < moves.length; i++) {
      newBoard = movePiece(board, moves[i].from, moves[i].to);
      evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (evalScore > maxEval) maxEval = evalScore;
      if (maxEval > alpha) alpha = maxEval;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    var minEval = Infinity;
    for (i = 0; i < moves.length; i++) {
      newBoard = movePiece(board, moves[i].from, moves[i].to);
      evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      if (evalScore < minEval) minEval = evalScore;
      if (minEval < beta) beta = minEval;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;
  var moves = getValidMoves(board, aiPlayer);

  if (moves.length === 0) return null;

  var bestScore = -Infinity;
  var bestMoves = [];

  for (var i = 0; i < moves.length; i++) {
    var newBoard = movePiece(board, moves[i].from, moves[i].to);
    var score = minimax(newBoard, 4, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [moves[i]];
    } else if (score === bestScore) {
      bestMoves.push(moves[i]);
    }
  }

  // Random choice among equally good moves
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
    WIDE_END: WIDE_END,
    CONNECTIONS: CONNECTIONS,
    EDGES: EDGES,
    POSITIONS: POSITIONS,
    createBoard: createBoard,
    createInitialState: createInitialState,
    getConnections: getConnections,
    countPieces: countPieces,
    getValidMoves: getValidMoves,
    checkWin: checkWin,
    movePiece: movePiece,
    getOpponent: getOpponent,
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
    svg.setAttribute("viewBox", "0 0 450 320");
    svg.setAttribute("width", "100%");
    svg.setAttribute("style", "max-width: 450px; height: auto;");

    // Draw edges
    for (var e = 0; e < EDGES.length; e++) {
      var from = EDGES[e][0];
      var to = EDGES[e][1];
      var line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", POSITIONS[from].x);
      line.setAttribute("y1", POSITIONS[from].y);
      line.setAttribute("x2", POSITIONS[to].x);
      line.setAttribute("y2", POSITIONS[to].y);
      line.setAttribute("class", "board-edge");
      svg.appendChild(line);
    }

    // Zone labels
    var wideLabel = document.createElementNS(svgNS, "text");
    wideLabel.setAttribute("x", 50);
    wideLabel.setAttribute("y", 310);
    wideLabel.setAttribute("class", "zone-label");
    wideLabel.textContent = "宽端 (A起点)";
    svg.appendChild(wideLabel);

    var tipLabel = document.createElementNS(svgNS, "text");
    tipLabel.setAttribute("x", 395);
    tipLabel.setAttribute("y", 310);
    tipLabel.setAttribute("class", "zone-label");
    tipLabel.textContent = "尖端 (B起点)";
    svg.appendChild(tipLabel);

    // Draw position nodes and labels
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", POSITIONS[i].x);
      circle.setAttribute("cy", POSITIONS[i].y);
      circle.setAttribute("r", "24");
      circle.setAttribute("class", "position-node");
      circle.dataset.pos = i;
      circle.style.cursor = "pointer";
      circle.addEventListener(
        "click",
        (function (pos) {
          return function () {
            handlePositionClick(pos);
          };
        })(i)
      );
      svg.appendChild(circle);

      // Piece text element
      var text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", POSITIONS[i].x);
      text.setAttribute("y", POSITIONS[i].y + 7);
      text.setAttribute("class", "piece-text");
      text.dataset.pos = i;
      text.style.pointerEvents = "none";
      svg.appendChild(text);

      // Position number label
      var numLabel = document.createElementNS(svgNS, "text");
      numLabel.setAttribute("x", POSITIONS[i].x);
      numLabel.setAttribute("y", POSITIONS[i].y + 36);
      numLabel.setAttribute("class", "pos-label");
      numLabel.textContent = i + 1;
      svg.appendChild(numLabel);
    }

    boardEl.appendChild(svg);
  }

  function renderGame() {
    if (!state) return;

    var nodes = document.querySelectorAll("#board .position-node");
    var texts = document.querySelectorAll("#board .piece-text");

    nodes.forEach((node) => {
      var pos = parseInt(node.dataset.pos);
      node.setAttribute("class", "position-node");

      if (state.board[pos] === PLAYER_A) {
        node.classList.add("node-a");
      } else if (state.board[pos] === PLAYER_B) {
        node.classList.add("node-b");
      }

      if (selectedPiece === pos) {
        node.classList.add("node-selected");
      }

      // Highlight valid move targets
      if (selectedPiece !== null) {
        var targets = getConnections(selectedPiece);
        for (var i = 0; i < targets.length; i++) {
          if (targets[i] === pos && state.board[pos] === EMPTY) {
            node.classList.add("node-highlight");
          }
        }
      }
    });

    texts.forEach((text) => {
      var pos = parseInt(text.dataset.pos);
      text.textContent = "";
      text.setAttribute("class", "piece-text");
      if (state.board[pos] === PLAYER_A) {
        text.textContent = "A";
        text.classList.add("text-a");
      } else if (state.board[pos] === PLAYER_B) {
        text.textContent = "B";
        text.classList.add("text-b");
      }
    });

    // Update status bar
    document.getElementById("current-player").textContent =
      state.currentPlayer === PLAYER_A ? "A" : "B";
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;

    var movesA = getValidMoves(state.board, PLAYER_A).length;
    var movesB = getValidMoves(state.board, PLAYER_B).length;
    document.getElementById("moves-a").textContent = movesA;
    document.getElementById("moves-b").textContent = movesB;

    if (state.gameOver) {
      var winnerText = state.winner === PLAYER_A ? "A 获胜！(B被困住)" : "B 获胜！(到达宽端)";
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handlePositionClick(pos) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    var player = state.currentPlayer;

    // Clicking own piece: select it
    if (state.board[pos] === player) {
      selectedPiece = pos;
      renderGame();
      return;
    }

    // Clicking empty position with a piece selected: try to move
    if (selectedPiece !== null && state.board[pos] === EMPTY) {
      var targets = getConnections(selectedPiece);
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] === pos) {
          state.board = movePiece(state.board, selectedPiece, pos);
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
          return;
        }
      }
    }

    // Click elsewhere: deselect
    selectedPiece = null;
    renderGame();
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

      state.board = movePiece(state.board, aiMove.from, aiMove.to);

      var winner = checkWin(state.board);
      if (winner) {
        state.gameOver = true;
        state.winner = winner;
      }

      state.currentPlayer = getOpponent(state.currentPlayer);
      state.turnCount++;
      state.aiThinking = false;
      renderGame();
    }, 400);
  }

  function startGame(mode, firstPlayer) {
    state = createInitialState(mode);
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
