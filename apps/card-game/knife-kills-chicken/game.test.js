import { describe, it, expect } from 'vitest';

const { judgeRPS, getImagePath, IMAGE_MAP, ROLES, BASE_DOMINANCE, canCapture, createGameState, getValidMoves, getValidCaptures, getCarryTargets } = require('./game.js');

// ============================================================
// 石头剪刀布判定 - 9种组合穷举
// Validates: Requirements 6.1, 10.1
// ============================================================
describe('judgeRPS - 石头剪刀布判定', () => {
  // 平局
  it('rock vs rock = 0 (平局)', () => {
    expect(judgeRPS('rock', 'rock')).toBe(0);
  });
  it('scissors vs scissors = 0 (平局)', () => {
    expect(judgeRPS('scissors', 'scissors')).toBe(0);
  });
  it('paper vs paper = 0 (平局)', () => {
    expect(judgeRPS('paper', 'paper')).toBe(0);
  });

  // 第一方胜
  it('rock vs scissors = 1 (第一方胜)', () => {
    expect(judgeRPS('rock', 'scissors')).toBe(1);
  });
  it('scissors vs paper = 1 (第一方胜)', () => {
    expect(judgeRPS('scissors', 'paper')).toBe(1);
  });
  it('paper vs rock = 1 (第一方胜)', () => {
    expect(judgeRPS('paper', 'rock')).toBe(1);
  });

  // 第二方胜
  it('rock vs paper = -1 (第二方胜)', () => {
    expect(judgeRPS('rock', 'paper')).toBe(-1);
  });
  it('scissors vs rock = -1 (第二方胜)', () => {
    expect(judgeRPS('scissors', 'rock')).toBe(-1);
  });
  it('paper vs scissors = -1 (第二方胜)', () => {
    expect(judgeRPS('paper', 'scissors')).toBe(-1);
  });
});

// ============================================================
// 图片映射正确性 - 16种角色+阵营组合
// Validates: Requirements 6.1, 10.1
// ============================================================
describe('getImagePath - 图片映射正确性', () => {
  // 特殊路径：红方"人"使用"人-人.png"
  it('红方"人"应返回 images/人-人.png（特殊路径）', () => {
    expect(getImagePath('人', 'red')).toBe('images/人-人.png');
  });

  // 蓝方"人"正常路径
  it('蓝方"人"应返回 images/人-蓝.png', () => {
    expect(getImagePath('人', 'blue')).toBe('images/人-蓝.png');
  });

  // 红方普通角色
  it('红方"马蜂"应返回 images/胡蜂-红.png', () => {
    expect(getImagePath('马蜂', 'red')).toBe('images/胡蜂-红.png');
  });
  it('红方"癞痢"应返回 images/癞痢-红.png', () => {
    expect(getImagePath('癞痢', 'red')).toBe('images/癞痢-红.png');
  });
  it('红方"枪"应返回 images/洋枪-红.png', () => {
    expect(getImagePath('枪', 'red')).toBe('images/洋枪-红.png');
  });
  it('红方"老虎"应返回 images/老虎-红.png', () => {
    expect(getImagePath('老虎', 'red')).toBe('images/老虎-红.png');
  });
  it('红方"刀"应返回 images/刀-红.png', () => {
    expect(getImagePath('刀', 'red')).toBe('images/刀-红.png');
  });
  it('红方"鸡"应返回 images/鸡-红.png', () => {
    expect(getImagePath('鸡', 'red')).toBe('images/鸡-红.png');
  });
  it('红方"火箭"应返回 images/火箭-红.png', () => {
    expect(getImagePath('火箭', 'red')).toBe('images/火箭-红.png');
  });

  // 蓝方普通角色
  it('蓝方"马蜂"应返回 images/胡蜂-蓝.png', () => {
    expect(getImagePath('马蜂', 'blue')).toBe('images/胡蜂-蓝.png');
  });
  it('蓝方"癞痢"应返回 images/癞痢-蓝.png', () => {
    expect(getImagePath('癞痢', 'blue')).toBe('images/癞痢-蓝.png');
  });
  it('蓝方"枪"应返回 images/洋枪-蓝.png', () => {
    expect(getImagePath('枪', 'blue')).toBe('images/洋枪-蓝.png');
  });
  it('蓝方"老虎"应返回 images/老虎-蓝.png', () => {
    expect(getImagePath('老虎', 'blue')).toBe('images/老虎-蓝.png');
  });
  it('蓝方"刀"应返回 images/刀-蓝.png', () => {
    expect(getImagePath('刀', 'blue')).toBe('images/刀-蓝.png');
  });
  it('蓝方"鸡"应返回 images/鸡-蓝.png', () => {
    expect(getImagePath('鸡', 'blue')).toBe('images/鸡-蓝.png');
  });
  it('蓝方"火箭"应返回 images/火箭-蓝.png', () => {
    expect(getImagePath('火箭', 'blue')).toBe('images/火箭-蓝.png');
  });
});


// ============================================================
// canCapture - 相克判定函数（Card对象版本）
// Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
// ============================================================

// 辅助函数：创建卡牌对象用于 canCapture 测试
function card(role, carrying = null) {
  return { role, team: 'red', faceUp: true, carrying };
}

describe('canCapture - 相克判定（Card对象）', () => {
  // 基础相克关系（BASE_DOMINANCE 表）
  it('马蜂克癞痢', () => expect(canCapture(card('马蜂'), card('癞痢'))).toBe(true));
  it('老虎克人', () => expect(canCapture(card('老虎'), card('人'))).toBe(true));
  it('鸡克马蜂', () => expect(canCapture(card('鸡'), card('马蜂'))).toBe(true));

  // 火箭克所有其他角色
  it('火箭克马蜂', () => expect(canCapture(card('火箭'), card('马蜂'))).toBe(true));
  it('火箭克癞痢', () => expect(canCapture(card('火箭'), card('癞痢'))).toBe(true));
  it('火箭克枪', () => expect(canCapture(card('火箭'), card('枪'))).toBe(true));
  it('火箭克老虎', () => expect(canCapture(card('火箭'), card('老虎'))).toBe(true));
  it('火箭克人', () => expect(canCapture(card('火箭'), card('人'))).toBe(true));
  it('火箭克刀', () => expect(canCapture(card('火箭'), card('刀'))).toBe(true));
  it('火箭克鸡', () => expect(canCapture(card('火箭'), card('鸡'))).toBe(true));

  // 反向不克制（单向关系验证）
  it('癞痢不克马蜂', () => expect(canCapture(card('癞痢'), card('马蜂'))).toBe(false));
  it('人不克老虎', () => expect(canCapture(card('人'), card('老虎'))).toBe(false));
  it('马蜂不克鸡', () => expect(canCapture(card('马蜂'), card('鸡'))).toBe(false));

  // 刀和枪自身不能吃任何角色
  it('刀不能吃任何角色', () => {
    for (const role of ROLES) {
      expect(canCapture(card('刀'), card(role))).toBe(false);
    }
  });
  it('枪不能吃任何角色', () => {
    for (const role of ROLES) {
      expect(canCapture(card('枪'), card(role))).toBe(false);
    }
  });

  // 扛刀人克鸡
  it('扛刀人克鸡', () => expect(canCapture(card('人', '刀'), card('鸡'))).toBe(true));
  it('未扛刀的人不能吃鸡', () => expect(canCapture(card('人'), card('鸡'))).toBe(false));

  // 扛枪癞痢克老虎
  it('扛枪癞痢克老虎', () => expect(canCapture(card('癞痢', '枪'), card('老虎'))).toBe(true));
  it('未扛枪的癞痢不能吃老虎', () => expect(canCapture(card('癞痢'), card('老虎'))).toBe(false));

  // 人不克火箭（新版删除了人克火箭）
  it('人不克火箭', () => expect(canCapture(card('人'), card('火箭'))).toBe(false));
  it('扛刀人也不克火箭', () => expect(canCapture(card('人', '刀'), card('火箭'))).toBe(false));

  // 人不克刀（新版删除了人克刀）
  it('人不克刀', () => expect(canCapture(card('人'), card('刀'))).toBe(false));

  // 同角色不克制
  it('同角色不克制', () => {
    for (const role of ROLES) {
      if (role === '刀' || role === '枪') continue; // 刀枪已单独测试
      expect(canCapture(card(role), card(role))).toBe(false);
    }
  });

  // 扛枪癞痢对非老虎角色无额外克制
  it('扛枪癞痢不克马蜂', () => expect(canCapture(card('癞痢', '枪'), card('马蜂'))).toBe(false));

  // 扛刀人对非鸡角色无额外克制
  it('扛刀人不克老虎', () => expect(canCapture(card('人', '刀'), card('老虎'))).toBe(false));
});


// ============================================================
// createGameState - 初始游戏状态创建
// Validates: Requirements 1.1, 1.2, 1.4, 1.5, 11.1
// ============================================================
describe('createGameState - 初始游戏状态', () => {
  it('应返回包含所有必要字段的游戏状态对象', () => {
    const state = createGameState('pvp');
    expect(state.mode).toBe('pvp');
    expect(state.currentTeam).toBeNull();
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
    expect(state.teamAssigned).toBe(false);
    expect(state.firstPlayer).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.capturedRed).toEqual([]);
    expect(state.capturedBlue).toEqual([]);
    expect(state.selectedCell).toBeNull();
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.aiThinking).toBe(false);
  });

  it('PVE模式应正确设置mode', () => {
    const state = createGameState('pve');
    expect(state.mode).toBe('pve');
  });

  it('棋盘应为4×4，包含恰好16张牌', () => {
    const state = createGameState('pvp');
    expect(state.board.length).toBe(4);
    let cardCount = 0;
    for (let y = 0; y < 4; y++) {
      expect(state.board[y].length).toBe(4);
      for (let x = 0; x < 4; x++) {
        expect(state.board[y][x]).not.toBeNull();
        cardCount++;
      }
    }
    expect(cardCount).toBe(16);
  });

  it('红蓝各8张，每方8种角色各一张', () => {
    const state = createGameState('pvp');
    const redRoles = [];
    const blueRoles = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        if (card.team === 'red') redRoles.push(card.role);
        else blueRoles.push(card.role);
      }
    }
    expect(redRoles.sort()).toEqual([...ROLES].sort());
    expect(blueRoles.sort()).toEqual([...ROLES].sort());
  });

  it('所有牌初始为背面朝上', () => {
    const state = createGameState('pvp');
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(state.board[y][x].faceUp).toBe(false);
      }
    }
  });

  it('每张牌应包含 role、team、faceUp、carrying 属性', () => {
    const state = createGameState('pvp');
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        expect(card).toHaveProperty('role');
        expect(card).toHaveProperty('team');
        expect(card).toHaveProperty('faceUp');
        expect(card).toHaveProperty('carrying');
        expect(['red', 'blue']).toContain(card.team);
        expect(ROLES).toContain(card.role);
      }
    }
  });

  it('所有牌初始 carrying 为 null', () => {
    const state = createGameState('pvp');
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(state.board[y][x].carrying).toBeNull();
      }
    }
  });
});


// ============================================================
// 辅助函数：创建测试用棋盘
// ============================================================
function emptyBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

function makeCard(role, team, faceUp = true, carrying = null) {
  return { role, team, faceUp, carrying };
}


// ============================================================
// getValidMoves - 合法移动检测
// Validates: Requirements 4.1, 4.2, 4.3
// ============================================================
describe('getValidMoves - 合法移动检测', () => {
  it('中间位置四周都为空时返回4个合法目标', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('鸡', 'red');
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it('角落位置只有2个合法目标', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('鸡', 'blue');
    const moves = getValidMoves(board, 0, 0);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
  });

  it('边缘位置只有3个合法目标', () => {
    const board = emptyBoard();
    board[0][1] = makeCard('马蜂', 'red');
    const moves = getValidMoves(board, 1, 0);
    expect(moves).toHaveLength(3);
    expect(moves).toContainEqual({ x: 0, y: 0 });
    expect(moves).toContainEqual({ x: 2, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 1 });
  });

  it('相邻位置有牌时不能移动到该位置', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('鸡', 'red');
    board[1][0] = makeCard('马蜂', 'blue');
    board[0][1] = makeCard('老虎', 'red');
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it('四周全被占据时返回空数组', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('鸡', 'red');
    board[1][0] = makeCard('马蜂', 'blue');
    board[1][2] = makeCard('枪', 'red');
    board[0][1] = makeCard('老虎', 'blue');
    board[2][1] = makeCard('人', 'red');
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(0);
  });

  it('刀不能移动（返回空数组）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'red');
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(0);
  });

  it('枪不能移动（返回空数组）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('枪', 'blue');
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(0);
  });

  it('扛刀人（人carrying=刀）可以正常移动', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red', true, '刀');
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });
});


// ============================================================
// getValidCaptures - 合法吃牌检测
// Validates: Requirements 5.1, 5.5, 6.3
// ============================================================
describe('getValidCaptures - 合法吃牌检测', () => {
  it('相邻有可克制的对方已翻开的牌时返回该目标', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it('相邻有不可克制的对方牌时不返回该目标', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'red');
    board[1][2] = makeCard('马蜂', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('相邻有己方牌时不返回该目标', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'red');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('相邻有未翻开的对方牌时不返回该目标', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue', false);
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('人不能吃火箭（新版无人克火箭）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('火箭', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('扛刀人可以吃鸡', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red', true, '刀');
    board[1][2] = makeCard('鸡', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it('未扛刀人不能吃鸡', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('鸡', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('扛枪癞痢可以吃老虎', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'red', true, '枪');
    board[1][2] = makeCard('老虎', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it('未扛枪癞痢不能吃老虎', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'red');
    board[1][2] = makeCard('老虎', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('棋子未翻开时返回空数组', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red', false);
    board[1][2] = makeCard('癞痢', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('棋子不属于指定阵营时返回空数组', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'blue');
    board[1][2] = makeCard('癞痢', 'red');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('多个方向有可吃目标时全部返回', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('火箭', 'red');
    board[1][0] = makeCard('马蜂', 'blue');
    board[1][2] = makeCard('鸡', 'blue');
    board[0][1] = makeCard('老虎', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(3);
  });

  it('刀不能吃任何角色', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'red');
    board[1][2] = makeCard('鸡', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });

  it('枪不能吃任何角色', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('枪', 'red');
    board[1][2] = makeCard('老虎', 'blue');
    const captures = getValidCaptures(board, 1, 1, 'red');
    expect(captures).toHaveLength(0);
  });
});


const { flipCard, moveCard, captureCard, carryWeapon, hasAnyLegalAction, checkGameOver } = require('./game.js');

// ============================================================
// getCarryTargets - 合法扛刀/扛枪目标检测
// Validates: Requirements 7.1, 7.2, 7.3, 7.4
// ============================================================
describe('getCarryTargets - 合法扛刀/扛枪目标检测', () => {
  it('人可以扛相邻的己方已翻开的刀', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'red');
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(1);
    expect(targets).toContainEqual({ x: 2, y: 1 });
  });

  it('癞痢可以扛相邻的己方已翻开的枪', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'blue');
    board[1][2] = makeCard('枪', 'blue');
    const targets = getCarryTargets(board, 1, 1, 'blue');
    expect(targets).toHaveLength(1);
    expect(targets).toContainEqual({ x: 2, y: 1 });
  });

  it('人不能扛对方阵营的刀', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'blue');
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(0);
  });

  it('癞痢不能扛对方阵营的枪', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'red');
    board[1][2] = makeCard('枪', 'blue');
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(0);
  });

  it('人不能扛枪', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('枪', 'red');
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(0);
  });

  it('癞痢不能扛刀', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'red');
    board[1][2] = makeCard('刀', 'red');
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(0);
  });

  it('其他角色返回空列表', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('刀', 'red');
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(0);
  });

  it('已扛刀的人不能再扛', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red', true, '刀');
    board[1][2] = makeCard('刀', 'red');
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(0);
  });

  it('未翻开的刀不能被扛', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'red', false);
    const targets = getCarryTargets(board, 1, 1, 'red');
    expect(targets).toHaveLength(0);
  });
});


// ============================================================
// 辅助函数：创建带有指定 currentTeam 的测试状态
// ============================================================
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
    gameOver: false,
    winner: null,
    aiThinking: false,
    aiFirst: opts.aiFirst || false
  };
}


// ============================================================
// flipCard - 翻牌操作
// Validates: Requirements 3.1, 3.3, 3.4, 11.2, 11.3, 11.4
// ============================================================
describe('flipCard - 翻牌操作', () => {
  it('翻开一张背面朝上的牌', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', false);
    const state = makeState(board, 'red');
    const result = flipCard(state, 0, 0);
    expect(result).not.toBeNull();
    expect(result.board[0][0].faceUp).toBe(true);
  });

  it('翻牌后切换当前行动方', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', false);
    const state = makeState(board, 'red');
    flipCard(state, 0, 0);
    expect(state.currentTeam).toBe('blue');
  });

  it('翻牌后 turnCount 递增', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', false);
    const state = makeState(board, 'red', { turnCount: 5 });
    flipCard(state, 0, 0);
    expect(state.turnCount).toBe(6);
  });

  it('空位返回 null', () => {
    const board = emptyBoard();
    const state = makeState(board, 'red');
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it('已翻开的牌返回 null', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', true);
    const state = makeState(board, 'red');
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it('第一张翻牌时确定阵营分配（PVE模式）', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', false);
    const state = makeState(board, 'red', { teamAssigned: false, mode: 'pve' });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.playerTeam).toBe('red');
    expect(state.aiTeam).toBe('blue');
  });

  it('第一张翻牌为蓝方牌时，玩家为蓝方（PVE模式）', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('鸡', 'blue', false);
    const state = makeState(board, 'red', { teamAssigned: false, mode: 'pve' });
    flipCard(state, 0, 0);
    expect(state.playerTeam).toBe('blue');
    expect(state.aiTeam).toBe('red');
  });

  it('PVP模式下第一张翻牌不设置 playerTeam/aiTeam', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', false);
    const state = makeState(board, 'red', { teamAssigned: false, mode: 'pvp' });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });

  it('坐标越界返回 null', () => {
    const board = emptyBoard();
    const state = makeState(board, 'red');
    expect(flipCard(state, -1, 0)).toBeNull();
    expect(flipCard(state, 4, 0)).toBeNull();
  });

  it('currentTeam 为 null 时（首次翻牌前）可以翻牌', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', false);
    const state = makeState(board, null, { teamAssigned: false });
    const result = flipCard(state, 0, 0);
    expect(result).not.toBeNull();
    expect(result.board[0][0].faceUp).toBe(true);
  });
});


// ============================================================
// moveCard - 走牌操作
// Validates: Requirements 4.1, 4.4, 4.5, 4.6
// ============================================================
describe('moveCard - 走牌操作', () => {
  it('将牌移动到相邻空位', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    const result = moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].role).toBe('刀');
  });

  it('走牌后切换当前行动方', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe('blue');
  });

  it('走牌后 turnCount 递增', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'red');
    const state = makeState(board, 'red', { turnCount: 3 });
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(4);
  });

  it('目标位置非空时返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'red');
    board[1][2] = makeCard('鸡', 'blue');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('曼哈顿距离不为1时返回 null', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it('斜向移动返回 null', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it('移动对方的牌返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'blue');
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('移动未翻开的牌返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('刀', 'red', false);
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('起始位置为空返回 null', () => {
    const board = emptyBoard();
    const state = makeState(board, 'red');
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});


// ============================================================
// captureCard - 吃牌操作
// Validates: Requirements 5.1, 5.2, 5.4
// ============================================================
describe('captureCard - 吃牌操作', () => {
  it('成功吃牌：攻击方移到被吃方位置，原位置清空', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].role).toBe('马蜂');
    expect(result.board[1][2].team).toBe('red');
  });

  it('被吃角色加入对应阵营的被吃列表（蓝方被吃）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red');
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedBlue).toContain('癞痢');
  });

  it('被吃角色加入对应阵营的被吃列表（红方被吃）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'blue');
    board[1][2] = makeCard('马蜂', 'red');
    // 蓝方回合：癞痢不克马蜂，换个能吃的
    board[1][1] = makeCard('鸡', 'blue');
    board[1][2] = makeCard('马蜂', 'red');
    const state = makeState(board, 'blue');
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain('马蜂');
  });

  it('吃牌后切换当前行动方', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red');
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe('blue');
  });

  it('吃牌后 turnCount 递增', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red', { turnCount: 7 });
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(8);
  });

  it('不满足相克关系返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'red');
    board[1][2] = makeCard('马蜂', 'blue');
    const state = makeState(board, 'red');
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('被吃方未翻开返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue', false);
    const state = makeState(board, 'red');
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('被吃方为己方牌返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'red');
    const state = makeState(board, 'red');
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('曼哈顿距离不为1返回 null', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('马蜂', 'red');
    board[0][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red');
    expect(captureCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it('攻击方未翻开返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red', false);
    board[1][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red');
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('人不能吃火箭（新版无人克火箭）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('火箭', 'blue');
    const state = makeState(board, 'red');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).toBeNull();
  });

  it('被吃方位置为空返回 null', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    const state = makeState(board, 'red');
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  // 火箭吃牌同归于尽
  it('火箭吃普通角色时同归于尽（两个位置都为null）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('火箭', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2]).toBeNull();
  });

  it('火箭吃牌后火箭自身加入被吃列表', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('火箭', 'red');
    board[1][2] = makeCard('老虎', 'blue');
    const state = makeState(board, 'red');
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain('火箭');
    expect(state.capturedBlue).toContain('老虎');
  });

  // 扛刀人/扛枪癞痢被吃时同时移除武器
  it('扛刀人被吃时，人和刀都加入被吃列表', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('老虎', 'blue');
    board[1][2] = makeCard('人', 'red', true, '刀');
    const state = makeState(board, 'blue');
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain('人');
    expect(state.capturedRed).toContain('刀');
    expect(state.capturedRed).toHaveLength(2);
  });

  it('扛枪癞痢被吃时，癞痢和枪都加入被吃列表', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'blue');
    board[1][2] = makeCard('癞痢', 'red', true, '枪');
    // 马蜂克癞痢
    const state = makeState(board, 'blue');
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain('癞痢');
    expect(state.capturedRed).toContain('枪');
    expect(state.capturedRed).toHaveLength(2);
  });

  // 火箭吃扛刀人：三张牌都被移除
  it('火箭吃扛刀人时，三张牌都被移除（火箭+人+刀）', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('火箭', 'blue');
    board[1][2] = makeCard('人', 'red', true, '刀');
    const state = makeState(board, 'blue');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    // 两个位置都为空
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2]).toBeNull();
    // 火箭加入蓝方被吃列表
    expect(state.capturedBlue).toContain('火箭');
    // 人和刀加入红方被吃列表
    expect(state.capturedRed).toContain('人');
    expect(state.capturedRed).toContain('刀');
  });

  // 扛刀人吃鸡成功
  it('扛刀人吃鸡成功', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red', true, '刀');
    board[1][2] = makeCard('鸡', 'blue');
    const state = makeState(board, 'red');
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].role).toBe('人');
    expect(result.board[1][2].carrying).toBe('刀');
    expect(state.capturedBlue).toContain('鸡');
  });
});


// ============================================================
// carryWeapon - 扛刀/扛枪操作
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
// ============================================================
describe('carryWeapon - 扛刀/扛枪操作', () => {
  it('人扛刀：人移到刀位置，carrying设为刀，原位置变空', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    const result = carryWeapon(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].role).toBe('人');
    expect(result.board[1][2].carrying).toBe('刀');
  });

  it('癞痢扛枪：癞痢移到枪位置，carrying设为枪，原位置变空', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('癞痢', 'blue');
    board[1][2] = makeCard('枪', 'blue');
    const state = makeState(board, 'blue');
    const result = carryWeapon(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].role).toBe('癞痢');
    expect(result.board[1][2].carrying).toBe('枪');
  });

  it('扛刀/扛枪后切换当前行动方', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    carryWeapon(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe('blue');
  });

  it('扛刀/扛枪后 turnCount 递增', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'red');
    const state = makeState(board, 'red', { turnCount: 5 });
    carryWeapon(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(6);
  });

  it('人不能扛对方的刀', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'blue');
    const state = makeState(board, 'red');
    expect(carryWeapon(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('人不能扛枪', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('枪', 'red');
    const state = makeState(board, 'red');
    expect(carryWeapon(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('已扛刀的人不能再扛', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red', true, '刀');
    board[1][2] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    expect(carryWeapon(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it('曼哈顿距离不为1返回null', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('人', 'red');
    board[0][2] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    expect(carryWeapon(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });
});


// ============================================================
// hasAnyLegalAction - 合法操作检测
// Validates: Requirements 8.1, 8.2
// ============================================================
describe('hasAnyLegalAction - 合法操作检测', () => {
  it('有未翻开的牌时返回 true', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red', false);
    expect(hasAnyLegalAction(board, 'red')).toBe(true);
  });

  it('己方已翻开的牌有合法移动时返回 true', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('鸡', 'red');
    // 四周有空位
    expect(hasAnyLegalAction(board, 'red')).toBe(true);
  });

  it('己方已翻开的牌有合法吃牌时返回 true', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    board[1][0] = makeCard('枪', 'red');
    board[0][1] = makeCard('老虎', 'red');
    board[2][1] = makeCard('人', 'red');
    // 马蜂被包围但可以吃癞痢
    expect(hasAnyLegalAction(board, 'red')).toBe(true);
  });

  it('人与对方火箭相邻时（无法吃火箭）检查其他合法操作', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('火箭', 'blue');
    // 人不能吃火箭，但人四周有空位可以移动
    board[1][0] = makeCard('枪', 'red');
    board[0][1] = makeCard('老虎', 'red');
    board[2][1] = makeCard('鸡', 'red');
    // 红方有多个棋子，鸡可以移动
    expect(hasAnyLegalAction(board, 'red')).toBe(true);
  });

  it('棋盘上无己方牌且无未翻开的牌时返回 false', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'blue');
    expect(hasAnyLegalAction(board, 'red')).toBe(false);
  });

  it('己方牌被完全包围且无吃牌机会且无未翻开的牌时返回 false', () => {
    const board = emptyBoard();
    // 红方刀在中间，四周全是蓝方牌且刀不能吃任何一个
    board[1][1] = makeCard('刀', 'red');
    board[1][0] = makeCard('马蜂', 'blue'); // 刀不克马蜂
    board[1][2] = makeCard('枪', 'blue');   // 刀不克枪
    board[0][1] = makeCard('老虎', 'blue'); // 刀不克老虎
    board[2][1] = makeCard('人', 'blue');   // 刀不克人
    expect(hasAnyLegalAction(board, 'red')).toBe(false);
  });

  it('空棋盘返回 false', () => {
    const board = emptyBoard();
    expect(hasAnyLegalAction(board, 'red')).toBe(false);
  });

  it('人与己方刀相邻时（可以扛刀）返回 true', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][0] = makeCard('刀', 'red');
    board[1][2] = makeCard('马蜂', 'blue');
    board[0][1] = makeCard('老虎', 'blue');
    board[2][1] = makeCard('鸡', 'blue');
    // 人被包围，不能移动，不能吃任何相邻牌，但可以扛刀
    expect(hasAnyLegalAction(board, 'red')).toBe(true);
  });
});


// ============================================================
// checkGameOver - 游戏结束判定
// Validates: Requirements 8.1, 8.2
// ============================================================
describe('checkGameOver - 游戏结束判定', () => {
  it('红方无牌时蓝方获胜', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'blue');
    const result = checkGameOver(board, 'red');
    expect(result.ended).toBe(true);
    expect(result.winner).toBe('blue');
  });

  it('蓝方无牌时红方获胜', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red');
    const result = checkGameOver(board, 'blue');
    expect(result.ended).toBe(true);
    expect(result.winner).toBe('red');
  });

  it('当前行动方无合法操作时对方获胜', () => {
    const board = emptyBoard();
    // 红方刀被完全包围且无法吃任何牌
    board[1][1] = makeCard('刀', 'red');
    board[1][0] = makeCard('马蜂', 'blue');
    board[1][2] = makeCard('枪', 'blue');
    board[0][1] = makeCard('老虎', 'blue');
    board[2][1] = makeCard('人', 'blue');
    const result = checkGameOver(board, 'red');
    expect(result.ended).toBe(true);
    expect(result.winner).toBe('blue');
  });

  it('双方都有牌且有合法操作时游戏未结束', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('鸡', 'red');
    board[3][3] = makeCard('马蜂', 'blue');
    const result = checkGameOver(board, 'red');
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it('有未翻开的牌时游戏未结束', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('刀', 'red');
    board[3][3] = makeCard('鸡', 'blue', false);
    const result = checkGameOver(board, 'red');
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it('空棋盘时双方都无牌，红方先判定为0 → 蓝方获胜', () => {
    const board = emptyBoard();
    const result = checkGameOver(board, 'red');
    // 红方0张，蓝方也0张，但红方先检测到0 → 蓝方胜
    expect(result.ended).toBe(true);
    expect(result.winner).toBe('blue');
  });
});


const { aiDecide } = require('./game.js');

// ============================================================
// aiDecide - AI决策函数
// Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
// ============================================================
describe('aiDecide - AI决策函数', () => {
  // 优先级1：存在吃牌机会时，优先执行吃牌
  it('存在吃牌机会时返回 capture 操作', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('capture');
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  // 优先级1：多个吃牌机会时返回其中之一
  it('有吃牌机会时优先吃牌', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('老虎', 'blue');
    board[1][2] = makeCard('人', 'red');
    // 蓝方老虎可以吃红方人（老虎克人）
    const state = makeState(board, 'blue');
    const decision = aiDecide(state, 'blue');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('capture');
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  // 优先级3：只有翻牌可用时，返回 flip 操作
  it('只有未翻开的牌可用时返回 flip 操作', () => {
    const board = emptyBoard();
    // 红方有一张已翻开的牌但被包围且无法吃任何牌
    board[0][0] = makeCard('刀', 'red');
    board[0][1] = makeCard('马蜂', 'blue');
    board[1][0] = makeCard('枪', 'blue');
    // 有一张未翻开的牌
    board[3][3] = makeCard('鸡', 'red', false);
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('flip');
    expect(decision.x).toBe(3);
    expect(decision.y).toBe(3);
  });

  // 优先级4：只有走牌可用时，返回 move 操作
  it('只有走牌可用时返回 move 操作', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('鸡', 'red');
    // 四周有空位，无对方牌可吃，无未翻开的牌
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('move');
    expect(decision.from).toEqual({ x: 1, y: 1 });
    // 目标应是相邻空位之一
    const validTargets = [
      { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 2 }
    ];
    expect(validTargets).toContainEqual(decision.to);
  });

  // 无任何合法操作时返回 null
  it('无任何合法操作时返回 null', () => {
    const board = emptyBoard();
    // 红方刀被完全包围且无法吃任何牌，无未翻开的牌
    board[1][1] = makeCard('刀', 'red');
    board[1][0] = makeCard('马蜂', 'blue');
    board[1][2] = makeCard('枪', 'blue');
    board[0][1] = makeCard('老虎', 'blue');
    board[2][1] = makeCard('人', 'blue');
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).toBeNull();
  });

  // 多个吃牌选项时，返回的操作应在合法列表中
  it('多个吃牌选项时返回的操作应在合法列表中', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('马蜂', 'red');
    board[0][1] = makeCard('癞痢', 'blue');
    board[2][2] = makeCard('鸡', 'red');
    board[2][3] = makeCard('马蜂', 'blue');
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('capture');
    const validFromTo = [
      { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
      { from: { x: 2, y: 2 }, to: { x: 3, y: 2 } }
    ];
    expect(validFromTo).toContainEqual({ from: decision.from, to: decision.to });
  });

  // 优先级2：有扛刀机会时（无吃牌机会），返回 carry 操作
  it('有扛刀机会时（无吃牌机会）返回 carry 操作', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('carry');
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  // 吃牌优先于扛刀
  it('吃牌优先于扛刀', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    board[2][2] = makeCard('人', 'red');
    board[2][3] = makeCard('刀', 'red');
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('capture');
  });

  // 扛刀优先于翻牌
  it('扛刀优先于翻牌', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('人', 'red');
    board[1][2] = makeCard('刀', 'red');
    board[3][3] = makeCard('鸡', 'blue', false);
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('carry');
  });

  // 吃牌优先于翻牌
  it('有吃牌机会时优先于翻牌', () => {
    const board = emptyBoard();
    board[1][1] = makeCard('马蜂', 'red');
    board[1][2] = makeCard('癞痢', 'blue');
    board[3][3] = makeCard('枪', 'blue', false); // 未翻开的牌
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('capture');
  });

  // 翻牌优先于走牌
  it('有翻牌机会时优先于走牌', () => {
    const board = emptyBoard();
    board[0][0] = makeCard('鸡', 'red');
    // 鸡四周有空位可走，但也有未翻开的牌
    board[3][3] = makeCard('马蜂', 'blue', false);
    const state = makeState(board, 'red');
    const decision = aiDecide(state, 'red');
    expect(decision).not.toBeNull();
    expect(decision.type).toBe('flip');
  });
});
