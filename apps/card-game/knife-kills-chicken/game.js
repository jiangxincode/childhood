// ============================================================
// 刀杀鸡（扛刀扛枪版）- 游戏核心逻辑
// ============================================================

// 8种角色
const ROLES = ['马蜂', '癞痢', '枪', '老虎', '人', '刀', '鸡', '火箭'];

// 基础相克关系表：key 克制 value 中的角色
// 注意：人克鸡需要扛刀（条件性），癞痢克老虎需要扛枪（条件性）
// 刀和枪自身不能吃任何角色
const BASE_DOMINANCE = {
  '马蜂': ['癞痢'],
  '老虎': ['人'],
  '鸡':   ['马蜂'],
  '火箭': ['马蜂', '癞痢', '枪', '老虎', '人', '刀', '鸡']
};

// 角色名 → 图片文件名前缀映射
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
 * 获取角色图片路径
 * @param {string} role - 角色名
 * @param {string} team - 阵营 'red' | 'blue'
 * @returns {string} 图片路径
 */
function getImagePath(role, team) {
  // 特殊处理：红方"人"使用"人-人.png"
  if (role === '人' && team === 'red') {
    return 'images/人-人.png';
  }
  const prefix = IMAGE_MAP[role];
  const color = team === 'red' ? '红' : '蓝';
  return `images/${prefix}-${color}.png`;
}

/**
 * 石头剪刀布判定
 * @param {string} choice1 - 第一方选择 'rock' | 'scissors' | 'paper'
 * @param {string} choice2 - 第二方选择 'rock' | 'scissors' | 'paper'
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
 * 判断攻击方卡牌是否克制防守方卡牌
 * 需要考虑扛刀/扛枪状态：
 * - 刀和枪自身不能吃任何角色
 * - 基础相克：查 BASE_DOMINANCE 表
 * - 扛刀人(carrying='刀')克鸡，未扛刀的人不能吃鸡
 * - 扛枪癞痢(carrying='枪')克老虎，未扛枪的癞痢不能吃老虎
 * - 火箭克所有其他角色（同归于尽在captureCard中处理）
 * @param {Card} attackerCard - 攻击方卡牌对象（需要role和carrying属性）
 * @param {Card} defenderCard - 防守方卡牌对象
 * @returns {boolean} 是否克制
 */
function canCapture(attackerCard, defenderCard) {
  const attRole = attackerCard.role;
  const defRole = defenderCard.role;

  // 1. 刀和枪自身不能吃任何角色
  if (attRole === '刀' || attRole === '枪') return false;

  // 2. 基础相克：查 BASE_DOMINANCE 表
  if (Array.isArray(BASE_DOMINANCE[attRole]) && BASE_DOMINANCE[attRole].includes(defRole)) {
    return true;
  }

  // 3. 扛刀人克鸡
  if (attRole === '人' && attackerCard.carrying === '刀' && defRole === '鸡') {
    return true;
  }

  // 4. 扛枪癞痢克老虎
  if (attRole === '癞痢' && attackerCard.carrying === '枪' && defRole === '老虎') {
    return true;
  }

  // 5. 其他情况不克制
  return false;
}

/**
 * 创建初始游戏状态
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState} 初始状态
 */
function createGameState(mode) {
  // 生成16张牌：红蓝各8张，每方8种角色各一张
  const cards = [];
  for (const role of ROLES) {
    cards.push({ role, team: 'red', faceUp: false, carrying: null });
    cards.push({ role, team: 'blue', faceUp: false, carrying: null });
  }

  // Fisher-Yates 洗牌
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cards[i];
    cards[i] = cards[j];
    cards[j] = temp;
  }

  // 放置到4×4棋盘 board[y][x]
  const board = [];
  for (let y = 0; y < 4; y++) {
    const row = [];
    for (let x = 0; x < 4; x++) {
      row.push(cards[y * 4 + x]);
    }
    board.push(row);
  }

  return {
    mode: mode,
    board: board,
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

// 四个相邻方向偏移量
const DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 }
];

/**
 * 判断坐标是否在棋盘范围内
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x <= 3 && y >= 0 && y <= 3;
}

/**
 * 获取指定棋子的所有合法移动目标（曼哈顿距离为1的空位）
 * @param {(Card|null)[][]} board - 棋盘状态
 * @param {number} x - 棋子x坐标
 * @param {number} y - 棋子y坐标
 * @returns {Array<{x: number, y: number}>} 合法移动目标列表
 */
function getValidMoves(board, x, y) {
  const card = board[y][x];
  if (!card) return [];
  // 刀和枪在未被扛起时不能移动
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
 * 获取指定棋子的所有合法吃牌目标
 * @param {(Card|null)[][]} board - 棋盘状态
 * @param {number} x - 棋子x坐标
 * @param {number} y - 棋子y坐标
 * @param {string} team - 当前阵营 'red' | 'blue'
 * @returns {Array<{x: number, y: number}>} 合法吃牌目标列表
 */
function getValidCaptures(board, x, y, team) {
  const card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];
  // 刀和枪自身不能吃任何角色
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
 * 获取指定棋子的所有合法扛刀/扛枪目标
 * 人可以扛己方的刀，癞痢可以扛己方的枪
 * @param {(Card|null)[][]} board - 棋盘状态
 * @param {number} x - 棋子x坐标
 * @param {number} y - 棋子y坐标
 * @param {string} team - 当前阵营
 * @returns {Array<{x: number, y: number}>} 合法扛刀/扛枪目标列表
 */
function getCarryTargets(board, x, y, team) {
  const card = board[y][x];
  if (!card || !card.faceUp || card.team !== team) return [];
  
  // Only 人 can carry 刀, only 癞痢 can carry 枪
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
 * 执行翻牌操作
 * @param {GameState} state - 当前状态（就地修改）
 * @param {number} x - 目标x坐标
 * @param {number} y - 目标y坐标
 * @returns {GameState|null} 修改后的状态，非法操作返回 null
 */
function flipCard(state, x, y) {
  // 坐标越界
  if (!inBounds(x, y)) return null;
  const card = state.board[y][x];
  // 空位或已翻开
  if (!card || card.faceUp) return null;

  // 翻牌
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
    // 翻牌者是 currentTeam（还未切换），翻牌者控制 card.team
    // 所以下一个行动方应该是翻牌者控制的阵营的对方
    // 但由于翻牌者的阵营可能和 currentTeam 不同，需要直接设置
    if (state.mode === 'pve') {
      // 翻牌者的阵营已确定，下一个行动方是对方阵营
      var flipperTeam = state.aiFirst ? state.aiTeam : state.playerTeam;
      state.currentTeam = flipperTeam === 'red' ? 'blue' : 'red';
    } else {
      state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
    }
  } else {
    // 非第一次翻牌，正常切换
    state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  }
  state.turnCount++;

  return state;
}

/**
 * 执行走牌操作
 * @param {GameState} state - 当前状态（就地修改）
 * @param {{x: number, y: number}} from - 起始位置
 * @param {{x: number, y: number}} to - 目标位置
 * @returns {GameState|null} 修改后的状态，非法操作返回 null
 */
function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const card = state.board[from.y][from.x];
  // 起始位置必须有牌、已翻开、属于当前行动方
  if (!card || !card.faceUp || card.team !== state.currentTeam) return null;
  // 目标位置必须为空
  if (state.board[to.y][to.x] !== null) return null;
  // 曼哈顿距离必须为1
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;

  // 移动
  state.board[to.y][to.x] = card;
  state.board[from.y][from.x] = null;

  // 切换当前行动方
  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;

  return state;
}

/**
 * 执行吃牌操作
 * @param {GameState} state - 当前状态（就地修改）
 * @param {{x: number, y: number}} from - 攻击方位置
 * @param {{x: number, y: number}} to - 被吃方位置
 * @returns {GameState|null} 修改后的状态，非法操作返回 null
 */
function captureCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const attacker = state.board[from.y][from.x];
  const defender = state.board[to.y][to.x];
  // 攻击方必须存在、已翻开、属于当前行动方
  if (!attacker || !attacker.faceUp || attacker.team !== state.currentTeam) return null;
  // 被吃方必须存在、已翻开、属于对方
  if (!defender || !defender.faceUp || defender.team === state.currentTeam) return null;
  // 曼哈顿距离必须为1
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;
  // 必须满足相克关系
  if (!canCapture(attacker, defender)) return null;

  // 被吃角色加入对应阵营的被吃列表
  const defenderCapturedList = defender.team === 'red' ? 'capturedRed' : 'capturedBlue';
  state[defenderCapturedList].push(defender.role);
  // 如果被吃方正在扛武器，武器也加入被吃列表
  if (defender.carrying) {
    state[defenderCapturedList].push(defender.carrying);
  }

  // 火箭吃牌时同归于尽
  if (attacker.role === '火箭') {
    // 火箭自身也加入被吃列表
    const attackerCapturedList = attacker.team === 'red' ? 'capturedRed' : 'capturedBlue';
    state[attackerCapturedList].push('火箭');
    // 两个位置都变为空
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    // 普通吃牌：攻击方移动到被吃方位置，原位置清空
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  }

  // 切换当前行动方
  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;

  return state;
}

/**
 * 执行扛刀/扛枪操作
 * 人移动到己方刀的位置合体，癞痢移动到己方枪的位置合体
 * @param {GameState} state - 当前状态（就地修改）
 * @param {{x: number, y: number}} from - 人/癞痢的位置
 * @param {{x: number, y: number}} to - 刀/枪的位置
 * @returns {GameState|null} 修改后的状态，非法操作返回 null
 */
function carryWeapon(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const carrier = state.board[from.y][from.x];
  const weapon = state.board[to.y][to.x];
  // 扛者必须存在、已翻开、属于当前行动方
  if (!carrier || !carrier.faceUp || carrier.team !== state.currentTeam) return null;
  // 武器必须存在、已翻开、同阵营
  if (!weapon || !weapon.faceUp || weapon.team !== carrier.team) return null;
  // 曼哈顿距离必须为1
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;
  // 已经在扛武器时不能再扛
  if (carrier.carrying) return null;
  // 验证角色-武器匹配：人扛刀，癞痢扛枪
  if (carrier.role === '人' && weapon.role === '刀') {
    carrier.carrying = '刀';
  } else if (carrier.role === '癞痢' && weapon.role === '枪') {
    carrier.carrying = '枪';
  } else {
    return null;
  }
  // 扛者移动到武器位置，原位置变空
  state.board[to.y][to.x] = carrier;
  state.board[from.y][from.x] = null;
  // 切换当前行动方
  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;
  return state;
}

/**
 * 检查当前玩家是否有任何合法操作
 * @param {(Card|null)[][]} board - 棋盘状态
 * @param {string} team - 当前阵营
 * @returns {boolean} 是否有合法操作
 */
function hasAnyLegalAction(board, team) {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      // 翻牌：有任何未翻开的牌即可
      if (card && !card.faceUp) return true;

      // 走牌/吃牌/扛刀扛枪：己方已翻开的牌
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
 * 检查游戏是否结束
 * @param {(Card|null)[][]} board - 棋盘状态
 * @param {string} currentTeam - 当前行动方阵营
 * @returns {{ended: boolean, winner: string|null}} 游戏结束状态
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

  // 一方无牌 → 该方失败
  if (redCount === 0) return { ended: true, winner: 'blue' };
  if (blueCount === 0) return { ended: true, winner: 'red' };

  // 当前行动方无合法操作 → 当前行动方失败
  if (!hasAnyLegalAction(board, currentTeam)) {
    return { ended: true, winner: currentTeam === 'red' ? 'blue' : 'red' };
  }

  return { ended: false, winner: null };
}

/**
 * AI选择最优操作
 * @param {GameState} state - 当前游戏状态
 * @param {string} aiTeam - AI所属阵营
 * @returns {{type: string, from?: {x: number, y: number}, to?: {x: number, y: number}, x?: number, y?: number}|null} AI决策结果
 */
function aiDecide(state, aiTeam) {
  const board = state.board;

  // 优先级1：存在吃牌机会时，优先执行吃牌
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

  // 优先级2：人/癞痢与己方刀/枪相邻 → 执行扛刀/扛枪
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

  // 优先级3：有未翻开的牌时，随机翻一张
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

  // 优先级4：随机选一个己方棋子移动到合法位置
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

  // 无任何合法操作
  return null;
}

// 导出供测试使用
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
// UI 控制器（仅在浏览器环境中运行）
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

  // --- 渲染器函数 (Task 9.1) ---

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
            // 扛刀人/扛枪癞痢 - 两层重叠卡片
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
    // 当前行动方
    if (state.currentTeam) {
      const teamName = state.currentTeam === 'red' ? '红方' : '蓝方';
      $currentTeam.textContent = teamName;
      $currentTeam.className = 'team-indicator ' + (state.currentTeam === 'red' ? 'red-text' : 'blue-text');
    } else {
      $currentTeam.textContent = '—';
    }

    // 回合数
    $turnCount.textContent = state.turnCount;

    // 剩余棋子
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

    // 被吃掉的牌
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


  // --- 石头剪刀布逻辑 (Task 9.2) ---
  let rpsP1Choice = null;
  let rpsP2Choice = null;

  function startGame(firstTeam) {
    showGameArea();
    gameState.currentTeam = firstTeam;
    gameState.firstPlayer = firstTeam;
    renderBoard(gameState);

    // PVE模式下，如果电脑先手，直接触发AI翻牌
    // 此时阵营还未分配（teamAssigned=false），但第一步只能翻牌
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


  // --- 模式选择 (Task 9.2) ---
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

  // --- 棋盘点击事件处理 (Task 9.2) ---
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

      var selCard = gameState.board[sel.y][sel.x];

      // 点击己方已翻开的刀/枪 → 尝试扛刀/扛枪
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
        // 具体的非法吃牌提示
        if (selCard.role === '人' && card.role === '鸡') {
          showMessage('需要先扛刀才能杀鸡', 'error');
        } else if (selCard.role === '癞痢' && card.role === '老虎') {
          showMessage('需要先扛枪才能杀老虎', 'error');
        } else {
          showMessage('无法吃掉该棋子', 'error');
        }
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


  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    var currentTeam = gameState.currentTeam;
    var card = gameState.board[y][x];

    // 刀和枪不能移动
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
      } else if (!gameState.teamAssigned && gameState.aiFirst) {
        // 阵营未分配但电脑先手（第一次翻牌后轮到玩家翻牌）
        showMessage('请翻开一张牌', '');
      } else if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage('你的回合', '');
      }
    } else {
      // PVP 或阵营未分配
      var teamName = gameState.currentTeam === 'red' ? '红方' : '蓝方';
      if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage(teamName + '的回合', '');
      }
    }
  }


  // --- AI操作流程 (Task 9.3) ---
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

  // 初始化：显示模式选择
  showModeSelection();
}
