/* eslint-disable no-var */
/* global DIRECTIONS:writable, inBounds:writable, flipCard:writable, moveCard:writable, createBaseState:writable, chooseBestCapture:writable, chooseBestFlip:writable, chooseBestMove:writable, isStalemateDraw:writable, recordCaptureAction:writable, recordNonCaptureAction:writable */
// ============================================================
// Knife Kills Chicken (Carry Weapon Version) - Game Core Logic
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
  const _core = require("../../common/card-game-core.js");
  if (typeof DIRECTIONS === "undefined") DIRECTIONS = _core.DIRECTIONS;
  if (typeof inBounds === "undefined") inBounds = _core.inBounds;
  if (typeof flipCard === "undefined") flipCard = _core.flipCard;
  if (typeof moveCard === "undefined") moveCard = _core.moveCard;
  if (typeof createBaseState === "undefined") createBaseState = _core.createBaseState;
  if (typeof chooseBestCapture === "undefined") chooseBestCapture = _core.chooseBestCapture;
  if (typeof chooseBestFlip === "undefined") chooseBestFlip = _core.chooseBestFlip;
  if (typeof chooseBestMove === "undefined") chooseBestMove = _core.chooseBestMove;
  if (typeof isStalemateDraw === "undefined") isStalemateDraw = _core.isStalemateDraw;
  if (typeof recordCaptureAction === "undefined") recordCaptureAction = _core.recordCaptureAction;
  if (typeof recordNonCaptureAction === "undefined")
    recordNonCaptureAction = _core.recordNonCaptureAction;
}

// 8 roles
const ROLES = ["马蜂", "癞痢", "枪", "老虎", "人", "刀", "鸡", "火箭"];

// Basic dominance table: key dominates roles in value
// Note: human dominates chicken with knife (conditional), scalper dominates tiger with spear (conditional)
// Knife and spear themselves cannot capture any role
const BASE_DOMINANCE = {
  马蜂: ["癞痢"],
  老虎: ["人"],
  鸡: ["马蜂"],
  火箭: ["马蜂", "癞痢", "枪", "老虎", "人", "刀", "鸡"],
};

// Role name -> image filename prefix mapping
const IMAGE_MAP = {
  马蜂: "胡蜂",
  癞痢: "癞痢",
  枪: "洋枪",
  老虎: "老虎",
  人: "人",
  刀: "刀",
  鸡: "鸡",
  火箭: "火箭",
};

/**
 * Get role image path
 * @param {string} role - role name
 * @param {string} team - team 'red' | 'blue'
 * @returns {string} image path
 */
function getImagePath(role, team) {
  // Special handling: red "human" uses "human-human.png"
  if (role === "人" && team === "red") {
    return "images/人-人.png";
  }
  const prefix = IMAGE_MAP[role];
  const color = team === "red" ? "红" : "蓝";
  return `images/${prefix}-${color}.png`;
}

/**
 * Check if attacker card dominates defender card
 * Need to consider carry weapon state:
 * - Knife and spear themselves cannot capture any role
 * - Basic dominance: check BASE_DOMINANCE table
 * - Knife carrier(carrying knife) dominates chicken, unarmed human cannot capture chicken
 * - Spear carrier(carrying spear) dominates tiger, unarmed scalper cannot capture tiger
 * - Rocket dominates all other roles (mutual destruction handled in captureCard)
 * @param {Card} attackerCard - attacker card object (needs role and carrying properties)
 * @param {Card} defenderCard - defender card object
 * @returns {boolean} whether dominates
 */
function canCapture(attackerCard, defenderCard) {
  const attRole = attackerCard.role;
  const defRole = defenderCard.role;

  // 1. Knife and spear themselves cannot capture any role
  if (attRole === "刀" || attRole === "枪") return false;

  // 2. Basic dominance: check BASE_DOMINANCE table
  if (Array.isArray(BASE_DOMINANCE[attRole]) && BASE_DOMINANCE[attRole].includes(defRole)) {
    return true;
  }

  // 3. Knife carrier dominates chicken
  if (attRole === "人" && attackerCard.carrying === "刀" && defRole === "鸡") {
    return true;
  }

  // 4. Spear carrier dominates tiger
  if (attRole === "癞痢" && attackerCard.carrying === "枪" && defRole === "老虎") {
    return true;
  }

  // 5. Other cases do not dominate
  return false;
}

/**
 * Create initial game state
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState} initial state
 */
function createGameState(mode) {
  const state = createBaseState(mode);

  // Generate 16 cards: 8 red + 8 blue, one of each role per side
  const cards = [];
  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i];
    cards.push({ role: role, team: "red", faceUp: false, carrying: null });
    cards.push({ role: role, team: "blue", faceUp: false, carrying: null });
  }

  // Fisher-Yates shuffle
  shuffleArray(cards);

  // Place onto 4x4 board
  const board = [];
  for (let y = 0; y < 4; y++) {
    const row = [];
    for (let x = 0; x < 4; x++) {
      row.push(cards[y * 4 + x]);
    }
    board.push(row);
  }

  state.board = board;
  return state;
}

/**
 * Get all valid move targets for a piece (empty cells with Manhattan distance 1)
 * Knife and spear cannot move when not carried
 * @param {(Card|null)[][]} board - board state
 * @param {number} x - piece x coordinate
 * @param {number} y - piece y coordinate
 * @returns {Array<{x: number, y: number}>} valid move target list
 */
function getValidMoves(board, x, y) {
  const card = board[y][x];
  if (!card) return [];
  // Knife and spear cannot move when not carried
  if (card.role === "刀" || card.role === "枪") return [];

  const moves = [];
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(nx, ny) && board[ny][nx] === null) {
      moves.push({ x: nx, y: ny });
    }
  }
  return moves;
}

/**
 * Get all valid capture targets for a piece
 * Knife and spear themselves cannot capture any role
 * @param {(Card|null)[][]} board - board state
 * @param {number} x - piece x coordinate
 * @param {number} y - piece y coordinate
 * @param {string} team - current team 'red' | 'blue'
 * @returns {Array<{x: number, y: number}>} valid capture target list
 */
function getValidCaptures(board, x, y, team) {
  const card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];
  // Knife and spear themselves cannot capture any role
  if (card.role === "刀" || card.role === "枪") return [];

  const captures = [];
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const target = board[ny][nx];
    if (!target || !target.faceUp || target.team === team) continue;
    if (!canCapture(card, target)) continue;
    captures.push({ x: nx, y: ny });
  }
  return captures;
}

/**
 * Get all valid carry weapon targets for a piece
 * Human can carry own knife, scalper can carry own spear
 * @param {(Card|null)[][]} board - board state
 * @param {number} x - piece x coordinate
 * @param {number} y - piece y coordinate
 * @param {string} team - current team
 * @returns {Array<{x: number, y: number}>} valid carry weapon target list
 */
function getCarryTargets(board, x, y, team) {
  const card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];

  // Only human can carry knife, only scalper can carry spear
  let weaponRole;
  if (card.role === "人") weaponRole = "刀";
  else if (card.role === "癞痢") weaponRole = "枪";
  else return [];

  // If already carrying, can't carry again
  if (card.carrying) return [];

  const targets = [];
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const target = board[ny][nx];
    // Target must be the matching weapon, same team, face up
    if (target && target.faceUp && target.team === team && target.role === weaponRole) {
      targets.push({ x: nx, y: ny });
    }
  }
  return targets;
}

/**
 * Execute capture operation
 * @param {GameState} state - current state (modified in place)
 * @param {{x: number, y: number}} from - attacker position
 * @param {{x: number, y: number}} to - defender position
 * @returns {GameState|null} modified state, null on invalid operation
 */
function captureCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const attacker = state.board[from.y][from.x];
  const defender = state.board[to.y][to.x];
  // Attacker must exist, face-up, belong to current team
  if (!attacker || !attacker.faceUp || attacker.team !== state.currentTeam) return null;
  // Defender must exist, face-up, belong to opponent
  if (!defender || !defender.faceUp || defender.team === state.currentTeam) return null;
  // Manhattan distance must be 1
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;
  // Must satisfy dominance relationship
  if (!canCapture(attacker, defender)) return null;

  // Captured role added to corresponding team captured list
  const defenderCapturedList = defender.team === "red" ? "capturedRed" : "capturedBlue";
  state[defenderCapturedList].push(defender.role);
  // If captured side is carrying weapon, weapon also added to captured list
  if (defender.carrying) {
    state[defenderCapturedList].push(defender.carrying);
  }

  // Rocket capture results in mutual destruction
  if (attacker.role === "火箭") {
    // Rocket itself also added to captured list
    const attackerCapturedList = attacker.team === "red" ? "capturedRed" : "capturedBlue";
    state[attackerCapturedList].push("火箭");
    // Both positions become empty
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    // Normal capture: attacker moves to defender position, original cleared
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  }

  // Switch current team
  state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
  state.turnCount++;
  recordCaptureAction(state);

  return state;
}

/**
 * Execute carry weapon operation
 * Human moves to own knife position to merge, scalper moves to own spear position to merge
 * @param {GameState} state - current state (modified in place)
 * @param {{x: number, y: number}} from - human/scalper position
 * @param {{x: number, y: number}} to - knife/spear position
 * @returns {GameState|null} modified state, null on invalid operation
 */
function carryWeapon(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const carrier = state.board[from.y][from.x];
  const weapon = state.board[to.y][to.x];
  // Carrier must exist, face-up, belong to current team
  if (!carrier || !carrier.faceUp || carrier.team !== state.currentTeam) return null;
  // Weapon must exist, face-up, same team
  if (!weapon || !weapon.faceUp || weapon.team !== carrier.team) return null;
  // Manhattan distance must be 1
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;
  // Cannot carry when already carrying weapon
  if (carrier.carrying) return null;
  // Verify role-weapon match: human carries knife, scalper carries spear
  if (carrier.role === "人" && weapon.role === "刀") {
    carrier.carrying = "刀";
  } else if (carrier.role === "癞痢" && weapon.role === "枪") {
    carrier.carrying = "枪";
  } else {
    return null;
  }
  // Carrier moves to weapon position, original becomes empty
  state.board[to.y][to.x] = carrier;
  state.board[from.y][from.x] = null;
  // Switch current team
  state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
  state.turnCount++;
  recordNonCaptureAction(state);
  return state;
}

/**
 * Check if current player has any legal action
 * @param {(Card|null)[][]} board - board state
 * @param {string} team - current team
 * @returns {boolean} whether has legal actions
 */
function hasAnyLegalAction(board, team) {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      // Flip: any face-down card on board
      if (card && !card.faceUp) return true;

      // Move/capture/carry weapon: own face-up cards
      if (card && card.faceUp && card.team === team) {
        if (getValidMoves(board, x, y).length > 0) return true;
        if (getValidCaptures(board, x, y, team).length > 0) return true;
        if (getCarryTargets(board, x, y, team).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Check if game is over
 * @param {(Card|null)[][]} board - board state
 * @param {string} currentTeam - current team
 * @param {Object} [state] - optional full game state for stalemate detection
 * @returns {{ended: boolean, winner: string|null}} game over status
 */
function checkGameOver(board, currentTeam, state) {
  if (state && isStalemateDraw(state)) {
    return { ended: true, winner: "draw" };
  }
  let redCount = 0;
  let blueCount = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card) {
        if (card.team === "red") redCount++;
        else blueCount++;
      }
    }
  }

  // Both sides have no cards (mutual destruction wiped out remaining pieces) -> draw
  if (redCount === 0 && blueCount === 0) return { ended: true, winner: "draw" };
  // One side has no cards -> that side loses
  if (redCount === 0) return { ended: true, winner: "blue" };
  if (blueCount === 0) return { ended: true, winner: "red" };

  // Current team has no legal actions -> current team loses
  if (!hasAnyLegalAction(board, currentTeam)) {
    return { ended: true, winner: currentTeam === "red" ? "blue" : "red" };
  }

  return { ended: false, winner: null };
}

/**
 * Whether attacker-defender combat is mutual destruction.
 * Only the rocket triggers mutual destruction in this game (it always blows up).
 * @param {Card} attacker
 * @param {Card} defender
 * @returns {boolean}
 */
function isMutualDestruction(attacker, defender) {
  // Rocket sacrifices itself when it captures
  return attacker && attacker.role === "火箭" && defender;
}

/**
 * Piece value for AI scoring. Considers carry-weapon upgrades.
 *
 * Base scores reflect a unit's offensive reach in this game's cyclic
 * dominance graph (rocket is the strongest tactical asset; chicken / human
 * are mid-tier; tools alone are inert).
 *
 * Signature uses 3 args so the shared smart AI passes the full card object
 * (1-arg form would be treated as a legacy `pieceValue(rank)` callback).
 *
 * @param {Card} card
 * @param {Card} _other
 * @param {string} _role
 * @returns {number}
 */
function pieceValue(card, _other, _role) {
  if (!card) return 0;
  switch (card.role) {
    case "火箭":
      return 12; // most decisive piece
    case "鸡":
      return 7; // beats wasp + base for knife synergy
    case "马蜂":
      return 6; // beats scaly
    case "老虎":
      return 6; // beats human
    case "人":
      // Carrying knife unlocks attacking chicken -> upgrade
      return card.carrying === "刀" ? 8 : 5;
    case "癞痢":
      // Carrying spear unlocks attacking tiger -> upgrade
      return card.carrying === "枪" ? 8 : 4;
    case "刀":
    case "枪":
      // Standalone weapons cannot move or attack -> low intrinsic value,
      // but high "potential" once an ally walks over.
      return 3;
    default:
      return 1;
  }
}

/**
 * AI decision: smart one-step lookahead.
 *
 * Priority (matches original AI but with smarter scoring at every step):
 *   1. capture - best score, counter-attack risk aware
 *   2. carry weapon - human/scalper grabs own knife/spear if it unlocks new captures
 *   3. flip - face-down cell that minimises risk
 *   4. move - escape threats, approach prey
 *
 * @param {GameState} state - current game state
 * @param {string} aiTeam - AI team
 * @returns {{type: string, from?, to?, x?, y?}|null}
 */
function aiDecide(state, aiTeam) {
  const board = state.board;
  const deps = {
    canCapture: canCapture,
    isMutualDestruction: isMutualDestruction,
    pieceValue: pieceValue,
    getValidCaptures: function (b, x, y, team) {
      return getValidCaptures(b, x, y, team);
    },
    getValidMoves: function (b, x, y) {
      return getValidMoves(b, x, y);
    },
  };

  // Priority 1: capture
  const cap = chooseBestCapture(board, aiTeam, deps);
  if (cap) return cap;

  // Priority 2: carry weapon (rank by upgrade value gain)
  const carryPick = pickBestCarry(board, aiTeam);
  if (carryPick) return carryPick;

  // Priority 3: flip
  const flip = chooseBestFlip(board, aiTeam, deps);
  if (flip) return flip;

  // Priority 4: move
  const mv = chooseBestMove(board, aiTeam, deps);
  if (mv) return mv;

  return null;
}

/**
 * Pick the best carry-weapon move. Prefers carriers that are NOT already at
 * risk and prefers picking up the weapon that unlocks the most useful capture
 * next turn (knife on a chicken-rich board, spear on a tiger-rich board).
 * @param {(Card|null)[][]} board
 * @param {string} aiTeam
 * @returns {{type: 'carry', from: {x,y}, to: {x,y}}|null}
 */
function pickBestCarry(board, aiTeam) {
  const candidates = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getCarryTargets(board, x, y, aiTeam);
      for (const t of targets) {
        candidates.push({ from: { x, y }, to: t, carrier: card });
      }
    }
  }
  if (candidates.length === 0) return null;

  // Score each candidate
  for (const c of candidates) {
    // Synergy reward: count visible enemies the upgrade would unlock
    let unlockBonus = 0;
    if (c.carrier.role === "人") {
      // Human + knife -> can hunt chicken
      unlockBonus = countVisibleEnemyRole(board, aiTeam, "鸡") * 2;
    } else if (c.carrier.role === "癞痢") {
      // Scalper + spear -> can hunt tiger
      unlockBonus = countVisibleEnemyRole(board, aiTeam, "老虎") * 2;
    }
    // Penalty if carrier is currently safe but the destination is threatened
    const futureBoard = [];
    for (let y = 0; y < 4; y++) futureBoard.push(board[y].slice());
    futureBoard[c.to.y][c.to.x] = c.carrier;
    futureBoard[c.from.y][c.from.x] = null;
    const futureThreatened = isThreatened(futureBoard, c.to.x, c.to.y, aiTeam);
    c.score = unlockBonus + (futureThreatened ? -3 : 0);
  }
  candidates.sort((a, b) => b.score - a.score);
  return { type: "carry", from: candidates[0].from, to: candidates[0].to };
}

function countVisibleEnemyRole(board, aiTeam, role) {
  let n = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const c = board[y][x];
      if (c && c.faceUp && c.team !== aiTeam && c.role === role) n++;
    }
  }
  return n;
}

function isThreatened(board, x, y, ownTeam) {
  const me = board[y][x];
  if (!me || !me.faceUp) return false;
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const enemy = board[ny][nx];
    if (!enemy || !enemy.faceUp || enemy.team === ownTeam) continue;
    if (canCapture(enemy, me)) return true;
  }
  return false;
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ROLES,
    BASE_DOMINANCE,
    IMAGE_MAP,
    getImagePath,
    judgeRPS,
    canCapture,
    isMutualDestruction,
    pieceValue,
    createGameState,
    getValidMoves,
    getValidCaptures,
    getCarryTargets,
    flipCard,
    moveCard,
    captureCard,
    carryWeapon,
    hasAnyLegalAction,
    checkGameOver,
    aiDecide,
  };
}

// ============================================================
// UI controller (runs only in browser environment)
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

  // --- Renderer functions ---

  function getCell(x, y) {
    return $board.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
  }

  function renderBoard(state) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = getCell(x, y);
        const card = state.board[y][x];
        cell.className = "cell";
        cell.innerHTML = "";
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (!card) {
          cell.classList.add("cell-empty");
        } else if (!card.faceUp) {
          const back = document.createElement("div");
          back.className = "cell-back";
          cell.appendChild(back);
        } else {
          cell.classList.add(card.team === "red" ? "cell-red" : "cell-blue");

          if (card.carrying) {
            // Knife carrier/spear carrier - two-layer overlapping cards
            cell.classList.add("cell-carry", "cell-carry-glow");
            const bottom = document.createElement("div");
            bottom.className = "carry-bottom";
            const bottomImg = document.createElement("img");
            bottomImg.src = getImagePath(card.role, card.team);
            bottomImg.alt = card.role;
            bottom.appendChild(bottomImg);
            cell.appendChild(bottom);

            const top = document.createElement("div");
            top.className = "carry-top";
            const topImg = document.createElement("img");
            topImg.src = getImagePath(card.carrying, card.team);
            topImg.alt = card.carrying;
            top.appendChild(topImg);
            cell.appendChild(top);
          } else {
            const face = document.createElement("div");
            face.className = "cell-face";
            const img = document.createElement("img");
            img.src = getImagePath(card.role, card.team);
            img.alt = card.role;
            face.appendChild(img);
            cell.appendChild(face);
          }
        }
      }
    }
    updateStatus(state);
  }

  function clearHighlights() {
    document.querySelectorAll(".cell").forEach((c) => {
      c.classList.remove(
        "cell-selected",
        "cell-target",
        "cell-capture-target",
        "cell-carry-target",
        "cell-ai-highlight"
      );
    });
  }

  function highlightTargets(x, y, moveTargets, captureTargets, carryTargets) {
    clearHighlights();
    const selected = getCell(x, y);
    if (selected) selected.classList.add("cell-selected");
    for (var i = 0; i < moveTargets.length; i++) {
      var tc = getCell(moveTargets[i].x, moveTargets[i].y);
      if (tc) tc.classList.add("cell-target");
    }
    for (var i = 0; i < captureTargets.length; i++) {
      var tc = getCell(captureTargets[i].x, captureTargets[i].y);
      if (tc) tc.classList.add("cell-capture-target");
    }
    for (var i = 0; i < carryTargets.length; i++) {
      var tc = getCell(carryTargets[i].x, carryTargets[i].y);
      if (tc) tc.classList.add("cell-carry-target");
    }
  }

  function updateStatus(state) {
    // Current team
    if (state.currentTeam) {
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
    }

    // Turn count
    $turnCount.textContent = state.turnCount;

    // Remaining pieces
    let redCount = 0,
      blueCount = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        if (card) {
          if (card.team === "red") redCount++;
          else blueCount++;
        }
      }
    }
    $redRemaining.textContent = redCount;
    $blueRemaining.textContent = blueCount;

    // Captured cards
    $capturedRed.innerHTML = "";
    for (const role of state.capturedRed) {
      const div = document.createElement("div");
      div.className = "captured-card";
      const img = document.createElement("img");
      img.src = getImagePath(role, "red");
      img.alt = role;
      div.appendChild(img);
      $capturedRed.appendChild(div);
    }

    $capturedBlue.innerHTML = "";
    for (const role of state.capturedBlue) {
      const div = document.createElement("div");
      div.className = "captured-card";
      const img = document.createElement("img");
      img.src = getImagePath(role, "blue");
      img.alt = role;
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
    } else {
      $redLabel.textContent = "红方剩余：";
      $blueLabel.textContent = "蓝方剩余：";
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || "";
  }

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
    // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of color
    const label = getCurrentPlayerLabel({
      mode: gameState.mode,
      currentSide: winner,
      playerSide: gameState.playerTeam,
      sidesOrder: gameState.firstPlayer
        ? [gameState.firstPlayer, gameState.firstPlayer === "red" ? "blue" : "red"]
        : ["red", "blue"],
    });
    $winnerText.textContent = label.text + " 获胜！";
    $gameOver.style.display = "flex";
  }

  // --- Rock-Paper-Scissors logic ---
  let rpsP1Choice = null;
  let rpsP2Choice = null;

  function startGame(firstTeam) {
    showGameArea();
    gameState.currentTeam = firstTeam;
    gameState.firstPlayer = firstTeam;
    renderBoard(gameState);

    // In PVE mode, if AI goes first, trigger AI flip directly
    if (gameState.mode === "pve" && gameState.aiFirst) {
      triggerAI();
    } else {
      showMessage("请翻开一张牌", "");
    }
  }

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
        // Player won RPS -> player goes first
        $rpsResult.textContent = "电脑出了" + aiChoiceName + "，你赢了！你先手";
        gameState.aiFirst = false;
        setTimeout(() => {
          startGame("red");
        }, 1500);
      } else {
        // Computer won RPS -> computer goes first
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

  // --- Mode selection ---
  document.getElementById("btn-pvp").addEventListener("click", () => {
    gameState = createGameState("pvp");
    showRPSSelection("pvp");
  });

  document.getElementById("btn-pve").addEventListener("click", () => {
    gameState = createGameState("pve");
    showRPSSelection("pve");
  });

  // --- Restart ---
  $btnRestart.addEventListener("click", () => {
    gameState = null;
    showModeSelection();
  });

  // --- Board click event handler ---
  $board.addEventListener("click", (e) => {
    if (!gameState || gameState.gameOver) return;
    if (gameState.aiThinking) return;

    // In PVE mode, only allow player to click on their turn
    if (
      gameState.mode === "pve" &&
      gameState.teamAssigned &&
      gameState.currentTeam === gameState.aiTeam
    )
      return;

    const cell = e.target.closest(".cell");
    if (!cell) return;

    const x = Number.parseInt(cell.dataset.x);
    const y = Number.parseInt(cell.dataset.y);
    const card = gameState.board[y][x];
    const currentTeam = gameState.currentTeam;

    // Already have selected piece
    if (gameState.selectedCell) {
      const sel = gameState.selectedCell;

      // Click same cell to deselect
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      const selCard = gameState.board[sel.y][sel.x];

      // Click own face-up knife/spear -> try carry weapon
      if (
        card &&
        card.faceUp &&
        card.team === currentTeam &&
        (card.role === "刀" || card.role === "枪")
      ) {
        const carryTargets = getCarryTargets(gameState.board, sel.x, sel.y, currentTeam);
        if (carryTargets.some((t) => t.x === x && t.y === y)) {
          const carryResult = carryWeapon(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
          if (carryResult) {
            gameState.selectedCell = null;
            clearHighlights();
            renderBoard(gameState);
            afterAction();
            return;
          }
        }
      }

      // Click opponent face-up card -> try capture
      if (card && card.faceUp && card.team !== currentTeam) {
        if (
          getValidCaptures(gameState.board, sel.x, sel.y, currentTeam).some(
            (t) => t.x === x && t.y === y
          )
        ) {
          const result = captureCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
          if (result) {
            gameState.selectedCell = null;
            clearHighlights();
            renderBoard(gameState);
            afterAction();
            return;
          }
        }
        // Specific illegal capture message
        if (selCard.role === "人" && card.role === "鸡") {
          showMessage("需要先扛刀才能杀鸡", "error");
        } else if (selCard.role === "癞痢" && card.role === "老虎") {
          showMessage("需要先扛枪才能杀老虎", "error");
        } else {
          showMessage("无法吃掉该棋子", "error");
        }
        return;
      }

      // Click empty cell -> try move
      if (!card) {
        const moveResult = moveCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
        if (moveResult) {
          gameState.selectedCell = null;
          clearHighlights();
          renderBoard(gameState);
          afterAction();
          return;
        }
      }

      // Click own face-up card -> reselect
      if (card && card.faceUp && card.team === currentTeam) {
        selectCard(x, y);
        return;
      }

      // Invalid target
      gameState.selectedCell = null;
      clearHighlights();
      return;
    }

    // No piece selected

    // Click face-down card -> flip
    if (card && !card.faceUp) {
      const flipResult = flipCard(gameState, x, y);
      if (flipResult) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
        return;
      }
    }

    // Click own face-up card -> select
    if (card && card.faceUp && card.team === currentTeam) {
      selectCard(x, y);
      return;
    }

    // Click opponent face-up card (no selection)
    if (card && card.faceUp && card.team !== currentTeam) {
      showMessage("这不是你的棋子", "error");
      return;
    }
  });

  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    const currentTeam = gameState.currentTeam;
    const card = gameState.board[y][x];

    // Knife and spear cannot move
    if (card && (card.role === "刀" || card.role === "枪")) {
      showMessage("刀/枪不能主动移动", "error");
      gameState.selectedCell = null;
      return;
    }

    const moves = getValidMoves(gameState.board, x, y);
    const captures = getValidCaptures(gameState.board, x, y, currentTeam);
    const carries = getCarryTargets(gameState.board, x, y, currentTeam);

    highlightTargets(x, y, moves, captures, carries);
    showMessage("", "");
  }

  function afterAction() {
    // Check game over
    const result = checkGameOver(gameState.board, gameState.currentTeam, gameState);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      renderBoard(gameState);
      setTimeout(() => {
        showGameOverScreen(result.winner);
      }, 500);
      return;
    }

    // Update message
    if (gameState.mode === "pve") {
      if (gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) {
        // Team assigned, AI turn
        triggerAI();
      } else if (!gameState.teamAssigned && gameState.aiFirst) {
        // Team not assigned but computer first (player flips after first flip)
        showMessage("请翻开一张牌", "");
      } else if (!gameState.teamAssigned) {
        showMessage("请翻开一张牌", "");
      } else {
        showMessage("你的回合", "");
      }
    } else {
      // PVP - show 玩家1 / 玩家2 instead of color
      if (!gameState.teamAssigned) {
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
  }

  // --- AI action flow ---
  function triggerAI() {
    gameState.aiThinking = true;
    showMessage("电脑思考中...", "info");

    const delay = 500 + Math.random() * 1000;
    setTimeout(() => {
      const decision = aiDecide(gameState, gameState.aiTeam);
      if (!decision) {
        // AI has no legal action -> game should be over
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
      cell.classList.add("cell-ai-highlight");

      flipCard(gameState, decision.x, decision.y);
      renderBoard(gameState);

      // Re-get cell and highlight after flip
      const cell2 = getCell(decision.x, decision.y);
      cell2.classList.add("cell-ai-highlight");

      setTimeout(() => {
        clearHighlights();
        gameState.aiThinking = false;
        afterAction();
      }, 500);
    } else if (decision.type === "move") {
      const fromCell = getCell(decision.from.x, decision.from.y);
      fromCell.classList.add("cell-ai-highlight");

      setTimeout(() => {
        moveCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        const toCell = getCell(decision.to.x, decision.to.y);
        toCell.classList.add("cell-ai-highlight");

        setTimeout(() => {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    } else if (decision.type === "capture") {
      const fromCellCap = getCell(decision.from.x, decision.from.y);
      const toCellCap = getCell(decision.to.x, decision.to.y);
      fromCellCap.classList.add("cell-ai-highlight");
      toCellCap.classList.add("cell-ai-highlight");

      setTimeout(() => {
        captureCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        const newCell = getCell(decision.to.x, decision.to.y);
        newCell.classList.add("cell-ai-highlight");

        setTimeout(() => {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    } else if (decision.type === "carry") {
      const fromCellCarry = getCell(decision.from.x, decision.from.y);
      const toCellCarry = getCell(decision.to.x, decision.to.y);
      fromCellCarry.classList.add("cell-ai-highlight");
      toCellCarry.classList.add("cell-ai-highlight");

      setTimeout(() => {
        carryWeapon(gameState, decision.from, decision.to);
        renderBoard(gameState);

        const newCellCarry = getCell(decision.to.x, decision.to.y);
        newCellCarry.classList.add("cell-ai-highlight");

        setTimeout(() => {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    }
  }

  // Initialize: show mode selection
  showModeSelection();
}
