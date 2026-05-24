// ============================================================
// Card Game Core - Shared logic for 4x4 card games (red/blue teams)
// ============================================================

// Four adjacent direction offsets
const DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
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
  const card = board[y][x];
  if (!card) return [];
  const moves = [];
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const nx = x + DIRECTIONS[i].dx;
    const ny = y + DIRECTIONS[i].dy;
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
  const card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];
  const captures = [];
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const nx = x + DIRECTIONS[i].dx;
    const ny = y + DIRECTIONS[i].dy;
    if (!inBounds(nx, ny)) continue;
    const target = board[ny][nx];
    if (!target || !target.faceUp || target.team === team) continue;
    if (!canCaptureFn(card, target)) continue;
    captures.push({ x: nx, y: ny });
  }
  return captures;
}

// Browser-only alias: per-game scripts (animal-chess/cat-and-mouse/little-emperor)
// declare a 3-arg getValidCaptures(board, x, y, team) at the top level which
// shadows this 4-arg core function on the global object (classic <script>).
// Expose the core function under a separate name so those wrappers can still
// reach it after shadowing. In Node, those scripts assign this via require()
// instead, but exposing it here keeps the symbol consistent.
// eslint-disable-next-line no-var, no-unused-vars
var getValidCapturesCore = getValidCaptures;

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
  const card = state.board[y][x];
  if (!card || card.faceUp) return null;

  card.faceUp = true;

  if (!state.teamAssigned) {
    state.teamAssigned = true;
    if (state.mode === "pve") {
      if (state.aiFirst) {
        state.aiTeam = card.team;
        state.playerTeam = card.team === "red" ? "blue" : "red";
      } else {
        state.playerTeam = card.team;
        state.aiTeam = card.team === "red" ? "blue" : "red";
      }
    }
    if (state.mode === "pve") {
      const flipperTeam = state.aiFirst ? state.aiTeam : state.playerTeam;
      state.currentTeam = flipperTeam === "red" ? "blue" : "red";
    } else {
      state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
    }
  } else {
    state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
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
  const card = state.board[from.y][from.x];
  if (!card || !card.faceUp || card.team !== state.currentTeam) return null;
  if (state.board[to.y][to.x] !== null) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;

  state.board[to.y][to.x] = card;
  state.board[from.y][from.x] = null;
  state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
  state.turnCount++;
  return state;
}

// ============================================================
// AI helper utilities (shared one-step lookahead heuristics)
// ============================================================

/**
 * Check if the face-up piece at (x, y) is under threat:
 * any adjacent face-up enemy can capture it via canCaptureFn.
 * @param {Array} board
 * @param {number} x
 * @param {number} y
 * @param {string} ownTeam - team of the piece at (x, y)
 * @param {Function} canCaptureFn - (attacker, defender) => boolean
 * @returns {boolean}
 */
function isPositionUnderThreat(board, x, y, ownTeam, canCaptureFn) {
  const card = board[y][x];
  if (!card || !card.faceUp) return false;
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const nx = x + DIRECTIONS[i].dx;
    const ny = y + DIRECTIONS[i].dy;
    if (!inBounds(nx, ny)) continue;
    const enemy = board[ny][nx];
    if (!enemy || !enemy.faceUp || enemy.team === ownTeam) continue;
    if (canCaptureFn(enemy, card)) return true;
  }
  return false;
}

/**
 * Simulate a move: returns a shallow-cloned board with the move applied.
 * Original board is not mutated. Cards themselves are not deep-copied (they are
 * read-only for the simulation purposes used here).
 * @param {Array} board
 * @param {{x,y}} from
 * @param {{x,y}} to
 * @returns {Array}
 */
function simulateMove(board, from, to) {
  const newBoard = new Array(4);
  for (let y = 0; y < 4; y++) newBoard[y] = board[y].slice();
  newBoard[to.y][to.x] = newBoard[from.y][from.x];
  newBoard[from.y][from.x] = null;
  return newBoard;
}

/**
 * Simulate a capture: returns a shallow-cloned board with capture applied.
 * - Mutual destruction: both squares cleared.
 * - Otherwise: attacker moves into defender's square.
 * @param {Array} board
 * @param {{x,y}} from - attacker
 * @param {{x,y}} to - defender
 * @param {boolean} mutual - whether mutual destruction
 * @returns {Array}
 */
function simulateCapture(board, from, to, mutual) {
  const newBoard = new Array(4);
  for (let y = 0; y < 4; y++) newBoard[y] = board[y].slice();
  if (mutual) {
    newBoard[from.y][from.x] = null;
    newBoard[to.y][to.x] = null;
  } else {
    newBoard[to.y][to.x] = newBoard[from.y][from.x];
    newBoard[from.y][from.x] = null;
  }
  return newBoard;
}

/**
 * Smart AI decision with one-step lookahead heuristics.
 *
 * Action priority (kept compatible with original greedy AI):
 *   1. capture - choose the highest-scoring capture (counter-attack risk aware)
 *   2. flip    - choose a face-down cell that is least risky to flip
 *   3. move    - choose a move that escapes/avoids threats and approaches prey
 *
 * @param {Object} state - game state with board/currentTeam etc.
 * @param {string} aiTeam - team controlled by AI
 * @param {Object} deps - game-specific dependencies
 * @param {Function} deps.canCapture - (attacker, defender) => boolean
 * @param {Function} deps.isMutualDestruction - (attacker, defender) => boolean
 * @param {Function} deps.pieceValue - (rank) => number (higher = more valuable)
 * @param {Function} deps.getValidCaptures - (board, x, y, team) => Array<{x,y}>
 * @param {Function} deps.getValidMoves - (board, x, y) => Array<{x,y}>
 * @returns {{type, from?, to?, x?, y?}|null}
 */
function smartAiDecide(state, aiTeam, deps) {
  const board = state.board;
  const { canCapture, isMutualDestruction, pieceValue, getValidCaptures, getValidMoves } = deps;

  // Priority 1: capture (one-step lookahead for counter-attack risk)
  const allCaptures = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidCaptures(board, x, y, aiTeam);
      for (let k = 0; k < targets.length; k++) {
        const t = targets[k];
        const target = board[t.y][t.x];
        const mutual = isMutualDestruction(card, target);
        const attVal = pieceValue(card.rank);
        const defVal = pieceValue(target.rank);
        let score;
        if (mutual) {
          // Mutual destruction: net = enemy loss - own loss
          score = defVal - attVal;
        } else {
          // Normal capture: simulate and check if attacker would be captured next turn
          const futureBoard = simulateCapture(board, { x, y }, t, false);
          const exposed = isPositionUnderThreat(futureBoard, t.x, t.y, aiTeam, canCapture);
          score = defVal - (exposed ? attVal : 0);
        }
        allCaptures.push({
          from: { x, y },
          to: t,
          score,
          defenderRank: target.rank,
          attackerRank: card.rank,
          mutual,
        });
      }
    }
  }
  if (allCaptures.length > 0) {
    allCaptures.sort((a, b) => {
      // Primary: highest expected score
      if (a.score !== b.score) return b.score - a.score;
      // Tiebreakers preserve legacy behavior:
      //  prefer non-mutual, lower defender rank (higher value),
      //  higher attacker rank (preserve high-value attackers)
      if (a.mutual !== b.mutual) return a.mutual ? 1 : -1;
      if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank;
      return b.attackerRank - a.attackerRank;
    });
    return { type: "capture", from: allCaptures[0].from, to: allCaptures[0].to };
  }

  // Priority 2: flip (avoid flipping next to own face-up pieces)
  const faceDownCells = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card && !card.faceUp) faceDownCells.push({ x, y });
    }
  }
  if (faceDownCells.length > 0) {
    // Find own piece values at risk (most valuable own piece adjacent to flip)
    const scored = faceDownCells.map((pos) => {
      let maxAdjOwnVal = 0;
      let adjEnemyCount = 0;
      for (let i = 0; i < DIRECTIONS.length; i++) {
        const nx = pos.x + DIRECTIONS[i].dx;
        const ny = pos.y + DIRECTIONS[i].dy;
        if (!inBounds(nx, ny)) continue;
        const c = board[ny][nx];
        if (!c || !c.faceUp) continue;
        if (c.team === aiTeam) {
          const v = pieceValue(c.rank);
          if (v > maxAdjOwnVal) maxAdjOwnVal = v;
        } else {
          adjEnemyCount++;
        }
      }
      // Penalty: risk of flipping enemy that captures adjacent own piece
      // Bonus: adjacent enemies (newly flipped own piece could threaten them)
      // Slight bias toward the centre for strategic flexibility
      const distFromCenter = Math.abs(pos.x - 1.5) + Math.abs(pos.y - 1.5);
      const score = adjEnemyCount * 0.5 - maxAdjOwnVal * 1.0 - distFromCenter * 0.1;
      return { pos, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const topScore = scored[0].score;
    const top = scored.filter((s) => s.score === topScore);
    const pick = top[Math.floor(Math.random() * top.length)].pos;
    return { type: "flip", x: pick.x, y: pick.y };
  }

  // Priority 3: move (escape threats, approach prey, avoid suicide)
  const allMoves = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidMoves(board, x, y);
      for (let k = 0; k < targets.length; k++) {
        const t = targets[k];
        const cardVal = pieceValue(card.rank);
        let score = 0;

        const currThreatened = isPositionUnderThreat(board, x, y, aiTeam, canCapture);
        const futureBoard = simulateMove(board, { x, y }, t);
        const futureThreatened = isPositionUnderThreat(futureBoard, t.x, t.y, aiTeam, canCapture);

        if (currThreatened && !futureThreatened) {
          // Escaping danger
          score += cardVal;
        } else if (!currThreatened && futureThreatened) {
          // Walking into danger (suicide) - heavy penalty
          score -= cardVal * 1.5;
        } else if (currThreatened && futureThreatened) {
          // Still in danger
          score -= cardVal * 0.5;
        }

        // Reward approaching a capturable enemy (sets up next-turn capture)
        let approachBonus = 0;
        for (let i = 0; i < DIRECTIONS.length; i++) {
          const nx = t.x + DIRECTIONS[i].dx;
          const ny = t.y + DIRECTIONS[i].dy;
          if (!inBounds(nx, ny)) continue;
          const enemy = futureBoard[ny][nx];
          if (!enemy || !enemy.faceUp || enemy.team === aiTeam) continue;
          if (canCapture(card, enemy)) {
            const ev = pieceValue(enemy.rank);
            if (ev > approachBonus) approachBonus = ev;
          }
        }
        score += approachBonus * 0.5;

        // Slight preference for advancing toward enemy face-up pieces
        // (encourages activity rather than wandering aimlessly)
        const enemyDistDelta = nearestEnemyDelta(board, x, y, t, aiTeam);
        score += enemyDistDelta * 0.05;

        allMoves.push({ from: { x, y }, to: t, score });
      }
    }
  }
  if (allMoves.length > 0) {
    allMoves.sort((a, b) => b.score - a.score);
    const topScore = allMoves[0].score;
    const top = allMoves.filter((m) => m.score === topScore);
    const pick = top[Math.floor(Math.random() * top.length)];
    return { type: "move", from: pick.from, to: pick.to };
  }

  return null;
}

/**
 * Manhattan-distance reduction toward the nearest enemy face-up piece.
 * Positive = moving closer, negative = moving away, 0 = no enemy or unchanged.
 */
function nearestEnemyDelta(board, fromX, fromY, to, ownTeam) {
  let bestBefore = Infinity;
  let bestAfter = Infinity;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const c = board[y][x];
      if (!c || !c.faceUp || c.team === ownTeam) continue;
      const dBefore = Math.abs(x - fromX) + Math.abs(y - fromY);
      const dAfter = Math.abs(x - to.x) + Math.abs(y - to.y);
      if (dBefore < bestBefore) bestBefore = dBefore;
      if (dAfter < bestAfter) bestAfter = dAfter;
    }
  }
  if (!isFinite(bestBefore) || !isFinite(bestAfter)) return 0;
  return bestBefore - bestAfter;
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
    aiFirst: false,
  };
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DIRECTIONS: DIRECTIONS,
    inBounds: inBounds,
    getValidMoves: getValidMoves,
    getValidCaptures: getValidCaptures,
    flipCard: flipCard,
    moveCard: moveCard,
    createBaseState: createBaseState,
    isPositionUnderThreat: isPositionUnderThreat,
    simulateMove: simulateMove,
    simulateCapture: simulateCapture,
    smartAiDecide: smartAiDecide,
  };
}
