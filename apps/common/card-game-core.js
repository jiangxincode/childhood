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

// ============================================================
// Stalemate / draw detection (anti-deadlock for card games)
// ============================================================
// Reaching this number of consecutive non-capture actions ends the game in a draw.
const STALEMATE_NO_CAPTURE_LIMIT = 50;
// Reaching this number of repetitions of the same position+turn signals a draw.
const POSITION_REPETITION_LIMIT = 3;

/**
 * Build a compact signature of the board + side to move for repetition tracking.
 * Relies on JSON serialization of the board cells; field insertion order is
 * stable inside each game's card factory, so equivalent positions hash equal.
 * @param {Object} state
 * @returns {string}
 */
function hashPosition(state) {
  return JSON.stringify(state.board) + "|" + (state.currentTeam || "");
}

/**
 * Increment the non-capture action counter and record the current position.
 * Call this at the end of any non-capture action that consumes a turn
 * (flip / move / carry-weapon).
 * @param {Object} state
 */
function recordNonCaptureAction(state) {
  state.noCaptureActions = (state.noCaptureActions || 0) + 1;
  if (!state.positionHistory) state.positionHistory = {};
  const key = hashPosition(state);
  state.positionHistory[key] = (state.positionHistory[key] || 0) + 1;
}

/**
 * Reset stalemate tracking after a capture: piece count just changed so any
 * earlier repetition counts can no longer recur.
 * @param {Object} state
 */
function recordCaptureAction(state) {
  state.noCaptureActions = 0;
  state.positionHistory = {};
}

/**
 * Check whether the current state has reached a draw by stalemate rules.
 * @param {Object} state
 * @returns {boolean}
 */
function isStalemateDraw(state) {
  if (!state) return false;
  if ((state.noCaptureActions || 0) >= STALEMATE_NO_CAPTURE_LIMIT) return true;
  if (state.positionHistory) {
    const key = hashPosition(state);
    if ((state.positionHistory[key] || 0) >= POSITION_REPETITION_LIMIT) return true;
  }
  return false;
}

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
  for (const dir of DIRECTIONS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
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
  recordNonCaptureAction(state);
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
  recordNonCaptureAction(state);
  return state;
}

// ============================================================
// AI helper utilities (shared one-step lookahead heuristics)
// ============================================================

/**
 * Resolve board size from a board argument. The default 4x4 inBounds works for
 * most card games here; a 5x5 game (e.g. chinese-army-chess) supplies its own
 * inBoundsFn so this helper falls back to the board's own dimensions.
 * @param {Array} board
 * @returns {{size: number, inBounds: Function}}
 */
function _boardDims(board, customInBounds) {
  const size = board.length;
  const ib =
    typeof customInBounds === "function"
      ? customInBounds
      : function (x, y) {
          return x >= 0 && x < size && y >= 0 && y < size;
        };
  return { size: size, inBounds: ib };
}

/**
 * Check if the face-up piece at (x, y) is under threat:
 * any adjacent face-up enemy can capture it via canCaptureFn.
 * @param {Array} board
 * @param {number} x
 * @param {number} y
 * @param {string} ownTeam - team of the piece at (x, y)
 * @param {Function} canCaptureFn - (attacker, defender) => boolean
 * @param {Function} [inBoundsFn] - optional per-game inBounds (defaults to board size)
 * @returns {boolean}
 */
function isPositionUnderThreat(board, x, y, ownTeam, canCaptureFn, inBoundsFn) {
  const card = board[y][x];
  if (!card || !card.faceUp) return false;
  const dims = _boardDims(board, inBoundsFn);
  for (const dir of DIRECTIONS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (!dims.inBounds(nx, ny)) continue;
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
  const size = board.length;
  const newBoard = new Array(size);
  for (let y = 0; y < size; y++) newBoard[y] = board[y].slice();
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
  const size = board.length;
  const newBoard = new Array(size);
  for (let y = 0; y < size; y++) newBoard[y] = board[y].slice();
  if (mutual) {
    newBoard[from.y][from.x] = null;
    newBoard[to.y][to.x] = null;
  } else {
    newBoard[to.y][to.x] = newBoard[from.y][from.x];
    newBoard[from.y][from.x] = null;
  }
  return newBoard;
}

function buildCaptureCandidate(board, x, y, targetPos, aiTeam, deps) {
  const { canCapture, isMutualDestruction, pieceValue } = deps;
  const card = board[y][x];
  const target = board[targetPos.y][targetPos.x];
  const mutual = isMutualDestruction(card, target);
  const attackerValue = pieceValue(card, target, "attacker");
  const defenderValue = pieceValue(target, card, "defender");
  let score = defenderValue - attackerValue;
  if (!mutual) {
    const futureBoard = simulateCapture(board, { x, y }, targetPos, false);
    const exposed = isPositionUnderThreat(
      futureBoard,
      targetPos.x,
      targetPos.y,
      aiTeam,
      canCapture,
      deps.inBounds
    );
    score = defenderValue - (exposed ? attackerValue : 0);
  }
  return {
    from: { x, y },
    to: targetPos,
    score,
    defenderRank: target.rank,
    attackerRank: card.rank,
    mutual,
  };
}

function collectCaptureCandidates(board, aiTeam, deps, size) {
  const captures = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = deps.getValidCaptures(board, x, y, aiTeam);
      for (const target of targets) {
        captures.push(buildCaptureCandidate(board, x, y, target, aiTeam, deps));
      }
    }
  }
  return captures;
}

function compareCaptureCandidates(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  if (a.mutual !== b.mutual) return a.mutual ? 1 : -1;
  if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank;
  return b.attackerRank - a.attackerRank;
}

function shouldAvoidCapture(difficulty, score) {
  return (difficulty === "hard" && score < -2) || (difficulty === "master" && score < 0);
}

/**
 * Pick the best capture among all legal captures (one-step lookahead).
 * @param {Array} board
 * @param {string} aiTeam
 * @param {Object} deps - same shape as smartAiDecide deps
 * @param {number} [size] - board size (default board.length)
 * @returns {{type:'capture',from:{x,y},to:{x,y}}|null}
 */
function chooseBestCapture(board, aiTeam, deps, size, difficulty) {
  const dims = _boardDims(board, deps.inBounds);
  const N = size || dims.size;
  const allCaptures = collectCaptureCandidates(board, aiTeam, deps, N);
  if (allCaptures.length === 0) return null;
  if (difficulty === "easy") {
    const pick = allCaptures[Math.floor(Math.random() * allCaptures.length)];
    return { type: "capture", from: pick.from, to: pick.to };
  }
  allCaptures.sort(compareCaptureCandidates);
  if (shouldAvoidCapture(difficulty, allCaptures[0].score)) return null;
  return { type: "capture", from: allCaptures[0].from, to: allCaptures[0].to };
}

/**
 * Pick the best face-down cell to flip. Penalises being adjacent to own
 * high-value pieces (any flipped enemy could capture them next turn).
 * @param {Array} board
 * @param {string} aiTeam
 * @param {Object} deps
 * @param {number} [size]
 * @returns {{type:'flip',x:number,y:number}|null}
 */
function chooseBestFlip(board, aiTeam, deps, size, difficulty) {
  const dims = _boardDims(board, deps.inBounds);
  const N = size || dims.size;
  const { pieceValue } = deps;
  const faceDownCells = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const card = board[y][x];
      if (card && !card.faceUp) faceDownCells.push({ x, y });
    }
  }
  if (faceDownCells.length === 0) return null;
  if (difficulty === "easy") {
    const pos = faceDownCells[Math.floor(Math.random() * faceDownCells.length)];
    return { type: "flip", x: pos.x, y: pos.y };
  }

  const center = (N - 1) / 2;
  const scored = faceDownCells.map((pos) => {
    let maxAdjOwnVal = 0;
    let adjEnemyCount = 0;
    for (const dir of DIRECTIONS) {
      const nx = pos.x + dir.dx;
      const ny = pos.y + dir.dy;
      if (!dims.inBounds(nx, ny)) continue;
      const c = board[ny][nx];
      if (!c || !c.faceUp) continue;
      if (c.team === aiTeam) {
        const v = pieceValue(c, null, "self");
        if (v > maxAdjOwnVal) maxAdjOwnVal = v;
      } else {
        adjEnemyCount++;
      }
    }
    const distFromCenter = Math.abs(pos.x - center) + Math.abs(pos.y - center);
    const score = adjEnemyCount * 0.5 - maxAdjOwnVal * 1 - distFromCenter * 0.1;
    return { pos, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const top = scored.filter((s) => s.score === topScore);
  const pick = top[Math.floor(Math.random() * top.length)].pos;
  return { type: "flip", x: pick.x, y: pick.y };
}

/**
 * Pick the best move. Heuristics:
 * - escape from threat: bonus
 * - walk into a threatened cell: heavy penalty
 * - bring our piece next to a capturable enemy: bonus
 * - generic Manhattan reduction toward nearest enemy: tiny bias
 * @param {Array} board
 * @param {string} aiTeam
 * @param {Object} deps
 * @param {number} [size]
 * @returns {{type:'move',from:{x,y},to:{x,y}}|null}
 */
function getThreatAdjustment(currentThreatened, futureThreatened, cardValue) {
  if (currentThreatened && !futureThreatened) return cardValue;
  if (!currentThreatened && futureThreatened) return -cardValue * 1.5;
  if (currentThreatened && futureThreatened) return -cardValue * 0.5;
  return 0;
}

function getApproachBonus(board, position, card, aiTeam, deps, inBoundsFn) {
  let bonus = 0;
  for (const dir of DIRECTIONS) {
    const x = position.x + dir.dx;
    const y = position.y + dir.dy;
    if (!inBoundsFn(x, y)) continue;
    const enemy = board[y][x];
    if (!enemy || !enemy.faceUp || enemy.team === aiTeam) continue;
    if (!deps.canCapture(card, enemy)) continue;
    bonus = Math.max(bonus, deps.pieceValue(enemy, card, "defender"));
  }
  return bonus;
}

function scoreMoveCandidate(board, from, to, aiTeam, deps, size, inBoundsFn) {
  const card = board[from.y][from.x];
  const cardValue = deps.pieceValue(card, null, "self");
  const currentThreatened = isPositionUnderThreat(
    board,
    from.x,
    from.y,
    aiTeam,
    deps.canCapture,
    deps.inBounds
  );
  const futureBoard = simulateMove(board, from, to);
  const futureThreatened = isPositionUnderThreat(
    futureBoard,
    to.x,
    to.y,
    aiTeam,
    deps.canCapture,
    deps.inBounds
  );
  const threatScore = getThreatAdjustment(currentThreatened, futureThreatened, cardValue);
  const approachScore = getApproachBonus(futureBoard, to, card, aiTeam, deps, inBoundsFn) * 0.5;
  const distanceScore = nearestEnemyDelta(board, from.x, from.y, to, aiTeam, size) * 0.05;
  return threatScore + approachScore + distanceScore;
}

function collectMoveCandidates(board, aiTeam, deps, size, inBoundsFn) {
  const moves = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      for (const target of deps.getValidMoves(board, x, y)) {
        const from = { x, y };
        const score = scoreMoveCandidate(board, from, target, aiTeam, deps, size, inBoundsFn);
        moves.push({ from, to: target, score });
      }
    }
  }
  return moves;
}

function chooseBestMove(board, aiTeam, deps, size, difficulty) {
  const dims = _boardDims(board, deps.inBounds);
  const N = size || dims.size;
  const allMoves = collectMoveCandidates(board, aiTeam, deps, N, dims.inBounds);
  if (allMoves.length === 0) return null;
  if (difficulty === "easy") {
    const pick = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { type: "move", from: pick.from, to: pick.to };
  }
  allMoves.sort((a, b) => b.score - a.score);
  const topScore = allMoves[0].score;
  const top = allMoves.filter((m) => m.score === topScore);
  const pick = top[Math.floor(Math.random() * top.length)];
  return { type: "move", from: pick.from, to: pick.to };
}

/**
 * Smart AI decision with one-step lookahead heuristics.
 *
 * Action priority (kept compatible with original greedy AI):
 *   1. capture - choose the highest-scoring capture (counter-attack risk aware)
 *   2. flip    - choose a face-down cell that is least risky to flip
 *   3. move    - choose a move that escapes/avoids threats and approaches prey
 *
 * The pieceValue dependency is invoked as `pieceValue(card, otherCard?, role?)`.
 * Plain rank-based games can ignore the extra arguments. Games where value
 * depends on context (e.g. carrying a weapon) can use them.
 *
 * @param {Object} state - game state with board/currentTeam etc.
 * @param {string} aiTeam - team controlled by AI
 * @param {Object} deps - game-specific dependencies
 * @param {Function} deps.canCapture - (attacker, defender) => boolean
 * @param {Function} deps.isMutualDestruction - (attacker, defender) => boolean
 * @param {Function} deps.pieceValue - (card, otherCard?, role?) => number
 * @param {Function} deps.getValidCaptures - (board, x, y, team) => Array<{x,y}>
 * @param {Function} deps.getValidMoves - (board, x, y) => Array<{x,y}>
 * @param {Function} [deps.inBounds] - (x, y) => boolean (defaults to 4x4 / board size)
 * @returns {{type, from?, to?, x?, y?}|null}
 */
/**
 * Smart AI decision with one-step lookahead heuristics.
 *
 * Action priority (kept compatible with original greedy AI):
 *   1. capture - choose the highest-scoring capture (counter-attack risk aware)
 *   2. flip    - choose a face-down cell that is least risky to flip
 *   3. move    - choose a move that escapes/avoids threats and approaches prey
 *
 * The pieceValue dependency is invoked as `pieceValue(card, otherCard?, role?)`.
 * Plain rank-based games can ignore the extra arguments. Games where value
 * depends on context (e.g. carrying a weapon) can use them.
 *
 * @param {Object} state - game state with board/currentTeam etc.
 * @param {string} aiTeam - team controlled by AI
 * @param {Object} deps - game-specific dependencies
 * @param {Function} deps.canCapture - (attacker, defender) => boolean
 * @param {Function} deps.isMutualDestruction - (attacker, defender) => boolean
 * @param {Function} deps.pieceValue - (rank) or (card, other?, role?) => number
 * @param {Function} deps.getValidCaptures - (board, x, y, team) => Array<{x,y}>
 * @param {Function} deps.getValidMoves - (board, x, y) => Array<{x,y}>
 * @param {Function} [deps.inBounds] - (x, y) => boolean (defaults to board size)
 * @returns {{type, from?, to?, x?, y?}|null}
 */
function smartAiDecide(state, aiTeam, deps, difficulty) {
  // Wrap a legacy pieceValue(rank) signature so the new helpers can call
  // pieceValue(card, otherCard?, role?) uniformly.
  const wrappedDeps = { ...deps, pieceValue: wrapPieceValue(deps.pieceValue) };
  const board = state.board;
  const level =
    difficulty ||
    (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
      ? globalThis.AIDifficulty.getLevel()
      : "normal");

  const cap = chooseBestCapture(board, aiTeam, wrappedDeps, undefined, level);
  if (cap) return cap;
  const flip = chooseBestFlip(board, aiTeam, wrappedDeps, undefined, level);
  if (flip) return flip;
  const mv = chooseBestMove(board, aiTeam, wrappedDeps, undefined, level);
  if (mv) return mv;
  return null;
}

/**
 * Accept either a legacy `pieceValue(rank)` or a richer
 * `pieceValue(card, otherCard?, role?)` and always return the latter shape
 * for the helpers above.
 */
function wrapPieceValue(fn) {
  if (typeof fn !== "function") {
    return function () {
      return 0;
    };
  }
  return function (card, otherCard, role) {
    if (!card) return 0;
    // Legacy callers: receive only rank
    if (fn.length <= 1) {
      return fn(card.rank);
    }
    return fn(card, otherCard, role);
  };
}

/**
 * Manhattan-distance reduction toward the nearest enemy face-up piece.
 * Positive = moving closer, negative = moving away, 0 = no enemy or unchanged.
 */
function nearestEnemyDelta(board, fromX, fromY, to, ownTeam, size) {
  const N = size || board.length;
  let bestBefore = Infinity;
  let bestAfter = Infinity;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const c = board[y][x];
      if (!c || !c.faceUp || c.team === ownTeam) continue;
      const dBefore = Math.abs(x - fromX) + Math.abs(y - fromY);
      const dAfter = Math.abs(x - to.x) + Math.abs(y - to.y);
      if (dBefore < bestBefore) bestBefore = dBefore;
      if (dAfter < bestAfter) bestAfter = dAfter;
    }
  }
  if (!Number.isFinite(bestBefore) || !Number.isFinite(bestAfter)) return 0;
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
    // Stalemate tracking (anti-deadlock): consecutive non-capture turns and
    // position repetition counter. See isStalemateDraw / recordNonCaptureAction
    // / recordCaptureAction.
    noCaptureActions: 0,
    positionHistory: {},
  };
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DIRECTIONS: DIRECTIONS,
    STALEMATE_NO_CAPTURE_LIMIT: STALEMATE_NO_CAPTURE_LIMIT,
    POSITION_REPETITION_LIMIT: POSITION_REPETITION_LIMIT,
    hashPosition: hashPosition,
    recordNonCaptureAction: recordNonCaptureAction,
    recordCaptureAction: recordCaptureAction,
    isStalemateDraw: isStalemateDraw,
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
    chooseBestCapture: chooseBestCapture,
    chooseBestFlip: chooseBestFlip,
    chooseBestMove: chooseBestMove,
    wrapPieceValue: wrapPieceValue,
  };
}
