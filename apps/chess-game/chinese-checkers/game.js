// ============================================================
// Chinese Checkers - Game core logic
// ============================================================
// Reference: anchengjian/chinese_checkers implementation
// 17x17 axial coordinate system, 121 valid positions forming a hexagram

if (typeof judgeRPS === 'undefined' && typeof require !== 'undefined') {
  var _gameUtils = require('../../common/game-utils.js');
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var EMPTY = 0;
var RED = 1;
var BLUE = 2;
var GREEN = 3;
var YELLOW = 4;
var PURPLE = 5;
var ORANGE = 6;

var PLAYER_COLORS = {
  1: { name: '红方', color: '#e53935', textClass: 'text-red' },
  2: { name: '蓝方', color: '#1565c0', textClass: 'text-blue' },
  3: { name: '绿方', color: '#2e7d32', textClass: 'text-green' },
  4: { name: '黄方', color: '#f9a825', textClass: 'text-yellow' },
  5: { name: '紫方', color: '#7b1fa2', textClass: 'text-purple' },
  6: { name: '橙方', color: '#ef6c00', textClass: 'text-orange' }
};

// ============================================================
// Board definition - 17-column axial coordinates, posRegions defines valid row range per column
// ============================================================

var BOARD_ROWS = 17;

// Row (y) range [yMin, yMax] for each column (x) (1-based)
var POS_REGIONS = [
  [5, 5],   // x=1:  1 cell
  [5, 6],   // x=2:  2 cells
  [5, 7],   // x=3:  3 cells
  [5, 8],   // x=4:  4 cells
  [1, 13],  // x=5:  13 cells
  [2, 13],  // x=6:  12 cells
  [3, 13],  // x=7:  11 cells
  [4, 13],  // x=8:  10 cells
  [5, 13],  // x=9:  9 cells
  [5, 14],  // x=10: 10 cells
  [5, 15],  // x=11: 11 cells
  [5, 16],  // x=12: 12 cells
  [5, 17],  // x=13: 13 cells
  [10, 13], // x=14: 4 cells
  [11, 13], // x=15: 3 cells
  [12, 13], // x=16: 2 cells
  [13, 13]  // x=17: 1 cell
];

var TOTAL_POSITIONS = 121;
var ROW_COLS = [];
var positions = [];
var posKey = {};

function initBoard() {
  positions = [];
  posKey = {};
  var idx = 0;
  for (var xi = 0; xi < POS_REGIONS.length; xi++) {
    var x = xi + 1;
    var yMin = POS_REGIONS[xi][0];
    var yMax = POS_REGIONS[xi][1];
    ROW_COLS.push(yMax - yMin + 1);
    for (var y = yMin; y <= yMax; y++) {
      var key = x + '-' + y;
      posKey[key] = idx;
      positions.push({ x: x, y: y });
      idx++;
    }
  }
  return idx;
}

initBoard();

// ============================================================
// Adjacency - 6 fixed directions in axial coordinates
// ============================================================

var DIRECTION_VECTORS = [
  { x: -1, y: -1 },  // Upper-left
  { x: 0,  y: -1 },  // Up
  { x: 1,  y: 0  },  // Right
  { x: 1,  y: 1  },  // Lower-right
  { x: 0,  y: 1  },  // Down
  { x: -1, y: 0  }   // Left
];

// AI scoring weight constants
var AI_WEIGHTS = {
  PROGRESS: 100,           // Progress score weight
  JUMP_EFFICIENCY: 30,     // Jump efficiency weight (per cell)
  TARGET_ENTRY: 500,       // Target area entry bonus
  TARGET_DEPTH: 200,       // Target area depth bonus
  BLOCKING: 80,            // Blocking opponent weight
  FORMATION: 20,           // Formation cooperation weight
  RETREAT_PENALTY: -150    // Retreat penalty
};

var ADJACENT = [];

function getPosKey(x, y) {
  return x + '-' + y;
}

function isValidPos(x, y) {
  return posKey[getPosKey(x, y)] !== undefined;
}

function initAdjacency() {
  ADJACENT = [];
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    ADJACENT[i] = [];
  }

  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    var p = positions[i];
    for (var d = 0; d < DIRECTION_VECTORS.length; d++) {
      var nx = p.x + DIRECTION_VECTORS[d].x;
      var ny = p.y + DIRECTION_VECTORS[d].y;
      var nKey = getPosKey(nx, ny);
      if (posKey[nKey] !== undefined) {
        ADJACENT[i].push(posKey[nKey]);
      }
    }
  }
}

initAdjacency();

// ============================================================
// Player start and target positions
// ============================================================

var START_POSITIONS = {};
var TARGET_POSITIONS = {};

function initPlayerPositions() {
  // Player A (Red): top triangle area x=5,y=1 non-special
  START_POSITIONS[RED] = [];
  for (var i = 0; i < 4; i++) {
    for (var j = i; j < 4; j++) {
      START_POSITIONS[RED].push(posKey[getPosKey(5 + i, 1 + j)]);
    }
  }

  // Player C (Blue): bottom-right triangle area x=14,y=10 non-special
  START_POSITIONS[BLUE] = [];
  for (var i = 0; i < 4; i++) {
    for (var j = i; j < 4; j++) {
      START_POSITIONS[BLUE].push(posKey[getPosKey(14 + i, 10 + j)]);
    }
  }

  // Player E (Green): upper-left triangle area x=1,y=5 special
  START_POSITIONS[GREEN] = [];
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j <= i; j++) {
      START_POSITIONS[GREEN].push(posKey[getPosKey(1 + i, 5 + j)]);
    }
  }

  // Player B (Yellow): right triangle area x=10,y=5 special
  START_POSITIONS[YELLOW] = [];
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j <= i; j++) {
      START_POSITIONS[YELLOW].push(posKey[getPosKey(10 + i, 5 + j)]);
    }
  }

  // Player D (Purple): bottom triangle area x=10,y=14 special
  START_POSITIONS[PURPLE] = [];
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j <= i; j++) {
      START_POSITIONS[PURPLE].push(posKey[getPosKey(10 + i, 14 + j)]);
    }
  }

  // Player F (Orange): left triangle area x=5,y=10 non-special
  START_POSITIONS[ORANGE] = [];
  for (var i = 0; i < 4; i++) {
    for (var j = i; j < 4; j++) {
      START_POSITIONS[ORANGE].push(posKey[getPosKey(5 + i, 10 + j)]);
    }
  }

  // Target positions: opposite diagonal positions
  TARGET_POSITIONS[RED] = START_POSITIONS[BLUE].slice();
  TARGET_POSITIONS[BLUE] = START_POSITIONS[RED].slice();
  TARGET_POSITIONS[GREEN] = START_POSITIONS[ORANGE].slice();
  TARGET_POSITIONS[YELLOW] = START_POSITIONS[PURPLE].slice();
  TARGET_POSITIONS[PURPLE] = START_POSITIONS[YELLOW].slice();
  TARGET_POSITIONS[ORANGE] = START_POSITIONS[GREEN].slice();
}

initPlayerPositions();

// ============================================================
// AI: Pre-computed position scores
// ============================================================

var POSITION_SCORES = {};

function initPositionScores() {
  for (var player = RED; player <= ORANGE; player++) {
    POSITION_SCORES[player] = [];
    var targets = TARGET_POSITIONS[player];
    var targetSet = {};
    for (var i = 0; i < targets.length; i++) {
      targetSet[targets[i]] = true;
    }

    // Calculate target area centroid
    var cx = 0, cy = 0;
    for (var i = 0; i < targets.length; i++) {
      cx += positions[targets[i]].x;
      cy += positions[targets[i]].y;
    }
    cx /= targets.length;
    cy /= targets.length;

    // Calculate target area depth reference point (farthest vertex)
    var maxDistFromCenter = 0;
    var tipIdx = targets[0];
    for (var i = 0; i < targets.length; i++) {
      var dx = positions[targets[i]].x - cx;
      var dy = positions[targets[i]].y - cy;
      var dist = Math.abs(dx) + Math.abs(dy);
      if (dist > maxDistFromCenter) {
        maxDistFromCenter = dist;
        tipIdx = targets[i];
      }
    }
    var tipPos = positions[tipIdx];

    for (var cell = 0; cell < TOTAL_POSITIONS; cell++) {
      var pos = positions[cell];
      if (targetSet[cell]) {
        // Inside target area: high base score + depth bonus
        var depthDist = Math.abs(pos.x - tipPos.x) + Math.abs(pos.y - tipPos.y);
        POSITION_SCORES[player][cell] = 2000 + (maxDistFromCenter - depthDist) * 100;
      } else {
        // Outside target area: based on distance to target centroid
        var distToTarget = Math.abs(pos.x - cx) + Math.abs(pos.y - cy);
        POSITION_SCORES[player][cell] = 1000 - distToTarget * 50;
      }
    }
  }
}

initPositionScores();

// ============================================================
// Board operations
// ============================================================

function createBoard() {
  var board = [];
  for (var i = 0; i < TOTAL_POSITIONS; i++) {
    board[i] = EMPTY;
  }
  return board;
}

function placePieces(board, player) {
  var pos = START_POSITIONS[player];
  for (var i = 0; i < pos.length; i++) {
    board[pos[i]] = player;
  }
}

function getAdjacentMoves(board, cell) {
  var moves = [];
  var neighbors = ADJACENT[cell];
  for (var i = 0; i < neighbors.length; i++) {
    if (board[neighbors[i]] === EMPTY) {
      moves.push(neighbors[i]);
    }
  }
  return moves;
}

function getJumpMoves(board, cell, visited) {
  var moves = [];
  var neighbors = ADJACENT[cell];

  for (var i = 0; i < neighbors.length; i++) {
    var mid = neighbors[i];
    if (board[mid] !== EMPTY) {
      var p1 = positions[cell];
      var p2 = positions[mid];
      var dstX = p2.x + (p2.x - p1.x);
      var dstY = p2.y + (p2.y - p1.y);

      var dstKey = getPosKey(dstX, dstY);
      if (posKey[dstKey] !== undefined) {
        var dstIdx = posKey[dstKey];
        if (board[dstIdx] === EMPTY && !visited[dstIdx]) {
          moves.push(dstIdx);
          visited[dstIdx] = true;
          var furtherMoves = getJumpMoves(board, dstIdx, visited);
          moves = moves.concat(furtherMoves);
        }
      }
    }
  }
  return moves;
}

function getLegalMoves(board, cell) {
  var moves = [];
  var adjacentMoves = getAdjacentMoves(board, cell);
  moves = moves.concat(adjacentMoves);

  var visited = {};
  for (var i = 0; i < adjacentMoves.length; i++) {
    visited[adjacentMoves[i]] = true;
  }
  var jumpMoves = getJumpMoves(board, cell, visited);
  moves = moves.concat(jumpMoves);

  return moves;
}

function makeMove(board, from, to) {
  var newBoard = board.slice();
  var player = newBoard[from];
  newBoard[from] = EMPTY;
  newBoard[to] = player;
  return newBoard;
}

// ============================================================
// Win/loss determination
// ============================================================

function checkWin(board, player) {
  var targets = TARGET_POSITIONS[player];
  for (var i = 0; i < targets.length; i++) {
    if (board[targets[i]] !== player) {
      return false;
    }
  }
  return true;
}

function checkGameOver(board, players) {
  for (var i = 0; i < players.length; i++) {
    if (checkWin(board, players[i])) {
      return players[i];
    }
  }
  return null;
}

// ============================================================
// AI: Multi-factor greedy strategy
// ============================================================

function isInTargetArea(cell, player) {
  var targets = TARGET_POSITIONS[player];
  for (var i = 0; i < targets.length; i++) {
    if (targets[i] === cell) return true;
  }
  return false;
}

function calculateBlockingScore(board, player, position) {
  var score = 0;
  var neighbors = ADJACENT[position];
  for (var i = 0; i < neighbors.length; i++) {
    var neighborCell = neighbors[i];
    if (board[neighborCell] !== EMPTY && board[neighborCell] !== player) {
      // Opponent piece next to target position, forming a block
      var opponent = board[neighborCell];
      if (!isInTargetArea(position, opponent)) {
        score += 1;
      }
    }
  }
  return score;
}

function calculateFormationScore(board, player, position) {
  var score = 0;
  var neighbors = ADJACENT[position];
  for (var i = 0; i < neighbors.length; i++) {
    if (board[neighbors[i]] === player) {
      score += 1;
    }
  }
  return score;
}

function evaluateMove(board, player, from, to, allPlayers) {
  var score = 0;
  var fromPos = positions[from];
  var toPos = positions[to];

  // Factor 1: Progress score (based on pre-computed position scores)
  var progressScore = POSITION_SCORES[player][to] - POSITION_SCORES[player][from];
  score += progressScore * AI_WEIGHTS.PROGRESS;

  // Factor 2: Jump efficiency
  var xDiff = Math.abs(toPos.x - fromPos.x);
  var yDiff = Math.abs(toPos.y - fromPos.y);
  var jumpDistance = Math.max(xDiff, yDiff);
  if (jumpDistance > 1) {
    score += jumpDistance * AI_WEIGHTS.JUMP_EFFICIENCY;
  }

  // Factor 3: Target area entry bonus
  var wasInTarget = isInTargetArea(from, player);
  var nowInTarget = isInTargetArea(to, player);
  if (!wasInTarget && nowInTarget) {
    score += AI_WEIGHTS.TARGET_ENTRY;
  }

  // Factor 4: Target area depth bonus
  if (nowInTarget) {
    var depthBefore = POSITION_SCORES[player][from];
    var depthAfter = POSITION_SCORES[player][to];
    if (depthAfter > depthBefore) {
      score += AI_WEIGHTS.TARGET_DEPTH;
    }
  }

  // Factor 5: Blocking opponents
  var opponents = [];
  if (allPlayers) {
    for (var i = 0; i < allPlayers.length; i++) {
      if (allPlayers[i] !== player) opponents.push(allPlayers[i]);
    }
  } else {
    for (var p = RED; p <= ORANGE; p++) {
      if (p !== player) opponents.push(p);
    }
  }
  var blockingScore = calculateBlockingScore(board, player, to);
  score += blockingScore * AI_WEIGHTS.BLOCKING;

  // Factor 6: Formation cooperation
  var formationScore = calculateFormationScore(board, player, to);
  score += formationScore * AI_WEIGHTS.FORMATION;

  // Factor 7: Retreat penalty
  if (progressScore < 0) {
    score += AI_WEIGHTS.RETREAT_PENALTY;
  }

  return score;
}

function getBestAIMove(board, player, allPlayers) {
  var bestScore = -Infinity;
  var bestMove = null;

  for (var cell = 0; cell < TOTAL_POSITIONS; cell++) {
    if (board[cell] === player) {
      var moves = getLegalMoves(board, cell);
      for (var i = 0; i < moves.length; i++) {
        var score = evaluateMove(board, player, cell, moves[i], allPlayers);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { from: cell, to: moves[i] };
        }
      }
    }
  }

  return bestMove;
}

// ============================================================
// Game state
// ============================================================

function createGameState(mode, playerCount) {
  var players = [];
  for (var i = 1; i <= playerCount; i++) {
    players.push(i);
  }

  return {
    mode: mode,
    playerCount: playerCount,
    players: players,
    board: createBoard(),
    currentPlayer: RED,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    selectedPiece: null,
    validMoves: [],
    aiThinking: false
  };
}

function initGame(state) {
  for (var i = 0; i < state.players.length; i++) {
    placePieces(state.board, state.players[i]);
  }
}

// ============================================================
// Browser UI
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EMPTY: EMPTY,
    RED: RED,
    BLUE: BLUE,
    GREEN: GREEN,
    YELLOW: YELLOW,
    PURPLE: PURPLE,
    ORANGE: ORANGE,
    PLAYER_COLORS: PLAYER_COLORS,
    BOARD_ROWS: BOARD_ROWS,
    ROW_COLS: ROW_COLS,
    TOTAL_POSITIONS: TOTAL_POSITIONS,
    positions: positions,
    posKey: posKey,
    ADJACENT: ADJACENT,
    START_POSITIONS: START_POSITIONS,
    TARGET_POSITIONS: TARGET_POSITIONS,
    AI_WEIGHTS: AI_WEIGHTS,
    POSITION_SCORES: POSITION_SCORES,
    isInTargetArea: isInTargetArea,
    createBoard: createBoard,
    placePieces: placePieces,
    getAdjacentMoves: getAdjacentMoves,
    getJumpMoves: getJumpMoves,
    getLegalMoves: getLegalMoves,
    makeMove: makeMove,
    checkWin: checkWin,
    checkGameOver: checkGameOver,
    evaluateMove: evaluateMove,
    getBestAIMove: getBestAIMove,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName,
    createGameState: createGameState,
    initGame: initGame
  };
}

if (typeof document !== 'undefined') {
  var gameState = null;
  var rpsChoices = { player1: null, player2: null, human: null };
  var currentMode = null;
  var currentPlayerCount = 2;
  var CELL_SIZE = 28;
  var PADDING = 60;

  // Color zones
  var AREA_COLORS = {
    red: '#e53935',
    green: '#2e7d32',
    blue: '#1565c0',
    yellow: '#f9a825',
    purple: '#7b1fa2',
    orange: '#ef6c00',
    center: '#f5f0e1'
  };

  // Determine which color zone a position belongs to - only color start positions
  function getAreaColor(cell) {
    for (var p = 1; p <= 6; p++) {
      if (START_POSITIONS[p].indexOf(cell) !== -1) {
        return PLAYER_COLORS[p].color;
      }
    }
    return AREA_COLORS.center;
  }

  // Convert axial coordinates to pixel coordinates (reference: anchengjian implementation)
  function cellToPixel(cell) {
    var p = positions[cell];
    var x = p.x;
    var y = p.y;
    var spaceWidth = CELL_SIZE;
    var lineHeight = CELL_SIZE;
    var spaceX = spaceWidth / 2;

    var correct = 0;
    if (y < 5) correct = (5 - y) * spaceX;
    if (y > 5) correct = -(y - 5) * spaceX;

    var px = (x - 1) * spaceWidth + correct + PADDING;
    var py = y * lineHeight + PADDING;
    return { x: px, y: py };
  }

  function drawBoard() {
    var svg = document.getElementById('board-svg');
    svg.innerHTML = '';

    // Calculate canvas size
    var maxPx = 0;
    var maxPy = 0;
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      var cp = cellToPixel(i);
      if (cp.x > maxPx) maxPx = cp.x;
      if (cp.y > maxPy) maxPy = cp.y;
    }
    var width = maxPx + PADDING;
    var height = maxPy + PADDING;

    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    // Create rotation container
    var rotation = gameState.boardRotation || 0;
    var centerX = width / 2;
    var centerY = height / 2;
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'rotate(' + rotation + ' ' + centerX + ' ' + centerY + ')');
    svg.appendChild(g);

    // Background
    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', '#f5f0e1');
    bg.setAttribute('rx', '15');
    g.appendChild(bg);

    // Draw all valid positions (with area colors)
    for (var cell = 0; cell < TOTAL_POSITIONS; cell++) {
      var pos = cellToPixel(cell);
      var areaColor = getAreaColor(cell);

      var hex = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hex.setAttribute('cx', pos.x);
      hex.setAttribute('cy', pos.y);
      hex.setAttribute('r', CELL_SIZE * 0.42);
      hex.setAttribute('fill', areaColor);
      hex.setAttribute('stroke', '#333');
      hex.setAttribute('stroke-width', '1');
      hex.setAttribute('data-cell', cell);
      hex.style.cursor = 'pointer';
      g.appendChild(hex);

      // White inner circle
      var inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('cx', pos.x);
      inner.setAttribute('cy', pos.y);
      inner.setAttribute('r', CELL_SIZE * 0.32);
      inner.setAttribute('fill', 'white');
      inner.setAttribute('stroke', 'none');
      inner.setAttribute('data-cell', cell);
      inner.style.cursor = 'pointer';
      g.appendChild(inner);
    }

    // Draw pieces
    for (var cell = 0; cell < TOTAL_POSITIONS; cell++) {
      if (gameState.board[cell] !== EMPTY) {
        drawPiece(g, cell, gameState.board[cell]);
      }
    }

    // Draw valid move positions
    if (gameState.validMoves.length > 0) {
      for (var i = 0; i < gameState.validMoves.length; i++) {
        var moveCell = gameState.validMoves[i];
        var pos = cellToPixel(moveCell);
        var indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        indicator.setAttribute('cx', pos.x);
        indicator.setAttribute('cy', pos.y);
        indicator.setAttribute('r', '10');
        indicator.setAttribute('fill', '#4CAF50');
        indicator.setAttribute('opacity', '0.8');
        indicator.setAttribute('class', 'valid-move');
        indicator.setAttribute('data-cell', moveCell);
        indicator.style.cursor = 'pointer';
        g.appendChild(indicator);
      }
    }
  }

  function drawPiece(parent, cell, player) {
    var pos = cellToPixel(cell);
    var piece = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    piece.setAttribute('cx', pos.x);
    piece.setAttribute('cy', pos.y);
    piece.setAttribute('r', CELL_SIZE * 0.28);
    piece.setAttribute('fill', PLAYER_COLORS[player].color);
    piece.setAttribute('stroke', '#333');
    piece.setAttribute('stroke-width', '2');
    piece.setAttribute('class', 'piece');
    piece.setAttribute('data-cell', cell);

    if (gameState.selectedPiece === cell) {
      piece.classList.add('selected');
    }

    parent.appendChild(piece);
  }

  function updateStatusBar() {
    var currentConfig = PLAYER_COLORS[gameState.currentPlayer];
    document.getElementById('current-player').textContent = currentConfig.name;
    document.getElementById('current-player').className = 'team-indicator ' + currentConfig.textClass;
    document.getElementById('turn-count').textContent = gameState.turnCount;
  }

  function updateMessage(text, type) {
    var el = document.getElementById('message');
    el.textContent = text;
    el.className = type === 'error' ? 'error' : (type === 'info' ? 'info' : '');
  }

  function showGameOver() {
    var winnerText = document.getElementById('winner-text');
    if (gameState.winner) {
      winnerText.textContent = PLAYER_COLORS[gameState.winner].name + ' 获胜！';
    } else {
      winnerText.textContent = '平局！';
    }
    document.getElementById('game-over').style.display = 'flex';
  }

  function handleSvgClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;

    var target = e.target;
    var cell = parseInt(target.getAttribute('data-cell'));
    if (isNaN(cell)) return;

    if (target.classList.contains('piece')) {
      var player = gameState.board[cell];
      if (player === gameState.currentPlayer) {
        gameState.selectedPiece = cell;
        gameState.validMoves = getLegalMoves(gameState.board, cell);
        drawBoard();
        updateMessage('已选择棋子，点击绿色位置移动', 'info');
      }
    } else if (target.classList.contains('valid-move')) {
      if (gameState.selectedPiece !== null) {
        doMove(gameState.selectedPiece, cell);
      }
    } else if (target.tagName === 'circle') {
      var boardCell = gameState.board[cell];
      if (boardCell === gameState.currentPlayer) {
        gameState.selectedPiece = cell;
        gameState.validMoves = getLegalMoves(gameState.board, cell);
        drawBoard();
        updateMessage('已选择棋子，点击绿色位置移动', 'info');
      } else if (gameState.selectedPiece !== null && gameState.validMoves.indexOf(cell) !== -1) {
        doMove(gameState.selectedPiece, cell);
      }
    } else {
      if (gameState.selectedPiece !== null) {
        gameState.selectedPiece = null;
        gameState.validMoves = [];
        drawBoard();
        updateMessage('请选择要移动的棋子', 'info');
      }
    }
  }

  function doMove(from, to) {
    gameState.board = makeMove(gameState.board, from, to);
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;

    var winner = checkGameOver(gameState.board, gameState.players);
    if (winner) {
      gameState.gameOver = true;
      gameState.winner = winner;
      drawBoard();
      updateStatusBar();
      setTimeout(showGameOver, 500);
      return;
    }

    nextPlayer();
  }

  function nextPlayer() {
    var currentIndex = gameState.players.indexOf(gameState.currentPlayer);
    var nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentPlayer = gameState.players[nextIndex];

    drawBoard();
    updateStatusBar();
    updateMessage('轮到 ' + PLAYER_COLORS[gameState.currentPlayer].name + ' 行动', 'info');

    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    updateMessage('AI正在思考...', 'info');
    setTimeout(function() {
      var move = getBestAIMove(gameState.board, gameState.aiTeam);
      gameState.aiThinking = false;
      if (move) {
        doMove(move.from, move.to);
      } else {
        nextPlayer();
      }
    }, 500);
  }

  // Get board rotation angle for player (to place player's start area at bottom)
  function getPlayerRotation(player) {
    // Red is at top, needs 180-degree rotation
    // Green is at upper-left, needs 120-degree rotation
    // Yellow is at upper-right, needs 240-degree rotation
    // Blue is at bottom-right, no rotation needed
    // Orange is at bottom-left, no rotation needed
    // Purple is at bottom, no rotation needed
    var rotations = {
      1: 180,  // Red
      2: 0,    // Blue
      3: 120,  // Green
      4: 240,  // Yellow
      5: 0,    // Purple (bottom)
      6: 0     // Orange (bottom-left)
    };
    return rotations[player] || 0;
  }

  function startGame(mode, playerCount, firstPlayer) {
    gameState = createGameState(mode, playerCount);
    initGame(gameState);

    if (firstPlayer) {
      gameState.currentPlayer = firstPlayer;
    }

    if (mode === 'pve') {
      // Determine player and AI teams
      if (firstPlayer) {
        gameState.playerTeam = firstPlayer;
        // AI gets other players
        var aiPlayers = [];
        for (var i = 0; i < gameState.players.length; i++) {
          if (gameState.players[i] !== firstPlayer) {
            aiPlayers.push(gameState.players[i]);
          }
        }
        gameState.aiTeam = aiPlayers[0]; // Primary opponent
      } else {
        gameState.playerTeam = RED;
        gameState.aiTeam = BLUE;
      }
      // Set board rotation to place player at bottom
      gameState.boardRotation = getPlayerRotation(gameState.playerTeam);
    } else {
      // PVP mode, rotate based on first player
      gameState.boardRotation = firstPlayer ? getPlayerRotation(firstPlayer) : 0;
    }

    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('game-over').style.display = 'none';

    var colorRulesHtml = '';
    for (var i = 0; i < gameState.players.length; i++) {
      var player = gameState.players[i];
      var config = PLAYER_COLORS[player];
      colorRulesHtml += '<li style="color:' + config.color + '">' + config.name + '</li>';
    }
    document.getElementById('color-rules').innerHTML = colorRulesHtml;

    drawBoard();
    updateStatusBar();
    updateMessage('游戏开始！' + PLAYER_COLORS[gameState.currentPlayer].name + ' 先手', 'info');

    var svg = document.getElementById('board-svg');
    svg.onclick = handleSvgClick;

    // If AI goes first, trigger AI action
    if (mode === 'pve' && gameState.currentPlayer !== gameState.playerTeam) {
      triggerAI();
    }
  }

  function restartGame() {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'flex';
    gameState = null;
    rpsChoices = { player1: null, player2: null, human: null };
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
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你赢了！你先手(' + PLAYER_COLORS[RED].name + ')。';
        setTimeout(function() { startGame(currentMode, currentPlayerCount, RED); }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你输了！AI先手(' + PLAYER_COLORS[BLUE].name + ')。';
        setTimeout(function() { startGame(currentMode, currentPlayerCount, BLUE); }, 1500);
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
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家1赢了！玩家1先手(' + PLAYER_COLORS[RED].name + ')。';
          setTimeout(function() { startGame(currentMode, currentPlayerCount, RED); }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家2赢了！玩家2先手(' + PLAYER_COLORS[BLUE].name + ')。';
          setTimeout(function() { startGame(currentMode, currentPlayerCount, BLUE); }, 1500);
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
    // PVP mode buttons
    document.getElementById('btn-2p').addEventListener('click', function() {
      currentMode = 'pvp';
      currentPlayerCount = 2;
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'block';
      document.getElementById('rps-pve').style.display = 'none';
      rpsChoices = { player1: null, player2: null, human: null };
    });
    document.getElementById('btn-3p').addEventListener('click', function() {
      currentMode = 'pvp';
      currentPlayerCount = 3;
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'block';
      document.getElementById('rps-pve').style.display = 'none';
      rpsChoices = { player1: null, player2: null, human: null };
    });
    document.getElementById('btn-4p').addEventListener('click', function() {
      currentMode = 'pvp';
      currentPlayerCount = 4;
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'block';
      document.getElementById('rps-pve').style.display = 'none';
      rpsChoices = { player1: null, player2: null, human: null };
    });
    document.getElementById('btn-6p').addEventListener('click', function() {
      currentMode = 'pvp';
      currentPlayerCount = 6;
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'block';
      document.getElementById('rps-pve').style.display = 'none';
      rpsChoices = { player1: null, player2: null, human: null };
    });

    // PVE mode buttons
    document.getElementById('btn-pve').addEventListener('click', function() {
      currentMode = 'pve';
      currentPlayerCount = 2;
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'none';
      document.getElementById('rps-pve').style.display = 'block';
      rpsChoices = { player1: null, player2: null, human: null };
    });

    // Rock-Paper-Scissors button events
    document.querySelectorAll('.btn-rps').forEach(function(button) {
      button.addEventListener('click', function(ev) {
        var player = ev.target.dataset.player;
        var choice = ev.target.dataset.choice;
        handleRPSChoice(player, choice);
      });
    });

    document.getElementById('btn-restart').addEventListener('click', restartGame);

    document.getElementById('mode-selection').style.display = 'flex';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
  });
}
