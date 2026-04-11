// ============================================================
// 兽棋 - 游戏核心逻辑
// ============================================================

// 所有动物名称（红蓝共用，等级1-8，数值越小等级越高）
const ANIMAL_NAMES = ['象', '狮', '虎', '豹', '狼', '狗', '猫', '鼠'];

// 等级映射：动物名 → 等级数值（1最高，8最低）
const RANK_MAP = {
  '象': 1, '狮': 2, '虎': 3, '豹': 4,
  '狼': 5, '狗': 6, '猫': 7, '鼠': 8
};

/**
 * 获取棋子图片路径
 * @param {string} team - 阵营 'red' | 'blue'
 * @param {string} animal - 动物名称 如 '象', '鼠'
 * @returns {string} 图片路径 如 'images/红-象.png'
 */
function getImagePath(team, animal) {
  const prefix = team === 'red' ? '红' : '蓝';
  return `images/${prefix}-${animal}.png`;
}

/**
 * 获取棋子等级
 * @param {string} animal - 动物名称
 * @returns {number} 等级数值 1-8
 */
function getRank(animal) {
  return RANK_MAP[animal];
}

/**
 * 石头剪刀布判定
 * @param {string} choice1 - 'rock' | 'scissors' | 'paper'
 * @param {string} choice2 - 'rock' | 'scissors' | 'paper'
 * @returns {number} 1=第一方胜, -1=第二方胜, 0=平局
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
 * 判断坐标是否在棋盘范围内
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x <= 3 && y >= 0 && y <= 3;
}

// 四个相邻方向偏移量
const DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 }
];

/**
 * 判断攻击方棋子是否可以吃掉防守方棋子
 * 规则：
 * 1. 必须是不同阵营
 * 2. 高等级（数值小）吃低等级（数值大）
 * 3. 同级同归于尽（canCapture返回true，同归于尽在captureCard中处理）
 * 4. 逆袭：鼠(等级8)吃对方象(等级1)
 * 5. 象(等级1)不能吃对方鼠(等级8)（被逆袭克制）
 * @param {Object} attacker - 攻击方棋子 { animal, team, rank, faceUp }
 * @param {Object} defender - 防守方棋子 { animal, team, rank, faceUp }
 * @returns {boolean} 是否可以吃
 */
function canCapture(attacker, defender) {
  // 同阵营不能吃
  if (attacker.team === defender.team) return false;

  const attRank = attacker.rank;
  const defRank = defender.rank;

  // 逆袭规则：鼠(等级8)吃对方象(等级1)
  if (attRank === 8 && defRank === 1) return true;

  // 象(等级1)不能吃对方鼠(等级8)
  if (attRank === 1 && defRank === 8) return false;

  // 高等级（数值小）吃低等级（数值大），或同级
  if (attRank <= defRank) return true;

  return false;
}

/**
 * 判断吃牌后是否同归于尽
 * @param {Object} attacker - 攻击方棋子 { animal, team, rank, faceUp }
 * @param {Object} defender - 防守方棋子 { animal, team, rank, faceUp }
 * @returns {boolean} 是否同归于尽
 */
function isMutualDestruction(attacker, defender) {
  return attacker.rank === defender.rank;
}
/**
 * 创建初始游戏状态
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState}
 */
function createGameState(mode) {
  // 创建16张棋子：红蓝各8张（象、狮、虎、豹、狼、狗、猫、鼠各一张）
  const cards = [];
  for (const animal of ANIMAL_NAMES) {
    cards.push({ animal, team: 'red', rank: RANK_MAP[animal], faceUp: false });
  }
  for (const animal of ANIMAL_NAMES) {
    cards.push({ animal, team: 'blue', rank: RANK_MAP[animal], faceUp: false });
  }

  // Fisher-Yates 洗牌算法
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // 放置到 4×4 棋盘
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
 * 获取合法移动目标（相邻空位）
 * @param {Board} board - 棋盘
 * @param {number} x - 棋子x坐标
 * @param {number} y - 棋子y坐标
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
 * 获取合法吃牌目标
 * @param {Board} board - 棋盘
 * @param {number} x - 棋子x坐标
 * @param {number} y - 棋子y坐标
 * @param {string} team - 当前阵营 'red' | 'blue'
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
 * 执行翻牌操作（就地修改state）
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

  // 第一张翻牌：确定阵营分配
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
    // 第一次翻牌后，切换到非翻牌者的阵营
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
 * 执行走牌操作（就地修改state）
 * @param {GameState} state
 * @param {{x,y}} from - 起始位置
 * @param {{x,y}} to - 目标位置
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
 * 执行吃牌操作（就地修改state）
 * 处理同归于尽：同级棋子相遇时双方均被移除并加入被吃列表
 * @param {GameState} state
 * @param {{x,y}} from - 攻击方位置
 * @param {{x,y}} to - 防守方位置
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

  // 被吃方加入对应阵营的被吃列表
  if (defender.team === 'red') {
    state.capturedRed.push(defender.animal);
  } else {
    state.capturedBlue.push(defender.animal);
  }

  // 同归于尽处理
  if (isMutualDestruction(attacker, defender)) {
    if (attacker.team === 'red') {
      state.capturedRed.push(attacker.animal);
    } else {
      state.capturedBlue.push(attacker.animal);
    }
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    // 普通吃牌：攻击方移动到防守方位置
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  }

  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;
  return state;
}

/**
 * 检查指定阵营是否有任何合法操作（翻牌/走牌/吃牌）
 * @param {Board} board - 棋盘
 * @param {string} team - 'red' | 'blue'
 * @returns {boolean}
 */
function hasAnyLegalAction(board, team) {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      // 翻牌：有任何未翻开的牌即可
      if (card && !card.faceUp) return true;
      // 走牌/吃牌：己方已翻开的牌
      if (card && card.faceUp && card.team === team) {
        if (getValidMoves(board, x, y).length > 0) return true;
        if (getValidCaptures(board, x, y, team).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * 检查游戏是否结束
 * @param {Board} board - 棋盘
 * @param {string} currentTeam - 当前行动方 'red' | 'blue'
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
 * AI决策：选择最优操作
 * 优先级：吃牌（优先吃高等级棋子，避免高等级同归于尽）> 翻牌（随机）> 走牌（随机）
 * @param {GameState} state
 * @param {string} aiTeam - AI阵营 'red' | 'blue'
 * @returns {{type, from?, to?, x?, y?}|null}
 */
function aiDecide(state, aiTeam) {
  const board = state.board;

  // 优先级1：吃牌（优先吃高等级棋子，避免高等级同归于尽）
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
          from: { x, y }, to: t,
          defenderRank: target.rank,
          attackerRank: card.rank,
          mutual
        });
      }
    }
  }
  if (allCaptures.length > 0) {
    // Sort: prefer non-mutual first, then lower defender rank (higher value target), then higher attacker rank (lower value attacker)
    allCaptures.sort((a, b) => {
      if (a.mutual !== b.mutual) return a.mutual ? 1 : -1;
      if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank;
      return b.attackerRank - a.attackerRank;
    });
    return { type: 'capture', from: allCaptures[0].from, to: allCaptures[0].to };
  }

  // 优先级2：翻牌（随机）
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

  // 优先级3：走牌（随机）
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
// 模块导出（Node.js 环境）
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ANIMAL_NAMES,
    RANK_MAP,
    DIRECTIONS,
    getImagePath,
    getRank,
    judgeRPS,
    inBounds,
    canCapture,
    isMutualDestruction,
    createGameState,
    getValidMoves,
    getValidCaptures,
    flipCard,
    moveCard,
    captureCard,
    hasAnyLegalAction,
    checkGameOver,
    aiDecide
  };
}

// ============================================================
// UI 控制器（仅浏览器环境）
// ============================================================
if (typeof document !== 'undefined') {
  var gameState = null;

  // DOM elements
  var $modeSelection = document.getElementById('mode-selection');
  var $rpsSection = document.getElementById('rps-section');
  var $rpsPvp = document.getElementById('rps-pvp');
  var $rpsPve = document.getElementById('rps-pve');
  var $rpsResult = document.getElementById('rps-result');
  var $gameArea = document.getElementById('game-area');
  var $board = document.getElementById('board');
  var $currentTeam = document.getElementById('current-team');
  var $turnCount = document.getElementById('turn-count');
  var $redRemaining = document.getElementById('red-remaining');
  var $blueRemaining = document.getElementById('blue-remaining');
  var $capturedRed = document.getElementById('captured-red');
  var $capturedBlue = document.getElementById('captured-blue');
  var $message = document.getElementById('message');
  var $gameOver = document.getElementById('game-over');
  var $winnerText = document.getElementById('winner-text');
  var $btnRestart = document.getElementById('btn-restart');

  // --- 渲染器函数 ---

  function getCell(x, y) {
    return $board.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
  }

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
          img.src = getImagePath(card.team, card.animal);
          img.alt = card.animal;
          face.appendChild(img);
          cell.appendChild(face);
        }
      }
    }
    updateStatus(state);
  }

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
    for (var i = 0; i < captureTargets.length; i++) {
      var tc = getCell(captureTargets[i].x, captureTargets[i].y);
      if (tc) tc.classList.add('cell-capture-target');
    }
  }

  function updateStatus(state) {
    // 当前行动方
    if (state.currentTeam) {
      var teamName = state.currentTeam === 'red' ? '红方' : '蓝方';
      $currentTeam.textContent = teamName;
      $currentTeam.className = 'team-indicator ' + (state.currentTeam === 'red' ? 'red-text' : 'blue-text');
    } else {
      $currentTeam.textContent = '—';
    }

    // 回合数
    $turnCount.textContent = state.turnCount;

    // 剩余棋子
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

    // 被吃掉的牌
    $capturedRed.innerHTML = '';
    for (var i = 0; i < state.capturedRed.length; i++) {
      var animal = state.capturedRed[i];
      var div = document.createElement('div');
      div.className = 'captured-card';
      var img = document.createElement('img');
      img.src = getImagePath('red', animal);
      img.alt = animal;
      div.appendChild(img);
      $capturedRed.appendChild(div);
    }

    $capturedBlue.innerHTML = '';
    for (var i = 0; i < state.capturedBlue.length; i++) {
      var animal = state.capturedBlue[i];
      var div = document.createElement('div');
      div.className = 'captured-card';
      var img = document.createElement('img');
      img.src = getImagePath('blue', animal);
      img.alt = animal;
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

  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    var currentTeam = gameState.currentTeam;

    var moves = getValidMoves(gameState.board, x, y);
    var captures = getValidCaptures(gameState.board, x, y, currentTeam);

    highlightTargets(x, y, moves, captures);
    showMessage('', '');
  }

  // --- 界面切换函数 ---

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

  // --- 石头剪刀布逻辑 ---
  var rpsP1Choice = null;
  var rpsP2Choice = null;

  function startGame(firstTeam) {
    showGameArea();
    gameState.currentTeam = firstTeam;
    gameState.firstPlayer = firstTeam;
    renderBoard(gameState);

    // PVE模式下，如果电脑先手，直接触发AI翻牌
    if (gameState.mode === 'pve' && gameState.aiFirst) {
      triggerAI();
    } else {
      showMessage('请翻开一张牌', '');
    }
  }

  function handleRPSResult(choice1, choice2, mode) {
    var result = judgeRPS(choice1, choice2);
    var choiceNames = { rock: '石头', scissors: '剪刀', paper: '布' };

    if (result === 0) {
      $rpsResult.textContent = '双方都出了' + choiceNames[choice1] + '，平局！重新选择';
      setTimeout(function() {
        showRPSSelection(mode);
      }, 1500);
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
        // 玩家赢了石头剪刀布 → 玩家先手
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，你赢了！你先手';
        gameState.aiFirst = false;
        setTimeout(function() { startGame('red'); }, 1500);
      } else {
        // 电脑赢了石头剪刀布 → 电脑先手
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，电脑赢了！电脑先手';
        gameState.aiFirst = true;
        setTimeout(function() { startGame('red'); }, 1500);
      }
    }
  }

  // PVP 石头剪刀布按钮
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

  // PVE 石头剪刀布按钮
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

  // --- 模式选择 ---
  document.getElementById('btn-pvp').addEventListener('click', function() {
    gameState = createGameState('pvp');
    showRPSSelection('pvp');
  });

  document.getElementById('btn-pve').addEventListener('click', function() {
    gameState = createGameState('pve');
    showRPSSelection('pve');
  });

  // --- 重新开始 ---
  $btnRestart.addEventListener('click', function() {
    gameState = null;
    showModeSelection();
  });

  // --- 棋盘点击事件处理 ---
  $board.addEventListener('click', function(e) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.aiThinking) return;

    // PVE模式下，只允许玩家在自己回合点击
    if (gameState.mode === 'pve' && gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) return;

    var cell = e.target.closest('.cell');
    if (!cell) return;

    var x = parseInt(cell.dataset.x);
    var y = parseInt(cell.dataset.y);
    var card = gameState.board[y][x];
    var currentTeam = gameState.currentTeam;

    // 已有选中棋子
    if (gameState.selectedCell) {
      var sel = gameState.selectedCell;

      // 点击同一格取消选中
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      // 点击对方已翻开的牌 → 尝试吃牌
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
        showMessage('无法吃掉该棋子', 'error');
        return;
      }

      // 点击空位 → 尝试走牌
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

      // 点击己方已翻开的牌 → 重新选中
      if (card && card.faceUp && card.team === currentTeam) {
        selectCard(x, y);
        return;
      }

      // 无效目标
      gameState.selectedCell = null;
      clearHighlights();
      return;
    }

    // 没有选中棋子

    // 点击未翻开的牌 → 翻牌
    if (card && !card.faceUp) {
      var flipResult = flipCard(gameState, x, y);
      if (flipResult) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
        return;
      }
    }

    // 点击己方已翻开的牌 → 选中
    if (card && card.faceUp && card.team === currentTeam) {
      selectCard(x, y);
      return;
    }

    // 点击对方已翻开的牌（未选中状态）
    if (card && card.faceUp && card.team !== currentTeam) {
      showMessage('这不是你的棋子', 'error');
      return;
    }
  });

  // --- AI操作流程 ---
  function triggerAI() {
    gameState.aiThinking = true;
    showMessage('电脑思考中...', 'info');

    var delay = 500 + Math.random() * 1000;
    setTimeout(function() {
      var decision = aiDecide(gameState, gameState.aiTeam);
      if (!decision) {
        // AI无合法操作 → 游戏应已结束
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

      // 翻牌后重新获取cell并高亮
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
    }
  }

  function afterAction() {
    // 检查游戏结束
    var result = checkGameOver(gameState.board, gameState.currentTeam);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      renderBoard(gameState);
      setTimeout(function() { showGameOverScreen(result.winner); }, 500);
      return;
    }

    // 更新提示信息
    if (gameState.mode === 'pve') {
      if (gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) {
        // 阵营已分配，轮到AI
        triggerAI();
      } else if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage('你的回合', '');
      }
    } else {
      // PVP
      var teamName = gameState.currentTeam === 'red' ? '红方' : '蓝方';
      if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage(teamName + '的回合', '');
      }
    }
  }

  // --- 初始化：显示模式选择 ---
  showModeSelection();

} // end of if (typeof document !== 'undefined')
