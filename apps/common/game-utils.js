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
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'scissors' && choice2 === 'paper') ||
    (choice1 === 'paper' && choice2 === 'rock')
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
  var names = { 'rock': '石头', 'scissors': '剪刀', 'paper': '布' };
  return names[choice] || choice;
}

/**
 * Fisher-Yates shuffle (in-place)
 * @param {Array} arr
 * @returns {Array} the same array, shuffled
 */
function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { judgeRPS, getRPSName, shuffleArray };
}
