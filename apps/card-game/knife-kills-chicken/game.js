// ============================================================
// Knife Kills Chicken (Carry Weapon Version) - Game Core Logic
// ============================================================

// ============================================================
// Shared module loading (Node.js test environment)
// ============================================================
if (typeof judgeRPS === 'undefined' && typeof require !== 'undefined') {
  var _gameUtils = require('../../common/game-utils.js');
  var judgeRPS = _gameUtils.judgeRPS;
  var shuffleArray = _gameUtils.shuffleArray;
}
if (typeof DIRECTIONS === 'undefined' && typeof require !== 'undefined') {
  var _core = require('../../common/card-game-core.js');
  var DIRECTIONS = _core.DIRECTIONS;
  var inBounds = _core.inBounds;
  var flipCard = _core.flipCard;
  var moveCard = _core.moveCard;
  var createBaseState = _core.createBaseState;
}

// 8 roles
const ROLES = ['马蜂', '癞痢', '枪', '老虎', '人', '刀', '鸡', '火箭'];

// Basic dominance table: key dominates roles in value
// Note: human dominates chicken with knife (conditional), scalper dominates tiger with spear (conditional)
// Knife and spear themselves cannot capture any role
const BASE_DOMINANCE = {
  '马蜂': ['癞痢'],
  '老虎': ['人'],
  '鸡':   ['马蜂'],
  '火箭': ['马蜂', '癞痢', '枪', '老虎', '人', '刀', '鸡']
};

// Role name -> image filename prefix mapping
const IMAGE_MAP = {
  '马蜂': '胡蜂',
  '癞痢': '癞痢',
  '枪':   '洋枪',
  '老虎': '老虎',
  '人':   '人',
  '刀':   '刀',
  '鸡':   '鸡',
  '火箭': '火箭'
};

/**
 * Get role image path
 * @param {string} role - role name
 * @param {string} team - team 'red' | 'blue'
 * @returns {string} image path
 */
function getImagePath(role, team) {
  // Special handling: red "human" uses "human-human.png"
  if (role === '人' && team === 'red') {
    return 'images/人-人.png';
  }
  const prefix = IMAGE_MAP[role];
  const color = team === 'red' ? '红' : '蓝';
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
  if (attRole === '刀' || attRole === '枪') return false;

  // 2. Basic dominance: check BASE_DOMINANCE table
  if (Array.isArray(BASE_DOMINANCE[attRole]) && BASE_DOMINANCE[attRole].includes(defRole)) {
    return true;
  }

  // 3. Knife carrier dominates chicken
  if (attRole === '人' && attackerCard.carrying === '刀' && defRole === '鸡') {
    return true;
  }

  // 4. Spear carrier dominates tiger
  if (attRole === '癞痢' && attackerCard.carrying === '枪' && defRole === '老虎') {
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
  var state = createBaseState(mode);

  // Generate 16 cards: 8 red + 8 blue, one of each role per side
  var cards = [];
  for (var i = 0; i < ROLES.length; i++) {
    var role = ROLES[i];
    cards.push({ role: role, team: 'red', faceUp: false, carrying: null });
    cards.push({ role: role, team: 'blue', faceUp: false, carrying: null });
  }

  // Fisher-Yates shuffle
  shuffleArray(cards);

  // Place onto 4x4 board
  var board = [];
  for (var y = 0; y < 4; y++) {
    var row = [];
    for (var x = 0; x < 4; x++) {
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
  if (card.role === '刀' || card.role === '枪') return [];

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
  if (card.role === '刀' || card.role === '枪') return [];

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
  let weaponRole = null;
  if (card.role === '人') weaponRole = '刀';
  else if (card.role === '癞痢') weaponRole = '枪';
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
  const defenderCapturedList = defender.team === 'red' ? 'capturedRed' : 'capturedBlue';
  state[defenderCapturedList].push(defender.role);
  // If captured side is carrying weapon, weapon also added to captured list
  if (defender.carrying) {
    state[defenderCapturedList].push(defender.carrying);
  }

  // Rocket capture results in mutual destruction
  if (attacker.role === '火箭') {
    // Rocket itself also added to captured list
    const attackerCapturedList = attacker.team === 'red' ? 'capturedRed' : 'capturedBlue';
    state[attackerCapturedList].push('火箭');
    // Both positions become empty
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    // Normal capture: attacker moves to defender position, original cleared
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  }

  // Switch current team
  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;

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
  if (carrier.role === '人' && weapon.role === '刀') {
    carrier.carrying = '刀';
  } else if (carrier.role === '癞痢' && weapon.role === '枪') {
    carrier.carrying = '枪';
  } else {
    return null;
  }
  // Carrier moves to weapon position, original becomes empty
  state.board[to.y][to.x] = carrier;
  state.board[from.y][from.x] = null;
  // Switch current team
  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;
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
 * @returns {{ended: boolean, winner: string|null}} game over status
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

  // One side has no cards -> that side loses
  if (redCount === 0) return { ended: true, winner: 'blue' };
  if (blueCount === 0) return { ended: true, winner: 'red' };

  // Current team has no legal actions -> current team loses
  if (!hasAnyLegalAction(board, currentTeam)) {
    return { ended: true, winner: currentTeam === 'red' ? 'blue' : 'red' };
  }

  return { ended: false, winner: null };
}

/**
 * AI selects optimal action
 * @param {GameState} state - current game state
 * @param {string} aiTeam - AI team
 * @returns {{type: string, from?: {x: number, y: number}, to?: {x: number, y: number}, x?: number, y?: number}|null} AI decision result
 */
function aiDecide(state, aiTeam) {
  const board = state.board;

  // Priority 1: when capture opportunity exists, prioritize capture
  const allCaptures = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidCaptures(board, x, y, aiTeam);
      for (const t of targets) {
        allCaptures.push({ from: { x, y }, to: t });
      }
    }
  }
  if (allCaptures.length > 0) {
    const pick = allCaptures[Math.floor(Math.random() * allCaptures.length)];
    return { type: 'capture', from: pick.from, to: pick.to };
  }

  // Priority 2: human/scalper adjacent to own knife/spear -> carry weapon
  const allCarries = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getCarryTargets(board, x, y, aiTeam);
      for (const t of targets) {
        allCarries.push({ from: { x, y }, to: t });
      }
    }
  }
  if (allCarries.length > 0) {
    const pick = allCarries[Math.floor(Math.random() * allCarries.length)];
    return { type: 'carry', from: pick.from, to: pick.to };
  }

  // Priority 3: when face-down cards exist, flip one randomly
  const faceDownCells = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card && !card.faceUp) {
        faceDownCells.push({ x, y });
      }
    }
  }
  if (faceDownCells.length > 0) {
    const pick = faceDownCells[Math.floor(Math.random() * faceDownCells.length)];
    return { type: 'flip', x: pick.x, y: pick.y };
  }

  // Priority 4: randomly select own piece and move to legal position
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

  // No legal actions
  return null;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ROLES,
    BASE_DOMINANCE,
    IMAGE_MAP,
    getImagePath,
    judgeRPS,
    canCapture,
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
    aiDecide
  };
}

// ============================================================
// UI controller (runs only in browser environment)
// ============================================================
if (typeof document !== 'undefined') {
  let gameState = null;

  // DOM elements
  const $modeSelection = document.getElementById('mode-selection');
  const $rpsSection = document.getElementById('rps-section');
  const $rpsPvp = document.getElementById('rps-pvp');
  const $rpsPve = document.getElementById('rps-pve');
  const $rpsResult = document.getElementById('rps-result');
  const $gameArea = document.getElementById('game-area');
  const $board = document.getElementById('board');
  const $currentTeam = document.getElementById('current-team');
  const $turnCount = document.getElementById('turn-count');
  const $redRemaining = document.getElementById('red-remaining');
  const $blueRemaining = document.getElementById('blue-remaining');
  const $capturedRed = document.getElementById('captured-red');
  const $capturedBlue = document.getElementById('captured-blue');
  const $message = document.getElementById('message');
  const $gameOver = document.getElementById('game-over');
  const $winnerText = document.getElementById('winner-text');
  const $btnRestart = document.getElementById('btn-restart');

  // --- Renderer functions ---

  function getCell(x, y) {
    return $board.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
  }

  function renderBoard(state) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = getCell(x, y);
        const card = state.board[y][x];
        cell.className = 'cell';
        cell.innerHTML = '';
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (!card) {
          cell.classList.add('cell-empty');
        } else if (!card.faceUp) {
          const back = document.createElement('div');
          back.className = 'cell-back';
          cell.appendChild(back);
        } else {
          cell.classList.add(card.team === 'red' ? 'cell-red' : 'cell-blue');

          if (card.carrying) {
            // Knife carrier/spear carrier - two-layer overlapping cards
            cell.classList.add('cell-carry', 'cell-carry-glow');
            var bottom = document.createElement('div');
            bottom.className = 'carry-bottom';
            var bottomImg = document.createElement('img');
            bottomImg.src = getImagePath(card.role, card.team);
            bottomImg.alt = card.role;
            bottom.appendChild(bottomImg);
            cell.appendChild(bottom);

            var top = document.createElement('div');
            top.className = 'carry-top';
            var topImg = document.createElement('img');
            topImg.src = getImagePath(card.carrying, card.team);
            topImg.alt = card.carrying;
            top.appendChild(topImg);
            cell.appendChild(top);
          } else {
            var face = document.createElement('div');
            face.className = 'cell-face';
            var img = document.createElement('img');
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
    document.querySelectorAll('.cell').forEach(function(c) {
      c.classList.remove('cell-selected', 'cell-target', 'cell-capture-target', 'cell-carry-target', 'cell-ai-highlight');
    });
  }

  function highlightTargets(x, y, moveTargets, captureTargets, carryTargets) {
    clearHighlights();
    var selected = getCell(x, y);
    if (selected) selected.classList.add('cell-selected');
    for (var i = 0; i < moveTargets.length; i++) {
      var tc = getCell(moveTargets[i].x, moveTargets[i].y);
      if (tc) tc.classList.add('cell-target');
    }
    for (var i = 0; i < captureTargets.length; i++) {
      var tc = getCell(captureTargets[i].x, captureTargets[i].y);
      if (tc) tc.classList.add('cell-capture-target');
    }
    for (var i = 0; i < carryTargets.length; i++) {
      var tc = getCell(carryTargets[i].x, carryTargets[i].y);
      if (tc) tc.classList.add('cell-carry-target');
    }
  }

  function updateStatus(state) {
    // Current team
    if (state.currentTeam) {
      const teamName = state.currentTeam === 'red' ? '红方' : '蓝方';
      $currentTeam.textContent = teamName;
      $currentTeam.className = 'team-indicator ' + (state.currentTeam === 'red' ? 'red-text' : 'blue-text');
    } else {
      $currentTeam.textContent = '—';
    }

    // Turn count
    $turnCount.textContent = state.turnCount;

    // Remaining pieces
    let redCount = 0, blueCount = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
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
    for (const role of state.capturedRed) {
      const div = document.createElement('div');
      div.className = 'captured-card';
      const img = document.createElement('img');
      img.src = getImagePath(role, 'red');
      img.alt = role;
      div.appendChild(img);
      $capturedRed.appendChild(div);
    }

    $capturedBlue.innerHTML = '';
    for (const role of state.capturedBlue) {
      const div = document.createElement('div');
      div.className = 'captured-card';
      const img = document.createElement('img');
      img.src = getImagePath(role, 'blue');
      img.alt = role;
      div.appendChild(img);
      $capturedBlue.appendChild(div);
    }

    updateTeamLabels(state);
  }

  function updateTeamLabels(state) {
    var $redLabel = document.getElementById('red-label');
    var $blueLabel = document.getElementById('blue-label');
    if (state.mode === 'pve' && state.teamAssigned) {
      if (state.playerTeam === 'red') {
        $redLabel.textContent = '玩家（红方）剩余：';
        $blueLabel.textContent = '电脑（蓝方）剩余：';
      } else {
        $redLabel.textContent = '电脑（红方）剩余：';
        $blueLabel.textContent = '玩家（蓝方）剩余：';
      }
    } else {
      $redLabel.textContent = '红方剩余：';
      $blueLabel.textContent = '蓝方剩余：';
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || '';
  }

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
    const winnerName = winner === 'red' ? '红方' : '蓝方';
    $winnerText.textContent = winnerName + ' 获胜！';
    $gameOver.style.display = 'flex';
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
    if (gameState.mode === 'pve' && gameState.aiFirst) {
      triggerAI();
    } else {
      showMessage('请翻开一张牌', '');
    }
  }

  function handleRPSResult(choice1, choice2, mode) {
    const result = judgeRPS(choice1, choice2);
    const choiceNames = { rock: '石头', scissors: '剪刀', paper: '布' };

    if (result === 0) {
      $rpsResult.textContent = '双方都出了' + choiceNames[choice1] + '，平局！重新选择';
      setTimeout(function() {
        showRPSSelection(mode);
      }, 1500);
      return;
    }

    if (mode === 'pvp') {
      const winner = result === 1 ? '玩家1' : '玩家2';
      $rpsResult.textContent = winner + ' 获胜！' + winner + '先手';
      const firstTeam = result === 1 ? 'red' : 'blue';
      setTimeout(function() { startGame(firstTeam); }, 1500);
    } else {
      // PVE
      const aiChoiceName = choiceNames[choice2];
      if (result === 1) {
        // Player won RPS -> player goes first
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，你赢了！你先手';
        gameState.aiFirst = false;
        setTimeout(function() { startGame('red'); }, 1500);
      } else {
        // Computer won RPS -> computer goes first
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，电脑赢了！电脑先手';
        gameState.aiFirst = true;
        setTimeout(function() { startGame('red'); }, 1500);
      }
    }
  }

  // PVP Rock-Paper-Scissors buttons
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

  // PVE Rock-Paper-Scissors buttons
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


  // --- Mode selection ---
  document.getElementById('btn-pvp').addEventListener('click', function() {
    gameState = createGameState('pvp');
    showRPSSelection('pvp');
  });

  document.getElementById('btn-pve').addEventListener('click', function() {
    gameState = createGameState('pve');
    showRPSSelection('pve');
  });

  // --- Restart ---
  $btnRestart.addEventListener('click', function() {
    gameState = null;
    showModeSelection();
  });

  // --- Board click event handler ---
  $board.addEventListener('click', function(e) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.aiThinking) return;

    // In PVE mode, only allow player to click on their turn
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

      // Click same cell to deselect
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      var selCard = gameState.board[sel.y][sel.x];

      // Click own face-up knife/spear -> try carry weapon
      if (card && card.faceUp && card.team === currentTeam && (card.role === '刀' || card.role === '枪')) {
        var carryTargets = getCarryTargets(gameState.board, sel.x, sel.y, currentTeam);
        if (carryTargets.some(function(t) { return t.x === x && t.y === y; })) {
          var carryResult = carryWeapon(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
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
        if (getValidCaptures(gameState.board, sel.x, sel.y, currentTeam).some(function(t) { return t.x === x && t.y === y; })) {
          var result = captureCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
          if (result) {
            gameState.selectedCell = null;
            clearHighlights();
            renderBoard(gameState);
            afterAction();
            return;
          }
        }
        // Specific illegal capture message
        if (selCard.role === '人' && card.role === '鸡') {
          showMessage('需要先扛刀才能杀鸡', 'error');
        } else if (selCard.role === '癞痢' && card.role === '老虎') {
          showMessage('需要先扛枪才能杀老虎', 'error');
        } else {
          showMessage('无法吃掉该棋子', 'error');
        }
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
      var flipResult = flipCard(gameState, x, y);
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
      showMessage('这不是你的棋子', 'error');
      return;
    }
  });


  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    var currentTeam = gameState.currentTeam;
    var card = gameState.board[y][x];

    // Knife and spear cannot move
    if (card && (card.role === '刀' || card.role === '枪')) {
      showMessage('刀/枪不能主动移动', 'error');
      gameState.selectedCell = null;
      return;
    }

    var moves = getValidMoves(gameState.board, x, y);
    var captures = getValidCaptures(gameState.board, x, y, currentTeam);
    var carries = getCarryTargets(gameState.board, x, y, currentTeam);

    highlightTargets(x, y, moves, captures, carries);
    showMessage('', '');
  }

  function afterAction() {
    // Check game over
    var result = checkGameOver(gameState.board, gameState.currentTeam);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      renderBoard(gameState);
      setTimeout(function() { showGameOverScreen(result.winner); }, 500);
      return;
    }

    // Update message
    if (gameState.mode === 'pve') {
      if (gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) {
        // Team assigned, AI turn
        triggerAI();
      } else if (!gameState.teamAssigned && gameState.aiFirst) {
        // Team not assigned but computer first (player flips after first flip)
        showMessage('请翻开一张牌', '');
      } else if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage('你的回合', '');
      }
    } else {
      // PVP or team not assigned
      var teamName = gameState.currentTeam === 'red' ? '红方' : '蓝方';
      if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage(teamName + '的回合', '');
      }
    }
  }


  // --- AI action flow ---
  function triggerAI() {
    gameState.aiThinking = true;
    showMessage('电脑思考中...', 'info');

    var delay = 500 + Math.random() * 1000;
    setTimeout(function() {
      var decision = aiDecide(gameState, gameState.aiTeam);
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

    if (decision.type === 'flip') {
      var cell = getCell(decision.x, decision.y);
      cell.classList.add('cell-ai-highlight');

      flipCard(gameState, decision.x, decision.y);
      renderBoard(gameState);

      // Re-get cell and highlight after flip
      var cell2 = getCell(decision.x, decision.y);
      cell2.classList.add('cell-ai-highlight');

      setTimeout(function() {
        clearHighlights();
        gameState.aiThinking = false;
        afterAction();
      }, 500);

    } else if (decision.type === 'move') {
      var fromCell = getCell(decision.from.x, decision.from.y);
      fromCell.classList.add('cell-ai-highlight');

      setTimeout(function() {
        moveCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        var toCell = getCell(decision.to.x, decision.to.y);
        toCell.classList.add('cell-ai-highlight');

        setTimeout(function() {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);

    } else if (decision.type === 'capture') {
      var fromCellCap = getCell(decision.from.x, decision.from.y);
      var toCellCap = getCell(decision.to.x, decision.to.y);
      fromCellCap.classList.add('cell-ai-highlight');
      toCellCap.classList.add('cell-ai-highlight');

      setTimeout(function() {
        captureCard(gameState, decision.from, decision.to);
        renderBoard(gameState);

        var newCell = getCell(decision.to.x, decision.to.y);
        newCell.classList.add('cell-ai-highlight');

        setTimeout(function() {
          clearHighlights();
          gameState.aiThinking = false;
          afterAction();
        }, 500);
      }, 300);

    } else if (decision.type === 'carry') {
      var fromCellCarry = getCell(decision.from.x, decision.from.y);
      var toCellCarry = getCell(decision.to.x, decision.to.y);
      fromCellCarry.classList.add('cell-ai-highlight');
      toCellCarry.classList.add('cell-ai-highlight');

      setTimeout(function() {
        carryWeapon(gameState, decision.from, decision.to);
        renderBoard(gameState);

        var newCellCarry = getCell(decision.to.x, decision.to.y);
        newCellCarry.classList.add('cell-ai-highlight');

        setTimeout(function() {
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
