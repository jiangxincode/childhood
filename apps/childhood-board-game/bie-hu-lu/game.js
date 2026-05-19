/* eslint-disable no-var */
// ============================================================
// 憋葫芦 (Bie Hu Lu) - Squeeze the Gourd
// 2 players, 4x4 grid with diamond connections, 8 pieces each
// Capture by jump or surround, reduce opponent < 3 pieces to win
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
var MIN_PIECES = 3;
var AI_DEPTH = 3;

// Board connections: standard grid + diamond diagonal pattern
// All connections are bidirectional
var CONNECTIONS = {
  "0,0": [
    [1, 0],
    [0, 1],
  ],
  "1,0": [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 1],
    [2, 1],
  ],
  "2,0": [
    [1, 0],
    [3, 0],
    [2, 1],
    [1, 1],
    [3, 1],
  ],
  "3,0": [
    [2, 0],
    [3, 1],
    [2, 1],
  ],
  "0,1": [
    [0, 0],
    [1, 1],
    [0, 2],
    [1, 0],
    [1, 2],
  ],
  "1,1": [
    [0, 1],
    [2, 1],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
  "2,1": [
    [1, 1],
    [3, 1],
    [2, 0],
    [2, 2],
    [1, 0],
    [3, 0],
  ],
  "3,1": [
    [3, 0],
    [2, 1],
    [3, 2],
    [2, 0],
    [2, 2],
    [1, 2],
  ],
  "0,2": [
    [0, 1],
    [1, 2],
    [0, 3],
    [1, 3],
  ],
  "1,2": [
    [0, 2],
    [2, 2],
    [1, 1],
    [1, 3],
    [0, 1],
    [2, 3],
    [3, 2],
    [3, 1],
  ],
  "2,2": [
    [1, 2],
    [3, 2],
    [2, 1],
    [2, 3],
    [1, 1],
    [3, 1],
    [1, 3],
  ],
  "3,2": [
    [2, 2],
    [3, 1],
    [3, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ],
  "0,3": [
    [0, 2],
    [1, 3],
  ],
  "1,3": [
    [0, 3],
    [2, 3],
    [1, 2],
    [0, 2],
    [2, 2],
    [3, 2],
  ],
  "2,3": [
    [1, 3],
    [3, 3],
    [2, 2],
    [1, 2],
    [3, 2],
  ],
  "3,3": [
    [2, 3],
    [3, 2],
  ],
};

function getConnections(x, y) {
  var key = x + "," + y;
  return CONNECTIONS[key] || [];
}

function cloneBoard(board) {
  var newBoard = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    newBoard.push(board[y].slice());
  }
  return newBoard;
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
    phase: "place",
    piecesA: 0,
    piecesB: 0,
    placedA: 0,
    placedB: 0,
    gameOver: false,
    winner: null,
    winReason: null,
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

function getJumpCaptures(board, player) {
  var opponent = getOpponent(player);
  var captures = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== opponent) continue;
      var neighbors = getConnections(x, y);
      for (var i = 0; i < neighbors.length; i++) {
        var nx = neighbors[i][0];
        var ny = neighbors[i][1];
        if (board[ny][nx] !== EMPTY) continue;
        // Find player pieces adjacent to the opponent
        for (var j = 0; j < neighbors.length; j++) {
          var ax = neighbors[j][0];
          var ay = neighbors[j][1];
          if (board[ay][ax] !== player) continue;
          // Landing spot must NOT be adjacent to the player piece
          var playerConns = getConnections(ax, ay);
          var isAdjacent = false;
          for (var k = 0; k < playerConns.length; k++) {
            if (playerConns[k][0] === nx && playerConns[k][1] === ny) {
              isAdjacent = true;
              break;
            }
          }
          if (!isAdjacent) {
            captures.push({ fromX: ax, fromY: ay, toX: nx, toY: ny, captureX: x, captureY: y });
          }
        }
      }
    }
  }
  return captures;
}

function getSurroundCaptures(board, player) {
  var opponent = getOpponent(player);
  var captures = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== opponent) continue;
      var neighbors = getConnections(x, y);
      var allSurrounded = true;
      for (var i = 0; i < neighbors.length; i++) {
        if (board[neighbors[i][1]][neighbors[i][0]] !== player) {
          allSurrounded = false;
          break;
        }
      }
      if (allSurrounded) {
        captures.push({ x: x, y: y });
      }
    }
  }
  return captures;
}

function getValidMoves(board, player) {
  if (board === null || board === undefined) return [];
  var moves = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) {
        var neighbors = getConnections(x, y);
        for (var i = 0; i < neighbors.length; i++) {
          var nx = neighbors[i][0];
          var ny = neighbors[i][1];
          if (board[ny][nx] === EMPTY) {
            moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
          }
        }
      }
    }
  }
  return moves;
}

function checkWin(board, currentPlayer) {
  var piecesA = countPieces(board, PLAYER_A);
  var piecesB = countPieces(board, PLAYER_B);
  // Only check piece count when at least one player has pieces on the board
  if (piecesA + piecesB > 0) {
    if (piecesA < MIN_PIECES) return { winner: PLAYER_B, reason: "insufficient" };
    if (piecesB < MIN_PIECES) return { winner: PLAYER_A, reason: "insufficient" };
  }
  var opponent = getOpponent(currentPlayer);
  var opponentPieces = countPieces(board, opponent);
  if (opponentPieces > 0) {
    var moves = getValidMoves(board, opponent);
    if (moves.length === 0) return { winner: currentPlayer, reason: "no_moves" };
  }
  return null;
}

function placePiece(board, x, y, player) {
  var newBoard = cloneBoard(board);
  newBoard[y][x] = player;
  return newBoard;
}

function movePiece(board, fromX, fromY, toX, toY) {
  var newBoard = cloneBoard(board);
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

function capturePiece(board, x, y) {
  var newBoard = cloneBoard(board);
  newBoard[y][x] = EMPTY;
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

function evaluate(board, aiPlayer) {
  var aiPieces = countPieces(board, aiPlayer);
  var opponent = getOpponent(aiPlayer);
  var oppPieces = countPieces(board, opponent);
  // Only check piece count when at least one player has pieces on the board
  if (aiPieces + oppPieces > 0) {
    if (aiPieces < MIN_PIECES) return -1000;
    if (oppPieces < MIN_PIECES) return 1000;
  }
  var material = (aiPieces - oppPieces) * 10;
  var jumpCaps = getJumpCaptures(board, aiPlayer).length;
  var surrCaps = getSurroundCaptures(board, aiPlayer).length;
  var oppJumpCaps = getJumpCaptures(board, opponent).length;
  var oppSurrCaps = getSurroundCaptures(board, opponent).length;
  return material + jumpCaps * 5 + surrCaps * 3 - oppJumpCaps * 4 - oppSurrCaps * 2;
}

function minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
  var opponent = getOpponent(aiPlayer);
  var winner = checkWin(board, isMaximizing ? opponent : aiPlayer);
  if (winner) {
    return winner.winner === aiPlayer ? 1000 - depth : -1000 + depth;
  }
  if (depth === 0) return evaluate(board, aiPlayer);
  var currentPlayer = isMaximizing ? aiPlayer : opponent;
  var moves = getValidMoves(board, currentPlayer);
  if (moves.length === 0) return isMaximizing ? -1000 + depth : 1000 - depth;
  var bestScore = isMaximizing ? -Infinity : Infinity;
  for (var i = 0; i < moves.length; i++) {
    var newBoard = movePiece(board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
    var captures = getSurroundCaptures(newBoard, currentPlayer);
    for (var c = 0; c < captures.length; c++) {
      newBoard = capturePiece(newBoard, captures[c].x, captures[c].y);
    }
    var score = minimax(newBoard, depth - 1, !isMaximizing, aiPlayer, alpha, beta);
    if (isMaximizing) {
      if (score > bestScore) bestScore = score;
      if (score > alpha) alpha = score;
    } else {
      if (score < bestScore) bestScore = score;
      if (score < beta) beta = score;
    }
    if (beta <= alpha) break;
  }
  return bestScore;
}

function getBestAIMove(state) {
  var board = state.board;
  var aiPlayer = state.aiTeam;
  var opponent = getOpponent(aiPlayer);

  if (state.phase === "place") {
    var emptyCells = getEmptyCells(board);
    if (emptyCells.length === 0) return null;
    // Try to win by placing
    for (var w = 0; w < emptyCells.length; w++) {
      var testBoard = placePiece(board, emptyCells[w].x, emptyCells[w].y, aiPlayer);
      var win = checkWin(testBoard, aiPlayer);
      if (win && win.winner === aiPlayer) {
        return { type: "place", x: emptyCells[w].x, y: emptyCells[w].y };
      }
    }
    // Block opponent winning move
    for (var b = 0; b < emptyCells.length; b++) {
      var testBoard2 = placePiece(board, emptyCells[b].x, emptyCells[b].y, opponent);
      var win2 = checkWin(testBoard2, opponent);
      if (win2 && win2.winner === opponent) {
        return { type: "place", x: emptyCells[b].x, y: emptyCells[b].y };
      }
    }
    // Try to set up jump capture
    var jCaps = getJumpCaptures(board, aiPlayer);
    if (jCaps.length > 0) {
      return { type: "place", x: jCaps[0].toX, y: jCaps[0].toY };
    }
    // Try to set up surround capture
    var sCaps = getSurroundCaptures(board, aiPlayer);
    if (sCaps.length > 0) {
      var sNeighbors = getConnections(sCaps[0].x, sCaps[0].y);
      for (var si = 0; si < sNeighbors.length; si++) {
        if (board[sNeighbors[si][1]][sNeighbors[si][0]] === EMPTY) {
          return { type: "place", x: sNeighbors[si][0], y: sNeighbors[si][1] };
        }
      }
    }
    // Random placement
    var idx = Math.floor(Math.random() * emptyCells.length);
    return { type: "place", x: emptyCells[idx].x, y: emptyCells[idx].y };
  }

  // Move phase
  var moves = getValidMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  // Try jump capture
  var jumpCaps = getJumpCaptures(board, aiPlayer);
  if (jumpCaps.length > 0) {
    var bestJump = jumpCaps[0];
    var bestJumpScore = -Infinity;
    for (var jc = 0; jc < jumpCaps.length; jc++) {
      var jumpBoard = movePiece(
        board,
        jumpCaps[jc].fromX,
        jumpCaps[jc].fromY,
        jumpCaps[jc].toX,
        jumpCaps[jc].toY
      );
      jumpBoard = capturePiece(jumpBoard, jumpCaps[jc].captureX, jumpCaps[jc].captureY);
      var score = evaluate(jumpBoard, aiPlayer);
      if (score > bestJumpScore) {
        bestJumpScore = score;
        bestJump = jumpCaps[jc];
      }
    }
    return {
      type: "move",
      fromX: bestJump.fromX,
      fromY: bestJump.fromY,
      toX: bestJump.toX,
      toY: bestJump.toY,
    };
  }

  // Try surround capture (move to complete surround)
  var surrCaps = getSurroundCaptures(board, aiPlayer);
  if (surrCaps.length > 0) {
    // Move to complete surround on a different piece
    for (var sc = 0; sc < surrCaps.length; sc++) {
      var sNeighbors2 = getConnections(surrCaps[sc].x, surrCaps[sc].y);
      for (var si2 = 0; si2 < sNeighbors2.length; si2++) {
        var sx = sNeighbors2[si2][0];
        var sy = sNeighbors2[si2][1];
        if (board[sy][sx] === EMPTY) {
          // Find an AI piece adjacent to this empty cell
          var adjToEmpty = getConnections(sx, sy);
          for (var ae = 0; ae < adjToEmpty.length; ae++) {
            var aex = adjToEmpty[ae][0];
            var aey = adjToEmpty[ae][1];
            if (board[aey][aex] === aiPlayer) {
              return { type: "move", fromX: aex, fromY: aey, toX: sx, toY: sy };
            }
          }
        }
      }
    }
  }

  // Try to block opponent jump captures
  var oppJumpCaps = getJumpCaptures(board, opponent);
  if (oppJumpCaps.length > 0) {
    for (var ojc = 0; ojc < oppJumpCaps.length; ojc++) {
      var oj = oppJumpCaps[ojc];
      // Try moving to the landing spot to block
      for (var bm = 0; bm < moves.length; bm++) {
        if (moves[bm].toX === oj.toX && moves[bm].toY === oj.toY) {
          return {
            type: "move",
            fromX: moves[bm].fromX,
            fromY: moves[bm].fromY,
            toX: moves[bm].toX,
            toY: moves[bm].toY,
          };
        }
      }
    }
  }

  // Minimax with alpha-beta pruning
  var bestScore = -Infinity;
  var bestMove = moves[0];
  for (var m = 0; m < moves.length; m++) {
    var newBoard = movePiece(board, moves[m].fromX, moves[m].fromY, moves[m].toX, moves[m].toY);
    var caps = getSurroundCaptures(newBoard, aiPlayer);
    for (var c = 0; c < caps.length; c++) {
      newBoard = capturePiece(newBoard, caps[c].x, caps[c].y);
    }
    var score2 = minimax(newBoard, AI_DEPTH - 1, false, aiPlayer, -Infinity, Infinity);
    if (score2 > bestScore) {
      bestScore = score2;
      bestMove = moves[m];
    }
  }
  return {
    type: "move",
    fromX: bestMove.fromX,
    fromY: bestMove.fromY,
    toX: bestMove.toX,
    toY: bestMove.toY,
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
    MIN_PIECES: MIN_PIECES,
    CONNECTIONS: CONNECTIONS,
    getConnections: getConnections,
    cloneBoard: cloneBoard,
    createBoard: createBoard,
    createGameState: createGameState,
    inBounds: inBounds,
    countPieces: countPieces,
    getEmptyCells: getEmptyCells,
    getJumpCaptures: getJumpCaptures,
    getSurroundCaptures: getSurroundCaptures,
    getValidMoves: getValidMoves,
    checkWin: checkWin,
    placePiece: placePiece,
    movePiece: movePiece,
    capturePiece: capturePiece,
    getOpponent: getOpponent,
    evaluate: evaluate,
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

    // Create cells
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

    // Create SVG overlay for diagonal lines
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "board-lines-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    // Track drawn lines to avoid duplicates
    var drawnLines = {};

    for (var y2 = 0; y2 < BOARD_SIZE; y2++) {
      for (var x2 = 0; x2 < BOARD_SIZE; x2++) {
        var neighbors = getConnections(x2, y2);
        for (var i = 0; i < neighbors.length; i++) {
          var nx = neighbors[i][0];
          var ny = neighbors[i][1];
          // Only draw diagonal lines (skip horizontal/vertical)
          if (nx === x2 || ny === y2) continue;
          var key1 = x2 + "," + y2 + "-" + nx + "," + ny;
          var key2 = nx + "," + ny + "-" + x2 + "," + y2;
          if (drawnLines[key1] || drawnLines[key2]) continue;
          drawnLines[key1] = true;

          var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", x2);
          line.setAttribute("y1", y2);
          line.setAttribute("x2", nx);
          line.setAttribute("y2", ny);
          line.setAttribute("class", "board-diagonal-line");
          svg.appendChild(line);
        }
      }
    }

    boardEl.appendChild(svg);
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
      if (selectedPiece) {
        var neighbors = getConnections(selectedPiece.x, selectedPiece.y);
        for (var i = 0; i < neighbors.length; i++) {
          if (neighbors[i][0] === x && neighbors[i][1] === y && state.board[y][x] === EMPTY) {
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
    document.getElementById("pieces-a").textContent = countPieces(state.board, PLAYER_A);
    document.getElementById("pieces-b").textContent = countPieces(state.board, PLAYER_B);

    if (state.gameOver) {
      var winnerText = state.winner
        ? state.winner === PLAYER_A
          ? "A 获胜！"
          : "B 获胜！"
        : "平局！";
      if (state.winReason === "insufficient") {
        winnerText += "（对手棋子不足）";
      } else if (state.winReason === "no_moves") {
        winnerText += "（对手无路可走）";
      }
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function showMessage(text, type) {
    var msgEl = document.getElementById("message");
    msgEl.textContent = text;
    msgEl.className = type;
    setTimeout(() => {
      msgEl.textContent = "";
      msgEl.className = "";
    }, 2000);
  }

  function handleCellClick(x, y) {
    if (!state || state.gameOver || state.aiThinking) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    if (state.phase === "place") {
      if (state.board[y][x] !== EMPTY) {
        showMessage("该位置已有棋子", "error");
        return;
      }
      var player = state.currentPlayer;
      var placedCount = player === PLAYER_A ? state.placedA : state.placedB;
      if (placedCount >= PIECES_EACH) return;

      state.board = placePiece(state.board, x, y, player);
      if (player === PLAYER_A) state.piecesA++;
      else state.piecesB++;
      if (player === PLAYER_A) state.placedA++;
      else state.placedB++;

      var winResult = checkWin(state.board, player);
      if (winResult) {
        state.gameOver = true;
        state.winner = winResult.winner;
        state.winReason = winResult.reason;
      } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
        state.phase = "move";
        showMessage("进入走子阶段！", "info");
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
      var neighbors = getConnections(selectedPiece.x, selectedPiece.y);
      for (var i = 0; i < neighbors.length; i++) {
        if (neighbors[i][0] === x && neighbors[i][1] === y) {
          state.board = movePiece(state.board, selectedPiece.x, selectedPiece.y, x, y);
          selectedPiece = null;

          // Check surround capture
          var surrCaps = getSurroundCaptures(state.board, state.currentPlayer);
          if (surrCaps.length > 0) {
            for (var c = 0; c < surrCaps.length; c++) {
              state.board = capturePiece(state.board, surrCaps[c].x, surrCaps[c].y);
              if (state.currentPlayer === PLAYER_A) state.piecesB--;
              else state.piecesA--;
              showMessage("包围吃子！", "info");
            }
          }

          var winResult2 = checkWin(state.board, state.currentPlayer);
          if (winResult2) {
            state.gameOver = true;
            state.winner = winResult2.winner;
            state.winReason = winResult2.reason;
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
        state.gameOver = true;
        state.winner = getOpponent(state.aiTeam);
        state.winReason = "no_moves";
        state.aiThinking = false;
        renderGame();
        return;
      }

      if (aiMove.type === "place") {
        state.board = placePiece(state.board, aiMove.x, aiMove.y, state.aiTeam);
        if (state.aiTeam === PLAYER_A) state.piecesA++;
        else state.piecesB++;
        if (state.aiTeam === PLAYER_A) state.placedA++;
        else state.placedB++;

        var winResult = checkWin(state.board, state.aiTeam);
        if (winResult) {
          state.gameOver = true;
          state.winner = winResult.winner;
          state.winReason = winResult.reason;
        } else if (state.placedA >= PIECES_EACH && state.placedB >= PIECES_EACH) {
          state.phase = "move";
        }
      } else {
        state.board = movePiece(state.board, aiMove.fromX, aiMove.fromY, aiMove.toX, aiMove.toY);

        // Check jump capture
        var jCaps = getJumpCaptures(state.board, state.aiTeam);
        if (jCaps.length > 0) {
          for (var jc = 0; jc < jCaps.length; jc++) {
            if (
              jCaps[jc].fromX === aiMove.fromX &&
              jCaps[jc].fromY === aiMove.fromY &&
              jCaps[jc].toX === aiMove.toX &&
              jCaps[jc].toY === aiMove.toY
            ) {
              state.board = capturePiece(state.board, jCaps[jc].captureX, jCaps[jc].captureY);
              if (state.aiTeam === PLAYER_A) state.piecesB--;
              else state.piecesA--;
            }
          }
        }

        // Check surround capture
        var surrCaps = getSurroundCaptures(state.board, state.aiTeam);
        if (surrCaps.length > 0) {
          for (var sc = 0; sc < surrCaps.length; sc++) {
            state.board = capturePiece(state.board, surrCaps[sc].x, surrCaps[sc].y);
            if (state.aiTeam === PLAYER_A) state.piecesB--;
            else state.piecesA--;
          }
        }

        var winResult2 = checkWin(state.board, state.aiTeam);
        if (winResult2) {
          state.gameOver = true;
          state.winner = winResult2.winner;
          state.winReason = winResult2.reason;
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
