// ============================================================
// Card Game Core - Shared logic for 4x4 card games (red/blue teams)
// ============================================================

// Four adjacent direction offsets
var DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 }
];

/**
 * Check if coordinates are within 4x4 board range
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x <= 3 && y >= 0 && y <= 3;
}

/**
 * Get valid move targets (adjacent empty cells)
 * @param {Array} board - 4x4 board
 * @param {number} x
 * @param {number} y
 * @returns {Array<{x, y}>}
 */
function getValidMoves(board, x, y) {
  var card = board[y][x];
  if (!card) return [];
  var moves = [];
  for (var i = 0; i < DIRECTIONS.length; i++) {
    var nx = x + DIRECTIONS[i].dx;
    var ny = y + DIRECTIONS[i].dy;
    if (inBounds(nx, ny) && board[ny][nx] === null) {
      moves.push({ x: nx, y: ny });
    }
  }
  return moves;
}

/**
 * Get valid capture targets
 * @param {Array} board - 4x4 board
 * @param {number} x
 * @param {number} y
 * @param {string} team - current team
 * @param {Function} canCaptureFn - game-specific: (attacker, defender) => boolean
 * @returns {Array<{x, y}>}
 */
function getValidCaptures(board, x, y, team, canCaptureFn) {
  var card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];
  var captures = [];
  for (var i = 0; i < DIRECTIONS.length; i++) {
    var nx = x + DIRECTIONS[i].dx;
    var ny = y + DIRECTIONS[i].dy;
    if (!inBounds(nx, ny)) continue;
    var target = board[ny][nx];
    if (!target || !target.faceUp || target.team === team) continue;
    if (!canCaptureFn(card, target)) continue;
    captures.push({ x: nx, y: ny });
  }
  return captures;
}

/**
 * Execute flip operation (modifies state in place)
 * Works for red/blue team games.
 * @param {Object} state - game state
 * @param {number} x
 * @param {number} y
 * @returns {Object|null}
 */
function flipCard(state, x, y) {
  if (!inBounds(x, y)) return null;
  var card = state.board[y][x];
  if (!card || card.faceUp) return null;

  card.faceUp = true;

  if (!state.teamAssigned) {
    state.teamAssigned = true;
    if (state.mode === 'pve') {
      if (state.aiFirst) {
        state.aiTeam = card.team;
        state.playerTeam = card.team === 'red' ? 'blue' : 'red';
      } else {
        state.playerTeam = card.team;
        state.aiTeam = card.team === 'red' ? 'blue' : 'red';
      }
    }
    if (state.mode === 'pve') {
      var flipperTeam = state.aiFirst ? state.aiTeam : state.playerTeam;
      state.currentTeam = flipperTeam === 'red' ? 'blue' : 'red';
    } else {
      state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
    }
  } else {
    state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  }
  state.turnCount++;
  return state;
}

/**
 * Execute move operation (modifies state in place)
 * @param {Object} state
 * @param {{x,y}} from
 * @param {{x,y}} to
 * @returns {Object|null}
 */
function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  var card = state.board[from.y][from.x];
  if (!card || !card.faceUp || card.team !== state.currentTeam) return null;
  if (state.board[to.y][to.x] !== null) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;

  state.board[to.y][to.x] = card;
  state.board[from.y][from.x] = null;
  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;
  return state;
}

/**
 * Create base game state object for red/blue card games
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {Object} state with null board (caller sets board)
 */
function createBaseState(mode) {
  return {
    mode: mode,
    board: null,
    currentTeam: null,
    playerTeam: null,
    aiTeam: null,
    teamAssigned: false,
    firstPlayer: null,
    turnCount: 0,
    capturedRed: [],
    capturedBlue: [],
    selectedCell: null,
    gameOver: false,
    winner: null,
    aiThinking: false,
    aiFirst: false
  };
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DIRECTIONS: DIRECTIONS,
    inBounds: inBounds,
    getValidMoves: getValidMoves,
    getValidCaptures: getValidCaptures,
    flipCard: flipCard,
    moveCard: moveCard,
    createBaseState: createBaseState
  };
}
