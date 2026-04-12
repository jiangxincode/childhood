import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  NORMAL_PIECE_NAMES, BOMB_NAME, MINE_NAME, FLAG_NAME,
  TEAM_PIECE_NAMES, RANK_MAP,
  isNormalPiece, isBomb, isMine, isFlag, isMovable,
  getImagePath, getRank, judgeRPS, inBounds,
  canCapture, resolveCombat, getLowestNormalPiece, canCaptureFlag,
  createGameState, getValidMoves, getValidCaptures,
  flipCard, moveCard, captureCard,
  hasAnyLegalAction, checkGameOver, aiDecide
} = require('./game.js');

// ============================================================
// 辅助函数
// ============================================================
function emptyBoard() {
  return Array.from({ length: 5 }, () => Array(5).fill(null));
}

function makePiece(name, team, faceUp = true) {
  return { name, team, rank: getRank(name), faceUp };
}

function makeState(board, currentTeam, opts = {}) {
  return {
    mode: opts.mode || 'pvp',
    board,
    currentTeam,
    playerTeam: opts.playerTeam || null,
    aiTeam: opts.aiTeam || null,
    teamAssigned: opts.teamAssigned !== undefined ? opts.teamAssigned : true,
    firstPlayer: opts.firstPlayer || null,
    turnCount: opts.turnCount || 0,
    capturedRed: opts.capturedRed || [],
    capturedBlue: opts.capturedBlue || [],
    selectedCell: null,
    gameOver: opts.gameOver || false,
    winner: opts.winner || null,
    aiThinking: false,
    aiFirst: opts.aiFirst || false
  };
}


// ============================================================
// 单元测试 - 石头剪刀布 9 种组合穷举
// ============================================================
describe('judgeRPS - 石头剪刀布判定', () => {
  it('rock vs rock = 0 (平局)', () => expect(judgeRPS('rock', 'rock')).toBe(0));
  it('scissors vs scissors = 0 (平局)', () => expect(judgeRPS('scissors', 'scissors')).toBe(0));
  it('paper vs paper = 0 (平局)', () => expect(judgeRPS('paper', 'paper')).toBe(0));
  it('rock vs scissors = 1 (第一方胜)', () => expect(judgeRPS('rock', 'scissors')).toBe(1));
  it('scissors vs paper = 1 (第一方胜)', () => expect(judgeRPS('scissors', 'paper')).toBe(1));
  it('paper vs rock = 1 (第一方胜)', () => expect(judgeRPS('paper', 'rock')).toBe(1));
  it('rock vs paper = -1 (第二方胜)', () => expect(judgeRPS('rock', 'paper')).toBe(-1));
  it('scissors vs rock = -1 (第二方胜)', () => expect(judgeRPS('scissors', 'rock')).toBe(-1));
  it('paper vs scissors = -1 (第二方胜)', () => expect(judgeRPS('paper', 'scissors')).toBe(-1));
});

// ============================================================
// 单元测试 - 图片映射 25 种棋子验证
// ============================================================
describe('getImagePath - 图片映射正确性', () => {
  // 红方 12 张
  for (const name of TEAM_PIECE_NAMES) {
    it(`红方"${name}"应返回 images/红-${name}.png`, () => {
      const piece = makePiece(name, 'red');
      expect(getImagePath(piece)).toBe(`images/红-${name}.png`);
    });
  }
  // 蓝方 12 张
  for (const name of TEAM_PIECE_NAMES) {
    it(`蓝方"${name}"应返回 images/蓝-${name}.png`, () => {
      const piece = makePiece(name, 'blue');
      expect(getImagePath(piece)).toBe(`images/蓝-${name}.png`);
    });
  }
  // 军旗
  it('军旗应返回 images/军旗.png', () => {
    const piece = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    expect(getImagePath(piece)).toBe('images/军旗.png');
  });
});

// ============================================================
// 单元测试 - 具体吃子场景
// ============================================================
describe('canCapture / resolveCombat - 具体吃子场景', () => {
  it('炸弹同归于尽：红炸弹 vs 蓝司令 → mutual_destruction', () => {
    const bomb = makePiece('炸弹', 'red');
    const commander = makePiece('司令', 'blue');
    expect(canCapture(bomb, commander)).toBe(true);
    expect(resolveCombat(bomb, commander)).toBe('mutual_destruction');
  });

  it('工兵排雷：红工兵 vs 蓝地雷 → attacker_wins', () => {
    const sapper = makePiece('工兵', 'red');
    const mine = makePiece('地雷', 'blue');
    expect(canCapture(sapper, mine)).toBe(true);
    expect(resolveCombat(sapper, mine)).toBe('attacker_wins');
  });

  it('普通棋子碰地雷：红司令 vs 蓝地雷 → mutual_destruction', () => {
    const commander = makePiece('司令', 'red');
    const mine = makePiece('地雷', 'blue');
    expect(canCapture(commander, mine)).toBe(true);
    expect(resolveCombat(commander, mine)).toBe('mutual_destruction');
  });

  it('同级同归于尽：红司令 vs 蓝司令 → mutual_destruction', () => {
    const r = makePiece('司令', 'red');
    const b = makePiece('司令', 'blue');
    expect(canCapture(r, b)).toBe(true);
    expect(resolveCombat(r, b)).toBe('mutual_destruction');
  });

  it('高等级吃低等级：红司令(rank=1) vs 蓝工兵(rank=10) → attacker_wins', () => {
    const commander = makePiece('司令', 'red');
    const sapper = makePiece('工兵', 'blue');
    expect(canCapture(commander, sapper)).toBe(true);
    expect(resolveCombat(commander, sapper)).toBe('attacker_wins');
  });

  it('低等级不能吃高等级：红工兵 vs 蓝司令 → canCapture 返回 false', () => {
    const sapper = makePiece('工兵', 'red');
    const commander = makePiece('司令', 'blue');
    expect(canCapture(sapper, commander)).toBe(false);
  });

  it('军旗不可被吃：任何棋子 vs 军旗 → canCapture 返回 false', () => {
    const flag = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const commander = makePiece('司令', 'red');
    expect(canCapture(commander, flag)).toBe(false);
  });

  it('地雷不能主动攻击：地雷 vs 任何棋子 → canCapture 返回 false', () => {
    const mine = makePiece('地雷', 'red');
    const commander = makePiece('司令', 'blue');
    expect(canCapture(mine, commander)).toBe(false);
  });
});

// ============================================================
// 单元测试 - getValidMoves / getValidCaptures
// ============================================================
describe('getValidMoves - 合法移动检测', () => {
  it('棋盘满时（初始状态）：普通棋子无法走牌（无空位）', () => {
    const state = createGameState('pvp');
    // 找一个已翻开的普通棋子（手动翻开）
    state.board[0][0].faceUp = true;
    state.board[0][0].team = 'red';
    state.board[0][0].name = '司令';
    state.board[0][0].rank = 1;
    const moves = getValidMoves(state.board, 0, 0, 'red');
    // 棋盘满，无空位，不能走牌
    expect(moves.filter(m => m.type === 'move')).toHaveLength(0);
  });

  it('有空位时：可以走牌', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('司令', 'red');
    const moves = getValidMoves(board, 2, 2, 'red');
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every(m => m.type === 'move')).toBe(true);
  });

  it('最小普通棋子与军旗相邻时：getValidMoves 包含 capture_flag 类型', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('工兵', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const moves = getValidMoves(board, 2, 2, 'red');
    const flagMoves = moves.filter(m => m.type === 'capture_flag');
    expect(flagMoves.length).toBe(1);
    expect(flagMoves[0]).toMatchObject({ x: 3, y: 2 });
  });
});

describe('getValidCaptures - 合法吃牌检测', () => {
  it('高等级可以吃低等级', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = makePiece('工兵', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it('低等级不能吃高等级', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('工兵', 'red');
    board[1][2] = makePiece('司令', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('军旗不出现在 getValidCaptures 中', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });
});

// ============================================================
// 单元测试 - flipCard 翻牌操作
// ============================================================
describe('flipCard - 翻牌操作', () => {
  it('翻开普通棋子：faceUp 变为 true，currentTeam 切换，turnCount++', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('司令', 'red', false);
    const state = makeState(board, 'red', { teamAssigned: true });
    const prevTurn = state.turnCount;
    const result = flipCard(state, 0, 0);
    expect(result).not.toBeNull();
    expect(state.board[0][0].faceUp).toBe(true);
    expect(state.currentTeam).toBe('blue');
    expect(state.turnCount).toBe(prevTurn + 1);
  });

  it('翻开军旗：faceUp 变为 true，不分配阵营（teamAssigned 仍为 false）', () => {
    const board = emptyBoard();
    board[0][0] = { name: '军旗', team: 'neutral', rank: null, faceUp: false };
    const state = makeState(board, 'red', { teamAssigned: false });
    flipCard(state, 0, 0);
    expect(state.board[0][0].faceUp).toBe(true);
    expect(state.teamAssigned).toBe(false);
  });

  it('翻开非军旗棋子：teamAssigned 变为 true', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('工兵', 'red', false);
    const state = makeState(board, 'red', { teamAssigned: false });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
  });

  it('空位返回 null', () => {
    const board = emptyBoard();
    const state = makeState(board, 'red');
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it('已翻开的牌返回 null', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('司令', 'red', true);
    const state = makeState(board, 'red');
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it('坐标越界返回 null', () => {
    const state = makeState(emptyBoard(), 'red');
    expect(flipCard(state, -1, 0)).toBeNull();
    expect(flipCard(state, 5, 0)).toBeNull();
  });
});

// ============================================================
// 单元测试 - moveCard 走牌操作
// ============================================================
describe('moveCard - 走牌操作', () => {
  it('地雷不可移动：返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('地雷', 'red');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('军旗不可移动：返回 null', () => {
    const board = emptyBoard();
    board[1][1] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('正常走牌：棋子移动，currentTeam 切换', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    const state = makeState(board, 'red');
    const result = moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(state.board[1][1]).toBeNull();
    expect(state.board[1][2].name).toBe('司令');
    expect(state.currentTeam).toBe('blue');
  });

  it('非最小普通棋子尝试移动到军旗位置：返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    // 还有工兵在场，司令不是最小棋子
    board[0][0] = makePiece('工兵', 'red');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });
});

// ============================================================
// 单元测试 - captureCard 吃牌操作
// ============================================================
describe('captureCard - 吃牌操作', () => {
  it('炸弹同归于尽：双方均从棋盘移除', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('炸弹', 'red');
    board[1][2] = makePiece('司令', 'blue');
    const state = makeState(board, 'red');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(state.board[1][1]).toBeNull();
    expect(state.board[1][2]).toBeNull();
  });

  it('工兵排雷：工兵存活，地雷移除', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('工兵', 'red');
    board[1][2] = makePiece('地雷', 'blue');
    const state = makeState(board, 'red');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(state.board[1][1]).toBeNull();
    expect(state.board[1][2].name).toBe('工兵');
    expect(state.board[1][2].team).toBe('red');
  });

  it('高等级吃低等级：攻击方移到目标位置', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = makePiece('工兵', 'blue');
    const state = makeState(board, 'red');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(state.board[1][1]).toBeNull();
    expect(state.board[1][2].name).toBe('司令');
  });
});

// ============================================================
// 单元测试 - canCaptureFlag 抱军旗判定
// ============================================================
describe('canCaptureFlag - 抱军旗判定', () => {
  it('最小普通棋子与军旗相邻：返回 { canCapture: true, flagX, flagY }', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('工兵', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const result = canCaptureFlag(board, 2, 2, 'red');
    expect(result).not.toBeNull();
    expect(result.canCapture).toBe(true);
    expect(result.flagX).toBe(3);
    expect(result.flagY).toBe(2);
  });

  it('非最小普通棋子：返回 null', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('司令', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    // 工兵也在场，司令不是最小
    board[0][0] = makePiece('工兵', 'red');
    const result = canCaptureFlag(board, 2, 2, 'red');
    expect(result).toBeNull();
  });

  it('炸弹不能抱军旗：返回 null', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('炸弹', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const result = canCaptureFlag(board, 2, 2, 'red');
    expect(result).toBeNull();
  });

  it('地雷不能抱军旗：返回 null', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('地雷', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const result = canCaptureFlag(board, 2, 2, 'red');
    expect(result).toBeNull();
  });
});

// ============================================================
// 单元测试 - checkGameOver 游戏结束判定
// ============================================================
describe('checkGameOver - 游戏结束判定', () => {
  it('state.gameOver=true 时：返回 { ended: true, winner }', () => {
    const state = makeState(emptyBoard(), 'red', { gameOver: true, winner: 'red' });
    const result = checkGameOver(state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe('red');
  });

  it('当前行动方无合法操作：返回 { ended: true, winner: 对方 }', () => {
    // 构造一个红方无任何合法操作的状态（棋盘全空，currentTeam=red）
    const board = emptyBoard();
    // 只放一张蓝方已翻开棋子，红方无棋子
    board[0][0] = makePiece('司令', 'blue');
    const state = makeState(board, 'red');
    const result = checkGameOver(state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe('blue');
  });

  it('正常游戏中：返回 { ended: false, winner: null }', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('司令', 'red', false); // 未翻开，红方可翻牌
    board[1][0] = makePiece('工兵', 'blue');
    const state = makeState(board, 'red');
    const result = checkGameOver(state);
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });
});

// ============================================================
// 单元测试 - aiDecide AI 决策优先级
// ============================================================
describe('aiDecide - AI 决策优先级', () => {
  it('存在抱军旗机会时：返回 type=move 且 to 为军旗位置', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('工兵', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('move');
    expect(decision.to).toMatchObject({ x: 3, y: 2 });
  });

  it('存在吃牌机会时：返回 type=capture', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = makePiece('工兵', 'blue');
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('capture');
  });

  it('只有翻牌时：返回 type=flip', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('司令', 'red', false);
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('flip');
  });
});


// ============================================================
// Property 1: 初始状态不变量
// Feature: chinese-army-chess-game, Property 1: 初始状态不变量
// Validates: Requirements 1.2, 1.4, 1.5
// ============================================================
describe('Property 1: 初始状态不变量', () => {
  it('createGameState 创建的棋盘满足所有不变量', () => {
    fc.assert(fc.property(fc.constantFrom('pvp', 'pve'), (mode) => {
      const state = createGameState(mode);
      let total = 0, redCount = 0, blueCount = 0, neutralCount = 0;
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const p = state.board[y][x];
          expect(p).not.toBeNull();
          total++;
          if (p.team === 'red') redCount++;
          else if (p.team === 'blue') blueCount++;
          else if (p.team === 'neutral') neutralCount++;
          expect(p.faceUp).toBe(false);
        }
      }
      expect(total).toBe(25);
      expect(redCount).toBe(12);
      expect(blueCount).toBe(12);
      expect(neutralCount).toBe(1);
    }));
  });
});

// ============================================================
// Property 2: 图片路径映射正确性
// Feature: chinese-army-chess-game, Property 2: 图片路径映射正确性
// Validates: Requirements 3.2, 12.1
// ============================================================
describe('Property 2: 图片路径映射正确性', () => {
  it('所有阵营棋子图片路径格式正确', () => {
    fc.assert(fc.property(
      fc.constantFrom(...TEAM_PIECE_NAMES),
      fc.constantFrom('red', 'blue'),
      (name, team) => {
        const piece = { name, team, rank: getRank(name), faceUp: true };
        const path = getImagePath(piece);
        if (team === 'red') expect(path).toBe(`images/红-${name}.png`);
        else expect(path).toBe(`images/蓝-${name}.png`);
      }
    ));
  });

  it('军旗图片路径正确', () => {
    const flagPiece = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    expect(getImagePath(flagPiece)).toBe('images/军旗.png');
  });
});

// ============================================================
// Property 3: 等级映射正确性
// Feature: chinese-army-chess-game, Property 3: 等级映射正确性
// Validates: Requirements 7.1, 7.4
// ============================================================
describe('Property 3: 等级映射正确性', () => {
  it('普通棋子等级映射正确', () => {
    const expectedRanks = {
      '司令': 1, '军长': 2, '师长': 3, '旅长': 4, '团长': 5,
      '营长': 6, '连长': 7, '排长': 8, '班长': 9, '工兵': 10
    };
    fc.assert(fc.property(fc.constantFrom(...NORMAL_PIECE_NAMES), (name) => {
      expect(getRank(name)).toBe(expectedRanks[name]);
    }));
  });

  it('特殊棋子等级为 null', () => {
    expect(getRank('炸弹')).toBeNull();
    expect(getRank('地雷')).toBeNull();
    expect(getRank('军旗')).toBeNull();
  });
});

// ============================================================
// Property 4: 战斗判定完整性
// Feature: chinese-army-chess-game, Property 4: 战斗判定完整性
// Validates: Requirements 6.1, 6.4, 6.7, 6.8, 8.2, 8.3, 8.4, 9.2, 9.3, 9.5, 10.3
// ============================================================
describe('Property 4: 战斗判定完整性', () => {
  it('军旗作为防守方：始终返回 false', () => {
    fc.assert(fc.property(
      fc.constantFrom(...TEAM_PIECE_NAMES),
      fc.constantFrom('red', 'blue'),
      (name, team) => {
        const attacker = { name, team: 'red', rank: getRank(name), faceUp: true };
        const flag = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
        expect(canCapture(attacker, flag)).toBe(false);
      }
    ));
  });

  it('地雷作为攻击方：始终返回 false', () => {
    fc.assert(fc.property(
      fc.constantFrom(...TEAM_PIECE_NAMES),
      (name) => {
        const mine = { name: '地雷', team: 'red', rank: null, faceUp: true };
        const target = { name, team: 'blue', rank: getRank(name), faceUp: true };
        expect(canCapture(mine, target)).toBe(false);
      }
    ));
  });

  it('同阵营棋子：始终返回 false', () => {
    fc.assert(fc.property(
      fc.constantFrom(...TEAM_PIECE_NAMES),
      fc.constantFrom(...TEAM_PIECE_NAMES),
      fc.constantFrom('red', 'blue'),
      (name1, name2, team) => {
        const a = { name: name1, team, rank: getRank(name1), faceUp: true };
        const b = { name: name2, team, rank: getRank(name2), faceUp: true };
        expect(canCapture(a, b)).toBe(false);
      }
    ));
  });

  it('炸弹攻击非军旗对方棋子：返回 true', () => {
    fc.assert(fc.property(
      fc.constantFrom(...TEAM_PIECE_NAMES),
      (name) => {
        const bomb = { name: '炸弹', team: 'red', rank: null, faceUp: true };
        const target = { name, team: 'blue', rank: getRank(name), faceUp: true };
        expect(canCapture(bomb, target)).toBe(true);
      }
    ));
  });

  it('普通棋子之间：高等级（数值小）可以吃低等级（数值大）', () => {
    fc.assert(fc.property(
      fc.constantFrom(...NORMAL_PIECE_NAMES),
      fc.constantFrom(...NORMAL_PIECE_NAMES),
      (name1, name2) => {
        const a = { name: name1, team: 'red', rank: getRank(name1), faceUp: true };
        const b = { name: name2, team: 'blue', rank: getRank(name2), faceUp: true };
        const result = canCapture(a, b);
        if (a.rank <= b.rank) expect(result).toBe(true);
        else expect(result).toBe(false);
      }
    ));
  });
});

// ============================================================
// Property 5: 战斗结果正确性
// Feature: chinese-army-chess-game, Property 5: 战斗结果正确性
// Validates: Requirements 6.2, 6.3, 8.2, 8.4, 9.2, 9.3, 9.4
// ============================================================
describe('Property 5: 战斗结果正确性', () => {
  it('炸弹攻击任何棋子（除军旗）→ mutual_destruction', () => {
    fc.assert(fc.property(
      fc.constantFrom(...NORMAL_PIECE_NAMES, '地雷'),
      (name) => {
        const bomb = { name: '炸弹', team: 'red', rank: null, faceUp: true };
        const target = { name, team: 'blue', rank: getRank(name), faceUp: true };
        expect(resolveCombat(bomb, target)).toBe('mutual_destruction');
      }
    ));
  });

  it('工兵攻击地雷 → attacker_wins', () => {
    const sapper = { name: '工兵', team: 'red', rank: 10, faceUp: true };
    const mine = { name: '地雷', team: 'blue', rank: null, faceUp: true };
    expect(resolveCombat(sapper, mine)).toBe('attacker_wins');
  });

  it('其他普通棋子攻击地雷 → mutual_destruction', () => {
    fc.assert(fc.property(
      fc.constantFrom('司令', '军长', '师长', '旅长', '团长', '营长', '连长', '排长', '班长'),
      (name) => {
        const piece = { name, team: 'red', rank: getRank(name), faceUp: true };
        const mine = { name: '地雷', team: 'blue', rank: null, faceUp: true };
        expect(resolveCombat(piece, mine)).toBe('mutual_destruction');
      }
    ));
  });

  it('同级普通棋子 → mutual_destruction', () => {
    fc.assert(fc.property(
      fc.constantFrom(...NORMAL_PIECE_NAMES),
      (name) => {
        const a = { name, team: 'red', rank: getRank(name), faceUp: true };
        const b = { name, team: 'blue', rank: getRank(name), faceUp: true };
        expect(resolveCombat(a, b)).toBe('mutual_destruction');
      }
    ));
  });

  it('高等级普通棋子攻击低等级 → attacker_wins', () => {
    const commander = { name: '司令', team: 'red', rank: 1, faceUp: true };
    const sapper = { name: '工兵', team: 'blue', rank: 10, faceUp: true };
    expect(resolveCombat(commander, sapper)).toBe('attacker_wins');
  });
});

// ============================================================
// Property 6: 操作后回合切换
// Feature: chinese-army-chess-game, Property 6: 操作后回合切换
// Validates: Requirements 3.3, 5.4, 6.5, 11.2
// ============================================================
describe('Property 6: 操作后回合切换', () => {
  it('翻牌后 currentTeam 切换，turnCount++', () => {
    fc.assert(fc.property(fc.constantFrom('pvp', 'pve'), (mode) => {
      const state = createGameState(mode);
      state.currentTeam = 'red';
      const prevTurn = state.turnCount;
      // 找一张未翻开的棋子
      let fx = -1, fy = -1;
      outer: for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          if (state.board[y][x] && !state.board[y][x].faceUp) { fx = x; fy = y; break outer; }
        }
      }
      const result = flipCard(state, fx, fy);
      expect(result).not.toBeNull();
      expect(state.turnCount).toBe(prevTurn + 1);
      expect(state.currentTeam).toBe('blue');
    }));
  });

  it('走牌后 currentTeam 切换，turnCount++', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('司令', 'red');
    const state = makeState(board, 'red', { turnCount: 5 });
    moveCard(state, { x: 2, y: 2 }, { x: 3, y: 2 });
    expect(state.currentTeam).toBe('blue');
    expect(state.turnCount).toBe(6);
  });

  it('吃牌后 currentTeam 切换，turnCount++', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = makePiece('工兵', 'blue');
    const state = makeState(board, 'red', { turnCount: 3 });
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe('blue');
    expect(state.turnCount).toBe(4);
  });
});

// ============================================================
// Property 7: 非法操作拒绝
// Feature: chinese-army-chess-game, Property 7: 非法操作拒绝
// Validates: Requirements 5.2, 5.5, 5.6, 5.7, 6.6, 11.4
// ============================================================
describe('Property 7: 非法操作拒绝', () => {
  it('flipCard 越界坐标返回 null', () => {
    expect(flipCard(createGameState('pvp'), -1, 0)).toBeNull();
    expect(flipCard(createGameState('pvp'), 5, 0)).toBeNull();
    expect(flipCard(createGameState('pvp'), 0, -1)).toBeNull();
    expect(flipCard(createGameState('pvp'), 0, 5)).toBeNull();
  });

  it('地雷不可移动', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('地雷', 'red');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('军旗不可移动', () => {
    const board = emptyBoard();
    board[1][1] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('非己方棋子不可移动', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'blue');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('未翻开棋子不可移动', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red', false);
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('曼哈顿距离不为1时 moveCard 返回 null', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('司令', 'red');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it('目标位置非空时 moveCard 返回 null（非军旗情况）', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = makePiece('工兵', 'blue');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });
});

// ============================================================
// Property 8: 抱军旗判定正确性
// Feature: chinese-army-chess-game, Property 8: 抱军旗判定正确性
// Validates: Requirements 10.4, 10.5, 10.6
// ============================================================
describe('Property 8: 抱军旗判定正确性', () => {
  it('仅最小普通棋子可抱军旗', () => {
    // 工兵是最小普通棋子（rank=10），与军旗相邻
    const board = emptyBoard();
    board[2][2] = makePiece('工兵', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    expect(canCaptureFlag(board, 2, 2, 'red')).not.toBeNull();

    // 司令不是最小棋子（工兵也在场）
    board[0][0] = makePiece('司令', 'red');
    expect(canCaptureFlag(board, 0, 0, 'red')).toBeNull();
  });

  it('非普通棋子（炸弹、地雷）不能抱军旗', () => {
    fc.assert(fc.property(
      fc.constantFrom('炸弹', '地雷'),
      (name) => {
        const board = emptyBoard();
        board[2][2] = { name, team: 'red', rank: null, faceUp: true };
        board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
        expect(canCaptureFlag(board, 2, 2, 'red')).toBeNull();
      }
    ));
  });

  it('最小普通棋子不与军旗相邻时返回 null', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('工兵', 'red');
    board[4][4] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    expect(canCaptureFlag(board, 0, 0, 'red')).toBeNull();
  });
});

// ============================================================
// Property 9: 游戏结束判定
// Feature: chinese-army-chess-game, Property 9: 游戏结束判定
// Validates: Requirements 10.7
// ============================================================
describe('Property 9: 游戏结束判定', () => {
  it('state.gameOver=true 时正确返回获胜方', () => {
    fc.assert(fc.property(
      fc.constantFrom('red', 'blue'),
      (winner) => {
        const state = makeState(emptyBoard(), winner === 'red' ? 'blue' : 'red', {
          gameOver: true,
          winner
        });
        const result = checkGameOver(state);
        expect(result.ended).toBe(true);
        expect(result.winner).toBe(winner);
      }
    ));
  });

  it('当前行动方无合法操作时对方获胜', () => {
    // 红方无棋子，无法操作
    const board = emptyBoard();
    board[0][0] = makePiece('司令', 'blue');
    const state = makeState(board, 'red');
    const result = checkGameOver(state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe('blue');
  });

  it('双方均有合法操作时游戏未结束', () => {
    const board = emptyBoard();
    board[0][0] = makePiece('司令', 'red', false); // 红方可翻牌
    board[1][0] = makePiece('工兵', 'blue');
    const state = makeState(board, 'red');
    const result = checkGameOver(state);
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });
});

// ============================================================
// Property 10: PVE 首次翻牌阵营分配
// Feature: chinese-army-chess-game, Property 10: PVE 首次翻牌阵营分配
// Validates: Requirements 4.2, 4.4, 4.5
// ============================================================
describe('Property 10: PVE 首次翻牌阵营分配', () => {
  it('玩家先手翻开非军旗棋子：playerTeam = 棋子阵营，aiTeam = 另一方', () => {
    fc.assert(fc.property(
      fc.constantFrom('red', 'blue'),
      (cardTeam) => {
        const board = emptyBoard();
        board[0][0] = makePiece('司令', cardTeam, false);
        const state = makeState(board, 'red', {
          mode: 'pve',
          teamAssigned: false,
          aiFirst: false
        });
        flipCard(state, 0, 0);
        expect(state.teamAssigned).toBe(true);
        expect(state.playerTeam).toBe(cardTeam);
        expect(state.aiTeam).toBe(cardTeam === 'red' ? 'blue' : 'red');
      }
    ));
  });

  it('AI 先手翻开非军旗棋子：aiTeam = 棋子阵营，playerTeam = 另一方', () => {
    fc.assert(fc.property(
      fc.constantFrom('red', 'blue'),
      (cardTeam) => {
        const board = emptyBoard();
        board[0][0] = makePiece('司令', cardTeam, false);
        const state = makeState(board, 'red', {
          mode: 'pve',
          teamAssigned: false,
          aiFirst: true
        });
        flipCard(state, 0, 0);
        expect(state.teamAssigned).toBe(true);
        expect(state.aiTeam).toBe(cardTeam);
        expect(state.playerTeam).toBe(cardTeam === 'red' ? 'blue' : 'red');
      }
    ));
  });

  it('翻开军旗时不进行阵营分配', () => {
    const board = emptyBoard();
    board[0][0] = { name: '军旗', team: 'neutral', rank: null, faceUp: false };
    const state = makeState(board, 'red', {
      mode: 'pve',
      teamAssigned: false,
      aiFirst: false
    });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(false);
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});

// ============================================================
// Property 11: AI 决策合法性
// Feature: chinese-army-chess-game, Property 11: AI 决策合法性
// Validates: Requirements 15.1, 15.2, 15.5, 15.7
// ============================================================
describe('Property 11: AI 决策合法性', () => {
  it('AI 最小普通棋子与军旗相邻时必须返回抱军旗操作（最高优先级）', () => {
    const board = emptyBoard();
    board[2][2] = makePiece('工兵', 'red');
    board[2][3] = { name: '军旗', team: 'neutral', rank: null, faceUp: true };
    // 也有吃牌机会，但抱军旗优先级更高
    board[2][1] = makePiece('工兵', 'blue');
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('move');
    expect(decision.to).toMatchObject({ x: 3, y: 2 });
  });

  it('存在合法吃牌操作时必须返回 capture 类型', () => {
    const board = emptyBoard();
    board[1][1] = makePiece('司令', 'red');
    board[1][2] = makePiece('工兵', 'blue');
    // 无翻牌机会（所有棋子已翻开）
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('capture');
  });

  it('返回的操作类型为合法类型之一', () => {
    fc.assert(fc.property(fc.constantFrom('pvp', 'pve'), (mode) => {
      const state = createGameState(mode);
      state.currentTeam = 'red';
      const decision = aiDecide(state, 'red');
      // 初始状态有未翻开棋子，应返回 flip
      expect(decision).not.toBeNull();
      expect(['flip', 'move', 'capture']).toContain(decision.type);
    }));
  });

  it('返回的 flip 操作可以成功执行', () => {
    const state = createGameState('pvp');
    state.currentTeam = 'red';
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    if (decision.type === 'flip') {
      const result = flipCard(state, decision.x, decision.y);
      expect(result).not.toBeNull();
    }
  });
});
