/* eslint-disable no-var, no-undef */
/* global DIRECTIONS:writable, chooseBestCapture:writable, chooseBestFlip:writable, chooseBestMove:writable, isStalemateDraw:writable, recordCaptureAction:writable, recordNonCaptureAction:writable */
// ============================================================
// Chinese Army Chess (Flip Chess) - Game Core Logic
// ============================================================

// ============================================================
// Shared module loading (Node.js test environment)
// ============================================================
if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var shuffleArray = _gameUtils.shuffleArray;
}
// Each binding is checked individually so that later requires of this module
// (after another game.js has already populated some globals) still get the
// game-specific helpers we need.
if (typeof require !== "undefined") {
  if (typeof DIRECTIONS === "undefined") {
    DIRECTIONS = require("../../common/card-game-core.js").DIRECTIONS;
  }
  if (typeof chooseBestCapture === "undefined") {
    chooseBestCapture = require("../../common/card-game-core.js").chooseBestCapture;
  }
  if (typeof chooseBestFlip === "undefined") {
    chooseBestFlip = require("../../common/card-game-core.js").chooseBestFlip;
  }
  if (typeof chooseBestMove === "undefined") {
    chooseBestMove = require("../../common/card-game-core.js").chooseBestMove;
  }
  if (typeof isStalemateDraw === "undefined") {
    isStalemateDraw = require("../../common/card-game-core.js").isStalemateDraw;
  }
  if (typeof recordCaptureAction === "undefined") {
    recordCaptureAction = require("../../common/card-game-core.js").recordCaptureAction;
  }
  if (typeof recordNonCaptureAction === "undefined") {
    recordNonCaptureAction = require("../../common/card-game-core.js").recordNonCaptureAction;
  }
}

// ============================================================
// Task 1.1: Constants and basic utility functions
// ============================================================

// Normal piece name list (rank 1-10, lower value = higher rank)
const NORMAL_PIECE_NAMES = [
  "司令",
  "军长",
  "师长",
  "旅长",
  "团长",
  "营长",
  "连长",
  "排长",
  "班长",
  "工兵",
];

// Special piece names
const BOMB_NAME = "炸弹";
const MINE_NAME = "地雷";
const FLAG_NAME = "军旗";

// Each side piece name list (12 cards: 10 normal + bomb + mine)
const TEAM_PIECE_NAMES = [...NORMAL_PIECE_NAMES, BOMB_NAME, MINE_NAME];

// Rank mapping: piece name -> rank value (1=highest, 10=lowest)
const RANK_MAP = {
  司令: 1,
  军长: 2,
  师长: 3,
  旅长: 4,
  团长: 5,
  营长: 6,
  连长: 7,
  排长: 8,
  班长: 9,
  工兵: 10,
};

/**
 * Whether is a normal piece (10 types that participate in rank sorting)
 * @param {string} name
 * @returns {boolean}
 */
function isNormalPiece(name) {
  return NORMAL_PIECE_NAMES.includes(name);
}

/**
 * Whether is a bomb
 * @param {string} name
 * @returns {boolean}
 */
function isBomb(name) {
  return name === BOMB_NAME;
}

/**
 * Whether is a mine
 * @param {string} name
 * @returns {boolean}
 */
function isMine(name) {
  return name === MINE_NAME;
}

/**
 * Whether is a flag
 * @param {string} name
 * @returns {boolean}
 */
function isFlag(name) {
  return name === FLAG_NAME;
}

/**
 * Whether is movable (mine and flag cannot move)
 * @param {Piece} piece
 * @returns {boolean}
 */
function isMovable(piece) {
  return !isMine(piece.name) && !isFlag(piece.name);
}

/**
 * Get piece image path
 * @param {Piece} piece
 * @returns {string}
 */
function getImagePath(piece) {
  if (isFlag(piece.name)) {
    return "images/军旗.png";
  }
  if (piece.team === "red") {
    return `images/红-${piece.name}.png`;
  }
  return `images/蓝-${piece.name}.png`;
}

/**
 * Get piece rank (only normal pieces have rank)
 * @param {string} name
 * @returns {number|null}
 */
function getRank(name) {
  return RANK_MAP[name] !== undefined ? RANK_MAP[name] : null;
}

/**
/**
 * Check if coordinates are within 5x5 board range
 * @param {number} x - 0~4
 * @param {number} y - 0~4
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x <= 4 && y >= 0 && y <= 4;
}

// ============================================================
// Task 1.2: Combat resolution function
// ============================================================

/**
 * Check if attacker can capture/collide with target piece
 * @param {Piece} attacker - attacker piece
 * @param {Piece} defender - defender piece
 * @returns {boolean}
 */
function canCapture(attacker, defender) {
  // Flag cannot be captured
  if (isFlag(defender.name)) return false;

  // Mine cannot actively attack
  if (isMine(attacker.name)) return false;

  // Flag cannot actively attack
  if (isFlag(attacker.name)) return false;

  // Same team cannot capture each other
  if (attacker.team === defender.team) return false;

  // Bomb vs any opponent piece (except flag, already excluded) -> allowed
  if (isBomb(attacker.name)) return true;

  // Any movable piece vs opponent bomb -> allowed (mutual destruction)
  if (isBomb(defender.name)) return true;

  // Engineer vs mine -> allowed (engineer survives)
  if (attacker.name === "工兵" && isMine(defender.name)) return true;

  // Other normal piece vs mine -> allowed (mutual destruction)
  if (isMine(defender.name) && isNormalPiece(attacker.name)) return true;

  // Normal pieces: higher rank (lower value) captures lower rank (higher value), or same rank
  if (isNormalPiece(attacker.name) && isNormalPiece(defender.name)) {
    return attacker.rank <= defender.rank;
  }

  return false;
}

/**
 * Resolve combat result
 * @param {Piece} attacker - attacker piece
 * @param {Piece} defender - defender piece
 * @returns {'attacker_wins' | 'mutual_destruction' | 'invalid'}
 */
function resolveCombat(attacker, defender) {
  if (!canCapture(attacker, defender)) return "invalid";

  // Bomb attacks -> mutual destruction
  if (isBomb(attacker.name)) return "mutual_destruction";

  // Defended by bomb -> mutual destruction
  if (isBomb(defender.name)) return "mutual_destruction";

  // Engineer vs mine -> engineer survives
  if (attacker.name === "工兵" && isMine(defender.name)) return "attacker_wins";

  // Other normal piece vs mine -> mutual destruction
  if (isMine(defender.name)) return "mutual_destruction";

  // Between normal pieces
  if (attacker.rank === defender.rank) return "mutual_destruction";
  if (attacker.rank < defender.rank) return "attacker_wins";

  return "invalid";
}

// ============================================================
// Task 1.3: Game state creation function
// ============================================================

/**
 * Create initial game state
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState}
 */
function createGameState(mode) {
  const pieces = [];

  // Red team 12 pieces
  for (const name of TEAM_PIECE_NAMES) {
    pieces.push({
      name,
      team: "red",
      rank: getRank(name),
      faceUp: false,
    });
  }

  // Blue team 12 pieces
  for (const name of TEAM_PIECE_NAMES) {
    pieces.push({
      name,
      team: "blue",
      rank: getRank(name),
      faceUp: false,
    });
  }

  // 1 neutral flag
  pieces.push({
    name: FLAG_NAME,
    team: "neutral",
    rank: null,
    faceUp: false,
  });

  shuffleArray(pieces);

  // Place onto 5x5 board board[y][x]
  const board = [];
  for (let y = 0; y < 5; y++) {
    const row = [];
    for (let x = 0; x < 5; x++) {
      row.push(pieces[y * 5 + x]);
    }
    board.push(row);
  }

  return {
    mode,
    board,
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
    // Stalemate tracking (anti-deadlock)
    noCaptureActions: 0,
    positionHistory: {},
  };
}

// ============================================================
// Task 1.4: Piece operation functions
// ============================================================

/**
 * Get smallest normal piece alive on field for a team (highest rank value normal piece)
 * @param {Board} board
 * @param {string} team - 'red' | 'blue'
 * @returns {Piece|null}
 */
function getLowestNormalPiece(board, team) {
  let lowest = null;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== team) continue;
      if (!isNormalPiece(piece.name)) continue;
      if (lowest === null || piece.rank > lowest.rank) {
        lowest = piece;
      }
    }
  }
  return lowest;
}

/**
 * Check if specified piece can capture flag
 * @param {Board} board
 * @param {number} x
 * @param {number} y
 * @param {string} team
 * @returns {{canCapture: boolean, flagX: number, flagY: number}|null}
 */
function canCaptureFlag(board, x, y, team) {
  const piece = board[y][x];
  if (!piece || !piece.faceUp) return null;
  if (piece.team !== team) return null;
  if (!isNormalPiece(piece.name)) return null;

  // Check if own smallest normal piece
  const lowest = getLowestNormalPiece(board, team);
  if (!lowest || piece.name !== lowest.name) return null;

  // Check if adjacent position has face-up flag
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const adj = board[ny][nx];
    if (adj && isFlag(adj.name) && adj.faceUp) {
      return { canCapture: true, flagX: nx, flagY: ny };
    }
  }

  return null;
}

/**
 * Get valid move targets (adjacent empty cells + capturable flag positions)
 * @param {Board} board
 * @param {number} x
 * @param {number} y
 * @param {string} team
 * @returns {Array<{x, y, type: 'move'|'capture_flag'}>}
 */
function getValidMoves(board, x, y, team) {
  const piece = board[y][x];
  if (!piece || !piece.faceUp || piece.team !== team) return [];
  if (!isMovable(piece)) return [];

  const moves = [];

  // Check if can capture flag
  const flagCapture = canCaptureFlag(board, x, y, team);

  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: "move" });
    } else if (target && isFlag(target.name) && target.faceUp) {
      // Flag position: only add when can capture flag
      if (flagCapture && flagCapture.flagX === nx && flagCapture.flagY === ny) {
        moves.push({ x: nx, y: ny, type: "capture_flag" });
      }
    }
  }

  return moves;
}

/**
 * Get valid capture targets
 * @param {Board} board
 * @param {number} x
 * @param {number} y
 * @param {string} team
 * @returns {Array<{x, y}>}
 */
function getValidCaptures(board, x, y, team) {
  const piece = board[y][x];
  if (!piece || !piece.faceUp || piece.team !== team) return [];

  const captures = [];
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const target = board[ny][nx];
    if (!target || !target.faceUp) continue;
    if (target.team === team) continue;
    if (isFlag(target.name)) continue; // Flag cannot be captured by captureCard
    if (!canCapture(piece, target)) continue;
    captures.push({ x: nx, y: ny });
  }

  return captures;
}

/**
 * Execute flip operation (modifies state in place)
 * @param {GameState} state
 * @param {number} x
 * @param {number} y
 * @returns {GameState|null}
 */
function flipCard(state, x, y) {
  if (!inBounds(x, y)) return null;
  const card = state.board[y][x];
  if (!card || card.faceUp) return null;

  card.faceUp = true;

  // If flipped card is flag, do not assign team
  if (isFlag(card.name)) {
    state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
    state.turnCount++;
    recordNonCaptureAction(state);
    return state;
  }

  // If flipped card is not flag and team not assigned
  if (!state.teamAssigned) {
    if (state.mode === "pve") {
      if (state.aiFirst) {
        // AI flip: aiTeam = card.team, playerTeam = other side
        state.aiTeam = card.team;
        state.playerTeam = card.team === "red" ? "blue" : "red";
      } else {
        // Player flip: playerTeam = card.team, aiTeam = other side
        state.playerTeam = card.team;
        state.aiTeam = card.team === "red" ? "blue" : "red";
      }
    }
    // PVP mode does not need to set playerTeam/aiTeam
    state.teamAssigned = true;
  }

  state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
  state.turnCount++;
  recordNonCaptureAction(state);
  return state;
}

/**
 * Execute move operation (modifies state in place), includes flag capture check
 * @param {GameState} state
 * @param {{x,y}} from
 * @param {{x,y}} to
 * @returns {GameState|null}
 */
function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;

  const card = state.board[from.y][from.x];
  if (!card || !card.faceUp) return null;
  if (card.team !== state.currentTeam) return null;
  if (!isMovable(card)) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;

  const target = state.board[to.y][to.x];

  // If target position is face-up flag
  if (target && isFlag(target.name) && target.faceUp) {
    const flagResult = canCaptureFlag(state.board, from.x, from.y, state.currentTeam);
    if (!flagResult) return null; // Only smallest piece can capture flag

    // Capture flag to win
    state.board[to.y][to.x] = card;
    state.board[from.y][from.x] = null;
    state.gameOver = true;
    state.winner = state.currentTeam;
    state.turnCount++;
    // Capturing the flag ends the game; treat as a capture-equivalent reset
    // (no need for further stalemate detection on this state).
    recordCaptureAction(state);
    return state;
  }

  // If target position is empty
  if (target === null) {
    state.board[to.y][to.x] = card;
    state.board[from.y][from.x] = null;
    state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
    state.turnCount++;
    recordNonCaptureAction(state);
    return state;
  }

  // Other cases (target has piece but not flag)
  return null;
}

/**
 * Execute capture operation (modifies state in place)
 * @param {GameState} state
 * @param {{x,y}} from - attacker position
 * @param {{x,y}} to - defender position
 * @returns {GameState|null}
 */
function captureCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;

  const attacker = state.board[from.y][from.x];
  const defender = state.board[to.y][to.x];

  if (!attacker || !attacker.faceUp || attacker.team !== state.currentTeam) return null;
  if (!defender || !defender.faceUp) return null;
  if (attacker.team === defender.team) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;

  if (!canCapture(attacker, defender)) return null;

  const result = resolveCombat(attacker, defender);

  if (result === "attacker_wins") {
    // Add captured piece to corresponding captured list
    if (defender.team === "red") {
      state.capturedRed.push(defender.name);
    } else {
      state.capturedBlue.push(defender.name);
    }
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  } else if (result === "mutual_destruction") {
    // Both sides removed
    if (attacker.team === "red") {
      state.capturedRed.push(attacker.name);
    } else {
      state.capturedBlue.push(attacker.name);
    }
    if (defender.team === "red") {
      state.capturedRed.push(defender.name);
    } else {
      state.capturedBlue.push(defender.name);
    }
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    return null;
  }

  state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
  state.turnCount++;
  recordCaptureAction(state);
  return state;
}

// ============================================================
// Task 1.5: Game over check and AI decision
// ============================================================

/**
 * Check if a team has any legal action (flip/move/capture)
 * @param {Board} board
 * @param {string} team - 'red' | 'blue'
 * @returns {boolean}
 */
function hasAnyLegalAction(board, team) {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      // Flip: any face-down piece on board
      if (piece && !piece.faceUp) return true;
      // Move/capture: own face-up pieces
      if (piece && piece.faceUp && piece.team === team) {
        if (getValidMoves(board, x, y, team).length > 0) return true;
        if (getValidCaptures(board, x, y, team).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Check if game is over
 * @param {GameState} state
 * @returns {{ended: boolean, winner: string|null}}
 */
function checkGameOver(state) {
  // If already won by capturing flag
  if (state.gameOver) {
    return { ended: true, winner: state.winner };
  }

  // Stalemate / repetition draw (anti-deadlock)
  if (isStalemateDraw(state)) {
    return { ended: true, winner: "draw" };
  }

  // If current team has no legal actions
  if (state.currentTeam && !hasAnyLegalAction(state.board, state.currentTeam)) {
    const opponent = state.currentTeam === "red" ? "blue" : "red";
    return { ended: true, winner: opponent };
  }

  return { ended: false, winner: null };
}

/**
 * Whether attacker-defender combat is mutual destruction.
 * Bombs and mines (vs non-engineer) trigger mutual destruction; equal-rank
 * normal collisions also do.
 * @param {Piece} attacker
 * @param {Piece} defender
 * @returns {boolean}
 */
function isMutualDestruction(attacker, defender) {
  if (!attacker || !defender) return false;
  if (resolveCombat(attacker, defender) === "mutual_destruction") return true;
  return false;
}

/**
 * Piece value used by the smart AI for scoring.
 *
 * Pieces are ranked by tactical impact, not strictly by military rank:
 * - 司令(rank 1) is irreplaceable
 * - 工兵(rank 10) gets a reversal premium because it disarms mines
 * - 炸弹 / 地雷 carry strategic value: bombs are sacrificial high-value pieces,
 *   mines are immobile but hard to clear
 *
 * Signature uses 3 args so the shared smart AI passes the full card object
 * (1-arg form would be treated as a legacy `pieceValue(rank)` callback, which
 * cannot distinguish bombs/mines/flags whose rank is null).
 *
 * @param {Piece} piece
 * @param {Piece} _other
 * @param {string} _role
 * @returns {number}
 */
function pieceValue(piece, _other, _role) {
  if (!piece) return 0;
  if (isFlag(piece.name)) return 100; // flag is the win condition
  if (isBomb(piece.name)) return 7; // bombs trade for any non-flag piece
  if (isMine(piece.name)) return 4; // mines block lanes; only engineers can clear
  if (!isNormalPiece(piece.name)) return 1;
  // Normal pieces: rank 1 (司令) is most valuable, rank 10 (工兵) is mine sweeper
  if (piece.rank === 1) return 12;
  if (piece.rank === 10) return 6; // engineer reversal premium (vs mine)
  return 11 - piece.rank; // rank 2..9 -> value 9..2
}

/**
 * AI decision for chinese-army-chess.
 *
 * Priority:
 *   1. Capture flag (game-winning move)
 *   2. Capture (smart, with counter-attack lookahead)
 *   3. Approach the (revealed) flag with our smallest normal piece - the
 *      flag-capture candidate. If we're not next to the flag yet, walk a step
 *      closer; this is the only path to victory in this game.
 *   4. Flip (avoid revealing pieces near our 司令 / 军长)
 *   5. Move (escape threats / approach prey, suicide-aware)
 *
 * @param {GameState} state
 * @param {string} aiTeam - AI team 'red' | 'blue'
 * @returns {{type, from?, to?, x?, y?}|null}
 */
function aiDecide(state, aiTeam) {
  const board = state.board;

  // Priority 1: capture flag (highest priority, game-winning move)
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
      const flagResult = canCaptureFlag(board, x, y, aiTeam);
      if (flagResult) {
        return { type: "move", from: { x, y }, to: { x: flagResult.flagX, y: flagResult.flagY } };
      }
    }
  }

  // Build deps for the shared smart helpers. The 5x5 board needs a custom
  // inBounds; getValidMoves needs to drop flag targets so smart move scoring
  // does not treat the (possibly unreachable) flag tile as a normal target.
  const deps = {
    canCapture: canCapture,
    isMutualDestruction: isMutualDestruction,
    pieceValue: pieceValue,
    inBounds: inBounds,
    getValidCaptures: function (b, x, y, team) {
      return getValidCaptures(b, x, y, team);
    },
    getValidMoves: function (b, x, y) {
      // Smart move scoring assumes empty target cells. The flag-capture branch
      // already runs above as a preempt; here we filter out flag targets so
      // simulateMove won't write onto the flag tile.
      const moves = [];
      const piece = b[y][x];
      if (!piece || !piece.faceUp) return moves;
      const list = getValidMoves(b, x, y, piece.team);
      for (const t of list) {
        if (t.type !== "capture_flag") moves.push({ x: t.x, y: t.y });
      }
      return moves;
    },
  };

  // Priority 2: capture
  const cap = chooseBestCapture(board, aiTeam, deps, 5);
  if (cap) return cap;

  // Priority 3: approach the revealed flag with our smallest normal piece.
  // This is the dominant winning condition in chinese-army-chess: legacy AI
  // wins ~96% of its games via flag capture, so the smart AI must actively
  // pursue the flag rather than just react to threats.
  const approachFlag = approachFlagMove(board, aiTeam);
  if (approachFlag) return approachFlag;

  // Priority 4: flip
  const flip = chooseBestFlip(board, aiTeam, deps, 5);
  if (flip) return flip;

  // Priority 5: move
  const mv = chooseBestMove(board, aiTeam, deps, 5);
  if (mv) return mv;

  return null;
}

/**
 * If the flag is face-up and we have our team's smallest normal piece on the
 * board, return a one-step move that strictly reduces the Manhattan distance
 * between that piece and the flag. Returns null otherwise.
 *
 * The smallest normal piece is the only one that can capture the flag, so we
 * actively walk it toward the flag. Among legal moves we pick the one whose
 * resulting cell is closest to the flag; ties broken by avoiding cells that
 * are under threat by stronger enemies.
 *
 * @param {Board} board
 * @param {string} aiTeam
 * @returns {{type:'move', from:{x,y}, to:{x,y}}|null}
 */
function approachFlagMove(board, aiTeam) {
  // Find the face-up flag
  let flagX = -1;
  let flagY = -1;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const p = board[y][x];
      if (p && isFlag(p.name) && p.faceUp) {
        flagX = x;
        flagY = y;
      }
    }
  }
  if (flagX < 0) return null;

  // Find our team's smallest normal piece (highest rank value)
  const smallest = getLowestNormalPiece(board, aiTeam);
  if (!smallest) return null;

  // Locate it on the board
  let sx = -1;
  let sy = -1;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const p = board[y][x];
      if (p && p.faceUp && p.team === aiTeam && p.name === smallest.name) {
        sx = x;
        sy = y;
      }
    }
  }
  if (sx < 0) return null;

  const currDist = Math.abs(sx - flagX) + Math.abs(sy - flagY);
  // Already adjacent - the flag-capture branch above should have handled it,
  // but keep this defensive check.
  if (currDist <= 1) return null;

  const moves = getValidMoves(board, sx, sy, aiTeam);
  let best = null;
  let bestDist = Infinity;
  let bestThreatened = true;
  for (const t of moves) {
    if (t.type !== "move") continue;
    const dist = Math.abs(t.x - flagX) + Math.abs(t.y - flagY);
    if (dist >= currDist) continue; // strictly closer only
    // Check whether the cell is currently threatened by any face-up enemy
    // strong enough to capture the smallest piece
    let threatened = false;
    for (const { dx, dy } of DIRECTIONS) {
      const nx = t.x + dx;
      const ny = t.y + dy;
      if (!inBounds(nx, ny)) continue;
      const enemy = board[ny][nx];
      if (!enemy || !enemy.faceUp || enemy.team === aiTeam) continue;
      if (canCapture(enemy, smallest)) {
        threatened = true;
        break;
      }
    }
    // Prefer non-threatened with shorter distance; among threatened cells,
    // pick the closest one (still better than wandering randomly).
    if (
      best === null ||
      (bestThreatened && !threatened) ||
      (bestThreatened === threatened && dist < bestDist)
    ) {
      best = t;
      bestDist = dist;
      bestThreatened = threatened;
    }
  }
  if (!best) return null;
  return { type: "move", from: { x: sx, y: sy }, to: { x: best.x, y: best.y } };
}

// ============================================================
// Task 1.6: Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    NORMAL_PIECE_NAMES,
    BOMB_NAME,
    MINE_NAME,
    FLAG_NAME,
    TEAM_PIECE_NAMES,
    RANK_MAP,
    isNormalPiece,
    isBomb,
    isMine,
    isFlag,
    isMovable,
    getImagePath,
    getRank,
    judgeRPS,
    inBounds,
    canCapture,
    resolveCombat,
    isMutualDestruction,
    pieceValue,
    getLowestNormalPiece,
    canCaptureFlag,
    createGameState,
    getValidMoves,
    getValidCaptures,
    flipCard,
    moveCard,
    captureCard,
    hasAnyLegalAction,
    checkGameOver,
    aiDecide,
  };
}

// ============================================================
// UI controller (browser environment only)
// Task 5.1, 5.2, 5.3
// ============================================================
if (typeof document !== "undefined") {
  let gameState = null;

  // DOM elements
  const $modeSelection = document.getElementById("mode-selection");
  const $rpsSection = document.getElementById("rps-section");
  const $rpsPvp = document.getElementById("rps-pvp");
  const $rpsPve = document.getElementById("rps-pve");
  const $rpsResult = document.getElementById("rps-result");
  const $gameArea = document.getElementById("game-area");
  const $board = document.getElementById("board");
  const $currentTeam = document.getElementById("current-team");
  const $turnCount = document.getElementById("turn-count");
  const $redRemaining = document.getElementById("red-remaining");
  const $blueRemaining = document.getElementById("blue-remaining");
  const $capturedRed = document.getElementById("captured-red");
  const $capturedBlue = document.getElementById("captured-blue");
  const $message = document.getElementById("message");
  const $gameOver = document.getElementById("game-over");
  const $winnerText = document.getElementById("winner-text");
  const $btnRestart = document.getElementById("btn-restart");

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null;
  let remoteTeam = null;
  let localIsFirstPlayer = false;

  // ============================================================
  // Task 5.1: Renderer and event handling
  // ============================================================

  function getCell(x, y) {
    return $board.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
  }

  function renderBoard(state) {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const cell = getCell(x, y);
        const piece = state.board[y][x];
        cell.className = "cell";
        cell.innerHTML = "";
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (!piece) {
          cell.classList.add("cell-empty");
        } else if (!piece.faceUp) {
          const back = document.createElement("div");
          back.className = "cell-back";
          cell.appendChild(back);
        } else {
          // Face-up
          if (piece.team === "red") {
            cell.classList.add("cell-red");
          } else if (piece.team === "blue") {
            cell.classList.add("cell-blue");
          } else {
            // neutral (flag)
            cell.classList.add("cell-neutral");
          }
          const face = document.createElement("div");
          face.className = "cell-face";
          const img = document.createElement("img");
          img.src = getImagePath(piece);
          img.alt = piece.name;
          face.appendChild(img);
          cell.appendChild(face);
        }
      }
    }
    updateStatus(state);
  }

  function updateStatus(state) {
    // Current team
    if (state.mode === "online") {
      if (!state.teamAssigned) {
        $currentTeam.textContent = localIsFirstPlayer ? "你的回合" : "对方回合";
      } else {
        $currentTeam.textContent = state.currentTeam === localTeam ? "你的回合" : "对方回合";
      }
      if (state.teamAssigned) {
        $currentTeam.className =
          "team-indicator " + (state.currentTeam === localTeam ? "red-text" : "blue-text");
      } else {
        $currentTeam.className = "team-indicator";
      }
    } else if (state.currentTeam) {
      const label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.currentTeam,
        playerSide: state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === "red" ? "blue" : "red"]
          : ["red", "blue"],
        assigned: state.teamAssigned,
        aiFirst: state.aiFirst,
      });
      $currentTeam.textContent = label.text;
      $currentTeam.className =
        "team-indicator " + (state.currentTeam === "red" ? "red-text" : "blue-text");
    } else {
      $currentTeam.textContent = "—";
      $currentTeam.className = "team-indicator";
    }

    // Turn count
    $turnCount.textContent = state.turnCount;

    // Count red/blue remaining pieces (excluding flag)
    let redCount = 0,
      blueCount = 0;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const p = state.board[y][x];
        if (p && !isFlag(p.name)) {
          if (p.team === "red") redCount++;
          else if (p.team === "blue") blueCount++;
        }
      }
    }
    $redRemaining.textContent = redCount;
    $blueRemaining.textContent = blueCount;

    // Captured piece images
    $capturedRed.innerHTML = "";
    for (const name of state.capturedRed) {
      const div = document.createElement("div");
      div.className = "captured-card";
      const img = document.createElement("img");
      img.src = getImagePath({ name: name, team: "red", rank: getRank(name), faceUp: true });
      img.alt = name;
      div.appendChild(img);
      $capturedRed.appendChild(div);
    }

    $capturedBlue.innerHTML = "";
    for (const name of state.capturedBlue) {
      const div = document.createElement("div");
      div.className = "captured-card";
      const img = document.createElement("img");
      img.src = getImagePath({ name: name, team: "blue", rank: getRank(name), faceUp: true });
      img.alt = name;
      div.appendChild(img);
      $capturedBlue.appendChild(div);
    }

    updateTeamLabels(state);
  }

  function updateTeamLabels(state) {
    const $redLabel = document.getElementById("red-label");
    const $blueLabel = document.getElementById("blue-label");
    if (state.mode === "pve" && state.teamAssigned) {
      if (state.playerTeam === "red") {
        $redLabel.textContent = "玩家（红方）剩余：";
        $blueLabel.textContent = "电脑（蓝方）剩余：";
      } else {
        $redLabel.textContent = "电脑（红方）剩余：";
        $blueLabel.textContent = "玩家（蓝方）剩余：";
      }
    } else if (state.mode === "online" && state.teamAssigned) {
      if (localTeam === "red") {
        $redLabel.textContent = "我方（红方）剩余：";
        $blueLabel.textContent = "对方（蓝方）剩余：";
      } else {
        $redLabel.textContent = "对方（红方）剩余：";
        $blueLabel.textContent = "我方（蓝方）剩余：";
      }
    } else {
      $redLabel.textContent = "红方剩余：";
      $blueLabel.textContent = "蓝方剩余：";
    }
  }

  function clearHighlights() {
    document.querySelectorAll(".cell").forEach((c) => {
      c.classList.remove(
        "cell-selected",
        "cell-target",
        "cell-capture-target",
        "cell-flag-target",
        "cell-ai-highlight"
      );
    });
  }

  function highlightTargets(x, y, moveTargets, captureTargets) {
    clearHighlights();
    const selected = getCell(x, y);
    if (selected) selected.classList.add("cell-selected");

    for (const t of moveTargets) {
      const tc = getCell(t.x, t.y);
      if (tc) {
        if (t.type === "capture_flag") {
          tc.classList.add("cell-flag-target");
        } else {
          tc.classList.add("cell-target");
        }
      }
    }

    for (const t of captureTargets) {
      const tc = getCell(t.x, t.y);
      if (tc) tc.classList.add("cell-capture-target");
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || "";
  }

  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    const currentTeam = gameState.currentTeam;
    const moves = getValidMoves(gameState.board, x, y, currentTeam);
    const captures = getValidCaptures(gameState.board, x, y, currentTeam);
    highlightTargets(x, y, moves, captures);
    showMessage("", "");
  }

  // Board click event
  $board.addEventListener("click", (e) => {
    if (!gameState || gameState.gameOver) return;
    if (gameState.aiThinking) return;
    // PVE mode and team assigned and current is AI turn: ignore
    if (
      gameState.mode === "pve" &&
      gameState.teamAssigned &&
      gameState.currentTeam === gameState.aiTeam
    )
      return;

    // In online mode, only allow click on local player's turn
    if (gameState.mode === "online") {
      if (gameState.teamAssigned && gameState.currentTeam !== localTeam) return;
      if (!gameState.teamAssigned && !localIsFirstPlayer) return;
    }

    const cell = e.target.closest(".cell");
    if (!cell) return;

    const x = Number.parseInt(cell.dataset.x);
    const y = Number.parseInt(cell.dataset.y);
    const piece = gameState.board[y][x];
    const currentTeam = gameState.currentTeam;

    // Already have selected piece
    if (gameState.selectedCell) {
      const sel = gameState.selectedCell;

      // Click same cell: deselect
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      // Click face-up flag: try to capture flag (moveCard)
      if (piece && piece.faceUp && isFlag(piece.name)) {
        const result = moveCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
        if (result) {
          gameState.selectedCell = null;
          clearHighlights();
          if (gameState.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({ a: "move", fx: sel.x, fy: sel.y, tx: x, ty: y });
          }
          renderBoard(gameState);
          afterAction();
        } else {
          showMessage("只有最小棋子才能抱军旗", "error");
        }
        return;
      }

      // Click opponent face-up piece (not flag): try capture
      if (piece && piece.faceUp && piece.team !== currentTeam && !isFlag(piece.name)) {
        const captures = getValidCaptures(gameState.board, sel.x, sel.y, currentTeam);
        const canDo = captures.some((t) => t.x === x && t.y === y);
        if (canDo) {
          const result = captureCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
          if (result) {
            gameState.selectedCell = null;
            clearHighlights();
            if (gameState.mode === "online" && networkProtocol) {
              networkProtocol.sendAction({ a: "capture", fx: sel.x, fy: sel.y, tx: x, ty: y });
            }
            renderBoard(gameState);
            afterAction();
            return;
          }
        }
        showMessage("无法吃掉该棋子", "error");
        return;
      }

      // Click empty cell: try move
      if (!piece) {
        const result = moveCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
        if (result) {
          gameState.selectedCell = null;
          clearHighlights();
          if (gameState.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({ a: "move", fx: sel.x, fy: sel.y, tx: x, ty: y });
          }
          renderBoard(gameState);
          afterAction();
          return;
        }
        showMessage("无法移动到该位置", "error");
        return;
      }

      // Click own face-up piece: reselect
      if (piece && piece.faceUp && piece.team === currentTeam) {
        selectCard(x, y);
        return;
      }

      // Other: deselect
      gameState.selectedCell = null;
      clearHighlights();
      return;
    }

    // No piece selected
    if (piece && !piece.faceUp) {
      // Click face-down piece: flip
      const result = flipCard(gameState, x, y);
      if (result) {
        clearHighlights();
        // In online mode, assign teams on first non-flag flip
        if (gameState.mode === "online" && !gameState.teamAssigned) {
          const flippedCard = gameState.board[y][x];
          if (!isFlag(flippedCard.name)) {
            localTeam = flippedCard.team;
            remoteTeam = localTeam === "red" ? "blue" : "red";
            gameState.teamAssigned = true;
          }
        }
        if (gameState.mode === "online" && networkProtocol) {
          networkProtocol.sendAction({ a: "flip", x: x, y: y });
        }
        renderBoard(gameState);
        afterAction();
      }
      return;
    }

    if (piece && piece.faceUp && isFlag(piece.name)) {
      showMessage("军旗不能被吃", "error");
      return;
    }

    if (piece && piece.faceUp && piece.team === currentTeam) {
      selectCard(x, y);
      return;
    }

    if (piece && piece.faceUp && piece.team !== currentTeam) {
      showMessage("这不是你的棋子", "error");
    }
  });

  // ============================================================
  // Task 5.2: Mode selection and Rock-Paper-Scissors flow
  // ============================================================

  function showModeSelection() {
    $modeSelection.style.display = "flex";
    $rpsSection.style.display = "none";
    $gameArea.style.display = "none";
    $gameOver.style.display = "none";
  }

  function showRPSSelection(mode) {
    $modeSelection.style.display = "none";
    $rpsSection.style.display = "flex";
    $rpsResult.textContent = "";
    if (mode === "pvp") {
      $rpsPvp.style.display = "block";
      $rpsPve.style.display = "none";
      rpsP1Choice = null;
      rpsP2Choice = null;
      document.getElementById("rps-p1-status").textContent = "请选择";
      document.getElementById("rps-p2-status").textContent = "请选择";
      document.querySelectorAll("#rps-pvp .btn-rps").forEach((b) => {
        b.classList.remove("selected");
      });
    } else {
      $rpsPvp.style.display = "none";
      $rpsPve.style.display = "block";
      document.querySelectorAll("#rps-pve .btn-rps").forEach((b) => {
        b.classList.remove("selected");
      });
    }
  }

  function showGameArea() {
    $modeSelection.style.display = "none";
    $rpsSection.style.display = "none";
    $gameArea.style.display = "flex";
    document.getElementById("rule-pve").style.display = gameState.mode === "pve" ? "block" : "none";
    $gameOver.style.display = "none";
  }

  function showGameOverScreen(winner) {
    if (winner === "draw") {
      $winnerText.textContent = "平局！";
      $gameOver.style.display = "flex";
      return;
    }
    if (gameState.mode === "online") {
      $winnerText.textContent = winner === localTeam ? "你获胜了！" : "你失败了！";
    } else {
      // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of color
      const label = getCurrentPlayerLabel({
        mode: gameState.mode,
        currentSide: winner,
        playerSide: gameState.playerTeam,
        sidesOrder: gameState.firstPlayer
          ? [gameState.firstPlayer, gameState.firstPlayer === "red" ? "blue" : "red"]
          : ["red", "blue"],
      });
      $winnerText.textContent = label.text + "获胜！";
    }
    $gameOver.style.display = "flex";
  }

  function startGame(firstTeam) {
    showGameArea();
    gameState.currentTeam = firstTeam;
    gameState.firstPlayer = firstTeam;
    renderBoard(gameState);
    if (gameState.mode === "pve" && gameState.aiFirst) {
      triggerAI();
    } else {
      showMessage("请翻开一张牌", "");
    }
  }

  let rpsP1Choice = null;
  let rpsP2Choice = null;

  function handleRPSResult(choice1, choice2, mode) {
    const result = judgeRPS(choice1, choice2);
    const choiceNames = { rock: "石头", scissors: "剪刀", paper: "布" };

    if (result === 0) {
      $rpsResult.textContent = "双方都出了" + choiceNames[choice1] + "，平局！重新选择";
      setTimeout(() => {
        showRPSSelection(mode);
      }, 1500);
      return;
    }

    if (mode === "pvp") {
      const winner = result === 1 ? "玩家1" : "玩家2";
      $rpsResult.textContent = winner + " 获胜！" + winner + "先手";
      const firstTeam = result === 1 ? "red" : "blue";
      setTimeout(() => {
        startGame(firstTeam);
      }, 1500);
    } else {
      // PVE
      const aiChoiceName = choiceNames[choice2];
      if (result === 1) {
        // Player won: player goes first
        $rpsResult.textContent = "电脑出了" + aiChoiceName + "，你赢了！你先手";
        gameState.aiFirst = false;
        setTimeout(() => {
          startGame("red");
        }, 1500);
      } else {
        // Computer won: computer goes first
        $rpsResult.textContent = "电脑出了" + aiChoiceName + "，电脑赢了！电脑先手";
        gameState.aiFirst = true;
        setTimeout(() => {
          startGame("red");
        }, 1500);
      }
    }
  }

  // PVP Rock-Paper-Scissors buttons
  document.querySelectorAll("#rps-pvp .btn-rps").forEach((btn) => {
    btn.addEventListener("click", () => {
      const player = btn.dataset.player;
      const choice = btn.dataset.choice;
      if (player === "1") {
        rpsP1Choice = choice;
        document.getElementById("rps-p1-status").textContent = "已选择";
        document.querySelectorAll("#rps-p1-buttons .btn-rps").forEach((b) => {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
      } else {
        rpsP2Choice = choice;
        document.getElementById("rps-p2-status").textContent = "已选择";
        document.querySelectorAll("#rps-p2-buttons .btn-rps").forEach((b) => {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
      }
      if (rpsP1Choice && rpsP2Choice) {
        handleRPSResult(rpsP1Choice, rpsP2Choice, "pvp");
      }
    });
  });

  // PVE Rock-Paper-Scissors buttons
  document.querySelectorAll("#rps-pve .btn-rps").forEach((btn) => {
    btn.addEventListener("click", () => {
      const playerChoice = btn.dataset.choice;
      const choices = ["rock", "scissors", "paper"];
      const aiChoice = choices[Math.floor(Math.random() * 3)];
      document.querySelectorAll("#rps-pve .btn-rps").forEach((b) => {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");
      handleRPSResult(playerChoice, aiChoice, "pve");
    });
  });

  // Mode selection buttons
  document.getElementById("btn-pvp").addEventListener("click", () => {
    gameState = createGameState("pvp");
    showRPSSelection("pvp");
  });

  document.getElementById("btn-pve").addEventListener("click", () => {
    gameState = createGameState("pve");
    showRPSSelection("pve");
  });

  // Restart button
  function restartGame() {
    if (gameState && gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    gameState = null;
    showModeSelection();
  }

  $btnRestart.addEventListener("click", () => {
    restartGame();
  });

  // ============================================================
  // Task 5.3: AI action execution and animation
  // ============================================================

  function afterAction() {
    const result = checkGameOver(gameState);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      setTimeout(() => {
        showGameOverScreen(result.winner);
      }, 500);
      return;
    }

    if (gameState.mode === "online") {
      if (!gameState.teamAssigned) {
        if (localIsFirstPlayer) {
          showMessage("请翻开一张牌", "");
        } else {
          showMessage("等待对方操作...", "info");
        }
      } else {
        showMessage(gameState.currentTeam === localTeam ? "你的回合" : "等待对方操作...", "");
      }
    } else if (gameState.mode === "pve") {
      if (gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) {
        triggerAI();
      } else if (!gameState.teamAssigned && gameState.aiFirst) {
        showMessage("请翻开一张牌", "");
      } else if (!gameState.teamAssigned) {
        showMessage("请翻开一张牌", "");
      } else {
        showMessage("你的回合", "");
      }
    } else if (!gameState.teamAssigned) {
      // PVP - show 玩家1 / 玩家2 instead of color
      showMessage("请翻开一张牌", "");
    } else {
      const sidesOrder = gameState.firstPlayer
        ? [gameState.firstPlayer, gameState.firstPlayer === "red" ? "blue" : "red"]
        : ["red", "blue"];
      const idx = sidesOrder.indexOf(gameState.currentTeam);
      const playerName = idx >= 0 ? "玩家" + (idx + 1) : "玩家";
      showMessage(playerName + "的回合", "");
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    showMessage("电脑思考中...", "info");
    const delay = 500 + Math.random() * 1000;
    setTimeout(() => {
      const decision = aiDecide(gameState, gameState.aiTeam);
      if (!decision) {
        gameState.aiThinking = false;
        afterAction();
        return;
      }
      executeAIAction(decision);
    }, delay);
  }

  function executeAIAction(decision) {
    clearHighlights();

    if (decision.type === "flip") {
      const cell = getCell(decision.x, decision.y);
      if (cell) cell.classList.add("cell-ai-highlight");

      flipCard(gameState, decision.x, decision.y);
      renderBoard(gameState);

      const cell2 = getCell(decision.x, decision.y);
      if (cell2) cell2.classList.add("cell-ai-highlight");

      setTimeout(() => {
        clearHighlights();
        gameState.aiThinking = false;
        afterAction();
      }, 500);
    } else if (decision.type === "move") {
      const fromCell = getCell(decision.from.x, decision.from.y);
      if (fromCell) fromCell.classList.add("cell-ai-highlight");

      setTimeout(() => {
        moveCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        const toCell = getCell(decision.to.x, decision.to.y);
        if (toCell) toCell.classList.add("cell-ai-highlight");

        setTimeout(() => {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    } else if (decision.type === "capture") {
      const fromCellCap = getCell(decision.from.x, decision.from.y);
      const toCellCap = getCell(decision.to.x, decision.to.y);
      if (fromCellCap) fromCellCap.classList.add("cell-ai-highlight");
      if (toCellCap) toCellCap.classList.add("cell-ai-highlight");

      setTimeout(() => {
        captureCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        const newCell = getCell(decision.to.x, decision.to.y);
        if (newCell) newCell.classList.add("cell-ai-highlight");

        setTimeout(() => {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    }
  }

  // --- Online mode functions ---
  function cleanupNetwork() {
    if (networkProtocol) {
      networkProtocol.destroy();
      networkProtocol = null;
    }
    if (networkConnection) {
      networkConnection.close();
      networkConnection = null;
    }
    if (roomUI) {
      roomUI.destroy();
      roomUI = null;
    }
    localPlayerRole = null;
    localTeam = null;
    remoteTeam = null;
    localIsFirstPlayer = false;
  }

  function setupNetworkHandlers() {
    if (!networkProtocol) return;

    networkProtocol.onAction = (actionData) => {
      applyRemoteAction(actionData);
    };

    networkProtocol.onRPSChoice = (remoteChoice) => {
      handleOnlineRPSReceived(remoteChoice);
    };

    networkProtocol.onRPSResult = (result) => {
      handleOnlineRPSResult(result);
    };

    networkProtocol.onRestart = () => {
      cleanupNetwork();
      gameState = null;
      showModeSelection();
    };

    networkProtocol.onDisconnect = () => {
      handleDisconnect();
    };
  }

  function startOnlineRPS() {
    $modeSelection.style.display = "none";
    $rpsSection.style.display = "none";
    document.getElementById("rps-online").style.display = "flex";
    document.getElementById("rps-online-status").textContent = "请选择";
    document.getElementById("rps-online-result").textContent = "";
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((b) => {
      b.classList.remove("selected");
    });
  }

  function handleOnlineRPSChoice(choice, ev) {
    if (networkProtocol) {
      networkProtocol.sendRPSChoice(choice);
    }
    document.getElementById("rps-online-status").textContent = "已选择，等待对方...";
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((b) => {
      b.classList.remove("selected");
    });
    ev.target.classList.add("selected");
  }

  let _onlineMyRPSChoice = null;
  let _onlineRemoteRPSChoice = null;

  function handleOnlineRPSReceived(remoteChoice) {
    _onlineRemoteRPSChoice = remoteChoice;
    checkOnlineRPSComplete();
  }

  function checkOnlineRPSComplete() {
    if (!_onlineMyRPSChoice || !_onlineRemoteRPSChoice) return;
    // Host resolves
    if (localPlayerRole === "host") {
      const result = judgeRPS(_onlineMyRPSChoice, _onlineRemoteRPSChoice);
      if (result === 0) {
        // Draw - restart RPS
        if (networkProtocol) {
          networkProtocol.sendRPSResult({ result: "draw" });
        }
        handleOnlineRPSResult({ result: "draw" });
      } else {
        let winnerRole;
        if (result === 1) {
          winnerRole = localPlayerRole;
        } else {
          winnerRole = localPlayerRole === "host" ? "guest" : "host";
        }
        const rpsResult = { result: "win", winner: winnerRole };
        if (networkProtocol) {
          networkProtocol.sendRPSResult(rpsResult);
        }
        handleOnlineRPSResult(rpsResult);
      }
    }
  }

  function handleOnlineRPSResult(rpsResult) {
    const $rpsOnlineResult = document.getElementById("rps-online-result");

    if (rpsResult.result === "draw") {
      $rpsOnlineResult.textContent = "平局！重新选择";
      _onlineMyRPSChoice = null;
      _onlineRemoteRPSChoice = null;
      setTimeout(() => {
        startOnlineRPS();
      }, 1500);
      return;
    }

    const winnerRole = rpsResult.winner;
    const isFirst = winnerRole === localPlayerRole;
    $rpsOnlineResult.textContent = isFirst ? "你赢了！你先手" : "你输了！对方先手";

    setTimeout(() => {
      document.getElementById("rps-online").style.display = "none";
      startOnlineGame(isFirst ? "host" : "guest");
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");
    localIsFirstPlayer = firstPlayerRole === localPlayerRole;
    gameState.currentTeam = "red";
    showGameArea();
    renderBoard(gameState);

    if (localIsFirstPlayer) {
      showMessage("请翻开一张牌", "");
    } else {
      showMessage("等待对方操作...", "info");
    }
  }

  function applyRemoteAction(actionData) {
    if (!gameState || gameState.gameOver) return;

    if (actionData.a === "flip") {
      const flipResult = flipCard(gameState, actionData.x, actionData.y);
      if (flipResult) {
        // Assign teams on first non-flag flip
        if (!gameState.teamAssigned) {
          const flippedCard = gameState.board[actionData.y][actionData.x];
          if (!isFlag(flippedCard.name)) {
            remoteTeam = flippedCard.team;
            localTeam = remoteTeam === "red" ? "blue" : "red";
            gameState.teamAssigned = true;
          }
        }
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
    } else if (actionData.a === "move") {
      const moveResult = moveCard(
        gameState,
        { x: actionData.fx, y: actionData.fy },
        { x: actionData.tx, y: actionData.ty }
      );
      if (moveResult) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
    } else if (actionData.a === "capture") {
      const captureResult = captureCard(
        gameState,
        { x: actionData.fx, y: actionData.fy },
        { x: actionData.tx, y: actionData.ty }
      );
      if (captureResult) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
    }
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      showMessage("对方已断开连接，你获胜！", "success");
      $winnerText.textContent = "对方已断开连接，你获胜！";
      $gameOver.style.display = "flex";
    }
  }

  // --- Online mode button ---
  document.getElementById("btn-online").addEventListener("click", () => {
    if (!RoomUI.isSupported()) {
      alert("当前浏览器不支持联网对战");
      return;
    }
    cleanupNetwork();
    roomUI = new RoomUI(document.body, {
      gameName: "军师旅团营",
      onConnectionEstablished: (connection, protocol, role) => {
        networkConnection = connection;
        networkProtocol = protocol;
        localPlayerRole = role;
        setupNetworkHandlers();
        startOnlineRPS();
      },
    });
    roomUI.show();
  });

  // --- Online RPS buttons ---
  document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      _onlineMyRPSChoice = btn.dataset.choice;
      handleOnlineRPSChoice(btn.dataset.choice, ev);
    });
  });

  // Initialize
  showModeSelection();
}
