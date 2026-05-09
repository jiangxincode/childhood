import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  NORMAL_PIECE_NAMES, BOMB_NAME, MINE_NAME, FLAG_NAME,
  RANK_MAP, PIECE_COUNTS, COLS, ROWS, RED, BLUE,
  STATE_FACE_UP, STATE_FACE_DOWN,
  CAMPS, BASE_CAMPS, H_RAILWAYS,
  isNormalPiece, isBomb, isMine, isFlag, isMovable, getRank,
  inBounds, isCamp, isBaseCamp, getBoardRow, hasDiagonalEligibility,
  isOnHRailway, isOnVRailway, isOnRailway, areOnSameRailway,
  judgeRPS, canCapture, resolveCombat,
  createGameState, placePiecesRandom, shuffle,
  getValidMoves, getNormalMoves, getEngineerMoves, getDiagonalMoves,
  flipPiece, revealFlag, moveCard, addCaptured,
  hasAnyLegalAction, checkGameOver, aiDecide
} = require('./game.js');

// ============================================================
// 辅助函数
// ============================================================
function emptyBoard() {
  var board = [];
  for (var y = 0; y < ROWS; y++) {
    board[y] = [];
    for (var x = 0; x < COLS; x++) {
      board[y][x] = null;
    }
  }
  return board;
}

function makePiece(name, team, state) {
  return { name: name, team: team, rank: getRank(name), state: state || STATE_FACE_UP };
}

function makeState(board, currentTeam, opts) {
  opts = opts || {};
  return {
    gameType: opts.gameType || 'open',
    oppType: opts.oppType || 'pvp',
    board: board,
    currentTeam: currentTeam,
    playerTeam: opts.playerTeam || null,
    aiTeam: opts.aiTeam || null,
    firstPlayer: opts.firstPlayer || null,
    turnCount: opts.turnCount || 0,
    capturedRed: opts.capturedRed || [],
    capturedBlue: opts.capturedBlue || [],
    selectedCell: null,
    gameOver: opts.gameOver || false,
    winner: opts.winner || null,
    aiThinking: false
  };
}

// ============================================================
// 基础工具函数测试
// ============================================================
describe('基础工具函数', () => {
  it('isNormalPiece', () => {
    expect(isNormalPiece('工兵')).toBe(true);
    expect(isNormalPiece('司令')).toBe(true);
    expect(isNormalPiece('炸弹')).toBe(false);
    expect(isNormalPiece('地雷')).toBe(false);
    expect(isNormalPiece('军旗')).toBe(false);
  });

  it('isBomb / isMine / isFlag', () => {
    expect(isBomb('炸弹')).toBe(true);
    expect(isBomb('工兵')).toBe(false);
    expect(isMine('地雷')).toBe(true);
    expect(isMine('工兵')).toBe(false);
    expect(isFlag('军旗')).toBe(true);
    expect(isFlag('工兵')).toBe(false);
  });

  it('isMovable', () => {
    expect(isMovable(makePiece('工兵', RED))).toBe(true);
    expect(isMovable(makePiece('司令', RED))).toBe(true);
    expect(isMovable(makePiece('炸弹', RED))).toBe(true);
    expect(isMovable(makePiece('地雷', RED))).toBe(false);
    expect(isMovable(makePiece('军旗', RED))).toBe(false);
  });

  it('getRank', () => {
    expect(getRank('工兵')).toBe(0);
    expect(getRank('排长')).toBe(1);
    expect(getRank('司令')).toBe(8);
    expect(getRank('炸弹')).toBe(null);
    expect(getRank('地雷')).toBe(null);
    expect(getRank('军旗')).toBe(null);
  });

  it('inBounds', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(4, 11)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(5, 0)).toBe(false);
    expect(inBounds(0, 12)).toBe(false);
  });

  it('isCamp', () => {
    expect(isCamp(1, 2)).toBe(true);
    expect(isCamp(2, 3)).toBe(true);
    expect(isCamp(3, 9)).toBe(true);
    expect(isCamp(0, 0)).toBe(false);
    expect(isCamp(2, 2)).toBe(false);
  });

  it('isBaseCamp', () => {
    expect(isBaseCamp(1, 0)).toBe(true);
    expect(isBaseCamp(3, 0)).toBe(true);
    expect(isBaseCamp(1, 11)).toBe(true);
    expect(isBaseCamp(3, 11)).toBe(true);
    expect(isBaseCamp(2, 0)).toBe(false);
  });

  it('getBoardRow', () => {
    expect(getBoardRow(0)).toBe(0);
    expect(getBoardRow(5)).toBe(5);
    expect(getBoardRow(6)).toBe(7);
    expect(getBoardRow(11)).toBe(12);
  });

  it('hasDiagonalEligibility', () => {
    // (0,1): boardRow=1, 0+1=1 奇数 → true
    expect(hasDiagonalEligibility(0, 1)).toBe(true);
    // (1,2): boardRow=2, 1+2=3 奇数 → true
    expect(hasDiagonalEligibility(1, 2)).toBe(true);
    // (0,0): boardRow=0, 0+0=0 偶数 → false
    expect(hasDiagonalEligibility(0, 0)).toBe(false);
    // (2,3): boardRow=3, 2+3=5 奇数 → true
    expect(hasDiagonalEligibility(2, 3)).toBe(true);
  });
});

// ============================================================
// 铁路判定测试
// ============================================================
describe('铁路判定', () => {
  it('水平铁路', () => {
    expect(isOnHRailway(1)).toBe(true);
    expect(isOnHRailway(5)).toBe(true);
    expect(isOnHRailway(6)).toBe(true);
    expect(isOnHRailway(10)).toBe(true);
    expect(isOnHRailway(0)).toBe(false);
    expect(isOnHRailway(3)).toBe(false);
  });

  it('垂直铁路', () => {
    // 左右两侧
    expect(isOnVRailway(0, 1)).toBe(true);
    expect(isOnVRailway(4, 5)).toBe(true);
    expect(isOnVRailway(0, 0)).toBe(false); // 端点不算
    expect(isOnVRailway(0, 11)).toBe(false);
    // 中间
    expect(isOnVRailway(2, 5)).toBe(true);
    expect(isOnVRailway(2, 6)).toBe(true);
    expect(isOnVRailway(2, 4)).toBe(false);
  });

  it('areOnSameRailway', () => {
    // 水平相邻且在水平铁路上
    expect(areOnSameRailway(0, 1, 1, 1)).toBe(true);
    expect(areOnSameRailway(3, 10, 4, 10)).toBe(true);
    // 垂直相邻且在垂直铁路上
    expect(areOnSameRailway(0, 1, 0, 2)).toBe(true);
    expect(areOnSameRailway(4, 5, 4, 6)).toBe(true);
    // 跨越 gap row：中间列和侧边铁路可以跨越
    expect(areOnSameRailway(2, 5, 2, 6)).toBe(true);
    expect(areOnSameRailway(0, 5, 0, 6)).toBe(true);
    expect(areOnSameRailway(4, 5, 4, 6)).toBe(true);
    expect(areOnSameRailway(1, 5, 1, 6)).toBe(false); // 非铁路列不能跨越
    expect(areOnSameRailway(3, 5, 3, 6)).toBe(false);
    // 不相邻
    expect(areOnSameRailway(0, 1, 0, 3)).toBe(false);
  });
});

// ============================================================
// 战斗判定测试
// ============================================================
describe('战斗判定', () => {
  it('高等级吃低等级', () => {
    expect(canCapture(makePiece('司令', RED), makePiece('军长', BLUE))).toBe(true);
    expect(canCapture(makePiece('军长', RED), makePiece('工兵', BLUE))).toBe(true);
  });

  it('低等级不能吃高等级', () => {
    expect(canCapture(makePiece('工兵', RED), makePiece('司令', BLUE))).toBe(false);
  });

  it('同级同归于尽', () => {
    expect(canCapture(makePiece('连长', RED), makePiece('连长', BLUE))).toBe(true);
    expect(resolveCombat(makePiece('连长', RED), makePiece('连长', BLUE))).toBe('mutual_destruction');
  });

  it('炸弹碰任何棋子同归于尽', () => {
    expect(canCapture(makePiece('炸弹', RED), makePiece('司令', BLUE))).toBe(true);
    expect(resolveCombat(makePiece('炸弹', RED), makePiece('司令', BLUE))).toBe('mutual_destruction');
    expect(resolveCombat(makePiece('工兵', RED), makePiece('炸弹', BLUE))).toBe('mutual_destruction');
  });

  it('工兵排雷', () => {
    expect(canCapture(makePiece('工兵', RED), makePiece('地雷', BLUE))).toBe(true);
    expect(resolveCombat(makePiece('工兵', RED), makePiece('地雷', BLUE))).toBe('attacker_wins');
  });

  it('非工兵碰地雷同归于尽', () => {
    expect(canCapture(makePiece('排长', RED), makePiece('地雷', BLUE))).toBe(true);
    expect(resolveCombat(makePiece('排长', RED), makePiece('地雷', BLUE))).toBe('mutual_destruction');
  });

  it('军旗不可被吃', () => {
    expect(canCapture(makePiece('工兵', RED), makePiece('军旗', BLUE))).toBe(false);
  });

  it('地雷不能主动攻击', () => {
    expect(canCapture(makePiece('地雷', RED), makePiece('工兵', BLUE))).toBe(false);
  });

  it('同阵营不能互吃', () => {
    expect(canCapture(makePiece('司令', RED), makePiece('工兵', RED))).toBe(false);
  });
});

// ============================================================
// 创建游戏状态测试
// ============================================================
describe('createGameState', () => {
  it('明棋：创建后棋盘有 50 颗棋子', () => {
    var state = createGameState({ gameType: 'open', oppType: 'pvp' });
    var count = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (state.board[y][x]) count++;
      }
    }
    expect(count).toBe(50);
  });

  it('明棋：每方 25 颗棋子', () => {
    var state = createGameState({ gameType: 'open', oppType: 'pvp' });
    var redCount = 0, blueCount = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && p.team === RED) redCount++;
        if (p && p.team === BLUE) blueCount++;
      }
    }
    expect(redCount).toBe(25);
    expect(blueCount).toBe(25);
  });

  it('明棋：军旗在大本营中', () => {
    var state = createGameState({ gameType: 'open', oppType: 'pvp' });
    var flags = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && isFlag(p.name)) flags.push({ x: x, y: y, team: p.team });
      }
    }
    expect(flags.length).toBe(2);
    for (var i = 0; i < flags.length; i++) {
      expect(isBaseCamp(flags[i].x, flags[i].y)).toBe(true);
    }
  });

  it('明棋：地雷在最后两行', () => {
    var state = createGameState({ gameType: 'open', oppType: 'pvp' });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && isMine(p.name)) {
          if (p.team === RED) {
            expect(y >= 10).toBe(true);
          } else {
            expect(y >= 4 && y <= 5).toBe(true);
          }
        }
      }
    }
  });

  it('明棋：炸弹不在第一行', () => {
    var state = createGameState({ gameType: 'open', oppType: 'pvp' });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && isBomb(p.name)) {
          if (p.team === RED) {
            expect(y).not.toBe(6);
          } else {
            expect(y).not.toBe(0);
          }
        }
      }
    }
  });

  it('明棋：所有棋子面朝上', () => {
    var state = createGameState({ gameType: 'open', oppType: 'pvp' });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p) expect(p.state).toBe(STATE_FACE_UP);
      }
    }
  });

  it('翻棋：50颗棋子随机放满全棋盘（不含行营）', () => {
    var state = createGameState({ gameType: 'flip', oppType: 'pvp' });
    var count = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (state.board[y][x]) count++;
      }
    }
    expect(count).toBe(50);
    // 行营中没有棋子
    for (var i = 0; i < CAMPS.length; i++) {
      var c = CAMPS[i];
      expect(state.board[c.y][c.x]).toBe(null);
    }
  });

  it('翻棋：所有棋子面朝下', () => {
    var state = createGameState({ gameType: 'flip', oppType: 'pvp' });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p) expect(p.state).toBe(STATE_FACE_DOWN);
      }
    }
  });

  it('暗棋：行营中没有棋子', () => {
    var state = createGameState({ gameType: 'hidden', oppType: 'pvp' });
    for (var i = 0; i < CAMPS.length; i++) {
      var c = CAMPS[i];
      expect(state.board[c.y][c.x]).toBe(null);
    }
  });
});

// ============================================================
// 移动验证测试
// ============================================================
describe('getValidMoves', () => {
  it('地雷不可移动', () => {
    var board = emptyBoard();
    board[10][2] = makePiece('地雷', RED);
    var moves = getValidMoves(board, 2, 10, RED);
    expect(moves.length).toBe(0);
  });

  it('军旗不可移动', () => {
    var board = emptyBoard();
    board[11][1] = makePiece('军旗', RED);
    var moves = getValidMoves(board, 1, 11, RED);
    expect(moves.length).toBe(0);
  });

  it('普通棋子可向相邻空位移动', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('排长', RED);
    var moves = getValidMoves(board, 2, 5, RED);
    // (2,5) 在铁路上，可以沿铁路和普通方向移动
    expect(moves.length).toBeGreaterThan(0);
    // 至少能向上 (2,4) 或向下 (2,6，跨越gap)
    var hasUp = moves.some(function (m) { return m.x === 2 && m.y === 4; });
    expect(hasUp).toBe(true);
  });

  it('工兵可沿铁路无限移动', () => {
    var board = emptyBoard();
    board[1][0] = makePiece('工兵', RED);
    // (0,1) 在水平和垂直铁路上
    var moves = getValidMoves(board, 0, 1, RED);
    // 应该能移动到水平铁路 (1,1), (2,1), (3,1), (4,1)
    var hasFar = moves.some(function (m) { return m.x === 4 && m.y === 1; });
    expect(hasFar).toBe(true);
  });

  it('行营中的棋子不能被攻击', () => {
    var board = emptyBoard();
    board[2][1] = makePiece('工兵', RED);  // (1,2) 是行营
    board[2][0] = makePiece('司令', BLUE);
    var moves = getValidMoves(board, 0, 2, BLUE);
    // 司令不能吃行营中的工兵
    var canAttackCamp = moves.some(function (m) { return m.x === 1 && m.y === 2; });
    expect(canAttackCamp).toBe(false);
  });

  it('己方棋子不能移动到己方棋子位置', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('排长', RED);
    board[5][3] = makePiece('连长', RED);
    var moves = getValidMoves(board, 2, 5, RED);
    var canMoveToOwn = moves.some(function (m) { return m.x === 3 && m.y === 5; });
    expect(canMoveToOwn).toBe(false);
  });

  it('跨越 gap row 只能通过中间列', () => {
    var board = emptyBoard();
    board[5][1] = makePiece('排长', RED);
    var moves = getValidMoves(board, 1, 5, RED);
    // (1,5) 不能向下跨越到 (1,6)
    var canCross = moves.some(function (m) { return m.x === 1 && m.y === 6; });
    expect(canCross).toBe(false);

    board[5][2] = makePiece('排长', RED);
    var moves2 = getValidMoves(board, 2, 5, RED);
    // (2,5) 可以向下跨越到 (2,6)
    var canCross2 = moves2.some(function (m) { return m.x === 2 && m.y === 6; });
    expect(canCross2).toBe(true);
  });
});

// ============================================================
// 移动操作测试
// ============================================================
describe('moveCard', () => {
  it('普通移动成功', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('排长', RED);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(result).not.toBe(null);
    expect(state.board[4][2].name).toBe('排长');
    expect(state.board[5][2]).toBe(null);
    expect(state.currentTeam).toBe(BLUE);
  });

  it('吃子成功', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('司令', RED);
    board[4][2] = makePiece('工兵', BLUE);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(result).not.toBe(null);
    expect(state.board[4][2].name).toBe('司令');
    expect(state.capturedBlue).toContain('工兵');
  });

  it('同归于尽', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('连长', RED);
    board[4][2] = makePiece('连长', BLUE);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(result).not.toBe(null);
    expect(state.board[5][2]).toBe(null);
    expect(state.board[4][2]).toBe(null);
    expect(state.capturedRed).toContain('连长');
    expect(state.capturedBlue).toContain('连长');
  });

  it('工兵扛旗获胜', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('工兵', RED);
    board[6][2] = makePiece('军旗', BLUE);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 6 });
    expect(result).not.toBe(null);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(RED);
  });

  it('不能移动到非法位置', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('排长', RED);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 0, y: 0 });
    expect(result).toBe(null);
  });

  it('暗棋：司令被吃暴露对方军旗', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('司令', RED);
    board[4][2] = makePiece('司令', BLUE);
    board[0][1] = makePiece('军旗', BLUE, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: 'hidden' });
    moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(state.board[0][1].state).toBe(STATE_FACE_UP);
  });
});

// ============================================================
// 游戏结束判定测试
// ============================================================
describe('checkGameOver', () => {
  it('游戏已通过扛旗结束', () => {
    var board = emptyBoard();
    var state = makeState(board, RED, { gameOver: true, winner: RED });
    var result = checkGameOver(state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe(RED);
  });

  it('红方无可用棋子，蓝方胜', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('工兵', BLUE);
    // 红方没有任何棋子
    var state = makeState(board, RED);
    var result = checkGameOver(state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe(BLUE);
  });

  it('双方都有棋子时游戏继续', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('工兵', RED);
    board[0][2] = makePiece('工兵', BLUE);
    var state = makeState(board, RED);
    var result = checkGameOver(state);
    expect(result.ended).toBe(false);
  });
});

// ============================================================
// AI 决策测试
// ============================================================
describe('aiDecide', () => {
  it('AI 优先扛旗', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('工兵', BLUE);
    board[6][2] = makePiece('军旗', RED); // 军旗在红方大本营
    var state = makeState(board, BLUE, { aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).not.toBe(null);
    expect(decision.to.x).toBe(2);
    expect(decision.to.y).toBe(6);
  });

  it('AI 有吃子机会时吃子', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('司令', BLUE);
    board[5][3] = makePiece('工兵', RED);
    board[0][0] = makePiece('工兵', RED); // 避免蓝方无对手导致游戏结束
    var state = makeState(board, BLUE, { aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).not.toBe(null);
    // 应该选择吃子
    var eats = decision.to.x === 3 && decision.to.y === 5;
    expect(eats).toBe(true);
  });

  it('无操作时返回 null', () => {
    var board = emptyBoard();
    // 只有地雷和军旗，不可移动
    board[11][1] = makePiece('军旗', BLUE);
    board[10][0] = makePiece('地雷', BLUE);
    board[0][0] = makePiece('工兵', RED); // 对手
    var state = makeState(board, BLUE, { aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).toBe(null);
  });
});

// ============================================================
// 石头剪刀布测试
// ============================================================
describe('judgeRPS', () => {
  it('平局', () => {
    expect(judgeRPS('rock', 'rock')).toBe(0);
    expect(judgeRPS('scissors', 'scissors')).toBe(0);
    expect(judgeRPS('paper', 'paper')).toBe(0);
  });

  it('第一方胜', () => {
    expect(judgeRPS('rock', 'scissors')).toBe(1);
    expect(judgeRPS('scissors', 'paper')).toBe(1);
    expect(judgeRPS('paper', 'rock')).toBe(1);
  });

  it('第二方胜', () => {
    expect(judgeRPS('rock', 'paper')).toBe(-1);
    expect(judgeRPS('scissors', 'rock')).toBe(-1);
    expect(judgeRPS('paper', 'scissors')).toBe(-1);
  });
});

// ============================================================
// 军旗扛走测试
// ============================================================
describe('军旗扛走', () => {
  it('工兵可以通过对角线进入大本营扛旗', () => {
    var board = emptyBoard();
    board[1][0] = makePiece('工兵', RED);
    board[0][1] = makePiece('军旗', BLUE);
    var moves = getValidMoves(board, 0, 1, RED);
    var flagMove = moves.find(function (m) { return m.type === 'capture_flag' && m.x === 1 && m.y === 0; });
    expect(flagMove).not.toBe(undefined);
  });

  it('非工兵棋子不能扛旗', () => {
    var board = emptyBoard();
    board[1][0] = makePiece('排长', RED);
    board[0][1] = makePiece('军旗', BLUE);
    var moves = getValidMoves(board, 0, 1, RED);
    var flagMove = moves.find(function (m) { return m.type === 'capture_flag'; });
    expect(flagMove).toBe(undefined);
  });

  it('工兵可以沿铁路到达大本营附近', () => {
    var board = emptyBoard();
    board[5][0] = makePiece('工兵', RED);
    board[0][1] = makePiece('军旗', BLUE);
    var moves = getEngineerMoves(board, 0, 5, RED);
    // 工兵可以沿铁路到 (0,1)
    var canReach01 = moves.some(function (m) { return m.x === 0 && m.y === 1; });
    expect(canReach01).toBe(true);
  });
});

// ============================================================
// 行营保护测试
// ============================================================
describe('行营保护', () => {
  it('行营中的棋子不能被攻击', () => {
    var board = emptyBoard();
    board[2][1] = makePiece('工兵', RED);
    board[2][0] = makePiece('司令', BLUE);
    var moves = getValidMoves(board, 0, 2, BLUE);
    var canAttack = moves.some(function (m) { return m.x === 1 && m.y === 2; });
    expect(canAttack).toBe(false);
  });

  it('大本营中的非军旗棋子也不能被攻击', () => {
    var board = emptyBoard();
    board[0][1] = makePiece('工兵', RED);
    board[0][0] = makePiece('司令', BLUE);
    var moves = getValidMoves(board, 0, 0, BLUE);
    var canAttack = moves.some(function (m) { return m.x === 1 && m.y === 0; });
    expect(canAttack).toBe(false);
  });

  it('行营中的棋子可以沿对角线跳到另一个行营', () => {
    // (1,2) 和 (2,3) 是对角线相邻的行营
    var board = emptyBoard();
    board[2][1] = makePiece('工兵', RED);
    var moves = getValidMoves(board, 1, 2, RED);
    var canReachCamp = moves.some(function (m) { return m.x === 2 && m.y === 3; });
    expect(canReachCamp).toBe(true);
  });

  it('行营中的棋子可以经过空格到达较远的行营', () => {
    // (2,3) 到 (1,4) 需要经过中间空格
    var board = emptyBoard();
    board[3][2] = makePiece('团长', RED);
    var moves = getValidMoves(board, 2, 3, RED);
    var canReachCamp = moves.some(function (m) { return m.x === 1 && m.y === 4; });
    expect(canReachCamp).toBe(true);
  });

  it('工兵可以从铁路进入相邻行营', () => {
    var board = emptyBoard();
    board[1][1] = makePiece('工兵', RED);
    var moves = getValidMoves(board, 1, 1, RED);
    var canEnterCamp = moves.some(function (m) { return m.x === 1 && m.y === 2; });
    expect(canEnterCamp).toBe(true);
  });

  it('行营中棋子不能跳过己方棋子到达另一个行营', () => {
    // (1,2) 想到 (2,3)，但中间格被己方棋子占据
    var board = emptyBoard();
    board[2][1] = makePiece('工兵', RED);
    // (2,3) 不是直接相邻的，需要经过中间格，但中间格如果有己方棋子则不能通过
    // 这里测试 (1,2) 到 (3,4) 的路径：需要经过 (2,3) 行营
    // (1,2) -> (2,3) 是直接相邻行营，所以中间没有障碍格
    // 换一个更合适的测试：(1,7) 到 (3,9) 经过 (2,8)
    board[7][1] = makePiece('团长', RED);
    board[8][2] = makePiece('连长', RED); // 己方棋子占据中间行营
    var moves = getValidMoves(board, 1, 7, RED);
    var canReachCamp = moves.some(function (m) { return m.x === 3 && m.y === 9; });
    expect(canReachCamp).toBe(false);
  });
});

// ============================================================
// shuffle 测试
// ============================================================
describe('shuffle', () => {
  it('打乱后元素不变', () => {
    var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var sorted = arr.slice().sort();
    shuffle(arr);
    expect(arr.slice().sort()).toEqual(sorted);
  });
});

// ============================================================
// 翻棋模式测试
// ============================================================
describe('翻棋模式', () => {
  it('翻开棋子', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('工兵', RED, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: 'flip' });
    var result = flipPiece(state, 2, 5);
    expect(result).not.toBe(null);
    expect(state.board[5][2].state).toBe(STATE_FACE_UP);
    expect(state.currentTeam).toBe(BLUE);
  });

  it('面朝下的棋子不能移动', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('排长', RED, STATE_FACE_DOWN);
    var moves = getValidMoves(board, 2, 5, RED, 'flip');
    expect(moves.length).toBe(0);
  });

  it('不能攻击面朝下的棋子', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('司令', RED);
    board[4][2] = makePiece('工兵', BLUE, STATE_FACE_DOWN);
    var moves = getValidMoves(board, 2, 5, RED, 'flip');
    var canAttack = moves.some(function (m) { return m.x === 2 && m.y === 4; });
    expect(canAttack).toBe(false);
  });

  it('翻棋模式：AI优先翻开棋子', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('工兵', BLUE, STATE_FACE_DOWN);
    board[0][0] = makePiece('工兵', RED, STATE_FACE_UP);
    var state = makeState(board, BLUE, { gameType: 'flip', aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).not.toBe(null);
    expect(decision.type).toBe('flip');
  });
});

// ============================================================
// 暗棋模式测试
// ============================================================
describe('暗棋模式', () => {
  it('暗棋模式：所有棋子初始面朝下', () => {
    var state = createGameState({ gameType: 'hidden', oppType: 'pvp' });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p) expect(p.state).toBe(STATE_FACE_DOWN);
      }
    }
  });

  it('暗棋模式：司令被吃暴露军旗', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('司令', RED);
    board[4][2] = makePiece('司令', BLUE);
    board[0][1] = makePiece('军旗', BLUE, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: 'hidden' });
    moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(state.board[0][1].state).toBe(STATE_FACE_UP);
  });

  it('暗棋模式：司令同归于尽暴露双方军旗', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('司令', RED);
    board[4][2] = makePiece('司令', BLUE);
    board[0][1] = makePiece('军旗', BLUE, STATE_FACE_DOWN);
    board[11][1] = makePiece('军旗', RED, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: 'hidden' });
    moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(state.board[0][1].state).toBe(STATE_FACE_UP);
    expect(state.board[11][1].state).toBe(STATE_FACE_UP);
  });

  it('暗棋模式：不能攻击面朝下的棋子', () => {
    var board = emptyBoard();
    board[5][2] = makePiece('司令', RED);
    board[4][2] = makePiece('工兵', BLUE, STATE_FACE_DOWN);
    var moves = getValidMoves(board, 2, 5, RED, 'hidden');
    var canAttack = moves.some(function (m) { return m.x === 2 && m.y === 4; });
    expect(canAttack).toBe(false);
  });
});
