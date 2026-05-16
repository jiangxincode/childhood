// ============================================================
// Cat Catches Mouse - Game Core Logic
// ============================================================

// All piece names (shared by red/blue, sorted by rank, lower value = stronger)
const PIECE_NAMES = ['大黄猫', '小花猫', '大灰鼠', '米老鼠', '白老鼠', '偷米鼠', '大头鼠', '油滑鼠'];

// Rank mapping: piece name -> rank value (0=strongest, 7=weakest)
const RANK_MAP = {
  '大黄猫': 0, '小花猫': 1, '大灰鼠': 2, '米老鼠': 3,
  '白老鼠': 4, '偷米鼠': 5, '大头鼠': 6, '油滑鼠': 7
};

/**
 * Get piece image path
 * @param {string} team - team 'red' | 'blue'
 * @param {string} name - piece name e.g. '大黄猫', '油滑鼠'
 * @returns {string} image path e.g. 'images/红-大黄猫.png'
 */
function getImagePath(team, name) {
  const prefix = team === 'red' ? '红' : '蓝';
  return `images/${prefix}-${name}.png`;
}

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
 * Check if coordinates are within board range（4×4）
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x <= 3 && y >= 0 && y <= 3;
}

// Four adjacent direction offsets
const DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 }
];

/**
 * Check if attacker piece can capture defender piece
 * Rules (no reversal, pure rank comparison):
 * 1. Same team cannot capture
 * 2. attacker.rank <= defender.rank -> can capture (includes same-rank mutual destruction)
 * 3. attacker.rank > defender.rank -> cannot capture
 * @param {Object} attacker - attacker piece { name, team, rank, faceUp }
 * @param {Object} defender - defender piece { name, team, rank, faceUp }
 * @returns {boolean}
 */
function canCapture(attacker, defender) {
  if (attacker.team === defender.team) return false;
  return attacker.rank <= defender.rank;
}

/**
 * Check if capture results in mutual destruction (same rank)
 * @param {Object} attacker - attacker piece
 * @param {Object} defender - defender piece
 * @returns {boolean}
 */
function isMutualDestruction(attacker, defender) {
  return attacker.rank === defender.rank;
}

/**
 * Create initial game state
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState}
 */
function createGameState(mode) {
  // Create 16 pieces: 8 red + 8 blue
  const cards = [];
  for (const name of PIECE_NAMES) {
    cards.push({ name, team: 'red', rank: RANK_MAP[name], faceUp: false });
  }
  for (const name of PIECE_NAMES) {
    cards.push({ name, team: 'blue', rank: RANK_MAP[name], faceUp: false });
  }

  // Fisher-Yates shuffle algorithm
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Place onto 4x4 board
  const board = [];
  for (let y = 0; y < 4; y++) {
    const row = [];
    for (let x = 0; x < 4; x++) {
      row.push(cards[y * 4 + x]);
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
    aiFirst: false
  };
}

/**
 * Get valid move targets (adjacent empty cells)
 * @param {Array} board - 4×4 board
 * @param {number} x
 * @param {number} y
 * @returns {Array<{x, y}>}
 */
function getValidMoves(board, x, y) {
  const card = board[y][x];
  if (!card) return [];
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
 * Get valid capture target list
 * @param {Array} board - 4×4 board
 * @param {number} x
 * @param {number} y
 * @param {string} team - current team 'red' | 'blue'
 * @returns {Array<{x, y}>}
 */
function getValidCaptures(board, x, y, team) {
  const card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];
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
 * Execute flip operation (modifies state in place)
 * - Flip piece, set faceUp=true
 * - First flip determines team assignment (teamAssigned)
 * - Switch currentTeam, turnCount++
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

  if (!state.teamAssigned) {
    state.teamAssigned = true;
    if (state.mode === 'pve') {
      if (state.aiFirst) {
        // AI flips first, AI gets flipped card team
        state.aiTeam = card.team;
        state.playerTeam = card.team === 'red' ? 'blue' : 'red';
      } else {
        // Player flips first, player gets flipped card team
        state.playerTeam = card.team;
        state.aiTeam = card.team === 'red' ? 'blue' : 'red';
      }
    }
    // After first flip, switch to opponent turn
    if (state.mode === 'pve') {
      const flipperTeam = state.aiFirst ? state.aiTeam : state.playerTeam;
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
 * @param {GameState} state
 * @param {{x,y}} from - start position
 * @param {{x,y}} to - target cell
 * @returns {GameState|null}
 */
function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const card = state.board[from.y][from.x];
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
 * Execute capture operation (modifies state in place)
 * - Captured piece added to corresponding capturedRed/capturedBlue
 * - Mutual destruction: attacker also added to captured list, both positions set to null
 * - Normal capture: attacker moves to defender position, original set to null
 * - Switch currentTeam, turnCount++
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
  if (!defender || !defender.faceUp || defender.team === state.currentTeam) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;
  if (!canCapture(attacker, defender)) return null;

  // Captured piece added to corresponding captured list
  if (defender.team === 'red') {
    state.capturedRed.push(defender.name);
  } else {
    state.capturedBlue.push(defender.name);
  }

  if (isMutualDestruction(attacker, defender)) {
    // Mutual destruction: attacker also added to captured list, both removed
    if (attacker.team === 'red') {
      state.capturedRed.push(attacker.name);
    } else {
      state.capturedBlue.push(attacker.name);
    }
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    // Normal capture: attacker moves to defender position
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  }

  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;
  return state;
}

/**
 * Check if a team has any legal action (flip/move/capture)
 * @param {Array} board - 4×4 board
 * @param {string} team - 'red' | 'blue'
 * @returns {boolean}
 */
function hasAnyLegalAction(board, team) {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      // Flip: any face-down card on board
      if (card && !card.faceUp) return true;
      // Move/capture: own face-up cards
      if (card && card.faceUp && card.team === team) {
        if (getValidMoves(board, x, y).length > 0) return true;
        if (getValidCaptures(board, x, y, team).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Check if game is over
 * - One side has no pieces -> opponent wins
 * - Current team has no legal actions -> current team loses
 * @param {Array} board - 4×4 board
 * @param {string} currentTeam - current team 'red' | 'blue'
 * @returns {{ended: boolean, winner: string|null}}
 */
function checkGameOver(board, currentTeam) {
  let redCount = 0;
  let blueCount = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card) {
        if (card.team === 'red') redCount++;
        else blueCount++;
      }
    }
  }
  if (redCount === 0) return { ended: true, winner: 'blue' };
  if (blueCount === 0) return { ended: true, winner: 'red' };
  if (!hasAnyLegalAction(board, currentTeam)) {
    return { ended: true, winner: currentTeam === 'red' ? 'blue' : 'red' };
  }
  return { ended: false, winner: null };
}

/**
 * AI decision: select optimal action
 * Priority:
 * 1. Capture (prefer non-mutual; then low defenderRank high-value target; then high attackerRank low-value attacker)
 * 2. Flip (random face-down card)
 * 3. Move (random legal move)
 * @param {GameState} state
 * @param {string} aiTeam - AI team 'red' | 'blue'
 * @returns {{type, from?, to?, x?, y?}|null}
 */
function aiDecide(state, aiTeam) {
  const board = state.board;

  // Priority 1: capture
  const allCaptures = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidCaptures(board, x, y, aiTeam);
      for (const t of targets) {
        const target = board[t.y][t.x];
        const mutual = isMutualDestruction(card, target);
        allCaptures.push({
          from: { x, y },
          to: t,
          defenderRank: target.rank,
          attackerRank: card.rank,
          mutual
        });
      }
    }
  }
  if (allCaptures.length > 0) {
    // Sort: prefer non-mutual, then prefer low rank (high value), then use high rank (low value attacker)
    allCaptures.sort((a, b) => {
      if (a.mutual !== b.mutual) return a.mutual ? 1 : -1;
      if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank;
      return b.attackerRank - a.attackerRank;
    });
    return { type: 'capture', from: allCaptures[0].from, to: allCaptures[0].to };
  }

  // Priority 2: flip (random)
  const faceDownCells = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card && !card.faceUp) faceDownCells.push({ x, y });
    }
  }
  if (faceDownCells.length > 0) {
    const pick = faceDownCells[Math.floor(Math.random() * faceDownCells.length)];
    return { type: 'flip', x: pick.x, y: pick.y };
  }

  // Priority 3: move (random)
  const allMoves = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidMoves(board, x, y);
      for (const t of targets) {
        allMoves.push({ from: { x, y }, to: t });
      }
    }
  }
  if (allMoves.length > 0) {
    const pick = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { type: 'move', from: pick.from, to: pick.to };
  }

  return null;
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PIECE_NAMES, RANK_MAP, DIRECTIONS,
    getImagePath, judgeRPS, inBounds,
    canCapture, isMutualDestruction,
    createGameState, getValidMoves, getValidCaptures,
    flipCard, moveCard, captureCard,
    hasAnyLegalAction, checkGameOver, aiDecide
  };
}

// ============================================================
// UI controller (browser section)
// ============================================================
if (typeof document !== 'undefined') {

  var gameState = null;

  // DOM references
  var $modeSelection = document.getElementById('mode-selection');
  var $rpsSection    = document.getElementById('rps-section');
  var $rpsPvp        = document.getElementById('rps-pvp');
  var $rpsPve        = document.getElementById('rps-pve');
  var $rpsResult     = document.getElementById('rps-result');
  var $gameArea      = document.getElementById('game-area');
  var $board         = document.getElementById('board');
  var $currentTeam   = document.getElementById('current-team');
  var $turnCount     = document.getElementById('turn-count');
  var $redRemaining  = document.getElementById('red-remaining');
  var $blueRemaining = document.getElementById('blue-remaining');
  var $capturedRed   = document.getElementById('captured-red');
  var $capturedBlue  = document.getElementById('captured-blue');
  var $message       = document.getElementById('message');
  var $gameOver      = document.getElementById('game-over');
  var $winnerText    = document.getElementById('winner-text');
  var $btnRestart    = document.getElementById('btn-restart');

  // ---- 4.1 Screen switching functions ----

  function showModeSelection() {
    $modeSelection.style.display = 'flex';
    $rpsSection.style.display = 'none';
    $gameArea.style.display = 'none';
    $gameOver.style.display = 'none';
  }

  function showRPSSelection(mode) {
    $modeSelection.style.display = 'none';
    $rpsSection.style.display = 'flex';
    $rpsResult.textContent = '';
    if (mode === 'pvp') {
      $rpsPvp.style.display = 'block';
      $rpsPve.style.display = 'none';
      rpsP1Choice = null;
      rpsP2Choice = null;
      document.getElementById('rps-p1-status').textContent = '请选择';
      document.getElementById('rps-p2-status').textContent = '请选择';
      document.querySelectorAll('#rps-pvp .btn-rps').forEach(function(b) { b.classList.remove('selected'); });
    } else {
      $rpsPvp.style.display = 'none';
      $rpsPve.style.display = 'block';
      document.querySelectorAll('#rps-pve .btn-rps').forEach(function(b) { b.classList.remove('selected'); });
    }
  }

  function showGameArea() {
    $modeSelection.style.display = 'none';
    $rpsSection.style.display = 'none';
    $gameArea.style.display = 'flex';
    $gameOver.style.display = 'none';
  }

  function showGameOverScreen(winner) {
    var winnerName = winner === 'red' ? '红方' : '蓝方';
    $winnerText.textContent = winnerName + ' 获胜！';
    $gameOver.style.display = 'flex';
  }

  // ---- Helper Functions ----

  function getCell(x, y) {
    return $board.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || '';
  }

  // ---- 4.2 Board rendering functions ----

  function renderBoard(state) {
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var cell = getCell(x, y);
        var card = state.board[y][x];
        cell.className = 'cell';
        cell.innerHTML = '';
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (!card) {
          cell.classList.add('cell-empty');
        } else if (!card.faceUp) {
          var back = document.createElement('div');
          back.className = 'cell-back';
          cell.appendChild(back);
        } else {
          cell.classList.add(card.team === 'red' ? 'cell-red' : 'cell-blue');
          var face = document.createElement('div');
          face.className = 'cell-face';
          var img = document.createElement('img');
          img.src = getImagePath(card.team, card.name);
          img.alt = card.name;
          face.appendChild(img);
          cell.appendChild(face);
        }
      }
    }
    updateStatus(state);
  }

  // ---- 4.3 Highlight functions ----

  function clearHighlights() {
    document.querySelectorAll('.cell').forEach(function(c) {
      c.classList.remove('cell-selected', 'cell-target', 'cell-capture-target', 'cell-ai-highlight');
    });
  }

  function highlightTargets(x, y, moveTargets, captureTargets) {
    clearHighlights();
    var selected = getCell(x, y);
    if (selected) selected.classList.add('cell-selected');
    for (var i = 0; i < moveTargets.length; i++) {
      var tc = getCell(moveTargets[i].x, moveTargets[i].y);
      if (tc) tc.classList.add('cell-target');
    }
    for (var j = 0; j < captureTargets.length; j++) {
      var cc = getCell(captureTargets[j].x, captureTargets[j].y);
      if (cc) cc.classList.add('cell-capture-target');
    }
  }

  // ---- 4.4 Status update functions ----

  function updateStatus(state) {
    // Current team
    if (state.currentTeam) {
      var teamName = state.currentTeam === 'red' ? '红方' : '蓝方';
      $currentTeam.textContent = teamName;
      $currentTeam.className = 'team-indicator ' + (state.currentTeam === 'red' ? 'red-text' : 'blue-text');
    } else {
      $currentTeam.textContent = '—';
      $currentTeam.className = 'team-indicator';
    }

    // Turn count
    $turnCount.textContent = state.turnCount;

    // Count red/blue pieces on board
    var redCount = 0, blueCount = 0;
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var card = state.board[y][x];
        if (card) {
          if (card.team === 'red') redCount++;
          else blueCount++;
        }
      }
    }
    $redRemaining.textContent = redCount;
    $blueRemaining.textContent = blueCount;

    // Captured cards
    $capturedRed.innerHTML = '';
    for (var i = 0; i < state.capturedRed.length; i++) {
      var nameR = state.capturedRed[i];
      var divR = document.createElement('div');
      divR.className = 'captured-card';
      var imgR = document.createElement('img');
      imgR.src = getImagePath('red', nameR);
      imgR.alt = nameR;
      divR.appendChild(imgR);
      $capturedRed.appendChild(divR);
    }

    $capturedBlue.innerHTML = '';
    for (var k = 0; k < state.capturedBlue.length; k++) {
      var nameB = state.capturedBlue[k];
      var divB = document.createElement('div');
      divB.className = 'captured-card';
      var imgB = document.createElement('img');
      imgB.src = getImagePath('blue', nameB);
      imgB.alt = nameB;
      divB.appendChild(imgB);
      $capturedBlue.appendChild(divB);
    }

    updateTeamLabels(state);
  }

  // ---- 4.11 PVE team label update ----

  function updateTeamLabels(state) {
    var $redLabel  = document.getElementById('red-label');
    var $blueLabel = document.getElementById('blue-label');
    if (state.mode === 'pve' && state.teamAssigned) {
      if (state.playerTeam === 'red') {
        $redLabel.textContent  = '玩家（红方）剩余：';
        $blueLabel.textContent = '电脑（蓝方）剩余：';
      } else {
        $redLabel.textContent  = '电脑（红方）剩余：';
        $blueLabel.textContent = '玩家（蓝方）剩余：';
      }
    } else {
      $redLabel.textContent  = '红方剩余：';
      $blueLabel.textContent = '蓝方剩余：';
    }
  }

  // ---- 4.6 Select piece ----

  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    var moves    = getValidMoves(gameState.board, x, y);
    var captures = getValidCaptures(gameState.board, x, y, gameState.currentTeam);
    highlightTargets(x, y, moves, captures);
    showMessage('', '');
  }

  // ---- 4.5 PVP Rock-Paper-Scissors button events ----

  var rpsP1Choice = null;
  var rpsP2Choice = null;

  document.querySelectorAll('#rps-pvp .btn-rps').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var player = btn.dataset.player;
      var choice = btn.dataset.choice;

      if (player === '1') {
        rpsP1Choice = choice;
        document.getElementById('rps-p1-status').textContent = '已选择';
        document.querySelectorAll('#rps-p1-buttons .btn-rps').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      } else {
        rpsP2Choice = choice;
        document.getElementById('rps-p2-status').textContent = '已选择';
        document.querySelectorAll('#rps-p2-buttons .btn-rps').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      }

      if (rpsP1Choice && rpsP2Choice) {
        handleRPSResult(rpsP1Choice, rpsP2Choice, 'pvp');
      }
    });
  });

  // ---- 4.6 PVE Rock-Paper-Scissors button events ----

  document.querySelectorAll('#rps-pve .btn-rps').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var playerChoice = btn.dataset.choice;
      var choices = ['rock', 'scissors', 'paper'];
      var aiChoice = choices[Math.floor(Math.random() * 3)];

      document.querySelectorAll('#rps-pve .btn-rps').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');

      handleRPSResult(playerChoice, aiChoice, 'pve');
    });
  });

  // ---- Rock-Paper-Scissors result handling ----

  function handleRPSResult(choice1, choice2, mode) {
    var result = judgeRPS(choice1, choice2);
    var choiceNames = { rock: '石头', scissors: '剪刀', paper: '布' };

    if (result === 0) {
      $rpsResult.textContent = '双方都出了' + choiceNames[choice1] + '，平局！重新选择';
      setTimeout(function() { showRPSSelection(mode); }, 1500);
      return;
    }

    if (mode === 'pvp') {
      var winner = result === 1 ? '玩家1' : '玩家2';
      $rpsResult.textContent = winner + ' 获胜！' + winner + '先手';
      var firstTeam = result === 1 ? 'red' : 'blue';
      setTimeout(function() { startGame(firstTeam); }, 1500);
    } else {
      // PVE
      var aiChoiceName = choiceNames[choice2];
      if (result === 1) {
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，你赢了！你先手';
        gameState.aiFirst = false;
        setTimeout(function() { startGame('red'); }, 1500);
      } else {
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，电脑赢了！电脑先手';
        gameState.aiFirst = true;
        setTimeout(function() { startGame('red'); }, 1500);
      }
    }
  }

  // ---- Start game ----

  function startGame(firstTeam) {
    showGameArea();
    gameState.currentTeam = firstTeam;
    gameState.firstPlayer = firstTeam;
    renderBoard(gameState);

    if (gameState.mode === 'pve' && gameState.aiFirst) {
      triggerAI();
    } else {
      showMessage('请翻开一张牌', '');
    }
  }

  // ---- 4.7 Mode selection button events ----

  document.getElementById('btn-pvp').addEventListener('click', function() {
    gameState = createGameState('pvp');
    showRPSSelection('pvp');
  });

  document.getElementById('btn-pve').addEventListener('click', function() {
    gameState = createGameState('pve');
    showRPSSelection('pve');
  });

  // ---- 4.12 Restart button event ----

  $btnRestart.addEventListener('click', function() {
    gameState = null;
    showModeSelection();
  });

  // ---- 4.8 Board click event handler ----

  $board.addEventListener('click', function(e) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.aiThinking) return;

    // In PVE mode, ignore player clicks during AI turn
    if (gameState.mode === 'pve' && gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) return;

    var cell = e.target.closest('.cell');
    if (!cell) return;

    var x = parseInt(cell.dataset.x);
    var y = parseInt(cell.dataset.y);
    var card = gameState.board[y][x];
    var currentTeam = gameState.currentTeam;

    // Already have selected piece
    if (gameState.selectedCell) {
      var sel = gameState.selectedCell;

      // Click same cell -> deselect
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      // Click opponent face-up card -> try capture
      if (card && card.faceUp && card.team !== currentTeam) {
        var validCaps = getValidCaptures(gameState.board, sel.x, sel.y, currentTeam);
        if (validCaps.some(function(t) { return t.x === x && t.y === y; })) {
          var capResult = captureCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
          if (capResult) {
            gameState.selectedCell = null;
            clearHighlights();
            renderBoard(gameState);
            afterAction();
            return;
          }
        }
        showMessage('无法吃掉该棋子', 'error');
        return;
      }

      // Click empty cell -> try move
      if (!card) {
        var moveResult = moveCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
        if (moveResult) {
          gameState.selectedCell = null;
          clearHighlights();
          renderBoard(gameState);
          afterAction();
          return;
        }
        // Invalid empty cell (not adjacent), deselect
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      // Click own face-up card -> reselect
      if (card && card.faceUp && card.team === currentTeam) {
        selectCard(x, y);
        return;
      }

      // Other cases deselect
      gameState.selectedCell = null;
      clearHighlights();
      return;
    }

    // No piece selected

    // Click face-down card -> flip
    if (card && !card.faceUp) {
      var flipResult = flipCard(gameState, x, y);
      if (flipResult) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
      return;
    }

    // Click own face-up card -> select
    if (card && card.faceUp && card.team === currentTeam) {
      selectCard(x, y);
      return;
    }

    // Click opponent face-up card (no selection)
    if (card && card.faceUp && card.team !== currentTeam) {
      showMessage('这不是你的棋子', 'error');
      return;
    }
  });

  // ---- 4.9 AI action flow ----

  function triggerAI() {
    gameState.aiThinking = true;
    showMessage('电脑思考中...', 'info');

    var delay = 500 + Math.random() * 1000;
    setTimeout(function() {
      var decision = aiDecide(gameState, gameState.aiTeam);
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

    if (decision.type === 'flip') {
      var cell = getCell(decision.x, decision.y);
      if (cell) cell.classList.add('cell-ai-highlight');

      flipCard(gameState, decision.x, decision.y);
      renderBoard(gameState);

      var cell2 = getCell(decision.x, decision.y);
      if (cell2) cell2.classList.add('cell-ai-highlight');

      setTimeout(function() {
        clearHighlights();
        gameState.aiThinking = false;
        afterAction();
      }, 500);

    } else if (decision.type === 'move') {
      var fromCell = getCell(decision.from.x, decision.from.y);
      if (fromCell) fromCell.classList.add('cell-ai-highlight');

      setTimeout(function() {
        moveCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        var toCell = getCell(decision.to.x, decision.to.y);
        if (toCell) toCell.classList.add('cell-ai-highlight');

        setTimeout(function() {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);

    } else if (decision.type === 'capture') {
      var fromCellCap = getCell(decision.from.x, decision.from.y);
      var toCellCap   = getCell(decision.to.x, decision.to.y);
      if (fromCellCap) fromCellCap.classList.add('cell-ai-highlight');
      if (toCellCap)   toCellCap.classList.add('cell-ai-highlight');

      setTimeout(function() {
        captureCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        var newCell = getCell(decision.to.x, decision.to.y);
        if (newCell) newCell.classList.add('cell-ai-highlight');

        setTimeout(function() {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);
    }
  }

  // ---- 4.10 Post-action processing ----

  function afterAction() {
    var result = checkGameOver(gameState.board, gameState.currentTeam);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      renderBoard(gameState);
      setTimeout(function() { showGameOverScreen(result.winner); }, 500);
      return;
    }

    if (gameState.mode === 'pve') {
      if (gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) {
        triggerAI();
      } else if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage('你的回合', '');
      }
    } else {
      // PVP
      if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        var teamName = gameState.currentTeam === 'red' ? '红方' : '蓝方';
        showMessage(teamName + '的回合', '');
      }
    }
  }

  // ---- Initialize: show mode selection ----
  showModeSelection();

}
