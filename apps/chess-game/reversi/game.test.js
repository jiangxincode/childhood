// ============================================================
// Reversi (Othello) - Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE,
  inBounds, getOpponent, isValidMove, getValidMoves,
  makeMove, countPieces, isGameOver, getWinner,
  createGameState, judgeRPS, getBestAIMove
} from './game.js';

// ---- Helper Functions ----
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
describe('inBounds - Board boundary check', () => {
  it('Origin (0,0) is within bounds', () => {
    expect(inBounds(0, 0)).toBe(true);
  });
  it('Bottom-right corner (7,7) is within bounds', () => {
    expect(inBounds(7, 7)).toBe(true);
  });
  it('Negative coordinate (-1,0) is out of bounds', () => {
    expect(inBounds(-1, 0)).toBe(false);
  });
  it('x exceeds (8,0) is out of bounds', () => {
    expect(inBounds(8, 0)).toBe(false);
  });
  it('y exceeds (0,8) is out of bounds', () => {
    expect(inBounds(0, 8)).toBe(false);
  });
});

// ============================================================
describe('getOpponent - Opponent color', () => {
  it('Black\'s opponent is white', () => {
    expect(getOpponent(PLAYER_BLACK)).toBe(PLAYER_WHITE);
  });
  it('White\'s opponent is black', () => {
    expect(getOpponent(PLAYER_WHITE)).toBe(PLAYER_BLACK);
  });
});

// ============================================================
describe('createGameState - Initial state', () => {
  it('Board size is 8x8', () => {
    const state = createGameState('pvp');
    expect(state.board.length).toBe(8);
    expect(state.board[0].length).toBe(8);
  });
  it('Center four pieces correctly placed', () => {
    const state = createGameState('pvp');
    const mid = BOARD_SIZE / 2;
    expect(state.board[mid - 1][mid - 1]).toBe(PLAYER_WHITE);
    expect(state.board[mid - 1][mid]).toBe(PLAYER_BLACK);
    expect(state.board[mid][mid - 1]).toBe(PLAYER_BLACK);
    expect(state.board[mid][mid]).toBe(PLAYER_WHITE);
  });
  it('Initial piece count is 2 black 2 white', () => {
    const state = createGameState('pvp');
    const counts = countPieces(state.board);
    expect(counts.black).toBe(2);
    expect(counts.white).toBe(2);
  });
  it('Initial turn count is 0', () => {
    const state = createGameState('pvp');
    expect(state.turnCount).toBe(0);
  });
  it('Game is not over', () => {
    const state = createGameState('pvp');
    expect(state.gameOver).toBe(false);
  });
});

// ============================================================
describe('countPieces - Piece count', () => {
  it('Empty board count is 0', () => {
    const counts = countPieces(emptyBoard());
    expect(counts.black).toBe(0);
    expect(counts.white).toBe(0);
  });
  it('All-black board', () => {
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
describe('isValidMove - Valid move check', () => {
  it('Standard opening (2,3) is valid for black', () => {
    const board = standardBoard();
    expect(isValidMove(board, 2, 3, PLAYER_BLACK)).not.toBeNull();
  });
  it('Standard opening (4,2) is valid for white', () => {
    const board = standardBoard();
    expect(isValidMove(board, 4, 2, PLAYER_WHITE)).not.toBeNull();
  });
  it('Standard opening (0,0) is invalid for black', () => {
    const board = standardBoard();
    expect(isValidMove(board, 0, 0, PLAYER_BLACK)).toBeNull();
  });
  it('Position with existing piece is invalid', () => {
    const board = standardBoard();
    expect(isValidMove(board, 3, 3, PLAYER_BLACK)).toBeNull();
  });
  it('Out-of-bounds position is invalid', () => {
    const board = standardBoard();
    expect(isValidMove(board, -1, 0, PLAYER_BLACK)).toBeNull();
  });
});

// ============================================================
describe('getValidMoves - Get all valid moves', () => {
  it('Black has valid moves in standard opening', () => {
    const board = standardBoard();
    const moves = getValidMoves(board, PLAYER_BLACK);
    expect(moves.length).toBeGreaterThan(0);
  });
  it('White has valid moves in standard opening', () => {
    const board = standardBoard();
    const moves = getValidMoves(board, PLAYER_WHITE);
    expect(moves.length).toBeGreaterThan(0);
  });
  it('Empty board (no opponent pieces) has no valid moves', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    const moves = getValidMoves(board, PLAYER_WHITE);
    expect(moves.length).toBe(0);
  });
});

// ============================================================
describe('makeMove - Move operation', () => {
  it('Placing black at (2,3) flips 1 white piece', () => {
    const board = standardBoard();
    const flipped = makeMove(board, 2, 3, PLAYER_BLACK);
    expect(flipped.length).toBe(1);
    expect(board[3][2]).toBe(PLAYER_BLACK); // board[y][x]
  });
  it('Target position becomes own color after flip', () => {
    const board = standardBoard();
    const flipped = makeMove(board, 2, 3, PLAYER_BLACK);
    for (const pos of flipped) {
      expect(board[pos.y][pos.x]).toBe(PLAYER_BLACK);
    }
  });
  it('Piece count increases after move', () => {
    const board = standardBoard();
    const before = countPieces(board);
    makeMove(board, 2, 3, PLAYER_BLACK);
    const after = countPieces(board);
    expect(after.black).toBe(before.black + 1 + 1); // +1 placement +1 flip
  });
});

// ============================================================
describe('isGameOver - Game over check', () => {
  it('Empty board game is over', () => {
    expect(isGameOver(emptyBoard())).toBe(true);
  });
  it('标准棋盘Game is not over', () => {
    expect(isGameOver(standardBoard())).toBe(false);
  });
  it('Game over when only one side has pieces', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    expect(isGameOver(board)).toBe(true);
  });
});

// ============================================================
describe('getWinner - Winner determination', () => {
  it('All-black board黑棋胜', () => {
    const board = emptyBoard();
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        board[y][x] = PLAYER_BLACK;
    expect(getWinner(board)).toBe(PLAYER_BLACK);
  });
  it('All-white board white wins', () => {
    const board = emptyBoard();
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        board[y][x] = PLAYER_WHITE;
    expect(getWinner(board)).toBe(PLAYER_WHITE);
  });
  it('Half black half white is a draw', () => {
    const board = emptyBoard();
    for (let y = 0; y < BOARD_SIZE; y++)
      for (let x = 0; x < BOARD_SIZE; x++)
        board[y][x] = (x + y) % 2 === 0 ? PLAYER_BLACK : PLAYER_WHITE;
    expect(getWinner(board)).toBe('draw');
  });
  it('More black than white black wins', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    board[0][1] = PLAYER_BLACK;
    board[0][2] = PLAYER_WHITE;
    expect(getWinner(board)).toBe(PLAYER_BLACK);
  });
});

// ============================================================
describe('judgeRPS - Rock-Paper-Scissors', () => {
  it('Same choice is a draw', () => {
    expect(judgeRPS('rock', 'rock')).toBe(0);
    expect(judgeRPS('scissors', 'scissors')).toBe(0);
    expect(judgeRPS('paper', 'paper')).toBe(0);
  });
  it('Rock beats scissors', () => {
    expect(judgeRPS('rock', 'scissors')).toBe(1);
    expect(judgeRPS('scissors', 'rock')).toBe(-1);
  });
  it('Scissors beats paper', () => {
    expect(judgeRPS('scissors', 'paper')).toBe(1);
    expect(judgeRPS('paper', 'scissors')).toBe(-1);
  });
  it('Paper beats rock', () => {
    expect(judgeRPS('paper', 'rock')).toBe(1);
    expect(judgeRPS('rock', 'paper')).toBe(-1);
  });
});

// ============================================================
describe('getBestAIMove - AI move', () => {
  it('AI can find valid move in standard opening', () => {
    const board = standardBoard();
    const move = getBestAIMove(board, PLAYER_BLACK);
    expect(move).not.toBeNull();
    expect(move.x).toBeGreaterThanOrEqual(0);
    expect(move.x).toBeLessThan(BOARD_SIZE);
    expect(move.y).toBeGreaterThanOrEqual(0);
    expect(move.y).toBeLessThan(BOARD_SIZE);
  });
  it('Returns null when no valid moves', () => {
    const board = emptyBoard();
    board[0][0] = PLAYER_BLACK;
    const move = getBestAIMove(board, PLAYER_WHITE);
    expect(move).toBeNull();
  });
});
