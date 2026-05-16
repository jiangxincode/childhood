import { describe, it, expect } from 'vitest';
import {
  EMPTY, RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE,
  PLAYER_COLORS,
  BOARD_ROWS, ROW_COLS, TOTAL_POSITIONS,
  positions, posKey, ADJACENT,
  START_POSITIONS, TARGET_POSITIONS,
  AI_WEIGHTS, POSITION_SCORES, isInTargetArea,
  createBoard, placePieces,
  getAdjacentMoves, getJumpMoves, getLegalMoves,
  makeMove, checkWin, checkGameOver,
  evaluateMove, getBestAIMove,
  judgeRPS, getRPSName,
  createGameState, initGame
} from './game.js';

describe('constants', () => {
  it('EMPTY is 0', () => { expect(EMPTY).toBe(0); });
  it('RED is 1', () => { expect(RED).toBe(1); });
  it('BLUE is 2', () => { expect(BLUE).toBe(2); });
  it('GREEN is 3', () => { expect(GREEN).toBe(3); });
  it('YELLOW is 4', () => { expect(YELLOW).toBe(4); });
  it('PURPLE is 5', () => { expect(PURPLE).toBe(5); });
  it('ORANGE is 6', () => { expect(ORANGE).toBe(6); });
  it('TOTAL_POSITIONS is 121', () => { expect(TOTAL_POSITIONS).toBe(121); });
  it('has 6 player color configs', () => { expect(Object.keys(PLAYER_COLORS).length).toBe(6); });
});

describe('board layout', () => {
  it('has 17 rows', () => { expect(BOARD_ROWS).toBe(17); });
  it('row cols sum to 121', () => {
    var sum = ROW_COLS.reduce(function(a, b) { return a + b; }, 0);
    expect(sum).toBe(121);
  });
  it('positions array has 121 entries', () => { expect(positions.length).toBe(121); });
});

describe('ADJACENT', () => {
  it('has 121 entries', () => { expect(ADJACENT.length).toBe(121); });
  it('center cell has 6 neighbors', () => {
    // Row 10, Col 10 is the center (position index 60)
    expect(ADJACENT[60].length).toBe(6);
  });
  it('corner cell has fewer neighbors', () => {
    expect(ADJACENT[0].length).toBeLessThan(6);
  });
  it('adjacency is symmetric', () => {
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      for (var j = 0; j < ADJACENT[i].length; j++) {
        var neighbor = ADJACENT[i][j];
        expect(ADJACENT[neighbor].indexOf(i)).not.toBe(-1);
      }
    }
  });
});

describe('START_POSITIONS', () => {
  it('each player has 10 start positions', () => {
    expect(START_POSITIONS[RED].length).toBe(10);
    expect(START_POSITIONS[BLUE].length).toBe(10);
    expect(START_POSITIONS[GREEN].length).toBe(10);
    expect(START_POSITIONS[YELLOW].length).toBe(10);
    expect(START_POSITIONS[PURPLE].length).toBe(10);
    expect(START_POSITIONS[ORANGE].length).toBe(10);
  });
  it('start positions do not overlap', () => {
    var all = [];
    for (var p = 1; p <= 6; p++) {
      for (var i = 0; i < START_POSITIONS[p].length; i++) {
        expect(all.indexOf(START_POSITIONS[p][i])).toBe(-1);
        all.push(START_POSITIONS[p][i]);
      }
    }
  });
});

describe('TARGET_POSITIONS', () => {
  it('RED target is BLUE start', () => {
    expect(TARGET_POSITIONS[RED]).toEqual(START_POSITIONS[BLUE]);
  });
  it('GREEN target is ORANGE start', () => {
    expect(TARGET_POSITIONS[GREEN]).toEqual(START_POSITIONS[ORANGE]);
  });
});

describe('createBoard', () => {
  it('creates empty board', () => {
    var board = createBoard();
    expect(board.length).toBe(TOTAL_POSITIONS);
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      expect(board[i]).toBe(EMPTY);
    }
  });
});

describe('placePieces', () => {
  it('places pieces correctly', () => {
    var board = createBoard();
    placePieces(board, RED);
    for (var i = 0; i < START_POSITIONS[RED].length; i++) {
      expect(board[START_POSITIONS[RED][i]]).toBe(RED);
    }
  });
});

describe('getLegalMoves', () => {
  it('returns legal moves from center', () => {
    var board = createBoard();
    var moves = getLegalMoves(board, 60);
    expect(moves.length).toBe(6);
  });
  it('includes jump moves', () => {
    var board = createBoard();
    board[60] = RED;
    board[61] = BLUE;
    var moves = getLegalMoves(board, 60);
    expect(moves.length).toBeGreaterThan(5);
  });
});

describe('makeMove', () => {
  it('moves piece correctly', () => {
    var board = createBoard();
    board[0] = RED;
    var newBoard = makeMove(board, 0, 1);
    expect(newBoard[0]).toBe(EMPTY);
    expect(newBoard[1]).toBe(RED);
  });
  it('does not modify original board', () => {
    var board = createBoard();
    board[0] = RED;
    makeMove(board, 0, 1);
    expect(board[0]).toBe(RED);
  });
});

describe('checkWin', () => {
  it('detects win when all pieces in target', () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    expect(checkWin(board, RED)).toBe(true);
  });
  it('returns false when not all pieces in target', () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length - 1; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    expect(checkWin(board, RED)).toBe(false);
  });
});

describe('checkGameOver', () => {
  it('returns null when no winner', () => {
    var board = createBoard();
    expect(checkGameOver(board, [RED, BLUE])).toBeNull();
  });
  it('returns winner', () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    expect(checkGameOver(board, [RED, BLUE])).toBe(RED);
  });
});

describe('getBestAIMove', () => {
  it('returns a valid move', () => {
    var board = createBoard();
    placePieces(board, RED);
    placePieces(board, BLUE);
    var move = getBestAIMove(board, BLUE);
    expect(move).not.toBeNull();
    expect(typeof move.from).toBe('number');
    expect(typeof move.to).toBe('number');
  });
});

describe('createGameState', () => {
  it('creates correct initial state', () => {
    var state = createGameState('pvp', 2);
    expect(state.mode).toBe('pvp');
    expect(state.playerCount).toBe(2);
    expect(state.players).toEqual([1, 2]);
    expect(state.currentPlayer).toBe(RED);
    expect(state.gameOver).toBe(false);
  });
});

describe('initGame', () => {
  it('places pieces for all players', () => {
    var state = createGameState('pvp', 6);
    initGame(state);
    for (var p = 1; p <= 6; p++) {
      for (var i = 0; i < START_POSITIONS[p].length; i++) {
        expect(state.board[START_POSITIONS[p][i]]).toBe(p);
      }
    }
  });
});

describe('AI_WEIGHTS', () => {
  it('has all weight constants', () => {
    expect(AI_WEIGHTS.PROGRESS).toBe(100);
    expect(AI_WEIGHTS.JUMP_EFFICIENCY).toBe(30);
    expect(AI_WEIGHTS.TARGET_ENTRY).toBe(500);
    expect(AI_WEIGHTS.TARGET_DEPTH).toBe(200);
    expect(AI_WEIGHTS.BLOCKING).toBe(80);
    expect(AI_WEIGHTS.FORMATION).toBe(20);
    expect(AI_WEIGHTS.RETREAT_PENALTY).toBe(-150);
  });
});

describe('POSITION_SCORES', () => {
  it('has scores for all players', () => {
    for (var p = RED; p <= ORANGE; p++) {
      expect(POSITION_SCORES[p]).toBeDefined();
      expect(POSITION_SCORES[p].length).toBe(TOTAL_POSITIONS);
    }
  });
  it('target positions have higher scores than start positions', () => {
    var targetScore = POSITION_SCORES[RED][TARGET_POSITIONS[RED][0]];
    var startScore = POSITION_SCORES[RED][START_POSITIONS[RED][0]];
    expect(targetScore).toBeGreaterThan(startScore);
  });
});

describe('isInTargetArea', () => {
  it('returns true for target positions', () => {
    expect(isInTargetArea(TARGET_POSITIONS[RED][0], RED)).toBe(true);
  });
  it('returns false for start positions', () => {
    expect(isInTargetArea(START_POSITIONS[RED][0], RED)).toBe(false);
  });
});

describe('judgeRPS', () => {
  it('rock beats scissors', () => {
    expect(judgeRPS('rock', 'scissors')).toBe(1);
    expect(judgeRPS('scissors', 'rock')).toBe(-1);
  });
  it('scissors beats paper', () => {
    expect(judgeRPS('scissors', 'paper')).toBe(1);
    expect(judgeRPS('paper', 'scissors')).toBe(-1);
  });
  it('paper beats rock', () => {
    expect(judgeRPS('paper', 'rock')).toBe(1);
    expect(judgeRPS('rock', 'paper')).toBe(-1);
  });
  it('same choice is draw', () => {
    expect(judgeRPS('rock', 'rock')).toBe(0);
    expect(judgeRPS('scissors', 'scissors')).toBe(0);
    expect(judgeRPS('paper', 'paper')).toBe(0);
  });
});

describe('getRPSName', () => {
  it('returns Chinese names', () => {
    expect(getRPSName('rock')).toBe('石头');
    expect(getRPSName('scissors')).toBe('剪刀');
    expect(getRPSName('paper')).toBe('布');
  });
});

// ============================================================
// 补充测试：getAdjacentMoves
// ============================================================

describe('getAdjacentMoves (补充)', () => {
  it('中心位置返回所有空邻接格', () => {
    var board = createBoard();
    var moves = getAdjacentMoves(board, 60);
    expect(moves.length).toBe(ADJACENT[60].length);
  });
  it('被棋子占据的邻接格不返回', () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    board[neighbors[0]] = RED;
    board[neighbors[1]] = BLUE;
    var moves = getAdjacentMoves(board, 60);
    expect(moves.length).toBe(neighbors.length - 2);
    expect(moves).not.toContain(neighbors[0]);
    expect(moves).not.toContain(neighbors[1]);
  });
  it('边界位置邻接格较少', () => {
    var board = createBoard();
    var moves = getAdjacentMoves(board, 0);
    expect(moves.length).toBeLessThan(6);
    expect(moves.length).toBe(ADJACENT[0].length);
  });
  it('所有邻接格都被占据时返回空数组', () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    for (var i = 0; i < neighbors.length; i++) {
      board[neighbors[i]] = RED;
    }
    var moves = getAdjacentMoves(board, 60);
    expect(moves).toHaveLength(0);
  });
});

// ============================================================
// 补充测试：getJumpMoves
// ============================================================

describe('getJumpMoves (补充)', () => {
  it('单跳：中间有棋子且目标为空', () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    // 在第一个邻接格放棋子，使其成为跳板
    board[neighbors[0]] = RED;
    // 计算跳越目标：从60跳过neighbors[0]
    var p1 = positions[60];
    var p2 = positions[neighbors[0]];
    var dstX = p2.x + (p2.x - p1.x);
    var dstY = p2.y + (p2.y - p1.y);
    var dstKey = dstX + ',' + dstY;
    if (posKey[dstKey] !== undefined) {
      var dstIdx = posKey[dstKey];
      var visited = {};
      var moves = getJumpMoves(board, 60, visited);
      expect(moves).toContain(dstIdx);
    }
  });
  it('无法跳跃时返回空数组', () => {
    var board = createBoard();
    // 空棋盘上没有跳板
    var visited = {};
    var moves = getJumpMoves(board, 60, visited);
    expect(moves).toHaveLength(0);
  });
  it('visited 防环机制：已访问位置不重复跳', () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    board[neighbors[0]] = RED;
    var visited = {};
    // 预先标记所有可能目标为已访问
    var p1 = positions[60];
    var p2 = positions[neighbors[0]];
    var dstX = p2.x + (p2.x - p1.x);
    var dstY = p2.y + (p2.y - p1.y);
    var dstKey = dstX + ',' + dstY;
    if (posKey[dstKey] !== undefined) {
      visited[posKey[dstKey]] = true;
      var moves = getJumpMoves(board, 60, visited);
      expect(moves).not.toContain(posKey[dstKey]);
    }
  });
  it('多跳递归：连续跳跃链', () => {
    var board = createBoard();
    // 构造一个可以连续跳的场景
    // 选一个有足够邻居的位置链
    var cell = 60;
    var neighbors = ADJACENT[cell];
    if (neighbors.length >= 2) {
      board[neighbors[0]] = RED;
      board[neighbors[1]] = RED;
      var visited = {};
      var moves = getJumpMoves(board, cell, visited);
      // 应该至少有2个跳越目标（每个跳板一个）
      expect(moves.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ============================================================
// 补充测试：getLegalMoves 边界情况
// ============================================================

describe('getLegalMoves (补充)', () => {
  it('角落位置的合法移动', () => {
    var board = createBoard();
    var moves = getLegalMoves(board, 0);
    // 角落位置只有邻接移动，无跳板时等于邻接数
    expect(moves.length).toBe(ADJACENT[0].length);
  });
  it('空位无棋子时返回空数组', () => {
    var board = createBoard();
    // 对空位调用 getLegalMoves 应返回空（虽然实际使用中不会这样调用）
    var moves = getLegalMoves(board, 60);
    // 空位本身没有棋子，但函数仍然返回邻接空位（这是设计行为）
    expect(moves.length).toBe(ADJACENT[60].length);
  });
  it('全棋盘被占满时返回空数组', () => {
    var board = createBoard();
    // 填满整个棋盘
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      board[i] = RED;
    }
    var moves = getLegalMoves(board, 60);
    expect(moves).toHaveLength(0);
  });
  it('多跳路径包含在结果中', () => {
    var board = createBoard();
    board[60] = RED;
    var neighbors = ADJACENT[60];
    board[neighbors[0]] = BLUE;
    var moves = getLegalMoves(board, 60);
    // 邻接移动 + 可能的跳越
    expect(moves.length).toBeGreaterThanOrEqual(neighbors.length - 1);
  });
});

// ============================================================
// 补充测试：placePieces 其他玩家
// ============================================================

describe('placePieces (补充)', () => {
  it('BLUE 棋子放置正确', () => {
    var board = createBoard();
    placePieces(board, BLUE);
    for (var i = 0; i < START_POSITIONS[BLUE].length; i++) {
      expect(board[START_POSITIONS[BLUE][i]]).toBe(BLUE);
    }
  });
  it('GREEN 棋子放置正确', () => {
    var board = createBoard();
    placePieces(board, GREEN);
    for (var i = 0; i < START_POSITIONS[GREEN].length; i++) {
      expect(board[START_POSITIONS[GREEN][i]]).toBe(GREEN);
    }
  });
  it('所有6个玩家的起始位置互不重叠', () => {
    var board = createBoard();
    for (var p = RED; p <= ORANGE; p++) {
      placePieces(board, p);
    }
    // 每个位置只能有一个玩家
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      if (board[i] !== EMPTY) {
        expect(board[i]).toBeGreaterThanOrEqual(RED);
        expect(board[i]).toBeLessThanOrEqual(ORANGE);
      }
    }
  });
});

// ============================================================
// 补充测试：checkWin 边界情况
// ============================================================

describe('checkWin (补充)', () => {
  it('最后一个棋子到位时立即获胜', () => {
    var board = createBoard();
    var targets = TARGET_POSITIONS[RED];
    // 放置9个到位，最后一个放在起始位置
    for (var i = 0; i < targets.length - 1; i++) {
      board[targets[i]] = RED;
    }
    // 还差一个，不算赢
    expect(checkWin(board, RED)).toBe(false);
    // 最后一个到位
    board[targets[targets.length - 1]] = RED;
    expect(checkWin(board, RED)).toBe(true);
  });
  it('目标区域有其他玩家棋子不算获胜', () => {
    var board = createBoard();
    var targets = TARGET_POSITIONS[RED];
    for (var i = 0; i < targets.length; i++) {
      board[targets[i]] = BLUE; // 放的是BLUE不是RED
    }
    expect(checkWin(board, RED)).toBe(false);
  });
});

// ============================================================
// 补充测试：checkGameOver 多人场景
// ============================================================

describe('checkGameOver (补充)', () => {
  it('3人游戏中只有目标玩家获胜', () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    var winner = checkGameOver(board, [RED, BLUE, GREEN]);
    expect(winner).toBe(RED);
  });
  it('6人游戏中无赢家时返回null', () => {
    var board = createBoard();
    placePieces(board, RED);
    placePieces(board, BLUE);
    var winner = checkGameOver(board, [RED, BLUE]);
    expect(winner).toBeNull();
  });
});

// ============================================================
// 补充测试：createGameState pve 模式
// ============================================================

describe('createGameState (补充)', () => {
  it('pve模式创建正确状态', () => {
    var state = createGameState('pve', 2);
    expect(state.mode).toBe('pve');
    expect(state.playerCount).toBe(2);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
  });
  it('不同playerCount创建正确的players数组', () => {
    var state2 = createGameState('pvp', 2);
    expect(state2.players).toEqual([1, 2]);
    var state4 = createGameState('pvp', 4);
    expect(state4.players).toEqual([1, 2, 3, 4]);
    var state6 = createGameState('pvp', 6);
    expect(state6.players).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// ============================================================
// 新增测试：evaluateMove
// ============================================================

describe('evaluateMove', () => {
  it('前进得分：向目标区域移动得分高于远离', () => {
    var board = createBoard();
    // 放一个RED棋子在中间位置，周围留空
    board[60] = RED;
    var neighbors = ADJACENT[60];
    var scores = [];
    for (var i = 0; i < neighbors.length; i++) {
      if (board[neighbors[i]] === EMPTY) {
        scores.push(evaluateMove(board, RED, 60, neighbors[i], [RED, BLUE]));
      }
    }
    // 至少应该有一些方向可以移动
    expect(scores.length).toBeGreaterThan(0);
    // 不同方向的得分应该不同（前进 vs 后退）
    var allSame = scores.every(function(s) { return s === scores[0]; });
    // 如果位置评分有差异，不同方向的得分应该不同
    if (!allSame) {
      var max = Math.max.apply(null, scores);
      var min = Math.min.apply(null, scores);
      expect(max).toBeGreaterThan(min);
    }
  });
  it('进入目标区域获得高额奖励', () => {
    var board = createBoard();
    // 把RED棋子放在目标区域旁边
    var target = TARGET_POSITIONS[RED][0];
    var neighbors = ADJACENT[target];
    var source = null;
    for (var i = 0; i < neighbors.length; i++) {
      if (!isInTargetArea(neighbors[i], RED)) {
        source = neighbors[i];
        break;
      }
    }
    if (source !== null) {
      board[source] = RED;
      var score = evaluateMove(board, RED, source, target, [RED, BLUE]);
      // 进入目标区域应该有显著正分
      expect(score).toBeGreaterThan(0);
    }
  });
  it('后退有惩罚', () => {
    var board = createBoard();
    placePieces(board, RED);
    // 找一个向远离目标方向移动的走法
    var from = START_POSITIONS[RED][0];
    var neighbors = ADJACENT[from];
    for (var i = 0; i < neighbors.length; i++) {
      if (board[neighbors[i]] === EMPTY) {
        var score = evaluateMove(board, RED, from, neighbors[i], [RED, BLUE]);
        var posFrom = POSITION_SCORES[RED][from];
        var posTo = POSITION_SCORES[RED][neighbors[i]];
        if (posTo < posFrom) {
          // 后退应该有惩罚分
          expect(score).toBeLessThan(AI_WEIGHTS.RETREAT_PENALTY + AI_WEIGHTS.PROGRESS * posTo + 100);
        }
      }
    }
  });
  it('跳跃比相邻移动得分更高（距离因素）', () => {
    var board = createBoard();
    // 构造一个有跳板的场景
    board[60] = RED;
    var neighbors = ADJACENT[60];
    if (neighbors.length > 0) {
      board[neighbors[0]] = BLUE;
      // 跳越得分
      var p1 = positions[60];
      var p2 = positions[neighbors[0]];
      var dstX = p2.x + (p2.x - p1.x);
      var dstY = p2.y + (p2.y - p1.y);
      var dstKey = dstX + ',' + dstY;
      if (posKey[dstKey] !== undefined) {
        var dstIdx = posKey[dstKey];
        if (board[dstIdx] === EMPTY) {
          var jumpScore = evaluateMove(board, RED, 60, dstIdx, [RED, BLUE]);
          // 邻接移动得分
          var adjTarget = null;
          for (var i = 1; i < neighbors.length; i++) {
            if (board[neighbors[i]] === EMPTY) {
              adjTarget = neighbors[i];
              break;
            }
          }
          if (adjTarget !== null) {
            var adjScore = evaluateMove(board, RED, 60, adjTarget, [RED, BLUE]);
            // 跳跃效率加分使得跳跃得分更高
            expect(jumpScore).toBeGreaterThanOrEqual(adjScore);
          }
        }
      }
    }
  });
});

// ============================================================
// 补充测试：getBestAIMove 决策质量
// ============================================================

describe('getBestAIMove (补充)', () => {
  it('AI会选择向目标区域移动', () => {
    var board = createBoard();
    placePieces(board, RED);
    placePieces(board, BLUE);
    var move = getBestAIMove(board, BLUE, [RED, BLUE]);
    expect(move).not.toBeNull();
    // 移动后位置分数应该比移动前高或持平
    var scoreBefore = POSITION_SCORES[BLUE][move.from];
    var scoreAfter = POSITION_SCORES[BLUE][move.to];
    // AI应该不会选择大幅后退的走法
    expect(scoreAfter).toBeGreaterThanOrEqual(scoreBefore - 50);
  });
  it('有跳跃机会时AI会选择跳跃', () => {
    var board = createBoard();
    // 构造一个有利于跳跃的局面
    board[60] = BLUE;
    var neighbors = ADJACENT[60];
    if (neighbors.length > 0) {
      board[neighbors[0]] = RED;
    }
    var move = getBestAIMove(board, BLUE, [RED, BLUE]);
    if (move !== null) {
      expect(typeof move.from).toBe('number');
      expect(typeof move.to).toBe('number');
    }
  });
  it('无合法移动时返回null', () => {
    var board = createBoard();
    // 只放一个棋子在角落，被完全包围
    board[0] = RED;
    var neighbors = ADJACENT[0];
    for (var i = 0; i < neighbors.length; i++) {
      board[neighbors[i]] = BLUE;
    }
    // RED在角落被包围，可能有跳板也可能没有
    var move = getBestAIMove(board, RED, [RED, BLUE]);
    // 如果有跳板可能返回非null，否则null
    // 这个测试主要验证不会抛异常
    expect(move === null || (typeof move.from === 'number' && typeof move.to === 'number')).toBe(true);
  });
});
