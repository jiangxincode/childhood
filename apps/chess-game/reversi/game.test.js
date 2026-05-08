// ============================================================
// 黑白棋（翻转棋）- 单元测试
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE,
  inBounds, getOpponent, isValidMove, getValidMoves,
  makeMove, countPieces, isGameOver, getWinner,
  createGameState, judgeRPS, getBestAIMove
} from './game.js';

// ---- 辅助函数 ----
function emptyBoard() {
  const board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push(null);
    }
    board.push(row);
  }
  return board;
}

function standardBoard() {
  const board = emptyBoard();
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = PLAYER_WHITE;
  board[mid - 1][mid] = PLAYER_BLACK;
  board[mid][mid - 1] = PLAYER_BLACK;
  board[mid][mid] = PLAYER_WHITE;
  return board;
}

// ============================================================
describe('inBounds - 棋盘边界检查', () => {
  it('原点 (0,0) 在边界内', () => {
    expect(inBounds(0, 0)).toBe(true);
  });
  it('右下角 (7,7) 在边界内', () => {
    expect(inBounds(7, 7)).toBe(true);
  });
  it('负坐标 (-1,0) 越界', () => {
    expect(inBounds(-1, 0)).toBe(false);
  });
  it('x 超出 (8,0) 越界', () => {
    expect(inBounds(8, 0)).toBe(false);
  });
  it('y 超出 (0,8) 越界', () => {
    expect(inBounds(0, 8)).toBe(false);
  });
});

// ============================================================
describe('getOpponent - 对手颜色', () => {
  it('黑棋对手是白棋', () => {
    expect(getOpponent(PLAYER_BLACK)).toBe(PLAYER_WHITE);
  });
  it('白棋对手是黑棋', () => {
    expect(getOpponent(PLAYER_WHITE)).toBe(PLAYER_BLACK);
  });
});

// ============================================================
describe('createGameState - 初始状态', () => {
  it('棋盘大小为 8x8', () => {
    const state = createGameState('pvp');
    expect(state.board.length).toBe(8);
    expect(state.board[0].length).toBe(8);
  });
  it('中央四子正确放置', () => {
    const state = createGameState('pvp');
    const mid = BOARD_SIZE / 2;
    expect(state.board[mid - 1][mid - 1]).toBe(PLAYER_WHITE);
    expect(state.board[mid - 1][mid]).toBe(PLAYER_BLACK);
    expect(state.board[mid][mid - 1]).toBe(PLAYER_BLACK);
    expect(state.board[mid][mid]).toBe(PLAYER_WHITE);
  });
  it('初始棋子数量为 2 黑 2 白', () => {
    const state = createGameState('pvp');
    const counts = countPieces(state.board);
    expect(counts.black).toBe(2);
    expect(counts.white).toBe(2);
  });
  it('初始回合数为 0', () => {
    const state = createGameState('pvp');
    expect(state.turnCount).toBe(0);
  });
  it('游戏未结束', () => {
    const state = createGameState('pvp');
    expect(state.gameOver).toBe(false);
  });
});

// ============================================================
describe('countPieces - 棋子计数', () => {
  it('空棋盘计数为 0', () => {
    const counts = countPieces(emptyBoard());
    expect(counts.black).toBe(0);
    expect(counts.white).toBe(0);
  });
  it('全黑棋盘', () => {
    const board = emptyBoard();
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        board[y][x] = PLAYER_BLACK;
    const counts = countPieces(board);
    expect(counts.black).toBe(64);
    expect(counts.white).toBe(0);
  });
});

// ============================================================
describe('isValidMove - 合法落子检查', () => {
  it('标准开局 (2,3) 对黑棋合法', () => {
    const board = standardBoard();
    expect(isValidMove(board, 2, 3, PLAYER_BLACK)).not.toBeNull();
  });
  it('标准开局 (4,2) 对白棋合法', () => {
    const board = standardBoard();
    expect(isValidMove(board, 4, 2, PLAYER_WHITE)).not.toBeNull();
  });
  it('标准开局 (0,0) 对黑棋不合法', () => {
    const board = standardBoard();
    expect(isValidMove(board, 0, 0, PLAYER_BLACK)).toBeNull();
  });
  it('已有棋子的位置不合法', () => {
    const board = standardBoard();
    expect(isValidMove(board, 3, 3, PLAYER_BLACK)).toBeNull();
  });
  it('越界位置不合法', () => {
    const board = standardBoard();
    expect(isValidMove(board, -1, 0, PLAYER_BLACK)).toBeNull();
  });
});

// ============================================================
describe('getValidMoves - 获取所有合法落子', () => {
  it('标准开局黑棋有合法落子', () => {
    const board = standardBoard();
    const moves = getValidMoves(board, PLAYER_BLACK);
    expect(moves.length).toBeGreaterThan(0);
  });
  it('标准开局白棋有合法落子', () => {
    const board = standardBoard();
    const moves = getValidMoves(board, PLAYER_WHITE);
    expect(moves.length).toBeGreaterThan(0);
  });
  it('空棋盘（无对手棋子）无合法落子', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    const moves = getValidMoves(board, PLAYER_WHITE);
    expect(moves.length).toBe(0);
  });
});

// ============================================================
describe('makeMove - 落子操作', () => {
  it('在 (2,3) 落黑棋翻转 1 颗白棋', () => {
    const board = standardBoard();
    const flipped = makeMove(board, 2, 3, PLAYER_BLACK);
    expect(flipped.length).toBe(1);
    expect(board[3][2]).toBe(PLAYER_BLACK); // board[y][x]
  });
  it('翻转后目标位置变为己方', () => {
    const board = standardBoard();
    const flipped = makeMove(board, 2, 3, PLAYER_BLACK);
    for (const pos of flipped) {
      expect(board[pos.y][pos.x]).toBe(PLAYER_BLACK);
    }
  });
  it('落子后棋子数量增加', () => {
    const board = standardBoard();
    const before = countPieces(board);
    makeMove(board, 2, 3, PLAYER_BLACK);
    const after = countPieces(board);
    expect(after.black).toBe(before.black + 1 + 1); // +1 落子 +1 翻转
  });
});

// ============================================================
describe('isGameOver - 游戏结束判断', () => {
  it('空棋盘游戏结束', () => {
    expect(isGameOver(emptyBoard())).toBe(true);
  });
  it('标准棋盘游戏未结束', () => {
    expect(isGameOver(standardBoard())).toBe(false);
  });
  it('仅一方有棋子游戏结束', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    expect(isGameOver(board)).toBe(true);
  });
});

// ============================================================
describe('getWinner - 胜负判断', () => {
  it('全黑棋盘黑棋胜', () => {
    const board = emptyBoard();
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        board[y][x] = PLAYER_BLACK;
    expect(getWinner(board)).toBe(PLAYER_BLACK);
  });
  it('全白棋盘白棋胜', () => {
    const board = emptyBoard();
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        board[y][x] = PLAYER_WHITE;
    expect(getWinner(board)).toBe(PLAYER_WHITE);
  });
  it('黑白各半平局', () => {
    const board = emptyBoard();
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        board[y][x] = (x + y) % 2 === 0 ? PLAYER_BLACK : PLAYER_WHITE;
    expect(getWinner(board)).toBe('draw');
  });
  it('黑多白少黑棋胜', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    board[0][1] = PLAYER_BLACK;
    board[0][2] = PLAYER_WHITE;
    expect(getWinner(board)).toBe(PLAYER_BLACK);
  });
});

// ============================================================
describe('judgeRPS - 石头剪刀布', () => {
  it('相同出拳平局', () => {
    expect(judgeRPS('rock', 'rock')).toBe(0);
    expect(judgeRPS('scissors', 'scissors')).toBe(0);
    expect(judgeRPS('paper', 'paper')).toBe(0);
  });
  it('石头胜剪刀', () => {
    expect(judgeRPS('rock', 'scissors')).toBe(1);
    expect(judgeRPS('scissors', 'rock')).toBe(-1);
  });
  it('剪刀胜布', () => {
    expect(judgeRPS('scissors', 'paper')).toBe(1);
    expect(judgeRPS('paper', 'scissors')).toBe(-1);
  });
  it('布胜石头', () => {
    expect(judgeRPS('paper', 'rock')).toBe(1);
    expect(judgeRPS('rock', 'paper')).toBe(-1);
  });
});

// ============================================================
describe('getBestAIMove - AI 落子', () => {
  it('标准开局 AI 能找到合法落子', () => {
    const board = standardBoard();
    const move = getBestAIMove(board, PLAYER_BLACK);
    expect(move).not.toBeNull();
    expect(move.x).toBeGreaterThanOrEqual(0);
    expect(move.x).toBeLessThan(BOARD_SIZE);
    expect(move.y).toBeGreaterThanOrEqual(0);
    expect(move.y).toBeLessThan(BOARD_SIZE);
  });
  it('无合法落子时返回 null', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    const move = getBestAIMove(board, PLAYER_WHITE);
    expect(move).toBeNull();
  });
});
