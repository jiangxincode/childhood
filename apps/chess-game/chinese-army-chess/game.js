// ============================================================
// 军棋（明棋）- 游戏核心逻辑
// ============================================================

// ============================================================
// 常量定义
// ============================================================

var NORMAL_PIECE_NAMES = ['工兵', '排长', '连长', '营长', '团长', '旅长', '师长', '军长', '司令'];
var BOMB_NAME = '炸弹';
var MINE_NAME = '地雷';
var FLAG_NAME = '军旗';

// 等级映射：数值越大等级越高（与 LifeLikeChess flag 一致）
var RANK_MAP = {
  '工兵': 0, '排长': 1, '连长': 2, '营长': 3, '团长': 4,
  '旅长': 5, '师长': 6, '军长': 7, '司令': 8
};

// 每种棋子的数量
var PIECE_COUNTS = {
  '工兵': 3, '排长': 3, '连长': 3, '营长': 2, '团长': 2,
  '旅长': 2, '师长': 2, '军长': 1, '司令': 1,
  '炸弹': 2, '地雷': 3, '军旗': 1
};

// 棋盘尺寸
var COLS = 5;
var ROWS = 12; // 数组行数（视觉上有 gap row，共 13 行）

// 阵营
var RED = 'red';
var BLUE = 'blue';

// 棋子状态
var STATE_FACE_UP = 'face_up';
var STATE_FACE_DOWN = 'face_down';

// ============================================================
// 棋盘布局常量
// ============================================================

// 行营位置（数组坐标）
var CAMPS = [
  { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 },
  { x: 1, y: 4 }, { x: 3, y: 4 },
  { x: 1, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 8 },
  { x: 1, y: 9 }, { x: 3, y: 9 }
];

// 大本营位置（数组坐标）
var BASE_CAMPS = [
  { x: 1, y: 0 }, { x: 3, y: 0 },
  { x: 1, y: 11 }, { x: 3, y: 11 }
];

// 水平铁路行（数组 y 坐标）
var H_RAILWAYS = [1, 5, 6, 10];

// 垂直铁路列和范围
var V_RAILWAY_LEFT_RIGHT = { x: [0, 4], yMin: 1, yMax: 10 };
var V_RAILWAY_MIDDLE = { x: 2, yMin: 5, yMax: 6 };

// ============================================================
// 工具函数
// ============================================================

function isNormalPiece(name) {
  return NORMAL_PIECE_NAMES.indexOf(name) !== -1;
}

function isBomb(name) { return name === BOMB_NAME; }
function isMine(name) { return name === MINE_NAME; }
function isFlag(name) { return name === FLAG_NAME; }

function isMovable(piece) {
  return !isMine(piece.name) && !isFlag(piece.name);
}

function getRank(name) {
  return RANK_MAP[name] !== undefined ? RANK_MAP[name] : null;
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function isCamp(x, y) {
  for (var i = 0; i < CAMPS.length; i++) {
    if (CAMPS[i].x === x && CAMPS[i].y === y) return true;
  }
  return false;
}

function isBaseCamp(x, y) {
  for (var i = 0; i < BASE_CAMPS.length; i++) {
    if (BASE_CAMPS[i].x === x && BASE_CAMPS[i].y === y) return true;
  }
  return false;
}

// 获取视觉行号（跳过 gap row）
function getBoardRow(y) {
  return y > 5 ? y + 1 : y;
}

// 判断位置是否有对角线连接资格（用于行营进出）
function hasDiagonalEligibility(x, y) {
  if (!inBounds(x, y)) return false;
  var boardRow = getBoardRow(y);
  return (x + boardRow) % 2 === 1;
}

// 判断是否在铁路上
function isOnHRailway(y) {
  return H_RAILWAYS.indexOf(y) !== -1;
}

function isOnVRailway(x, y) {
  if ((x === 0 || x === 4) && y >= 1 && y <= 10) return true;
  if (x === 2 && y >= 5 && y <= 6) return true;
  return false;
}

function isOnRailway(x, y) {
  return isOnHRailway(y) || isOnVRailway(x, y);
}

// 判断两个位置是否通过铁路连接（相邻且都在铁路上）
function areOnSameRailway(x1, y1, x2, y2) {
  // 水平相邻
  if (y1 === y2 && Math.abs(x1 - x2) === 1) {
    return isOnHRailway(y1);
  }
  // 垂直相邻
  if (x1 === x2 && Math.abs(y1 - y2) === 1) {
    // 跨越 gap row (y=5 ↔ y=6)：只有中间列 (x=2) 可以跨越
    if ((y1 === 5 && y2 === 6) || (y1 === 6 && y2 === 5)) {
      if (x1 === 2) return true;
      // 侧边铁路 (x=0,4) 直接跨越 gap，不需要特殊检查
      return isOnVRailway(x1, y1) && isOnVRailway(x1, y2);
    }
    return isOnVRailway(x1, y1) && isOnVRailway(x1, y2);
  }
  return false;
}

// 获取图片路径
function getImagePath(piece) {
  if (isFlag(piece.name)) return 'images/军旗.png';
  if (piece.team === RED) return 'images/红-' + piece.name + '.png';
  return 'images/蓝-' + piece.name + '.png';
}

// 石头剪刀布判定
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

// ============================================================
// 战斗判定
// ============================================================

function canCapture(attacker, defender) {
  if (isFlag(defender.name)) return false;
  if (isMine(attacker.name)) return false;
  if (isFlag(attacker.name)) return false;
  if (attacker.team === defender.team) return false;
  if (isBomb(attacker.name)) return true;
  if (isBomb(defender.name)) return true;
  if (attacker.name === '工兵' && isMine(defender.name)) return true;
  if (isMine(defender.name) && isNormalPiece(attacker.name)) return true;
  if (isNormalPiece(attacker.name) && isNormalPiece(defender.name)) {
    return attacker.rank >= defender.rank;
  }
  return false;
}

function resolveCombat(attacker, defender) {
  if (!canCapture(attacker, defender)) return 'invalid';
  if (isBomb(attacker.name)) return 'mutual_destruction';
  if (isBomb(defender.name)) return 'mutual_destruction';
  if (attacker.name === '工兵' && isMine(defender.name)) return 'attacker_wins';
  if (isMine(defender.name)) return 'mutual_destruction';
  if (attacker.rank === defender.rank) return 'mutual_destruction';
  if (attacker.rank > defender.rank) return 'attacker_wins';
  return 'invalid';
}

// ============================================================
// 创建游戏状态
// ============================================================

function createGameState(mode) {
  var gameType = mode.gameType || 'open';
  var oppType = mode.oppType || 'pvp';

  var pieces = [];

  // 红方 25 颗
  var redNames = [];
  for (var name in PIECE_COUNTS) {
    for (var i = 0; i < PIECE_COUNTS[name]; i++) {
      redNames.push(name);
    }
  }
  for (var i = 0; i < redNames.length; i++) {
    pieces.push({
      name: redNames[i],
      team: RED,
      rank: getRank(redNames[i]),
      state: STATE_FACE_UP
    });
  }

  // 蓝方 25 颗
  for (var i = 0; i < redNames.length; i++) {
    pieces.push({
      name: redNames[i],
      team: BLUE,
      rank: getRank(redNames[i]),
      state: STATE_FACE_UP
    });
  }

  // 放置棋子
  var board = [];
  for (var y = 0; y < ROWS; y++) {
    board[y] = [];
    for (var x = 0; x < COLS; x++) {
      board[y][x] = null;
    }
  }

  if (gameType === 'flip') {
    // 翻棋：50颗随机放满全棋盘，全部面朝下
    placePiecesRandom(board, pieces);
  } else {
    // 明棋/暗棋：分半约束放置
    placePiecesForTeam(board, pieces.slice(0, 25), 0);  // 红方 → y 6-11
    placePiecesForTeam(board, pieces.slice(25, 50), 1);  // 蓝方 → y 0-5

    // 暗棋：对方棋子面朝下
    if (gameType === 'hidden') {
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          var p = board[y][x];
          if (p) p.state = STATE_FACE_DOWN;
        }
      }
    }
  }

  return {
    gameType: gameType,
    oppType: oppType,
    board: board,
    currentTeam: null,
    playerTeam: null,
    aiTeam: null,
    firstPlayer: null,
    turnCount: 0,
    capturedRed: [],
    capturedBlue: [],
    selectedCell: null,
    gameOver: false,
    winner: null,
    aiThinking: false
  };
}

function placePiecesForTeam(board, pieces, halfIndex) {
  // halfIndex: 0 = bottom half (y 6-11), 1 = top half (y 0-5)
  var yStart = halfIndex === 0 ? 6 : 0;

  // 分类棋子
  var flags = [];
  var mines = [];
  var bombs = [];
  var others = [];

  for (var i = 0; i < pieces.length; i++) {
    var p = pieces[i];
    if (isFlag(p.name)) flags.push(p);
    else if (isMine(p.name)) mines.push(p);
    else if (isBomb(p.name)) bombs.push(p);
    else others.push(p);
  }

  // 收集该半区所有位置（排除行营）
  var allPositions = [];
  for (var y = yStart; y < yStart + 6; y++) {
    for (var x = 0; x < COLS; x++) {
      if (!isCamp(x, y)) {
        allPositions.push({ x: x, y: y });
      }
    }
  }

  // 标记已占用的位置
  var occupied = {};
  function occupy(x, y) { occupied[x + ',' + y] = true; }
  function isOccupied(x, y) { return !!occupied[x + ',' + y]; }

  // 1. 放置军旗：必须在大本营
  var baseCampPositions = [];
  for (var i = 0; i < BASE_CAMPS.length; i++) {
    var bc = BASE_CAMPS[i];
    if (bc.y >= yStart && bc.y < yStart + 6) {
      baseCampPositions.push(bc);
    }
  }
  shuffle(baseCampPositions);
  for (var i = 0; i < flags.length; i++) {
    var pos = baseCampPositions[i];
    board[pos.y][pos.x] = flags[i];
    occupy(pos.x, pos.y);
  }

  // 2. 放置地雷：只能在最后两行（排除行营）
  var mineRows = [];
  for (var y = yStart + 4; y < yStart + 6; y++) {
    for (var x = 0; x < COLS; x++) {
      if (!isCamp(x, y) && !isOccupied(x, y)) mineRows.push({ x: x, y: y });
    }
  }
  shuffle(mineRows);
  for (var i = 0; i < mines.length; i++) {
    var pos = mineRows[i];
    board[pos.y][pos.x] = mines[i];
    occupy(pos.x, pos.y);
  }

  // 3. 放置炸弹：不能在第一行（排除行营）
  var bombPositions = [];
  for (var i = 0; i < allPositions.length; i++) {
    var pos = allPositions[i];
    if (pos.y === yStart) continue; // 排除第一行
    if (!isOccupied(pos.x, pos.y)) bombPositions.push(pos);
  }
  shuffle(bombPositions);
  for (var i = 0; i < bombs.length; i++) {
    var pos = bombPositions[i];
    board[pos.y][pos.x] = bombs[i];
    occupy(pos.x, pos.y);
  }

  // 4. 放置其余棋子（排除行营）
  var remaining = [];
  for (var i = 0; i < allPositions.length; i++) {
    var pos = allPositions[i];
    if (!isOccupied(pos.x, pos.y)) remaining.push(pos);
  }
  shuffle(remaining);
  for (var i = 0; i < others.length; i++) {
    var pos = remaining[i];
    board[pos.y][pos.x] = others[i];
    occupy(pos.x, pos.y);
  }
}

function placePiecesRandom(board, pieces) {
  // 收集全部位置（排除行营）
  var allPositions = [];
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      if (!isCamp(x, y)) {
        allPositions.push({ x: x, y: y });
      }
    }
  }
  shuffle(allPositions);

  // 所有棋子面朝下
  for (var i = 0; i < pieces.length; i++) {
    pieces[i].state = STATE_FACE_DOWN;
  }

  // 随机放置
  for (var i = 0; i < pieces.length; i++) {
    var pos = allPositions[i];
    board[pos.y][pos.x] = pieces[i];
  }
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// ============================================================
// 移动验证
// ============================================================

function getValidMoves(board, x, y, team, gameType) {
  var piece = board[y][x];
  if (!piece || piece.team !== team) return [];
  if (!isMovable(piece)) return [];
  // 面朝下的棋子不能移动
  if (piece.state === STATE_FACE_DOWN) return [];

  var isEngineer = piece.name === '工兵';
  var moves = [];

  if (isEngineer) {
    // 工兵：BFS 沿铁路无限移动 + 普通移动 + 对角线移动
    moves = getEngineerMoves(board, x, y, team);
  } else {
    // 普通棋子：一步移动
    moves = getNormalMoves(board, x, y, team);
  }

  // 添加对角线移动（行营进出）
  var diagMoves = getDiagonalMoves(board, x, y, team);
  for (var i = 0; i < diagMoves.length; i++) {
    var dm = diagMoves[i];
    var dup = false;
    for (var j = 0; j < moves.length; j++) {
      if (moves[j].x === dm.x && moves[j].y === dm.y) { dup = true; break; }
    }
    if (!dup) moves.push(dm);
  }

  return moves;
}

function getNormalMoves(board, x, y, team) {
  var moves = [];
  var dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

  for (var d = 0; d < dirs.length; d++) {
    var nx = x + dirs[d].dx;
    var ny = y + dirs[d].dy;
    if (!inBounds(nx, ny)) continue;

    // 跨越 gap row 检查：只有中间列(x=2)或侧边垂直铁路(x=0,4)可以跨越
    if ((y === 5 && ny === 6) || (y === 6 && ny === 5)) {
      if (x !== 2 && !isOnVRailway(x, y)) continue;
    }

    // 普通棋子可以向相邻位置移动一步
    var target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: 'move' });
    } else if (target.team !== team) {
      // 检查行营保护
      if (isCamp(nx, ny)) continue;
      if (isBaseCamp(nx, ny)) continue;
      // 面朝下的棋子不能被攻击
      if (target.state === STATE_FACE_DOWN) continue;
      if (canCapture(board[y][x], target)) {
        moves.push({ x: nx, y: ny, type: 'capture' });
      }
    }
  }

  // 铁路上的非工兵棋子：沿铁路额外移动一步
  if (isOnRailway(x, y)) {
    for (var d = 0; d < dirs.length; d++) {
      var nx = x + dirs[d].dx;
      var ny = y + dirs[d].dy;
      if (!inBounds(nx, ny)) continue;
      if (!areOnSameRailway(x, y, nx, ny)) continue;

      // 检查是否已经包含
      var dup = false;
      for (var j = 0; j < moves.length; j++) {
        if (moves[j].x === nx && moves[j].y === ny) { dup = true; break; }
      }
      if (dup) continue;

      var target = board[ny][nx];
      if (target === null) {
        moves.push({ x: nx, y: ny, type: 'move' });
      } else if (target.team !== team) {
        if (isCamp(nx, ny)) continue;
        if (isBaseCamp(nx, ny)) continue;
        if (target.state === STATE_FACE_DOWN) continue;
        if (canCapture(board[y][x], target)) {
          moves.push({ x: nx, y: ny, type: 'capture' });
        }
      }
    }
  }

  return moves;
}

function getEngineerMoves(board, x, y, team) {
  var moves = [];
  var visited = {};
  visited[x + ',' + y] = true;
  var queue = [{ x: x, y: y }];
  var dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

  // 一步正交移动（到达相邻的非铁路格，如行营）
  for (var d = 0; d < dirs.length; d++) {
    var nx = x + dirs[d].dx;
    var ny = y + dirs[d].dy;
    if (!inBounds(nx, ny)) continue;

    // 跨越 gap row 检查
    if ((y === 5 && ny === 6) || (y === 6 && ny === 5)) {
      if (x !== 2 && !isOnVRailway(x, y)) continue;
    }

    // 跳过铁路上的格子，留给 BFS 处理
    if (isOnRailway(nx, ny)) continue;

    var key = nx + ',' + ny;
    if (visited[key]) continue;
    var target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: 'move' });
    } else if (target.team !== team) {
      if (isCamp(nx, ny)) continue;
      if (isBaseCamp(nx, ny)) continue;
      if (target.state === STATE_FACE_DOWN) continue;
      if (canCapture(board[y][x], target)) {
        moves.push({ x: nx, y: ny, type: 'capture' });
      }
    }
  }

  while (queue.length > 0) {
    var cur = queue.shift();
    for (var d = 0; d < dirs.length; d++) {
      var nx = cur.x + dirs[d].dx;
      var ny = cur.y + dirs[d].dy;
      var key = nx + ',' + ny;
      if (visited[key]) continue;
      if (!inBounds(nx, ny)) continue;

      // 检查铁路连接
      if (!areOnSameRailway(cur.x, cur.y, nx, ny)) continue;

      visited[key] = true;
      var target = board[ny][nx];
      if (target === null) {
        moves.push({ x: nx, y: ny, type: 'move' });
        queue.push({ x: nx, y: ny });
      } else if (target.team !== team) {
        // 面朝下的棋子不能被攻击
        if (target.state === STATE_FACE_DOWN) continue;
        // 行营/大本营保护：但军旗可以被工兵扛走
        if (isFlag(target.name)) {
          moves.push({ x: nx, y: ny, type: 'capture_flag' });
        } else if (!isCamp(nx, ny) && !isBaseCamp(nx, ny)) {
          if (canCapture(board[y][x], target)) {
            moves.push({ x: nx, y: ny, type: 'capture' });
          }
        }
        // 被阻挡，不继续（军旗除外，已处理）
        if (!isFlag(target.name)) {
          // 非军旗棋子阻挡，不继续探索
        }
      }
    }
  }

  return moves;
}

function getDiagonalMoves(board, x, y, team) {
  var moves = [];
  var piece = board[y][x];
  if (!piece) return moves;

  var inCamp = isCamp(x, y);

  var diagDirs = [{ dx: -1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }];

  for (var d = 0; d < diagDirs.length; d++) {
    var nx = x + diagDirs[d].dx;
    var ny = y + diagDirs[d].dy;
    if (!inBounds(nx, ny)) continue;

    if (inCamp) {
      // 在行营中：沿对角线方向移动，可经过空的非行营格子到达另一个行营
      var cx = x + diagDirs[d].dx;
      var cy = y + diagDirs[d].dy;
      while (inBounds(cx, cy)) {
        var target = board[cy][cx];
        if (isCamp(cx, cy)) {
          // 到达另一个行营
          if (target === null) {
            moves.push({ x: cx, y: cy, type: 'move' });
          }
          break;
        }
        if (isBaseCamp(cx, cy)) break;
        if (target === null) {
          // 空的非行营格子，可以经过并继续
          moves.push({ x: cx, y: cy, type: 'move' });
        } else if (target.team !== team) {
          // 遇到敌方棋子，可以吃但不能继续前进
          if (target.state === STATE_FACE_DOWN) break;
          if (isFlag(target.name) && piece.name === '工兵') {
            moves.push({ x: cx, y: cy, type: 'capture_flag' });
          } else {
            if (canCapture(piece, target)) {
              moves.push({ x: cx, y: cy, type: 'capture' });
            }
          }
          break;
        } else {
          // 遇到己方棋子，不能经过
          break;
        }
        cx += diagDirs[d].dx;
        cy += diagDirs[d].dy;
      }
    } else {
      // 不在行营：只能进入行营或大本营
      if (isCamp(nx, ny) || isBaseCamp(nx, ny)) {
        var target = board[ny][nx];
        if (target === null) {
          moves.push({ x: nx, y: ny, type: 'move' });
        } else if (target.team !== team && target.state !== STATE_FACE_DOWN && isFlag(target.name) && piece.name === '工兵') {
          moves.push({ x: nx, y: ny, type: 'capture_flag' });
        }
      }
    }
  }

  return moves;
}

// ============================================================
// 棋子操作
// ============================================================

function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  var piece = state.board[from.y][from.x];
  if (!piece || piece.team !== state.currentTeam) return null;

  var validMoves = getValidMoves(state.board, from.x, from.y, state.currentTeam);
  var valid = null;
  for (var i = 0; i < validMoves.length; i++) {
    if (validMoves[i].x === to.x && validMoves[i].y === to.y) {
      valid = validMoves[i];
      break;
    }
  }
  if (!valid) return null;

  var target = state.board[to.y][to.x];

  if (valid.type === 'capture_flag') {
    // 工兵扛旗获胜
    state.board[to.y][to.x] = piece;
    state.board[from.y][from.x] = null;
    state.gameOver = true;
    state.winner = state.currentTeam;
    state.turnCount++;
    return state;
  }

  if (valid.type === 'capture') {
    var result = resolveCombat(piece, target);
    if (result === 'attacker_wins') {
      addCaptured(state, target);
      // 暗棋模式：司令被吃，暴露对方军旗
      if (state.gameType === 'hidden' && target.name === '司令') {
        revealFlag(state, target.team);
      }
      state.board[to.y][to.x] = piece;
      state.board[from.y][from.x] = null;
    } else if (result === 'mutual_destruction') {
      addCaptured(state, piece);
      addCaptured(state, target);
      // 暗棋模式：司令同归于尽，暴露双方军旗
      if (state.gameType === 'hidden') {
        if (piece.name === '司令') revealFlag(state, piece.team);
        if (target.name === '司令') revealFlag(state, target.team);
      }
      state.board[from.y][from.x] = null;
      state.board[to.y][to.x] = null;
    } else {
      return null;
    }
  } else {
    // 普通移动
    state.board[to.y][to.x] = piece;
    state.board[from.y][from.x] = null;
  }

  state.currentTeam = state.currentTeam === RED ? BLUE : RED;
  state.turnCount++;
  return state;
}

function flipPiece(state, x, y) {
  if (state.gameType !== 'flip') return null;
  if (!inBounds(x, y)) return null;
  var piece = state.board[y][x];
  if (!piece || piece.state !== STATE_FACE_DOWN) return null;

  piece.state = STATE_FACE_UP;
  state.currentTeam = state.currentTeam === RED ? BLUE : RED;
  state.turnCount++;
  return state;
}

function revealFlag(state, team) {
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var p = state.board[y][x];
      if (p && p.team === team && isFlag(p.name)) {
        p.state = STATE_FACE_UP;
      }
    }
  }
}

function addCaptured(state, piece) {
  if (piece.team === RED) {
    state.capturedRed.push(piece.name);
  } else {
    state.capturedBlue.push(piece.name);
  }
}

// ============================================================
// 游戏结束判定
// ============================================================

function hasAnyLegalAction(board, team, gameType) {
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var piece = board[y][x];
      if (!piece || piece.team !== team) continue;

      // 翻棋模式：面朝下的棋子可以翻开
      if (gameType === 'flip' && piece.state === STATE_FACE_DOWN) return true;

      // 面朝上的可移动棋子
      if (piece.state === STATE_FACE_UP && isMovable(piece)) {
        if (getValidMoves(board, x, y, team, gameType).length > 0) return true;
      }
    }
  }
  return false;
}

function checkGameOver(state) {
  if (state.gameOver) return { ended: true, winner: state.winner };

  // 检查是否有可移动棋子
  var hasRed = false, hasBlue = false;
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var p = state.board[y][x];
      if (p && p.team === RED && isMovable(p)) hasRed = true;
      if (p && p.team === BLUE && isMovable(p)) hasBlue = true;
    }
  }

  if (!hasRed && !hasBlue) return { ended: true, winner: null }; // 平局
  if (!hasRed) return { ended: true, winner: BLUE };
  if (!hasBlue) return { ended: true, winner: RED };

  // 检查当前方是否有合法操作
  if (state.currentTeam && !hasAnyLegalAction(state.board, state.currentTeam, state.gameType)) {
    var opponent = state.currentTeam === RED ? BLUE : RED;
    return { ended: true, winner: opponent };
  }

  return { ended: false, winner: null };
}

// ============================================================
// AI 决策
// ============================================================

function aiDecide(state, aiTeam) {
  var board = state.board;
  var gameType = state.gameType;

  // 翻棋模式：优先翻开棋子
  if (gameType === 'flip') {
    var faceDown = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = board[y][x];
        if (p && p.state === STATE_FACE_DOWN) {
          faceDown.push({ x: x, y: y });
        }
      }
    }
    if (faceDown.length > 0) {
      // 优先翻开己方棋子附近的，或随机翻开
      var pick = faceDown[Math.floor(Math.random() * faceDown.length)];
      return { type: 'flip', from: { x: pick.x, y: pick.y }, to: { x: pick.x, y: pick.y } };
    }
  }

  // 优先级1：工兵扛旗
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var piece = board[y][x];
      if (!piece || piece.team !== aiTeam || piece.name !== '工兵') continue;
      if (piece.state === STATE_FACE_DOWN) continue;
      var moves = getValidMoves(board, x, y, aiTeam, gameType);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].type === 'capture_flag') {
          return { type: 'move', from: { x: x, y: y }, to: { x: moves[i].x, y: moves[i].y } };
        }
      }
    }
  }

  // 优先级2：有利吃子
  var bestCapture = null;
  var bestScore = -999;
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var piece = board[y][x];
      if (!piece || piece.team !== aiTeam || !isMovable(piece)) continue;
      if (piece.state === STATE_FACE_DOWN) continue;
      var moves = getValidMoves(board, x, y, aiTeam, gameType);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].type !== 'capture') continue;
        var target = board[moves[i].y][moves[i].x];
        if (target.state === STATE_FACE_DOWN) continue;
        var result = resolveCombat(piece, target);
        var score = 0;
        if (result === 'attacker_wins') {
          score = (target.rank !== null ? target.rank : 10) + 5;
        } else if (result === 'mutual_destruction') {
          score = (target.rank !== null ? target.rank : 10) - (piece.rank !== null ? piece.rank : 10);
        }
        if (score > bestScore) {
          bestScore = score;
          bestCapture = { from: { x: x, y: y }, to: { x: moves[i].x, y: moves[i].y } };
        }
      }
    }
  }
  if (bestCapture && bestScore > 0) {
    return { type: 'move', from: bestCapture.from, to: bestCapture.to };
  }

  // 优先级3：普通移动
  var allMoves = [];
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var piece = board[y][x];
      if (!piece || piece.team !== aiTeam || !isMovable(piece)) continue;
      if (piece.state === STATE_FACE_DOWN) continue;
      var moves = getValidMoves(board, x, y, aiTeam, gameType);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].type === 'move') {
          allMoves.push({ from: { x: x, y: y }, to: { x: moves[i].x, y: moves[i].y } });
        }
      }
    }
  }
  // 铁路上的移动优先
  var railwayMoves = [];
  var normalMoves = [];
  for (var i = 0; i < allMoves.length; i++) {
    if (isOnRailway(allMoves[i].from.x, allMoves[i].from.y)) {
      railwayMoves.push(allMoves[i]);
    } else {
      normalMoves.push(allMoves[i]);
    }
  }
  var pool = railwayMoves.length > 0 ? railwayMoves : normalMoves;
  if (pool.length === 0) pool = allMoves;
  if (pool.length > 0) {
    var pick = pool[Math.floor(Math.random() * pool.length)];
    return { type: 'move', from: pick.from, to: pick.to };
  }

  // 优先级4：同归于尽的吃子
  if (bestCapture) {
    return { type: 'move', from: bestCapture.from, to: bestCapture.to };
  }

  return null;
}

// ============================================================
// 模块导出
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NORMAL_PIECE_NAMES, BOMB_NAME, MINE_NAME, FLAG_NAME,
    RANK_MAP, PIECE_COUNTS, COLS, ROWS, RED, BLUE,
    STATE_FACE_UP, STATE_FACE_DOWN,
    CAMPS, BASE_CAMPS, H_RAILWAYS,
    isNormalPiece, isBomb, isMine, isFlag, isMovable, getRank,
    inBounds, isCamp, isBaseCamp, getBoardRow, hasDiagonalEligibility,
    isOnHRailway, isOnVRailway, isOnRailway, areOnSameRailway,
    judgeRPS, canCapture, resolveCombat,
    createGameState, placePiecesForTeam, placePiecesRandom, shuffle,
    getValidMoves, getNormalMoves, getEngineerMoves, getDiagonalMoves,
    flipPiece, revealFlag, moveCard, addCaptured,
    hasAnyLegalAction, checkGameOver, aiDecide
  };
}

// ============================================================
// 浏览器 UI（SVG + DOM 渲染，参考 junqi-master 风格）
// ============================================================
if (typeof document !== 'undefined') {
  var gameState = null;

  // 棋盘 SVG 视图坐标系
  var SVG_W = 480;
  var SVG_H = 780;
  var PAD = 36;
  var COL_SPACE = (SVG_W - 2 * PAD) / (COLS - 1); // = 102
  var GAP = 20;
  // 13 个视觉行 (0-12)，gap 在第 5 和第 7 行之间
  var ROW_SPACE = (SVG_H - 2 * PAD - GAP) / 12; // ≈ 59.7

  // 数组坐标 → SVG 坐标
  function svgX(x) { return PAD + x * COL_SPACE; }
  function svgY(y) {
    var vr = getBoardRow(y);
    if (vr <= 5) return PAD + vr * ROW_SPACE;
    return PAD + GAP + vr * ROW_SPACE;
  }

  // DOM 元素
  var $modeSelection = document.getElementById('mode-selection');
  var $gameArea = document.getElementById('game-area');
  var $boardContainer = document.getElementById('board-container');
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

  var boardScale = 1;

  // 石头剪刀布状态
  var rpsChoices = { player1: null, player2: null, human: null };
  var pendingMode = null; // 等待 RPS 结束后开始的游戏模式

  // ============================================================
  // SVG 棋盘构建（只执行一次）
  // ============================================================
  function buildBoardSVG() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + SVG_W + ' ' + SVG_H);
    svg.setAttribute('width', '100%');
    svg.style.display = 'block';

    // 铁路条纹图案
    var defs = document.createElementNS(ns, 'defs');
    var pat = document.createElementNS(ns, 'pattern');
    pat.setAttribute('id', 'rail-stripe');
    pat.setAttribute('patternUnits', 'userSpaceOnUse');
    pat.setAttribute('width', '8');
    pat.setAttribute('height', '8');
    pat.setAttribute('patternTransform', 'rotate(45)');
    var r1 = document.createElementNS(ns, 'rect');
    r1.setAttribute('width', '4'); r1.setAttribute('height', '8');
    r1.setAttribute('fill', '#EAC611');
    var r2 = document.createElementNS(ns, 'rect');
    r2.setAttribute('x', '4'); r2.setAttribute('width', '4');
    r2.setAttribute('height', '8'); r2.setAttribute('fill', '#111');
    pat.appendChild(r1); pat.appendChild(r2);
    defs.appendChild(pat);
    svg.appendChild(defs);

    var gHighway = document.createElementNS(ns, 'g');
    var gRailway = document.createElementNS(ns, 'g');
    var gDiag = document.createElementNS(ns, 'g');
    var gStation = document.createElementNS(ns, 'g');

    // ---- 公路（灰色细线）----
    // 水平公路
    var hHighwayRows = [0, 2, 3, 4, 7, 8, 9, 11];
    for (var i = 0; i < hHighwayRows.length; i++) {
      var y = hHighwayRows[i];
      addSVGLine(gHighway, ns, svgX(0), svgY(y), svgX(4), svgY(y), 'gray', 1);
    }
    // 垂直公路
    for (var x = 0; x < COLS; x++) {
      addSVGLine(gHighway, ns, svgX(x), svgY(0), svgX(x), svgY(5), 'gray', 1);
      addSVGLine(gHighway, ns, svgX(x), svgY(6), svgX(x), svgY(11), 'gray', 1);
    }

    // ---- 铁路（金色/黑色条纹粗线）----
    // 水平铁路
    var hRailRows = [1, 5, 6, 10];
    for (var i = 0; i < hRailRows.length; i++) {
      var y = hRailRows[i];
      addSVGLine(gRailway, ns, svgX(0), svgY(y), svgX(4), svgY(y), 'url(#rail-stripe)', 4);
    }
    // 垂直铁路
    addSVGLine(gRailway, ns, svgX(0), svgY(1), svgX(0), svgY(10), 'url(#rail-stripe)', 4);
    addSVGLine(gRailway, ns, svgX(4), svgY(1), svgX(4), svgY(10), 'url(#rail-stripe)', 4);
    addSVGLine(gRailway, ns, svgX(2), svgY(5), svgX(2), svgY(6), 'url(#rail-stripe)', 4);

    // ---- 对角线（灰色虚线）----
    var drawn = {};
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (!hasDiagonalEligibility(x, y) && !isCamp(x, y)) continue;
        var diagDirs = [{ dx: -1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }];
        for (var d = 0; d < diagDirs.length; d++) {
          var nx = x + diagDirs[d].dx;
          var ny = y + diagDirs[d].dy;
          if (!inBounds(nx, ny)) continue;
          if (!hasDiagonalEligibility(nx, ny) && !isCamp(nx, ny) && !isBaseCamp(nx, ny)) continue;
          var key = Math.min(x, nx) + ',' + Math.min(y, ny) + '-' + Math.max(x, nx) + ',' + Math.max(y, ny);
          if (drawn[key]) continue;
          drawn[key] = true;
          var line = document.createElementNS(ns, 'line');
          line.setAttribute('x1', svgX(x)); line.setAttribute('y1', svgY(y));
          line.setAttribute('x2', svgX(nx)); line.setAttribute('y2', svgY(ny));
          line.setAttribute('stroke', 'gray'); line.setAttribute('stroke-width', '1');
          line.setAttribute('stroke-dasharray', '4,3');
          gDiag.appendChild(line);
        }
      }
    }

    // ---- 站点标记 ----
    var STATION_W = 60;
    var STATION_H = 40;
    var CAMP_RX = 38;
    var CAMP_RY = 28;

    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var cx = svgX(x), cy = svgY(y);
        var label = '兵 站';
        if (isCamp(x, y)) {
          // 行营：椭圆
          label = '行 营';
          var ellipse = document.createElementNS(ns, 'ellipse');
          ellipse.setAttribute('cx', cx); ellipse.setAttribute('cy', cy);
          ellipse.setAttribute('rx', CAMP_RX); ellipse.setAttribute('ry', CAMP_RY);
          ellipse.setAttribute('fill', '#fff'); ellipse.setAttribute('stroke', 'gray');
          ellipse.setAttribute('stroke-width', '1');
          ellipse.classList.add('station-xingying');
          gStation.appendChild(ellipse);
        } else {
          // 兵站 / 大本营：矩形
          if (isBaseCamp(x, y)) label = '大本营';
          var rect = document.createElementNS(ns, 'rect');
          rect.setAttribute('x', cx - STATION_W / 2);
          rect.setAttribute('y', cy - STATION_H / 2);
          rect.setAttribute('width', STATION_W); rect.setAttribute('height', STATION_H);
          rect.setAttribute('fill', '#fff'); rect.setAttribute('stroke', 'gray');
          rect.setAttribute('stroke-width', '1');
          rect.setAttribute('rx', '3');
          rect.classList.add(isBaseCamp(x, y) ? 'station-dabenying' : 'station');
          gStation.appendChild(rect);
        }
        // 站点文字
        var text = document.createElementNS(ns, 'text');
        text.setAttribute('x', cx); text.setAttribute('y', cy);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', '#aaa');
        text.setAttribute('font-weight', '400');
        text.textContent = label;
        gStation.appendChild(text);
      }
    }

    svg.appendChild(gHighway);
    svg.appendChild(gRailway);
    svg.appendChild(gDiag);
    svg.appendChild(gStation);

    // 清空容器并添加 SVG + 棋子层
    $boardContainer.innerHTML = '';
    $boardContainer.appendChild(svg);

    var piecesLayer = document.createElement('div');
    piecesLayer.id = 'pieces-layer';
    piecesLayer.style.position = 'absolute';
    piecesLayer.style.top = '0';
    piecesLayer.style.left = '0';
    piecesLayer.style.width = '100%';
    piecesLayer.style.height = '100%';
    $boardContainer.appendChild(piecesLayer);

    // 计算缩放比例
    updateScale();
  }

  function addSVGLine(parent, ns, x1, y1, x2, y2, stroke, strokeWidth) {
    var line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', stroke);
    line.setAttribute('stroke-width', strokeWidth);
    parent.appendChild(line);
  }

  function updateScale() {
    var svg = $boardContainer.querySelector('svg');
    if (!svg) return;
    var rect = svg.getBoundingClientRect();
    boardScale = rect.width / SVG_W;
  }

  // ============================================================
  // 棋子渲染（DOM div 元素）
  // ============================================================
  function renderPieces() {
    var layer = document.getElementById('pieces-layer');
    if (!layer || !gameState) return;
    layer.innerHTML = '';
    updateScale();

    var PIECE_W = 56;
    var PIECE_H = 36;
    var board = gameState.board;
    var gameType = gameState.gameType;

    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var piece = board[y][x];
        if (!piece) continue;

        var div = document.createElement('div');
        div.className = 'chess-piece';

        // 判断是否显示棋子内容
        var showContent = piece.state === STATE_FACE_UP;
        if (gameType === 'hidden' && piece.team !== gameState.playerTeam) {
          showContent = false;
        }

        if (showContent) {
          if (piece.team === RED) div.classList.add('chess-red');
          else div.classList.add('chess-blue');
          div.textContent = piece.name;
        } else {
          div.classList.add('chess-face-down');
        }

        div.style.width = PIECE_W + 'px';
        div.style.height = PIECE_H + 'px';
        div.style.fontSize = Math.round(PIECE_W / 3) + 'px';

        // 定位：SVG 坐标 → 像素坐标
        var px = svgX(x) * boardScale - PIECE_W / 2;
        var py = svgY(y) * boardScale - PIECE_H / 2;
        div.style.left = px + 'px';
        div.style.top = py + 'px';

        div.dataset.x = x;
        div.dataset.y = y;

        layer.appendChild(div);
      }
    }

    // 高亮选中棋子
    if (gameState.selectedCell) {
      var sel = gameState.selectedCell;
      var selDiv = layer.querySelector('[data-x="' + sel.x + '"][data-y="' + sel.y + '"]');
      if (selDiv) selDiv.classList.add('chess-selected');
    }
  }

  function highlightMoves(moves) {
    var layer = document.getElementById('pieces-layer');
    if (!layer) return;

    // 移除旧的高亮
    var old = layer.querySelectorAll('.move-highlight');
    for (var i = 0; i < old.length; i++) old[i].remove();

    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var div = document.createElement('div');
      div.className = 'move-highlight';
      if (m.type === 'capture' || m.type === 'capture_flag') {
        div.classList.add('highlight-capture');
      } else {
        div.classList.add('highlight-move');
      }
      var px = svgX(m.x) * boardScale - 8;
      var py = svgY(m.y) * boardScale - 8;
      div.style.left = px + 'px';
      div.style.top = py + 'px';
      div.dataset.x = m.x;
      div.dataset.y = m.y;
      layer.appendChild(div);
    }
  }

  function clearHighlights() {
    var layer = document.getElementById('pieces-layer');
    if (!layer) return;
    var old = layer.querySelectorAll('.move-highlight');
    for (var i = 0; i < old.length; i++) old[i].remove();
    // 移除选中状态
    var selDiv = layer.querySelector('.chess-selected');
    if (selDiv) selDiv.classList.remove('chess-selected');
  }

  function drawBoard() {
    renderPieces();
  }

  // ============================================================
  // 事件处理（点击棋子层）
  // ============================================================
  function onBoardClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.oppType === 'pve' && gameState.currentTeam === gameState.aiTeam) return;

    var target = e.target;
    var x = parseInt(target.dataset.x);
    var y = parseInt(target.dataset.y);
    if (isNaN(x) || isNaN(y)) return;

    var piece = gameState.board[y][x];
    var team = gameState.currentTeam;
    var gameType = gameState.gameType;

    // 翻棋模式：点击面朝下棋子翻开
    if (gameType === 'flip' && piece && piece.state === STATE_FACE_DOWN) {
      var result = flipPiece(gameState, x, y);
      if (result) {
        clearHighlights();
        drawBoard();
        afterAction();
        return;
      }
    }

    // 点击高亮目标（移动/吃子）
    if (target.classList.contains('move-highlight')) {
      if (gameState.selectedCell) {
        var sel = gameState.selectedCell;
        var result = moveCard(gameState, sel, { x: x, y: y });
        if (result) {
          gameState.selectedCell = null;
          clearHighlights();
          drawBoard();
          afterAction();
          return;
        }
      }
    }

    // 已有选中棋子
    if (gameState.selectedCell) {
      var sel = gameState.selectedCell;

      // 点击同一格：取消选中
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        drawBoard();
        return;
      }

      // 尝试移动/吃子
      var result = moveCard(gameState, sel, { x: x, y: y });
      if (result) {
        gameState.selectedCell = null;
        clearHighlights();
        drawBoard();
        afterAction();
        return;
      }

      // 选中另一个己方棋子
      if (piece && piece.team === team && piece.state === STATE_FACE_UP) {
        gameState.selectedCell = { x: x, y: y };
        clearHighlights();
        drawBoard();
        var moves = getValidMoves(gameState.board, x, y, team, gameType);
        highlightMoves(moves);
        return;
      }

      showMessage('无法移动到该位置', 'error');
      return;
    }

    // 无选中：选中己方棋子（必须面朝上）
    if (piece && piece.team === team && piece.state === STATE_FACE_UP) {
      gameState.selectedCell = { x: x, y: y };
      clearHighlights();
      drawBoard();
      var moves = getValidMoves(gameState.board, x, y, team, gameType);
      highlightMoves(moves);
      return;
    }

    if (piece && piece.team !== team) {
      showMessage('这不是你的棋子', 'error');
    }
  }

  // ============================================================
  // 状态更新
  // ============================================================
  function updateStatus() {
    if (!gameState) return;
    var s = gameState;

    if (s.currentTeam) {
      $currentTeam.textContent = s.currentTeam === RED ? '红方' : '蓝方';
      $currentTeam.className = 'team-indicator ' + (s.currentTeam === RED ? 'red-text' : 'blue-text');
    } else {
      $currentTeam.textContent = '—';
      $currentTeam.className = 'team-indicator';
    }

    $turnCount.textContent = s.turnCount;

    var redCount = 0, blueCount = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = s.board[y][x];
        if (p) {
          if (p.team === RED) redCount++;
          else if (p.team === BLUE) blueCount++;
        }
      }
    }
    $redRemaining.textContent = redCount;
    $blueRemaining.textContent = blueCount;

    var $redLabel = document.getElementById('red-label');
    var $blueLabel = document.getElementById('blue-label');
    if (s.mode === 'pve' && s.playerTeam) {
      $redLabel.textContent = s.playerTeam === RED ? '玩家（红方）：' : '电脑（红方）：';
      $blueLabel.textContent = s.playerTeam === BLUE ? '玩家（蓝方）：' : '电脑（蓝方）：';
    } else {
      $redLabel.textContent = '红方：';
      $blueLabel.textContent = '蓝方：';
    }

    renderCaptured($capturedRed, s.capturedRed, RED);
    renderCaptured($capturedBlue, s.capturedBlue, BLUE);
  }

  function renderCaptured(container, list, team) {
    container.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var span = document.createElement('span');
      span.className = 'captured-piece ' + (team === RED ? 'red-text' : 'blue-text');
      span.textContent = list[i];
      container.appendChild(span);
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || '';
  }

  // ============================================================
  // 游戏流程
  // ============================================================
  function showModeSelection() {
    $modeSelection.style.display = 'flex';
    $gameArea.style.display = 'none';
    $gameOver.style.display = 'none';
  }

  function showGameArea() {
    $modeSelection.style.display = 'none';
    $gameArea.style.display = 'flex';
    $gameOver.style.display = 'none';
  }

  function showGameOverScreen(winner) {
    if (winner) {
      var winnerName = winner === RED ? '红方' : '蓝方';
      if (gameState.oppType === 'pve') {
        winnerName = winner === gameState.playerTeam ? '你赢了！' : '电脑获胜！';
      }
      $winnerText.textContent = winnerName;
    } else {
      $winnerText.textContent = '平局！';
    }
    $gameOver.style.display = 'flex';
  }

  function startGame(mode, firstPlayer) {
    document.getElementById('rps-section').style.display = 'none';
    gameState = createGameState(mode);
    buildBoardSVG();

    // 切换规则面板
    document.querySelectorAll('.rules-content').forEach(function (el) {
      el.style.display = 'none';
    });
    var rulesId = 'rules-' + mode.gameType;
    var rulesEl = document.getElementById(rulesId);
    if (rulesEl) rulesEl.style.display = 'block';

    // 绑定点击事件
    var layer = document.getElementById('pieces-layer');
    if (layer) layer.addEventListener('click', onBoardClick);

    var winner = firstPlayer || RED;

    if (mode.oppType === 'pvp') {
      gameState.currentTeam = winner;
      gameState.firstPlayer = winner;
      showGameArea();
      drawBoard();
      updateStatus();
      var teamName = winner === RED ? '红方' : '蓝方';
      var firstMsg = mode.gameType === 'flip' ? teamName + '先行，请翻开棋子' : teamName + '先行，请选择棋子移动';
      showMessage(firstMsg, '');
    } else {
      gameState.playerTeam = winner === RED ? RED : BLUE;
      gameState.aiTeam = winner === RED ? BLUE : RED;
      gameState.currentTeam = winner;
      showGameArea();
      drawBoard();
      updateStatus();
      if (gameState.currentTeam === gameState.aiTeam) {
        triggerAI();
      } else {
        showMessage('你的回合，请选择棋子移动', '');
      }
    }
  }

  function afterAction() {
    updateStatus();
    var result = checkGameOver(gameState);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      drawBoard();
      setTimeout(function () { showGameOverScreen(result.winner); }, 500);
      return;
    }

    if (gameState.oppType === 'pve' && gameState.currentTeam === gameState.aiTeam) {
      triggerAI();
    } else {
      var teamName = gameState.currentTeam === RED ? '红方' : '蓝方';
      showMessage(teamName + '的回合', '');
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    showMessage('电脑思考中...', 'info');
    var delay = 300 + Math.random() * 700;
    setTimeout(function () {
      var decision = aiDecide(gameState, gameState.aiTeam);
      if (!decision) {
        gameState.aiThinking = false;
        afterAction();
        return;
      }
      if (decision.type === 'flip') {
        executeAIFlip(decision);
      } else {
        executeAIAction(decision);
      }
    }, delay);
  }

  function executeAIAction(decision) {
    // 高亮 AI 操作的起始位置
    var layer = document.getElementById('pieces-layer');
    if (layer) {
      var fromDiv = layer.querySelector('[data-x="' + decision.from.x + '"][data-y="' + decision.from.y + '"]');
      if (fromDiv && fromDiv.classList.contains('chess-piece')) {
        fromDiv.classList.add('chess-ai-highlight');
      }
    }

    setTimeout(function () {
      moveCard(gameState, decision.from, decision.to);
      clearHighlights();
      drawBoard();

      // 高亮目标位置
      if (layer) {
        var toDiv = layer.querySelector('[data-x="' + decision.to.x + '"][data-y="' + decision.to.y + '"]');
        if (toDiv && toDiv.classList.contains('chess-piece')) {
          toDiv.classList.add('chess-ai-highlight');
        }
      }

      setTimeout(function () {
        clearHighlights();
        drawBoard();
        gameState.aiThinking = false;
        afterAction();
      }, 400);
    }, 300);
  }

  function executeAIFlip(decision) {
    var layer = document.getElementById('pieces-layer');
    if (layer) {
      var fromDiv = layer.querySelector('[data-x="' + decision.from.x + '"][data-y="' + decision.from.y + '"]');
      if (fromDiv && fromDiv.classList.contains('chess-piece')) {
        fromDiv.classList.add('chess-ai-highlight');
      }
    }

    setTimeout(function () {
      flipPiece(gameState, decision.from.x, decision.from.y);
      clearHighlights();
      drawBoard();

      setTimeout(function () {
        clearHighlights();
        drawBoard();
        gameState.aiThinking = false;
        afterAction();
      }, 400);
    }, 300);
  }

  // ============================================================
  // 石头剪刀布
  // ============================================================
  function getRPSName(c) {
    return { 'rock': '石头', 'scissors': '剪刀', 'paper': '布' }[c] || c;
  }

  function handleRPSChoice(player, choice, ev) {
    if (player === 'human') {
      rpsChoices.human = choice;
      document.querySelectorAll('#rps-player-buttons .btn-rps').forEach(function (btn) {
        btn.classList.remove('selected');
      });
      ev.target.classList.add('selected');

      var choices = ['rock', 'scissors', 'paper'];
      var aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      var resultEl = document.getElementById('rps-result');
      var humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你赢了！你先手。';
        setTimeout(function () { startGame(pendingMode, RED); }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你输了！AI先手。';
        setTimeout(function () { startGame(pendingMode, BLUE); }, 1500);
      } else {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，平局！重新选择。';
        rpsChoices.human = null;
        rpsChoices.player2 = null;
      }
    } else {
      rpsChoices['player' + player] = choice;
      document.querySelectorAll('#rps-p' + player + '-buttons .btn-rps').forEach(function (btn) {
        btn.classList.remove('selected');
      });
      ev.target.classList.add('selected');

      var statusEl = document.getElementById('rps-p' + player + '-status');
      statusEl.textContent = '已选择：' + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        var resultEl = document.getElementById('rps-result');
        var winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          resultEl.textContent = '红方赢了！红方先手。';
          setTimeout(function () { startGame(pendingMode, RED); }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = '蓝方赢了！蓝方先手。';
          setTimeout(function () { startGame(pendingMode, BLUE); }, 1500);
        } else {
          resultEl.textContent = '平局！重新选择。';
          rpsChoices.player1 = null;
          rpsChoices.player2 = null;
          document.getElementById('rps-p1-status').textContent = '请选择';
          document.getElementById('rps-p2-status').textContent = '请选择';
          document.querySelectorAll('.btn-rps').forEach(function (btn) {
            btn.classList.remove('selected');
          });
        }
      }
    }
  }

  function showRPS(oppType) {
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('rps-section').style.display = 'flex';
    document.getElementById('rps-pvp').style.display = oppType === 'pvp' ? 'block' : 'none';
    document.getElementById('rps-pve').style.display = oppType === 'pve' ? 'block' : 'none';
    document.getElementById('rps-result').textContent = '';
    rpsChoices = { player1: null, player2: null, human: null };
  }

  // ============================================================
  // 事件绑定
  // ============================================================
  var modeButtons = document.querySelectorAll('.mode-section .btn');
  for (var i = 0; i < modeButtons.length; i++) {
    modeButtons[i].addEventListener('click', function () {
      var gameType = this.dataset.gameType;
      var oppType = this.dataset.oppType;
      pendingMode = { gameType: gameType, oppType: oppType };
      showRPS(oppType);
    });
  }

  document.querySelectorAll('.btn-rps').forEach(function (button) {
    button.addEventListener('click', function (ev) {
      var player = ev.target.dataset.player;
      var choice = ev.target.dataset.choice;
      handleRPSChoice(player, choice, ev);
    });
  });

  $btnRestart.addEventListener('click', function () {
    gameState = null;
    showModeSelection();
  });

  // 窗口缩放时重新计算
  window.addEventListener('resize', function () {
    if (gameState) {
      updateScale();
      renderPieces();
    }
  });

  // 初始化
  showModeSelection();
}
