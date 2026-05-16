// ============================================================
// Go (Weiqi) - Game core logic
// ============================================================

if (typeof judgeRPS === 'undefined' && typeof require !== 'undefined') {
  var _gameUtils = require('../../common/game-utils.js');
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var BOARD_SIZE = 19;
var EMPTY = 0;
var BLACK = 1;
var WHITE = 2;
var KOMI = 6.5;

// Direction array: up, right, down, left
var DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }
];

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

function getOpponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

function getPlayerName(player) {
  return player === BLACK ? '黑棋' : '白棋';
}

function isValidPosition(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// ============================================================
// Liberties and capture logic (core)
// ============================================================

/**
 * Get the connected group of stones (BFS)
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @returns {{ stones: Array<{x: number, y: number}>, color: number }}
 */
function getGroup(board, x, y) {
  var color = board[y][x];
  if (color === EMPTY) return { stones: [], color: EMPTY };

  var visited = {};
  var stones = [];
  var queue = [{ x: x, y: y }];
  visited[x + ',' + y] = true;

  while (queue.length > 0) {
    var pos = queue.shift();
    stones.push(pos);

    for (var i = 0; i < DIRECTIONS.length; i++) {
      var nx = pos.x + DIRECTIONS[i].dx;
      var ny = pos.y + DIRECTIONS[i].dy;
      var key = nx + ',' + ny;

      if (isValidPosition(nx, ny) && !visited[key] && board[ny][nx] === color) {
        visited[key] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return { stones: stones, color: color };
}

/**
 * Calculate liberties (adjacent empty points) of a stone group
 * @param {number[][]} board
 * @param {Array<{x: number, y: number}>} group
 * @returns {Array<{x: number, y: number}>}
 */
function getLiberties(board, group) {
  var liberties = [];
  var visited = {};

  for (var i = 0; i < group.length; i++) {
    var stone = group[i];

    for (var j = 0; j < DIRECTIONS.length; j++) {
      var nx = stone.x + DIRECTIONS[j].dx;
      var ny = stone.y + DIRECTIONS[j].dy;
      var key = nx + ',' + ny;

      if (isValidPosition(nx, ny) && !visited[key] && board[ny][nx] === EMPTY) {
        visited[key] = true;
        liberties.push({ x: nx, y: ny });
      }
    }
  }

  return liberties;
}

/**
 * Remove a group of stones (capture)
 * @param {number[][]} board
 * @param {Array<{x: number, y: number}>} group
 * @returns {number[][]} new board
 */
function removeGroup(board, group) {
  var newBoard = copyBoard(board);
  for (var i = 0; i < group.length; i++) {
    newBoard[group[i].y][group[i].x] = EMPTY;
  }
  return newBoard;
}

/**
 * Deep copy the board
 * @param {number[][]} board
 * @returns {number[][]}
 */
function copyBoard(board) {
  var newBoard = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    newBoard.push(board[y].slice());
  }
  return newBoard;
}

/**
 * Place a stone and handle captures
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @param {number} player
 * @returns {{ board: number[][], captures: number, koPoint: {x: number, y: number}|null }}
 */
function playMove(board, x, y, player) {
  var newBoard = copyBoard(board);
  newBoard[y][x] = player;

  var opponent = getOpponent(player);
  var totalCaptures = 0;
  var lastCaptured = null;

  // Check and capture opponent groups with no liberties
  for (var i = 0; i < DIRECTIONS.length; i++) {
    var nx = x + DIRECTIONS[i].dx;
    var ny = y + DIRECTIONS[i].dy;

    if (isValidPosition(nx, ny) && newBoard[ny][nx] === opponent) {
      var group = getGroup(newBoard, nx, ny);
      var liberties = getLiberties(newBoard, group.stones);

      if (liberties.length === 0) {
        // Capture stones
        for (var j = 0; j < group.stones.length; j++) {
          newBoard[group.stones[j].y][group.stones[j].x] = EMPTY;
          totalCaptures++;
          lastCaptured = { x: group.stones[j].x, y: group.stones[j].y };
        }
      }
    }
  }

  // Check suicide (if after capture, own group has no liberties and no opponent stones were captured)
  var selfGroup = getGroup(newBoard, x, y);
  var selfLiberties = getLiberties(newBoard, selfGroup.stones);
  if (selfLiberties.length === 0) {
    return null; // Suicide, illegal move
  }

  // Ko detection: if only one stone captured and own group has only one liberty, it may be a ko
  var koPoint = null;
  if (totalCaptures === 1 && lastCaptured) {
    var selfGroupAfter = getGroup(newBoard, x, y);
    var selfLibertiesAfter = getLiberties(newBoard, selfGroupAfter.stones);
    if (selfLibertiesAfter.length === 1) {
      koPoint = lastCaptured;
    }
  }

  return {
    board: newBoard,
    captures: totalCaptures,
    koPoint: koPoint
  };
}

/**
 * Check if a move is legal
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @param {number} player
 * @param {{x: number, y: number}|null} koPoint
 * @returns {boolean}
 */
function isLegalMove(board, x, y, player, koPoint) {
  // Position must be empty
  if (!isValidPosition(x, y) || board[y][x] !== EMPTY) return false;

  // Ko check
  if (koPoint && koPoint.x === x && koPoint.y === y) return false;

  // Try placing stone
  var result = playMove(board, x, y, player);
  return result !== null;
}

/**
 * Collect all legal move positions
 * @param {number[][]} board
 * @param {number} player
 * @param {{x: number, y: number}|null} koPoint
 * @returns {Array<{x: number, y: number}>}
 */
function getLegalMoves(board, player, koPoint) {
  var moves = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (isLegalMove(board, x, y, player, koPoint)) {
        moves.push({ x: x, y: y });
      }
    }
  }
  return moves;
}

// ============================================================
// End game determination
// ============================================================

/**
 * Calculate territory for both sides (using flood fill)
 * @param {number[][]} board
 * @returns {{ black: number, white: number, blackTerritory: number, whiteTerritory: number }}
 */
function calculateScore(board) {
  var visited = {};
  var blackTerritory = 0;
  var whiteTerritory = 0;
  var blackStones = 0;
  var whiteStones = 0;

  // Count stones
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === BLACK) blackStones++;
      else if (board[y][x] === WHITE) whiteStones++;
    }
  }

  // Use flood fill to identify territory
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      var key = x + ',' + y;
      if (board[y][x] !== EMPTY || visited[key]) continue;

      // Found an empty point, start flood fill
      var territory = [];
      var borders = {};
      var queue = [{ x: x, y: y }];
      visited[key] = true;

      while (queue.length > 0) {
        var pos = queue.shift();
        territory.push(pos);

        for (var i = 0; i < DIRECTIONS.length; i++) {
          var nx = pos.x + DIRECTIONS[i].dx;
          var ny = pos.y + DIRECTIONS[i].dy;
          var nkey = nx + ',' + ny;

          if (!isValidPosition(nx, ny) || visited[nkey]) continue;

          if (board[ny][nx] === EMPTY) {
            visited[nkey] = true;
            queue.push({ x: nx, y: ny });
          } else {
            borders[board[ny][nx]] = true;
          }
        }
      }

      // Determine territory ownership
      var borderKeys = Object.keys(borders);
      if (borderKeys.length === 1) {
        var owner = parseInt(borderKeys[0]);
        if (owner === BLACK) {
          blackTerritory += territory.length;
        } else if (owner === WHITE) {
          whiteTerritory += territory.length;
        }
      }
    }
  }

  return {
    black: blackStones + blackTerritory,
    white: whiteStones + whiteTerritory,
    blackTerritory: blackTerritory,
    whiteTerritory: whiteTerritory,
    blackStones: blackStones,
    whiteStones: whiteStones
  };
}

// ============================================================
// AI: Simplified MCTS
// ============================================================

/**
 * Get the best AI move position
 * @param {number[][]} board
 * @param {number} aiPlayer
 * @param {{x: number, y: number}|null} koPoint
 * @param {number} capturesBlack
 * @param {number} capturesWhite
 * @returns {{x: number, y: number}}
 */
function getBestAIMove(board, aiPlayer, koPoint, capturesBlack, capturesWhite) {
  var legalMoves = getLegalMoves(board, aiPlayer, koPoint);

  if (legalMoves.length === 0) {
    return null; // No legal moves, pass
  }

  // If only one legal move, return directly
  if (legalMoves.length === 1) {
    return legalMoves[0];
  }

  var humanPlayer = getOpponent(aiPlayer);
  var simulations = 20; // Reduced for performance on 19x19 board
  var bestMove = null;
  var bestScore = -Infinity;

  // Heuristic pruning: only consider positions near existing stones
  var candidateMoves = filterCandidateMoves(board, legalMoves);

  // Score candidates by heuristic first, keep top N
  var scored = [];
  for (var i = 0; i < candidateMoves.length; i++) {
    var h = evaluateMove(board, candidateMoves[i], aiPlayer);
    scored.push({ move: candidateMoves[i], heuristic: h });
  }
  scored.sort(function(a, b) { return b.heuristic - a.heuristic; });
  var topCandidates = scored.slice(0, 12);

  for (var i = 0; i < topCandidates.length; i++) {
    var move = topCandidates[i].move;
    var wins = 0;

    for (var s = 0; s < simulations; s++) {
      var result = simulateGame(board, move, aiPlayer, koPoint, capturesBlack, capturesWhite);
      if (result === aiPlayer) wins++;
    }

    var winRate = wins / simulations;
    var score = winRate * 100 + topCandidates[i].heuristic;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Filter candidate move positions (heuristic pruning)
 * Only consider positions near existing stones
 */
function filterCandidateMoves(board, legalMoves) {
  var filtered = [];
  var radius = 2;

  for (var i = 0; i < legalMoves.length; i++) {
    var move = legalMoves[i];
    var nearStone = false;

    // Check if there are stones nearby
    for (var dy = -radius; dy <= radius; dy++) {
      for (var dx = -radius; dx <= radius; dx++) {
        var nx = move.x + dx;
        var ny = move.y + dy;
        if (isValidPosition(nx, ny) && board[ny][nx] !== EMPTY) {
          nearStone = true;
          break;
        }
      }
      if (nearStone) break;
    }

    // When board is empty, consider center area
    if (!nearStone && isNearCenter(move.x, move.y)) {
      nearStone = true;
    }

    if (nearStone) {
      filtered.push(move);
    }
  }

  // If no candidates after filtering, return all legal moves
  return filtered.length > 0 ? filtered : legalMoves;
}

function isNearCenter(x, y) {
  var center = Math.floor(BOARD_SIZE / 2);
  return Math.abs(x - center) <= 3 && Math.abs(y - center) <= 3;
}

/**
 * Heuristic evaluation of move value
 */
function evaluateMove(board, move, player) {
  var score = 0;
  var opponent = getOpponent(player);

  // 1. Center control
  var center = Math.floor(BOARD_SIZE / 2);
  var distToCenter = Math.abs(move.x - center) + Math.abs(move.y - center);
  score += (BOARD_SIZE - distToCenter) * 0.5;

  // 2. Capture threat
  var newBoard = copyBoard(board);
  newBoard[move.y][move.x] = player;

  for (var i = 0; i < DIRECTIONS.length; i++) {
    var nx = move.x + DIRECTIONS[i].dx;
    var ny = move.y + DIRECTIONS[i].dy;

    if (isValidPosition(nx, ny) && newBoard[ny][nx] === opponent) {
      var group = getGroup(newBoard, nx, ny);
      var liberties = getLiberties(newBoard, group.stones);
      if (liberties.length === 1) {
        score += group.stones.length * 5; // Capture threat
      }
    }
  }

  // 3. Own liberties
  var selfGroup = getGroup(newBoard, move.x, move.y);
  var selfLiberties = getLiberties(newBoard, selfGroup.stones);
  score += selfLiberties.length * 2;

  return score;
}

/**
 * Simulate a game (fast random play)
 */
function simulateGame(board, firstMove, aiPlayer, koPoint, capturesBlack, capturesWhite) {
  var simBoard = copyBoard(board);
  var current = aiPlayer;
  var simKo = koPoint;
  var simCapturesBlack = capturesBlack;
  var simCapturesWhite = capturesWhite;
  var passCount = 0;
  var maxMoves = 60;
  var moveCount = 0;
  var lastMoveX = firstMove.x;
  var lastMoveY = firstMove.y;

  // Place first stone
  var result = playMove(simBoard, firstMove.x, firstMove.y, current);
  if (result === null) return getOpponent(aiPlayer);

  simBoard = result.board;
  simKo = result.koPoint;
  if (current === BLACK) simCapturesBlack += result.captures;
  else simCapturesWhite += result.captures;

  current = getOpponent(current);
  moveCount++;

  // Fast random play
  while (moveCount < maxMoves) {
    var moves = getQuickMoves(simBoard, current, simKo, lastMoveX, lastMoveY);

    if (moves.length === 0) {
      passCount++;
      if (passCount >= 2) break;
      current = getOpponent(current);
      simKo = null;
      moveCount++;
      continue;
    }

    passCount = 0;

    // Pick a random move
    var idx = Math.floor(Math.random() * moves.length);
    var chosenMove = moves[idx];
    var moveResult = playMove(simBoard, chosenMove.x, chosenMove.y, current);

    if (moveResult === null) {
      current = getOpponent(current);
      moveCount++;
      continue;
    }

    simBoard = moveResult.board;
    simKo = moveResult.koPoint;
    lastMoveX = chosenMove.x;
    lastMoveY = chosenMove.y;
    if (current === BLACK) simCapturesBlack += moveResult.captures;
    else simCapturesWhite += moveResult.captures;

    current = getOpponent(current);
    moveCount++;
  }

  var score = calculateScore(simBoard);
  var blackScore = score.black + simCapturesBlack;
  var whiteScore = score.white + simCapturesWhite + KOMI;

  if (aiPlayer === BLACK) {
    return blackScore > whiteScore ? BLACK : WHITE;
  } else {
    return whiteScore > blackScore ? WHITE : BLACK;
  }
}

/**
 * Quick move generation for simulations - prefers positions near last move
 */
function getQuickMoves(board, player, koPoint, lastX, lastY) {
  var moves = [];
  var captureMoves = [];
  var nearMoves = [];
  var radius = 1;

  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== EMPTY) continue;
      if (koPoint && koPoint.x === x && koPoint.y === y) continue;

      // Quick suicide check: see if any neighbor is empty or opponent with 1 liberty
      var hasEmptyNeighbor = false;
      var canCapture = false;
      for (var d = 0; d < DIRECTIONS.length; d++) {
        var nx = x + DIRECTIONS[d].dx;
        var ny = y + DIRECTIONS[d].dy;
        if (isValidPosition(nx, ny)) {
          if (board[ny][nx] === EMPTY) hasEmptyNeighbor = true;
        }
      }

      var dist = Math.abs(x - lastX) + Math.abs(y - lastY);
      if (dist <= radius) {
        nearMoves.push({ x: x, y: y });
      }
      moves.push({ x: x, y: y });
    }
  }

  // Prefer near moves, fall back to all moves
  var pool = nearMoves.length > 0 ? nearMoves : moves;

  // If pool is still large, sample a subset
  if (pool.length > 20) {
    var sampled = [];
    for (var i = 0; i < 20; i++) {
      sampled.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return sampled;
  }

  return pool;
}

// ============================================================
// Game state
// ============================================================

function createGameState(mode) {
  return {
    mode: mode,
    board: createBoard(),
    currentPlayer: BLACK,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    koPoint: null,
    passCount: 0,
    capturesBlack: 0,
    capturesWhite: 0,
    turnCount: 0,
    aiThinking: false,
    lastMove: null,
    komi: KOMI
  };
}

// ============================================================
// Export for testing
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    BLACK: BLACK,
    WHITE: WHITE,
    KOMI: KOMI,
    DIRECTIONS: DIRECTIONS,
    createBoard: createBoard,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    isValidPosition: isValidPosition,
    getGroup: getGroup,
    getLiberties: getLiberties,
    removeGroup: removeGroup,
    copyBoard: copyBoard,
    playMove: playMove,
    isLegalMove: isLegalMove,
    getLegalMoves: getLegalMoves,
    calculateScore: calculateScore,
    getBestAIMove: getBestAIMove,
    filterCandidateMoves: filterCandidateMoves,
    evaluateMove: evaluateMove,
    simulateGame: simulateGame,
    getQuickMoves: getQuickMoves,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName,
    createGameState: createGameState
  };
}

// ============================================================
// Browser UI
// ============================================================

if (typeof document !== 'undefined') {
  var gameState = null;
  var rpsChoices = { player1: null, player2: null, human: null };
  var canvas, context;
  var CELL_SIZE = 28;
  var MARGIN = 20;
  var STONE_RADIUS = 12;
  var canvasSize = MARGIN * 2 + (BOARD_SIZE - 1) * CELL_SIZE;

  function initBoard() {
    canvas = document.getElementById('board-canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    context = canvas.getContext('2d');
    drawBoard();
  }

  function drawBoard() {
    // Background
    context.fillStyle = '#f0d9b5';
    context.fillRect(0, 0, canvasSize, canvasSize);

    // Grid lines
    context.strokeStyle = '#8b7355';
    context.lineWidth = 1;
    for (var i = 0; i < BOARD_SIZE; i++) {
      var pos = MARGIN + i * CELL_SIZE;
      // Vertical lines
      context.beginPath();
      context.moveTo(pos, MARGIN);
      context.lineTo(pos, MARGIN + (BOARD_SIZE - 1) * CELL_SIZE);
      context.stroke();
      // Horizontal lines
      context.beginPath();
      context.moveTo(MARGIN, pos);
      context.lineTo(MARGIN + (BOARD_SIZE - 1) * CELL_SIZE, pos);
      context.stroke();
    }

    // Star points (19x19 board has 9 star points)
    var starPoints = [
      { x: 3, y: 3 }, { x: 3, y: 9 }, { x: 3, y: 15 },
      { x: 9, y: 3 }, { x: 9, y: 9 }, { x: 9, y: 15 },
      { x: 15, y: 3 }, { x: 15, y: 9 }, { x: 15, y: 15 }
    ];
    context.fillStyle = '#8b7355';
    for (var i = 0; i < starPoints.length; i++) {
      var sx = MARGIN + starPoints[i].x * CELL_SIZE;
      var sy = MARGIN + starPoints[i].y * CELL_SIZE;
      context.beginPath();
      context.arc(sx, sy, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawStone(x, y, player) {
    var cx = MARGIN + x * CELL_SIZE;
    var cy = MARGIN + y * CELL_SIZE;
    var gradient = context.createRadialGradient(
      cx + 2, cy - 2, 2,
      cx, cy, STONE_RADIUS
    );
    if (player === BLACK) {
      gradient.addColorStop(0, '#636766');
      gradient.addColorStop(1, '#0A0A0A');
    } else {
      gradient.addColorStop(0, '#F9F9F9');
      gradient.addColorStop(1, '#D1D1D1');
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  function drawLastMoveMarker(x, y) {
    var cx = MARGIN + x * CELL_SIZE;
    var cy = MARGIN + y * CELL_SIZE;
    context.strokeStyle = '#e53935';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, 5, 0, Math.PI * 2);
    context.stroke();
  }

  function drawKoMarker(x, y) {
    var cx = MARGIN + x * CELL_SIZE;
    var cy = MARGIN + y * CELL_SIZE;
    context.fillStyle = 'rgba(229, 57, 53, 0.3)';
    context.beginPath();
    context.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  function renderGame(state) {
    drawBoard();

    // Draw all stones
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        if (state.board[y][x] !== EMPTY) {
          drawStone(x, y, state.board[y][x]);
        }
      }
    }

    // Mark last move
    if (state.lastMove) {
      drawLastMoveMarker(state.lastMove.x, state.lastMove.y);
    }

    // Mark ko point
    if (state.koPoint) {
      drawKoMarker(state.koPoint.x, state.koPoint.y);
    }

    // Update status bar
    document.getElementById('current-player').textContent = getPlayerName(state.currentPlayer);
    document.getElementById('current-player').className =
      'team-indicator ' + (state.currentPlayer === BLACK ? 'text-black' : 'text-white-stone');
    document.getElementById('turn-count').textContent = state.turnCount;
    document.getElementById('captures-black').textContent = state.capturesBlack;
    document.getElementById('captures-white').textContent = state.capturesWhite;

    if (state.gameOver) {
      updateMessage('游戏结束！', 'info');
    } else if (state.aiThinking) {
      updateMessage('AI正在思考...', 'info');
    } else if (state.mode === 'pve' && state.currentPlayer === state.aiTeam) {
      updateMessage('轮到AI行动', 'info');
    } else {
      updateMessage('轮到 ' + getPlayerName(state.currentPlayer) + ' 落子', 'info');
    }
  }

  function updateMessage(text, type) {
    var el = document.getElementById('message');
    el.textContent = text;
    el.className = type === 'error' ? 'error' : (type === 'info' ? 'info' : '');
  }

  function showGameOver(state) {
    var winnerText = document.getElementById('winner-text');
    var scoreDetail = document.getElementById('score-detail');
    var score = calculateScore(state.board);
    var blackTotal = score.black + state.capturesBlack;
    var whiteTotal = score.white + state.capturesWhite + state.komi;

    if (state.winner) {
      winnerText.textContent = getPlayerName(state.winner) + ' 获胜！';
    } else {
      // Calculate final score
      if (blackTotal > whiteTotal) {
        winnerText.textContent = '黑棋 获胜！';
        state.winner = BLACK;
      } else {
        winnerText.textContent = '白棋 获胜！';
        state.winner = WHITE;
      }
    }

    scoreDetail.innerHTML = '黑棋：' + score.blackStones + '子 + ' + score.blackTerritory + '目 = ' + blackTotal + '<br>' +
      '白棋：' + score.whiteStones + '子 + ' + score.whiteTerritory + '目 + ' + state.komi + '贴目 = ' + whiteTotal;

    document.getElementById('game-over').style.display = 'flex';
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;

    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var px = (e.clientX - rect.left) * scaleX;
    var py = (e.clientY - rect.top) * scaleY;

    var x = Math.round((px - MARGIN) / CELL_SIZE);
    var y = Math.round((py - MARGIN) / CELL_SIZE);

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;

    if (!isLegalMove(gameState.board, x, y, gameState.currentPlayer, gameState.koPoint)) {
      if (gameState.board[y][x] !== EMPTY) {
        updateMessage('此处已有棋子！', 'error');
      } else if (gameState.koPoint && gameState.koPoint.x === x && gameState.koPoint.y === y) {
        updateMessage('打劫！不能立即回提！', 'error');
      } else {
        updateMessage('此处不能落子（自杀）！', 'error');
      }
      return;
    }

    doMove(x, y);
  }

  function doMove(x, y) {
    var result = playMove(gameState.board, x, y, gameState.currentPlayer);
    if (result === null) {
      updateMessage('非法落子！', 'error');
      return;
    }

    gameState.board = result.board;
    gameState.koPoint = result.koPoint;
    gameState.lastMove = { x: x, y: y };
    gameState.passCount = 0;
    gameState.turnCount++;

    if (gameState.currentPlayer === BLACK) {
      gameState.capturesBlack += result.captures;
    } else {
      gameState.capturesWhite += result.captures;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    renderGame(gameState);

    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function doPass() {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;

    gameState.passCount++;
    gameState.koPoint = null;
    gameState.turnCount++;

    if (gameState.passCount >= 2) {
      // Both passed, game over
      gameState.gameOver = true;
      var score = calculateScore(gameState.board);
      var blackTotal = score.black + gameState.capturesBlack;
      var whiteTotal = score.white + gameState.capturesWhite + gameState.komi;

      if (blackTotal > whiteTotal) {
        gameState.winner = BLACK;
      } else {
        gameState.winner = WHITE;
      }

      renderGame(gameState);
      setTimeout(function() { showGameOver(gameState); }, 500);
      return;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    updateMessage(getPlayerName(gameState.currentPlayer) + '选择Pass，轮到对方', 'info');
    renderGame(gameState);

    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function doResign() {
    if (!gameState || gameState.gameOver) return;

    gameState.gameOver = true;
    gameState.winner = getOpponent(gameState.currentPlayer);
    renderGame(gameState);
    setTimeout(function() { showGameOver(gameState); }, 500);
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(function() {
      var move = getBestAIMove(
        gameState.board,
        gameState.aiTeam,
        gameState.koPoint,
        gameState.capturesBlack,
        gameState.capturesWhite
      );
      gameState.aiThinking = false;

      if (move) {
        doMove(move.x, move.y);
      } else {
        // AI chooses pass
        doPass();
      }
    }, 500);
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || BLACK;

    if (mode === 'pve') {
      if (firstPlayer === BLACK) {
        gameState.playerTeam = BLACK;
        gameState.aiTeam = WHITE;
      } else {
        gameState.playerTeam = WHITE;
        gameState.aiTeam = BLACK;
      }
    }

    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('game-over').style.display = 'none';

    initBoard();
    renderGame(gameState);

    canvas.onclick = handleCanvasClick;

    if (mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function restartGame() {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'flex';
    gameState = null;
  }

  function handleRPSChoice(player, choice) {
    if (player === 'human') {
      rpsChoices.human = choice;
      document.querySelectorAll('#rps-player-buttons .btn-rps').forEach(function(btn) {
        btn.classList.remove('selected');
      });
      event.target.classList.add('selected');

      var choices = ['rock', 'scissors', 'paper'];
      var aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      var resultEl = document.getElementById('rps-result');
      var humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你赢了！你先手(黑棋)。';
        setTimeout(function() { startGame('pve', BLACK); }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你输了！AI先手(黑棋)。';
        setTimeout(function() { startGame('pve', WHITE); }, 1500);
      } else {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，平局！重新选择。';
        rpsChoices.human = null;
        rpsChoices.player2 = null;
      }
    } else {
      rpsChoices['player' + player] = choice;
      document.querySelectorAll('#rps-p' + player + '-buttons .btn-rps').forEach(function(btn) {
        btn.classList.remove('selected');
      });
      event.target.classList.add('selected');

      var statusEl = document.getElementById('rps-p' + player + '-status');
      statusEl.textContent = '已选择：' + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        var resultEl = document.getElementById('rps-result');
        var winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家1赢了！玩家1先手(黑棋)。';
          setTimeout(function() { startGame('pvp', BLACK); }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家2赢了！玩家2先手(黑棋)。';
          setTimeout(function() { startGame('pvp', WHITE); }, 1500);
        } else {
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，平局！重新选择。';
          rpsChoices.player1 = null;
          rpsChoices.player2 = null;
          document.getElementById('rps-p1-status').textContent = '请选择';
          document.getElementById('rps-p2-status').textContent = '请选择';
          document.querySelectorAll('.btn-rps').forEach(function(btn) {
            btn.classList.remove('selected');
          });
        }
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-pvp').addEventListener('click', function() {
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'block';
      document.getElementById('rps-pve').style.display = 'none';
      rpsChoices = { player1: null, player2: null, human: null };
    });

    document.getElementById('btn-pve').addEventListener('click', function() {
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'none';
      document.getElementById('rps-pve').style.display = 'block';
      rpsChoices = { player1: null, player2: null, human: null };
    });

    document.querySelectorAll('.btn-rps').forEach(function(button) {
      button.addEventListener('click', function(ev) {
        var player = ev.target.dataset.player;
        var choice = ev.target.dataset.choice;
        handleRPSChoice(player, choice);
      });
    });

    document.getElementById('btn-pass').addEventListener('click', doPass);
    document.getElementById('btn-resign').addEventListener('click', doResign);
    document.getElementById('btn-restart').addEventListener('click', restartGame);

    document.getElementById('mode-selection').style.display = 'flex';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
  });
}
