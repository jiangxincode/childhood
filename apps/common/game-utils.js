// ============================================================
// Game Utilities - Shared functions for all games
// ============================================================

/**
 * Rock-Paper-Scissors judgment
 * @param {string} choice1 - 'rock' | 'scissors' | 'paper'
 * @param {string} choice2 - 'rock' | 'scissors' | 'paper'
 * @returns {number} 1=first player wins, -1=second player wins, 0=draw
 */
function judgeRPS(choice1, choice2) {
  if (choice1 === choice2) return 0;
  if (
    (choice1 === "rock" && choice2 === "scissors") ||
    (choice1 === "scissors" && choice2 === "paper") ||
    (choice1 === "paper" && choice2 === "rock")
  ) {
    return 1;
  }
  return -1;
}

/**
 * Get RPS choice display name in Chinese
 * @param {string} choice - 'rock' | 'scissors' | 'paper'
 * @returns {string}
 */
function getRPSName(choice) {
  const names = { rock: "石头", scissors: "剪刀", paper: "布" };
  return names[choice] || choice;
}

/**
 * Fisher-Yates shuffle (in-place)
 * @param {Array} arr
 * @returns {Array} the same array, shuffled
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Resolve a generic display label for the current acting side.
 * Returns "你"/"对方" in online mode, "玩家"/"电脑" in PVE mode,
 * and "玩家1"/"玩家2"/... in PVP mode.
 *
 * This avoids leaking side identifiers like color/role names to the UI.
 * It is especially useful for flip-card games where the side -> role
 * mapping is not yet decided at game start.
 *
 * @param {Object} opts
 * @param {string} [opts.mode] - 'pve' | 'pvp' | 'online'
 * @param {*} [opts.currentSide] - current side identifier (e.g. 'red', 1, 'dragon')
 * @param {*} [opts.playerSide] - human side identifier (used in PVE and online)
 * @param {Array} [opts.sidesOrder] - sides in turn order starting from the first to act (used in PVP)
 * @param {boolean} [opts.assigned=true] - whether the side -> role mapping is decided
 * @param {boolean} [opts.aiFirst] - whether the AI acts first (used in PVE before assignment)
 * @returns {{text: string, role: 'unknown'|'player'|'ai'|'playerN'|'opponent'}}
 */
function getCurrentPlayerLabel(opts) {
  const mode = opts?.mode;
  const currentSide = opts ? opts.currentSide : null;
  const playerSide = opts ? opts.playerSide : null;
  const sidesOrder = opts ? opts.sidesOrder : null;
  const assigned = !opts || opts.assigned !== false;
  const aiFirst = opts ? opts.aiFirst : undefined;

  if (currentSide == null) {
    return { text: "—", role: "unknown" };
  }

  if (mode === "online") {
    const isMyTurn = currentSide === playerSide;
    return { text: isMyTurn ? "你" : "对方", role: isMyTurn ? "player" : "opponent" };
  }

  if (mode === "pve") {
    if (assigned && playerSide != null) {
      return currentSide === playerSide
        ? { text: "玩家", role: "player" }
        : { text: "电脑", role: "ai" };
    }
    // Unassigned PVE (e.g. flip games before first flip): use aiFirst flag
    if (aiFirst === true) {
      return { text: "电脑", role: "ai" };
    }
    if (aiFirst === false) {
      return { text: "玩家", role: "player" };
    }
    return { text: "—", role: "unknown" };
  }

  // PVP mode (also default when mode is missing)
  if (Array.isArray(sidesOrder) && sidesOrder.length > 0) {
    const idx = sidesOrder.indexOf(currentSide);
    if (idx >= 0) {
      return { text: "玩家" + (idx + 1), role: "playerN" };
    }
  }
  return { text: "玩家", role: "unknown" };
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = { judgeRPS, getRPSName, shuffleArray, getCurrentPlayerLabel };
}
