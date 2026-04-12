// ============================================================
// 龙虎斗 - 游戏核心逻辑
// ============================================================

// 龙队8张棋子（等级1-8，数值越小等级越高）
const DRAGON_PIECES = ['龙王', '神龙', '金龙', '青龙', '赤龙', '白龙', '风雨龙', '变形龙'];

// 虎队8张棋子（等级1-8）
const TIGER_PIECES = ['虎王', '东北虎', '大头虎', '下山虎', '绿虎', '妖虎', '白虎', '小王虎'];

// 等级映射：棋子名 → 等级数值（1最高，8最低）
const RANK_MAP = {
  '龙王': 1, '神龙': 2, '金龙': 3, '青龙': 4,
  '赤龙': 5, '白龙': 6, '风雨龙': 7, '变形龙': 8,
  '虎王': 1, '东北虎': 2, '大头虎': 3, '下山虎': 4,
  '绿虎': 5, '妖虎': 6, '白虎': 7, '小王虎': 8
};

// 图片映射：棋子名 → 图片文件名
const IMAGE_MAP = {
  '龙王': '龙1.jpg', '神龙': '龙2.jpg', '金龙': '龙3.jpg', '青龙': '龙4.jpg',
  '赤龙': '龙5.jpg', '白龙': '龙6.jpg', '风雨龙': '龙7.jpg', '变形龙': '龙8.jpg',
  '虎王': '虎1.jpg', '东北虎': '虎2.jpg', '大头虎': '虎3.jpg', '下山虎': '虎4.jpg',
  '绿虎': '虎5.jpg', '妖虎': '虎6.jpg', '白虎': '虎7.jpg', '小王虎': '虎8.jpg'
};

// 阵营映射：棋子名 → 阵营
const TEAM_MAP = {};
DRAGON_PIECES.forEach(p => { TEAM_MAP[p] = 'dragon'; });
TIGER_PIECES.forEach(p => { TEAM_MAP[p] = 'tiger'; });

/**
 * 获取棋子图片路径
 * @param {string} piece - 棋子名称
 * @returns {string} 图片路径 如 'images/龙1.jpg'
 */
function getImagePath(piece) {
  return `images/${IMAGE_MAP[piece]}`;
}

/**
 * 获取棋子所属阵营
 * @param {string} piece - 棋子名称
 * @returns {string} 'dragon' | 'tiger'
 */
function getTeam(piece) {
  return TEAM_MAP[piece];
}

/**
 * 获取棋子等级
 * @param {string} piece - 棋子名称
 * @returns {number} 等级数值 1-8
 */
function getRank(piece) {
  return RANK_MAP[piece];
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
 * 4. 逆袭：等级8吃对方等级1
 * 5. 等级1不能吃对方等级8（被逆袭克制）
 * @param {Card} attacker - 攻击方棋子
 * @param {Card} defender - 防守方棋子
 * @returns {boolean} 是否可以吃
 */
function canCapture(attacker, defender) {
  if (attacker.team === defender.team) return false;

  const attRank = attacker.rank;
  const defRank = defender.rank;

  // 逆袭规则：等级8吃对方等级1
  if (attRank === 8 && defRank === 1) return true;

  // 等级1不能吃对方等级8（被逆袭克制）
  if (attRank === 1 && defRank === 8) return false;

  // 高等级（数值小）吃低等级（数值大），或同级
  if (attRank <= defRank) return true;

  return false;
}

/**
 * 判断吃牌后是否同归于尽
 * @param {Card} attacker - 攻击方棋子
 * @param {Card} defender - 防守方棋子
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
  const cards = [];
  for (const piece of DRAGON_PIECES) {
    cards.push({ piece, team: 'dragon', rank: RANK_MAP[piece], faceUp: false });
  }
  for (const piece of TIGER_PIECES) {
    cards.push({ piece, team: 'tiger', rank: RANK_MAP[piece], faceUp: false });
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
    mode, board,
    currentTeam: null, playerTeam: null, aiTeam: null,
    teamAssigned: false, firstPlayer: null,
    turnCount: 0, capturedDragon: [], capturedTiger: [],
    selectedCell: null, gameOver: false, winner: null,
    aiThinking: false, aiFirst: false
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
 * @param {string} team - 当前阵营 'dragon' | 'tiger'
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
        state.playerTeam = card.team === 'dragon' ? 'tiger' : 'dragon';
      } else {
        state.playerTeam = card.team;
        state.aiTeam = card.team === 'dragon' ? 'tiger' : 'dragon';
      }
    }
    // 第一次翻牌后，切换到非翻牌者的阵营
    if (state.mode === 'pve') {
      var flipperTeam = state.aiFirst ? state.aiTeam : state.playerTeam;
      state.currentTeam = flipperTeam === 'dragon' ? 'tiger' : 'dragon';
    } else {
      state.currentTeam = state.currentTeam === 'dragon' ? 'tiger' : 'dragon';
    }
  } else {
    state.currentTeam = state.currentTeam === 'dragon' ? 'tiger' : 'dragon';
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
  state.currentTeam = state.currentTeam === 'dragon' ? 'tiger' : 'dragon';
  state.turnCount++;
  return state;
}

/**
 * 执行吃牌操作（就地修改state）
 * 处理同归于尽：同级棋子相遇时双方均被移除
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
  if (defender.team === 'dragon') {
    state.capturedDragon.push(defender.piece);
  } else {
    state.capturedTiger.push(defender.piece);
  }

  // 同归于尽处理
  if (isMutualDestruction(attacker, defender)) {
    if (attacker.team === 'dragon') {
      state.capturedDragon.push(attacker.piece);
    } else {
      state.capturedTiger.push(attacker.piece);
    }
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    // 普通吃牌
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  }

  state.currentTeam = state.currentTeam === 'dragon' ? 'tiger' : 'dragon';
  state.turnCount++;
  return state;
}

/**
 * 检查指定阵营是否有任何合法操作（翻牌/走牌/吃牌）
 * @param {Board} board - 棋盘
 * @param {string} team - 阵营 'dragon' | 'tiger'
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
 * @param {string} currentTeam - 当前行动方 'dragon' | 'tiger'
 * @returns {{ended: boolean, winner: string|null}}
 */
function checkGameOver(board, currentTeam) {
  let dragonCount = 0;
  let tigerCount = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card) {
        if (card.team === 'dragon') dragonCount++;
        else tigerCount++;
      }
    }
  }
  if (dragonCount === 0) return { ended: true, winner: 'tiger' };
  if (tigerCount === 0) return { ended: true, winner: 'dragon' };
  if (!hasAnyLegalAction(board, currentTeam)) {
    return { ended: true, winner: currentTeam === 'dragon' ? 'tiger' : 'dragon' };
  }
  return { ended: false, winner: null };
}

/**
 * AI决策：选择最优操作
 * 优先级：吃牌（优先吃高等级）> 翻牌（随机）> 走牌（随机）
 * @param {GameState} state
 * @param {string} aiTeam - AI阵营 'dragon' | 'tiger'
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
    // Sort: prefer non-mutual, then lower defender rank (higher value target), then higher attacker rank (lower value attacker)
    allCaptures.sort((a, b) => {
      if (a.mutual !== b.mutual) return a.mutual ? 1 : -1; // non-mutual first
      if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank; // lower rank = higher value target
      return b.attackerRank - a.attackerRank; // use lower-value attacker
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
    DRAGON_PIECES,
    TIGER_PIECES,
    RANK_MAP,
    IMAGE_MAP,
    TEAM_MAP,
    DIRECTIONS,
    getImagePath,
    getTeam,
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
  var $dragonRemaining = document.getElementById('dragon-remaining');
  var $tigerRemaining = document.getElementById('tiger-remaining');
  var $capturedDragon = document.getElementById('captured-dragon');
  var $capturedTiger = document.getElementById('captured-tiger');
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
          cell.classList.add(card.team === 'dragon' ? 'cell-dragon' : 'cell-tiger');
          var face = document.createElement('div');
          face.className = 'cell-face';
          var img = document.createElement('img');
          img.src = getImagePath(card.piece);
          img.alt = card.piece;
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
      var teamName = state.currentTeam === 'dragon' ? '龙队' : '虎队';
      $currentTeam.textContent = teamName;
      $currentTeam.className = 'team-indicator ' + (state.currentTeam === 'dragon' ? 'dragon-text' : 'tiger-text');
    } else {
      $currentTeam.textContent = '—';
    }

    // 回合数
    $turnCount.textContent = state.turnCount;

    // 剩余棋子
    var dragonCount = 0, tigerCount = 0;
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var card = state.board[y][x];
        if (card) {
          if (card.team === 'dragon') dragonCount++;
          else tigerCount++;
        }
      }
    }
    $dragonRemaining.textContent = dragonCount;
    $tigerRemaining.textContent = tigerCount;

    // 被吃掉的牌
    $capturedDragon.innerHTML = '';
    for (var i = 0; i < state.capturedDragon.length; i++) {
      var piece = state.capturedDragon[i];
      var div = document.createElement('div');
      div.className = 'captured-card';
      var img = document.createElement('img');
      img.src = getImagePath(piece);
      img.alt = piece;
      div.appendChild(img);
      $capturedDragon.appendChild(div);
    }

    $capturedTiger.innerHTML = '';
    for (var i = 0; i < state.capturedTiger.length; i++) {
      var piece = state.capturedTiger[i];
      var div = document.createElement('div');
      div.className = 'captured-card';
      var img = document.createElement('img');
      img.src = getImagePath(piece);
      img.alt = piece;
      div.appendChild(img);
      $capturedTiger.appendChild(div);
    }

    updateTeamLabels(state);
  }

  function updateTeamLabels(state) {
    var $dragonLabel = document.getElementById('dragon-label');
    var $tigerLabel = document.getElementById('tiger-label');
    if (state.mode === 'pve' && state.teamAssigned) {
      if (state.playerTeam === 'dragon') {
        $dragonLabel.textContent = '玩家（龙队）剩余：';
        $tigerLabel.textContent = '电脑（虎队）剩余：';
      } else {
        $dragonLabel.textContent = '电脑（龙队）剩余：';
        $tigerLabel.textContent = '玩家（虎队）剩余：';
      }
    } else {
      $dragonLabel.textContent = '龙队剩余：';
      $tigerLabel.textContent = '虎队剩余：';
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
    var winnerName = winner === 'dragon' ? '龙队' : '虎队';
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
      var firstTeam = result === 1 ? 'dragon' : 'tiger';
      setTimeout(function() { startGame(firstTeam); }, 1500);
    } else {
      // PVE
      var aiChoiceName = choiceNames[choice2];
      if (result === 1) {
        // 玩家赢了石头剪刀布 → 玩家先手
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，你赢了！你先手';
        gameState.aiFirst = false;
        setTimeout(function() { startGame('dragon'); }, 1500);
      } else {
        // 电脑赢了石头剪刀布 → 电脑先手
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，电脑赢了！电脑先手';
        gameState.aiFirst = true;
        setTimeout(function() { startGame('dragon'); }, 1500);
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


  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    var currentTeam = gameState.currentTeam;

    var moves = getValidMoves(gameState.board, x, y);
    var captures = getValidCaptures(gameState.board, x, y, currentTeam);

    highlightTargets(x, y, moves, captures);
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
      // PVP
      var teamName = gameState.currentTeam === 'dragon' ? '龙队' : '虎队';
      if (!gameState.teamAssigned) {
        showMessage('请翻开一张牌', '');
      } else {
        showMessage(teamName + '的回合', '');
      }
    }
  }


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

  // 初始化：显示模式选择
  showModeSelection();
}
