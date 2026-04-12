// ============================================================
// 军棋（翻翻棋）- 游戏核心逻辑
// ============================================================

// ============================================================
// 任务 1.1：常量和基础工具函数
// ============================================================

// 普通棋子名称列表（等级1-10，数值越小等级越高）
const NORMAL_PIECE_NAMES = ['司令', '军长', '师长', '旅长', '团长', '营长', '连长', '排长', '班长', '工兵'];

// 特殊棋子名称
const BOMB_NAME = '炸弹';
const MINE_NAME = '地雷';
const FLAG_NAME = '军旗';

// 每方棋子名称列表（12张：10普通 + 炸弹 + 地雷）
const TEAM_PIECE_NAMES = [...NORMAL_PIECE_NAMES, BOMB_NAME, MINE_NAME];

// 等级映射：棋子名 → 等级数值（1最高，10最低）
const RANK_MAP = {
  '司令': 1, '军长': 2, '师长': 3, '旅长': 4, '团长': 5,
  '营长': 6, '连长': 7, '排长': 8, '班长': 9, '工兵': 10
};

// 四个相邻方向偏移量
const DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 }
];

/**
 * 是否为普通棋子（参与等级排序的10种）
 * @param {string} name
 * @returns {boolean}
 */
function isNormalPiece(name) {
  return NORMAL_PIECE_NAMES.includes(name);
}

/**
 * 是否为炸弹
 * @param {string} name
 * @returns {boolean}
 */
function isBomb(name) {
  return name === BOMB_NAME;
}

/**
 * 是否为地雷
 * @param {string} name
 * @returns {boolean}
 */
function isMine(name) {
  return name === MINE_NAME;
}

/**
 * 是否为军旗
 * @param {string} name
 * @returns {boolean}
 */
function isFlag(name) {
  return name === FLAG_NAME;
}

/**
 * 是否可移动（地雷和军旗不可移动）
 * @param {Piece} piece
 * @returns {boolean}
 */
function isMovable(piece) {
  return !isMine(piece.name) && !isFlag(piece.name);
}

/**
 * 获取棋子图片路径
 * @param {Piece} piece
 * @returns {string}
 */
function getImagePath(piece) {
  if (isFlag(piece.name)) {
    return 'images/军旗.png';
  }
  if (piece.team === 'red') {
    return `images/红-${piece.name}.png`;
  }
  return `images/蓝-${piece.name}.png`;
}

/**
 * 获取棋子等级（仅普通棋子有等级）
 * @param {string} name
 * @returns {number|null}
 */
function getRank(name) {
  return RANK_MAP[name] !== undefined ? RANK_MAP[name] : null;
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
 * 判断坐标是否在5×5棋盘范围内
 * @param {number} x - 0~4
 * @param {number} y - 0~4
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x <= 4 && y >= 0 && y <= 4;
}

// ============================================================
// 任务 1.2：战斗判定函数
// ============================================================

/**
 * 判断攻击方棋子是否可以对目标棋子发起吃牌/碰撞操作
 * @param {Piece} attacker - 攻击方棋子
 * @param {Piece} defender - 防守方棋子
 * @returns {boolean}
 */
function canCapture(attacker, defender) {
  // 军旗不可被吃
  if (isFlag(defender.name)) return false;

  // 地雷不能主动攻击
  if (isMine(attacker.name)) return false;

  // 军旗不能主动攻击
  if (isFlag(attacker.name)) return false;

  // 同阵营不能互吃
  if (attacker.team === defender.team) return false;

  // 炸弹碰任何对方棋子（除军旗，已在上面排除）→ 可以
  if (isBomb(attacker.name)) return true;

  // 任何可移动棋子碰对方炸弹 → 可以（炸弹同归于尽）
  if (isBomb(defender.name)) return true;

  // 工兵碰地雷 → 可以（工兵存活）
  if (attacker.name === '工兵' && isMine(defender.name)) return true;

  // 其他普通棋子碰地雷 → 可以（同归于尽）
  if (isMine(defender.name) && isNormalPiece(attacker.name)) return true;

  // 普通棋子之间：高等级（数值小）吃低等级（数值大），或同级
  if (isNormalPiece(attacker.name) && isNormalPiece(defender.name)) {
    return attacker.rank <= defender.rank;
  }

  return false;
}

/**
 * 解析战斗结果
 * @param {Piece} attacker - 攻击方棋子
 * @param {Piece} defender - 防守方棋子
 * @returns {'attacker_wins' | 'mutual_destruction' | 'invalid'}
 */
function resolveCombat(attacker, defender) {
  if (!canCapture(attacker, defender)) return 'invalid';

  // 炸弹攻击 → 同归于尽
  if (isBomb(attacker.name)) return 'mutual_destruction';

  // 被炸弹防守 → 同归于尽
  if (isBomb(defender.name)) return 'mutual_destruction';

  // 工兵碰地雷 → 工兵存活
  if (attacker.name === '工兵' && isMine(defender.name)) return 'attacker_wins';

  // 其他普通棋子碰地雷 → 同归于尽
  if (isMine(defender.name)) return 'mutual_destruction';

  // 普通棋子之间
  if (attacker.rank === defender.rank) return 'mutual_destruction';
  if (attacker.rank < defender.rank) return 'attacker_wins';

  return 'invalid';
}

// ============================================================
// 任务 1.3：游戏状态创建函数
// ============================================================

/**
 * 创建初始游戏状态
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState}
 */
function createGameState(mode) {
  const pieces = [];

  // 红方12张
  for (const name of TEAM_PIECE_NAMES) {
    pieces.push({
      name,
      team: 'red',
      rank: getRank(name),
      faceUp: false
    });
  }

  // 蓝方12张
  for (const name of TEAM_PIECE_NAMES) {
    pieces.push({
      name,
      team: 'blue',
      rank: getRank(name),
      faceUp: false
    });
  }

  // 1张中立军旗
  pieces.push({
    name: FLAG_NAME,
    team: 'neutral',
    rank: null,
    faceUp: false
  });

  // Fisher-Yates 洗牌
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }

  // 放置到 5×5 棋盘 board[y][x]
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
    aiFirst: false
  };
}

// ============================================================
// 任务 1.4：棋子操作函数
// ============================================================

/**
 * 获取指定阵营场上存活的最小普通棋子（等级数值最大的普通棋子）
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
 * 判断指定棋子是否可以执行抱军旗操作
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

  // 检查是否为己方最小普通棋子
  const lowest = getLowestNormalPiece(board, team);
  if (!lowest || piece.name !== lowest.name) return null;

  // 检查相邻位置是否有已翻开的军旗
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
 * 获取合法移动目标（相邻空位 + 可抱军旗的位置）
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

  // 检查是否可以抱军旗
  const flagCapture = canCaptureFlag(board, x, y, team);

  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: 'move' });
    } else if (target && isFlag(target.name) && target.faceUp) {
      // 军旗位置：只有可以抱军旗时才加入
      if (flagCapture && flagCapture.flagX === nx && flagCapture.flagY === ny) {
        moves.push({ x: nx, y: ny, type: 'capture_flag' });
      }
    }
  }

  return moves;
}

/**
 * 获取合法吃牌目标
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
    if (isFlag(target.name)) continue; // 军旗不能被 captureCard 吃
    if (!canCapture(piece, target)) continue;
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

  // 若翻开的是军旗，不分配阵营
  if (isFlag(card.name)) {
    state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
    state.turnCount++;
    return state;
  }

  // 若翻开的不是军旗且阵营未分配
  if (!state.teamAssigned) {
    if (state.mode === 'pve') {
      if (state.aiFirst) {
        // AI 翻牌：aiTeam = card.team，playerTeam = 另一方
        state.aiTeam = card.team;
        state.playerTeam = card.team === 'red' ? 'blue' : 'red';
      } else {
        // 玩家翻牌：playerTeam = card.team，aiTeam = 另一方
        state.playerTeam = card.team;
        state.aiTeam = card.team === 'red' ? 'blue' : 'red';
      }
    }
    // PVP 模式不需要设置 playerTeam/aiTeam
    state.teamAssigned = true;
  }

  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;
  return state;
}

/**
 * 执行走牌操作（就地修改state），包含抱军旗判定
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

  // 若目标位置是已翻开的军旗
  if (target && isFlag(target.name) && target.faceUp) {
    const flagResult = canCaptureFlag(state.board, from.x, from.y, state.currentTeam);
    if (!flagResult) return null; // 只有最小棋子才能抱军旗

    // 抱军旗获胜
    state.board[to.y][to.x] = card;
    state.board[from.y][from.x] = null;
    state.gameOver = true;
    state.winner = state.currentTeam;
    state.turnCount++;
    return state;
  }

  // 若目标位置为空
  if (target === null) {
    state.board[to.y][to.x] = card;
    state.board[from.y][from.x] = null;
    state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
    state.turnCount++;
    return state;
  }

  // 其他情况（目标有棋子但不是军旗）
  return null;
}

/**
 * 执行吃牌操作（就地修改state）
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
  if (!defender || !defender.faceUp) return null;
  if (attacker.team === defender.team) return null;
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return null;

  if (!canCapture(attacker, defender)) return null;

  const result = resolveCombat(attacker, defender);

  if (result === 'attacker_wins') {
    // 将被吃棋子加入对应 captured 列表
    if (defender.team === 'red') {
      state.capturedRed.push(defender.name);
    } else {
      state.capturedBlue.push(defender.name);
    }
    state.board[to.y][to.x] = attacker;
    state.board[from.y][from.x] = null;
  } else if (result === 'mutual_destruction') {
    // 双方均移除
    if (attacker.team === 'red') {
      state.capturedRed.push(attacker.name);
    } else {
      state.capturedBlue.push(attacker.name);
    }
    if (defender.team === 'red') {
      state.capturedRed.push(defender.name);
    } else {
      state.capturedBlue.push(defender.name);
    }
    state.board[from.y][from.x] = null;
    state.board[to.y][to.x] = null;
  } else {
    return null;
  }

  state.currentTeam = state.currentTeam === 'red' ? 'blue' : 'red';
  state.turnCount++;
  return state;
}

// ============================================================
// 任务 1.5：游戏结束判定和 AI 决策
// ============================================================

/**
 * 检查指定阵营是否有任何合法操作（翻牌/走牌/吃牌）
 * @param {Board} board
 * @param {string} team - 'red' | 'blue'
 * @returns {boolean}
 */
function hasAnyLegalAction(board, team) {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      // 翻牌：有任何未翻开的棋子即可
      if (piece && !piece.faceUp) return true;
      // 走牌/吃牌：己方已翻开的棋子
      if (piece && piece.faceUp && piece.team === team) {
        if (getValidMoves(board, x, y, team).length > 0) return true;
        if (getValidCaptures(board, x, y, team).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * 检查游戏是否结束
 * @param {GameState} state
 * @returns {{ended: boolean, winner: string|null}}
 */
function checkGameOver(state) {
  // 若已通过抱军旗获胜
  if (state.gameOver) {
    return { ended: true, winner: state.winner };
  }

  // 若当前行动方无合法操作
  if (state.currentTeam && !hasAnyLegalAction(state.board, state.currentTeam)) {
    const opponent = state.currentTeam === 'red' ? 'blue' : 'red';
    return { ended: true, winner: opponent };
  }

  return { ended: false, winner: null };
}

/**
 * AI决策：选择最优操作
 * 优先级：抱军旗 > 吃牌（优先吃高等级）> 翻牌（随机）> 走牌（随机）
 * @param {GameState} state
 * @param {string} aiTeam - AI阵营 'red' | 'blue'
 * @returns {{type, from?, to?, x?, y?}|null}
 */
function aiDecide(state, aiTeam) {
  const board = state.board;

  // 优先级1：抱军旗（最高优先级）
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
      const flagResult = canCaptureFlag(board, x, y, aiTeam);
      if (flagResult) {
        return { type: 'move', from: { x, y }, to: { x: flagResult.flagX, y: flagResult.flagY } };
      }
    }
  }

  // 优先级2：吃牌（优先吃高等级，避免高等级同归于尽）
  const allCaptures = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
      const targets = getValidCaptures(board, x, y, aiTeam);
      for (const t of targets) {
        const target = board[t.y][t.x];
        const combatResult = resolveCombat(piece, target);
        const mutual = combatResult === 'mutual_destruction';
        allCaptures.push({
          from: { x, y },
          to: t,
          defenderRank: target.rank !== null ? target.rank : 999,
          attackerRank: piece.rank !== null ? piece.rank : 999,
          mutual
        });
      }
    }
  }

  if (allCaptures.length > 0) {
    // non-mutual first，然后 defenderRank 升序（等级数值小=高等级），attackerRank 降序（用低价值棋子）
    allCaptures.sort((a, b) => {
      if (a.mutual !== b.mutual) return a.mutual ? 1 : -1;
      if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank;
      return b.attackerRank - a.attackerRank;
    });
    return { type: 'capture', from: allCaptures[0].from, to: allCaptures[0].to };
  }

  // 优先级3：翻牌（随机）
  const faceDownCells = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (piece && !piece.faceUp) faceDownCells.push({ x, y });
    }
  }
  if (faceDownCells.length > 0) {
    const pick = faceDownCells[Math.floor(Math.random() * faceDownCells.length)];
    return { type: 'flip', x: pick.x, y: pick.y };
  }

  // 优先级4：走牌（随机）
  const allMoves = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
      const targets = getValidMoves(board, x, y, aiTeam);
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
// 任务 1.6：模块导出
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NORMAL_PIECE_NAMES, BOMB_NAME, MINE_NAME, FLAG_NAME,
    TEAM_PIECE_NAMES, RANK_MAP,
    isNormalPiece, isBomb, isMine, isFlag, isMovable,
    getImagePath, getRank, judgeRPS, inBounds,
    canCapture, resolveCombat, getLowestNormalPiece, canCaptureFlag,
    createGameState, getValidMoves, getValidCaptures,
    flipCard, moveCard, captureCard,
    hasAnyLegalAction, checkGameOver, aiDecide
  };
}


// ============================================================
// UI 控制器（仅浏览器环境）
// 任务 5.1、5.2、5.3
// ============================================================
if (typeof document !== 'undefined') {
  var gameState = null;

  // DOM 元素
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

  // ============================================================
  // 任务 5.1：渲染器和事件处理
  // ============================================================

  function getCell(x, y) {
    return $board.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
  }

  function renderBoard(state) {
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 5; x++) {
        var cell = getCell(x, y);
        var piece = state.board[y][x];
        cell.className = 'cell';
        cell.innerHTML = '';
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (!piece) {
          cell.classList.add('cell-empty');
        } else if (!piece.faceUp) {
          var back = document.createElement('div');
          back.className = 'cell-back';
          cell.appendChild(back);
        } else {
          // 正面
          if (piece.team === 'red') {
            cell.classList.add('cell-red');
          } else if (piece.team === 'blue') {
            cell.classList.add('cell-blue');
          } else {
            // neutral（军旗）
            cell.classList.add('cell-neutral');
          }
          var face = document.createElement('div');
          face.className = 'cell-face';
          var img = document.createElement('img');
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
    // 当前行动方
    if (state.currentTeam) {
      if (state.currentTeam === 'red') {
        $currentTeam.textContent = '红方';
        $currentTeam.className = 'team-indicator red-text';
      } else {
        $currentTeam.textContent = '蓝方';
        $currentTeam.className = 'team-indicator blue-text';
      }
    } else {
      $currentTeam.textContent = '—';
      $currentTeam.className = 'team-indicator';
    }

    // 回合数
    $turnCount.textContent = state.turnCount;

    // 统计红方/蓝方剩余棋子数（不含军旗）
    var redCount = 0, blueCount = 0;
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 5; x++) {
        var p = state.board[y][x];
        if (p && !isFlag(p.name)) {
          if (p.team === 'red') redCount++;
          else if (p.team === 'blue') blueCount++;
        }
      }
    }
    $redRemaining.textContent = redCount;
    $blueRemaining.textContent = blueCount;

    // 被吃棋子图片
    $capturedRed.innerHTML = '';
    for (var i = 0; i < state.capturedRed.length; i++) {
      var name = state.capturedRed[i];
      var div = document.createElement('div');
      div.className = 'captured-card';
      var img = document.createElement('img');
      img.src = getImagePath({ name: name, team: 'red', rank: getRank(name), faceUp: true });
      img.alt = name;
      div.appendChild(img);
      $capturedRed.appendChild(div);
    }

    $capturedBlue.innerHTML = '';
    for (var i = 0; i < state.capturedBlue.length; i++) {
      var name = state.capturedBlue[i];
      var div = document.createElement('div');
      div.className = 'captured-card';
      var img = document.createElement('img');
      img.src = getImagePath({ name: name, team: 'blue', rank: getRank(name), faceUp: true });
      img.alt = name;
      div.appendChild(img);
      $capturedBlue.appendChild(div);
    }

    updateTeamLabels(state);
  }

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

  function clearHighlights() {
    document.querySelectorAll('.cell').forEach(function(c) {
      c.classList.remove('cell-selected', 'cell-target', 'cell-capture-target', 'cell-flag-target', 'cell-ai-highlight');
    });
  }

  function highlightTargets(x, y, moveTargets, captureTargets) {
    clearHighlights();
    var selected = getCell(x, y);
    if (selected) selected.classList.add('cell-selected');

    for (var i = 0; i < moveTargets.length; i++) {
      var t = moveTargets[i];
      var tc = getCell(t.x, t.y);
      if (tc) {
        if (t.type === 'capture_flag') {
          tc.classList.add('cell-flag-target');
        } else {
          tc.classList.add('cell-target');
        }
      }
    }

    for (var i = 0; i < captureTargets.length; i++) {
      var tc = getCell(captureTargets[i].x, captureTargets[i].y);
      if (tc) tc.classList.add('cell-capture-target');
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || '';
  }

  function selectCard(x, y) {
    gameState.selectedCell = { x: x, y: y };
    var currentTeam = gameState.currentTeam;
    var moves    = getValidMoves(gameState.board, x, y, currentTeam);
    var captures = getValidCaptures(gameState.board, x, y, currentTeam);
    highlightTargets(x, y, moves, captures);
    showMessage('', '');
  }

  // 棋盘点击事件
  $board.addEventListener('click', function(e) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.aiThinking) return;
    // PVE 模式且阵营已分配且当前是 AI 回合：忽略
    if (gameState.mode === 'pve' && gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) return;

    var cell = e.target.closest('.cell');
    if (!cell) return;

    var x = parseInt(cell.dataset.x);
    var y = parseInt(cell.dataset.y);
    var piece = gameState.board[y][x];
    var currentTeam = gameState.currentTeam;

    // 已有选中棋子
    if (gameState.selectedCell) {
      var sel = gameState.selectedCell;

      // 点击同一格：取消选中
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        return;
      }

      // 点击已翻开的军旗：尝试抱军旗（moveCard）
      if (piece && piece.faceUp && isFlag(piece.name)) {
        var result = moveCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
        if (result) {
          gameState.selectedCell = null;
          clearHighlights();
          renderBoard(gameState);
          afterAction();
        } else {
          showMessage('只有最小棋子才能抱军旗', 'error');
        }
        return;
      }

      // 点击对方已翻开棋子（非军旗）：尝试吃牌
      if (piece && piece.faceUp && piece.team !== currentTeam && !isFlag(piece.name)) {
        var captures = getValidCaptures(gameState.board, sel.x, sel.y, currentTeam);
        var canDo = captures.some(function(t) { return t.x === x && t.y === y; });
        if (canDo) {
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

      // 点击空位：尝试走牌
      if (!piece) {
        var result = moveCard(gameState, { x: sel.x, y: sel.y }, { x: x, y: y });
        if (result) {
          gameState.selectedCell = null;
          clearHighlights();
          renderBoard(gameState);
          afterAction();
          return;
        }
        showMessage('无法移动到该位置', 'error');
        return;
      }

      // 点击己方已翻开棋子：重新选中
      if (piece && piece.faceUp && piece.team === currentTeam) {
        selectCard(x, y);
        return;
      }

      // 其他：取消选中
      gameState.selectedCell = null;
      clearHighlights();
      return;
    }

    // 无选中棋子
    if (piece && !piece.faceUp) {
      // 点击未翻开棋子：翻牌
      var result = flipCard(gameState, x, y);
      if (result) {
        clearHighlights();
        renderBoard(gameState);
        afterAction();
      }
      return;
    }

    if (piece && piece.faceUp && isFlag(piece.name)) {
      showMessage('军旗不能被吃', 'error');
      return;
    }

    if (piece && piece.faceUp && piece.team === currentTeam) {
      selectCard(x, y);
      return;
    }

    if (piece && piece.faceUp && piece.team !== currentTeam) {
      showMessage('这不是你的棋子', 'error');
      return;
    }
  });

  // ============================================================
  // 任务 5.2：模式选择和石头剪刀布流程
  // ============================================================

  function showModeSelection() {
    $modeSelection.style.display = 'flex';
    $rpsSection.style.display   = 'none';
    $gameArea.style.display     = 'none';
    $gameOver.style.display     = 'none';
  }

  function showRPSSelection(mode) {
    $modeSelection.style.display = 'none';
    $rpsSection.style.display   = 'flex';
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
    $rpsSection.style.display   = 'none';
    $gameArea.style.display     = 'flex';
    $gameOver.style.display     = 'none';
  }

  function showGameOverScreen(winner) {
    var winnerName = winner === 'red' ? '红方' : '蓝方';
    $winnerText.textContent = winnerName + '获胜！';
    $gameOver.style.display = 'flex';
  }

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

  var rpsP1Choice = null;
  var rpsP2Choice = null;

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
        // 玩家赢：玩家先手
        $rpsResult.textContent = '电脑出了' + aiChoiceName + '，你赢了！你先手';
        gameState.aiFirst = false;
        setTimeout(function() { startGame('red'); }, 1500);
      } else {
        // 电脑赢：电脑先手
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

  // 模式选择按钮
  document.getElementById('btn-pvp').addEventListener('click', function() {
    gameState = createGameState('pvp');
    showRPSSelection('pvp');
  });

  document.getElementById('btn-pve').addEventListener('click', function() {
    gameState = createGameState('pve');
    showRPSSelection('pve');
  });

  // 重新开始按钮
  $btnRestart.addEventListener('click', function() {
    gameState = null;
    showModeSelection();
  });

  // ============================================================
  // 任务 5.3：AI 操作执行与动画
  // ============================================================

  function afterAction() {
    var result = checkGameOver(gameState);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      setTimeout(function() { showGameOverScreen(result.winner); }, 500);
      return;
    }

    if (gameState.mode === 'pve') {
      if (gameState.teamAssigned && gameState.currentTeam === gameState.aiTeam) {
        triggerAI();
      } else if (!gameState.teamAssigned && gameState.aiFirst) {
        showMessage('请翻开一张牌', '');
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

  // 初始化
  showModeSelection();
}
