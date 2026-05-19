/* eslint-disable no-var */
// ============================================================
// 仨子儿棋 (Sa Zi Er Qi) - Three-in-a-Row Chess
// 2 players, 12 positions (3 concentric squares), 6 pieces each
// Form a line of 3 to capture an opponent piece
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var BOARD_POSITIONS = 12;
var PIECES_EACH = 6;

// ============================================================
// Board layout: 3 concentric squares, 4 corners each
//
//   0---1            outer square
//   |   |
//   3---2
//   4---5            middle square
//   |   |
//   7---6
//   8---9            inner square
//   |   |
//  11--10
//
// Radial connections: 0-4, 1-5, 2-6, 3-7, 4-8, 5-9, 6-10, 7-11
// ============================================================

var CONNECTIONS = {
  0: [1, 3, 4],
  1: [0, 2, 5],
  2: [1, 3, 6],
  3: [0, 2, 7],
  4: [0, 5, 7, 8],
  5: [1, 4, 6, 9],
  6: [2, 5, 7, 10],
  7: [3, 4, 6, 11],
  8: [4, 9, 11],
  9: [5, 8, 10],
  10: [6, 9, 11],
  11: [7, 8, 10],
};

// All possible winning lines (3 in a row along connected edges)
var WIN_LINES = [
  // Outer square edges
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 0],
  [3, 0, 1],
  // Middle square edges
  [4, 5, 6],
  [5, 6, 7],
  [6, 7, 4],
  [7, 4, 5],
  // Inner square edges
  [8, 9, 10],
  [9, 10, 11],
  [10, 11, 8],
  [11, 8, 9],
  // Radial lines outer to middle
  [0, 4, 8],
  [1, 5, 9],
  [2, 6, 10],
  [3, 7, 11],
  // Radial lines middle to inner (same lines as above, reverse direction)
  [8, 4, 0],
  [9, 5, 1],
  [10, 6, 2],
  [11, 7, 3],
  // Cross square diagonals (short connections)
  [0, 4, 1],
  [1, 5, 2],
  [2, 6, 3],
  [3, 7, 0],
];

function createBoard() {
  var board = [];
  for (var i = 0; i < BOARD_POSITIONS; i++) {
    board.push(EMPTY);
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
    piecesA: 0,
    piecesB: 0,
    placedA: 0,
    placedB: 0,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    scoreA: 0,
    scoreB: 0,
  };
}

function getNeighbors(pos) {
  return CONNECTIONS[pos] || [];
}

function countPieces(board, player) {
  var count = 0;
  for (var i = 0; i < BOARD_POSITIONS; i++) {
    if (board[i] === player) count++;
  }
  return count;
}

function getEmptyPositions(board) {
  var positions = [];
  for (var i = 0; i < BOARD_POSITIONS; i++) {
    if (board[i] === EMPTY) {
      positions.push(i);
    }
  }
  return positions;
}

function getValidMoves(board, player) {
  var moves = [];
  for (var i = 0; i < BOARD_POSITIONS; i++) {
    if (board[i] === player) {
      var neighbors = getNeighbors(i);
      for (var j = 0; j < neighbors.length; j++) {
        if (board[neighbors[j]] === EMPTY) {
          moves.push({ from: i, to: neighbors[j] });
        }
      }
    }
  }
  return moves;
}

function getWinningLines(board, player) {
  var lines = [];
  for (var i = 0; i < WIN_LINES.length; i++) {
    var line = WIN_LINES[i];
    if (board[line[0]] === player && board[line[1]] === player && board[line[2]] === player) {
      lines.push(line);
    }
  }
  return lines;
}

function checkWin(board, player) {
  var opponent = player === PLAYER_A ? PLAYER_B : PLAYER_A;
  if (countPieces(board, opponent) < 3) {
    return { winner: player, reason: "opponent_eliminated" };
  }
  return null;
}

function capturePiece(board, pos) {
  var newBoard = board.slice();
  newBoard[pos] = EMPTY;
  return newBoard;
}

function placePiece(board, pos, player) {
  var newBoard = board.slice();
  newBoard[pos] = player;
  return newBoard;
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
  var aiPieces = countPieces(board, aiPlayer);
  var oppPieces = countPieces(board, opponent);

  var score = 0;

  // Material advantage
  score += (aiPieces - oppPieces) * 20;

  // Formation potential: count 2-in-a-row with open third
  for (var i = 0; i < WIN_LINES.length; i++) {
    var line = WIN_LINES[i];
    var aiCount = 0;
    var oppCount = 0;
    var emptyCount = 0;
    for (var j = 0; j < 3; j++) {
      if (board[line[j]] === aiPlayer) aiCount++;
      else if (board[line[j]] === opponent) oppCount++;
      else emptyCount++;
    }
    if (aiCount === 2 && emptyCount === 1) score += 15;
    if (oppCount === 2 && emptyCount === 1) score -= 12;
  }

  // Mobility
  var aiMoves = getValidMoves(board, aiPlayer).length;
  var oppMoves = getValidMoves(board, opponent).length;
  score += (aiMoves - oppMoves) * 3;

  // Center control (middle square positions 4-7 are more connected)
  for (var p = 4; p <= 7; p++) {
    if (board[p] === aiPlayer) score += 2;
    if (board[p] === opponent) score -= 2;
  }

  return score;
}

function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  if (countPieces(board, opponent) < 3) return 1000 + depth;
  if (countPieces(board, aiPlayer) < 3) return -1000 - depth;
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  var currentPlayer = maximizing ? aiPlayer : opponent;
  var moves = getValidMoves(board, currentPlayer);

  if (maximizing) {
    var maxEval = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var newBoard = movePiece(board, moves[i].from, moves[i].to);
      var evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (evalScore > maxEval) maxEval = evalScore;
      if (maxEval > alpha) alpha = maxEval;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    var minEval = Infinity;
    for (var j = 0; j < moves.length; j++) {
      var newBoard2 = movePiece(board, moves[j].from, moves[j].to);
      var evalScore2 = minimax(newBoard2, depth - 1, alpha, beta, true, aiPlayer);
      if (evalScore2 < minEval) minEval = evalScore2;
      if (minEval < beta) beta = evalScore2;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;

  if (state.phase === "place") {
    // Placement phase: simple heuristic
    var emptyPositions = getEmptyPositions(board);
    var opponent = getOpponent(aiPlayer);

    // Try to capture by forming line
    for (var i = 0; i < emptyPositions.length; i++) {
      var testBoard = placePiece(board, emptyPositions[i], aiPlayer);
      var winLines = getWinningLines(testBoard, aiPlayer);
      if (winLines.length > 0) {
        return { type: "place", pos: emptyPositions[i] };
      }
    }

    // Block opponent from forming line
    for (var j = 0; j < emptyPositions.length; j++) {
      var testBoard2 = placePiece(board, emptyPositions[j], opponent);
      var winLines2 = getWinningLines(testBoard2, opponent);
      if (winLines2.length > 0) {
        return { type: "place", pos: emptyPositions[j] };
      }
    }

    // Prefer middle square positions
    var middlePositions = [4, 5, 6, 7];
    var emptyMiddle = [];
    for (var m = 0; m < middlePositions.length; m++) {
      if (board[middlePositions[m]] === EMPTY) {
        emptyMiddle.push(middlePositions[m]);
      }
    }
    if (emptyMiddle.length > 0) {
      var idx = Math.floor(Math.random() * emptyMiddle.length);
      return { type: "place", pos: emptyMiddle[idx] };
    }

    // Random placement
    var rIdx = Math.floor(Math.random() * emptyPositions.length);
    return { type: "place", pos: emptyPositions[rIdx] };
  }

  // Movement phase: minimax
  var moves = getValidMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  var bestScore = -Infinity;
  var bestMoves = [];

  for (var k = 0; k < moves.length; k++) {
    var newBoard = movePiece(board, moves[k].from, moves[k].to);
    var score = minimax(newBoard, 3, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [moves[k]];
    } else if (score === bestScore) {
      bestMoves.push(moves[k]);
    }
  }

  var best = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return { type: "move", from: best.from, to: best.to };
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    BOARD_POSITIONS: BOARD_POSITIONS,
    PIECES_EACH: PIECES_EACH,
    CONNECTIONS: CONNECTIONS,
    WIN_LINES: WIN_LINES,
    createBoard: createBoard,
    createGameState: createGameState,
    getNeighbors: getNeighbors,
    countPieces: countPieces,
    getEmptyPositions: getEmptyPositions,
    getValidMoves: getValidMoves,
    getWinningLines: getWinningLines,
    checkWin: checkWin,
    capturePiece: capturePiece,
    placePiece: placePiece,
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
  var captureMode = false;

  // Position coordinates for SVG rendering
  var POSITIONS = [
    { x: 80, y: 80 },
    { x: 320, y: 80 },
    { x: 320, y: 320 },
    { x: 80, y: 320 },
    { x: 130, y: 130 },
    { x: 270, y: 130 },
    { x: 270, y: 270 },
    { x: 130, y: 270 },
    { x: 170, y: 170 },
    { x: 230, y: 170 },
    { x: 230, y: 230 },
    { x: 170, y: 230 },
  ];

  // All unique edges for drawing (deduplicated)
  var DRAW_EDGES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 8],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
    [4, 8],
    [5, 9],
    [6, 10],
    [7, 11],
  ];

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 400 400");
    svg.setAttribute("width", "100%");
    svg.setAttribute("style", "max-width: 400px; height: auto;");

    // Draw edges
    for (var e = 0; e < DRAW_EDGES.length; e++) {
      var from = DRAW_EDGES[e][0];
      var to = DRAW_EDGES[e][1];
      var line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", POSITIONS[from].x);
      line.setAttribute("y1", POSITIONS[from].y);
      line.setAttribute("x2", POSITIONS[to].x);
      line.setAttribute("y2", POSITIONS[to].y);
      line.setAttribute("class", "board-edge");
      svg.appendChild(line);
    }

    // Draw position nodes (click targets)
    for (var i = 0; i < BOARD_POSITIONS; i++) {
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

      // Piece text element (overlaid on node)
      var text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", POSITIONS[i].x);
      text.setAttribute("y", POSITIONS[i].y + 7);
      text.setAttribute("class", "piece-text");
      text.dataset.pos = i;
      text.style.pointerEvents = "none";
      svg.appendChild(text);
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
      if (selectedPiece !== null && !captureMode) {
        var targets = getNeighbors(selectedPiece);
        for (var i = 0; i < targets.length; i++) {
          if (targets[i] === pos && state.board[pos] === EMPTY) {
            node.classList.add("node-highlight");
          }
        }
      }

      // Highlight capturable pieces
      if (captureMode) {
        var opponent = getOpponent(state.currentPlayer);
        if (state.board[pos] === opponent) {
          node.classList.add("node-capturable");
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
    document.getElementById("phase-text").textContent =
      state.phase === "place" ? "布子阶段" : "走子阶段";

    // Show capture instructions
    var messageEl = document.getElementById("message");
    if (captureMode) {
      var opponent = getOpponent(state.currentPlayer);
      var capturableCount = 0;
      for (var c = 0; c < BOARD_POSITIONS; c++) {
        if (state.board[c] === opponent) capturableCount++;
      }
      messageEl.textContent = "形成三连！选择要吃掉的对方棋子（" + capturableCount + " 颗可选）";
      messageEl.className = "info";
    } else {
      messageEl.textContent = "";
      messageEl.className = "";
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

  function handlePositionClick(pos) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    var player = state.currentPlayer;

    // Capture mode: click opponent piece to remove
    if (captureMode) {
      var opponent = getOpponent(player);
      if (state.board[pos] === opponent) {
        state.board = capturePiece(state.board, pos);
        state.piecesA = countPieces(state.board, PLAYER_A);
        state.piecesB = countPieces(state.board, PLAYER_B);
        captureMode = false;
        selectedPiece = null;

        var winResult = checkWin(state.board, player);
        if (winResult) {
          state.gameOver = true;
          state.winner = player;
        } else {
          state.currentPlayer = getOpponent(state.currentPlayer);
          state.turnCount++;
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
      if (state.board[pos] !== EMPTY) return;
      var placedCount = player === PLAYER_A ? state.placedA : state.placedB;
      if (placedCount >= PIECES_EACH) return;

      state.board = placePiece(state.board, pos, player);
      if (player === PLAYER_A) {
        state.placedA++;
        state.piecesA++;
      } else {
        state.placedB++;
        state.piecesB++;
      }

      var winLines = getWinningLines(state.board, player);
      if (winLines.length > 0) {
        captureMode = true;
      } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
        state.phase = "move";
        state.currentPlayer = getOpponent(state.currentPlayer);
        state.turnCount++;
      } else {
        state.currentPlayer = getOpponent(state.currentPlayer);
        state.turnCount++;
      }
      renderGame();
      if (
        !state.gameOver &&
        state.mode === "pve" &&
        state.currentPlayer === state.aiTeam &&
        !captureMode
      ) {
        triggerAI();
      }
      return;
    }

    // Movement phase: select own piece
    if (state.board[pos] === player) {
      selectedPiece = pos;
      renderGame();
      return;
    }

    // Movement phase: move selected piece
    if (selectedPiece !== null && state.board[pos] === EMPTY) {
      var neighbors = getNeighbors(selectedPiece);
      for (var i = 0; i < neighbors.length; i++) {
        if (neighbors[i] === pos) {
          state.board = movePiece(state.board, selectedPiece, pos);
          selectedPiece = null;

          var winLines2 = getWinningLines(state.board, state.currentPlayer);
          if (winLines2.length > 0) {
            captureMode = true;
          } else {
            state.currentPlayer = getOpponent(state.currentPlayer);
            state.turnCount++;
          }

          renderGame();
          if (
            !state.gameOver &&
            state.mode === "pve" &&
            state.currentPlayer === state.aiTeam &&
            !captureMode
          ) {
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
        state.gameOver = true;
        state.winner = getOpponent(state.aiTeam);
        renderGame();
        return;
      }

      if (aiMove.type === "place") {
        state.board = placePiece(state.board, aiMove.pos, state.aiTeam);
        if (state.aiTeam === PLAYER_A) {
          state.placedA++;
          state.piecesA++;
        } else {
          state.placedB++;
          state.piecesB++;
        }

        var winLines = getWinningLines(state.board, state.aiTeam);
        if (winLines.length > 0) {
          // AI captures: pick the opponent piece with most connections to other opponent pieces
          var opponent = getOpponent(state.aiTeam);
          var bestCapture = -1;
          var bestScore = -1;
          for (var c = 0; c < BOARD_POSITIONS; c++) {
            if (state.board[c] === opponent) {
              var connections = 0;
              var neighbors = getNeighbors(c);
              for (var n = 0; n < neighbors.length; n++) {
                if (state.board[neighbors[n]] === opponent) connections++;
              }
              if (connections > bestScore) {
                bestScore = connections;
                bestCapture = c;
              }
            }
          }
          if (bestCapture >= 0) {
            state.board = capturePiece(state.board, bestCapture);
            state.piecesA = countPieces(state.board, PLAYER_A);
            state.piecesB = countPieces(state.board, PLAYER_B);
          }

          var winResult = checkWin(state.board, state.aiTeam);
          if (winResult) {
            state.gameOver = true;
            state.winner = state.aiTeam;
          }
        } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
          state.phase = "move";
        }

        if (!captureMode && !state.gameOver) {
          state.currentPlayer = getOpponent(state.currentPlayer);
          state.turnCount++;
        }
      } else {
        // Move phase
        state.board = movePiece(state.board, aiMove.from, aiMove.to);

        var winLines2 = getWinningLines(state.board, state.aiTeam);
        if (winLines2.length > 0) {
          // AI captures
          var opponent2 = getOpponent(state.aiTeam);
          var bestCapture2 = -1;
          var bestScore2 = -1;
          for (var c2 = 0; c2 < BOARD_POSITIONS; c2++) {
            if (state.board[c2] === opponent2) {
              var connections2 = 0;
              var neighbors2 = getNeighbors(c2);
              for (var n2 = 0; n2 < neighbors2.length; n2++) {
                if (state.board[neighbors2[n2]] === opponent2) connections2++;
              }
              if (connections2 > bestScore2) {
                bestScore2 = connections2;
                bestCapture2 = c2;
              }
            }
          }
          if (bestCapture2 >= 0) {
            state.board = capturePiece(state.board, bestCapture2);
            state.piecesA = countPieces(state.board, PLAYER_A);
            state.piecesB = countPieces(state.board, PLAYER_B);
          }

          var winResult2 = checkWin(state.board, state.aiTeam);
          if (winResult2) {
            state.gameOver = true;
            state.winner = state.aiTeam;
          }
        }

        if (!state.gameOver) {
          state.currentPlayer = getOpponent(state.currentPlayer);
          state.turnCount++;
        }
      }

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
    captureMode = false;
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
