import { describe, it, expect } from 'vitest';
import {
  PLAYER_X, PLAYER_O, WIN_LINES,
  createGameState, checkWin, checkDraw, getValidMoves, makeMove,
  getOpponent, getBestAIMove, judgeRPS, getRPSName
} from './game.js';

describe('constants', () => {
  it('PLAYER_X is X', () => {
    expect(PLAYER_X).toBe('X');
  });
  it('PLAYER_O is O', () => {
    expect(PLAYER_O).toBe('O');
  });
  it('WIN_LINES has 8 lines', () => {
    expect(WIN_LINES.length).toBe(8);
  });
});

describe('createGameState', () => {
  it('creates empty 3x3 board', () => {
    var state = createGameState('pvp');
    expect(state.board.length).toBe(3);
    expect(state.board[0].length).toBe(3);
    expect(state.board[2].length).toBe(3);
    for (var y = 0; y < 3; y++) {
      for (var x = 0; x < 3; x++) {
        expect(state.board[y][x]).toBeNull();
      }
    }
  });
  it('X goes first', () => {
    var state = createGameState('pvp');
    expect(state.currentPlayer).toBe(PLAYER_X);
  });
  it('initial state is correct', () => {
    var state = createGameState('pve');
    expect(state.mode).toBe('pve');
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.winLine).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.aiThinking).toBe(false);
    expect(state.scoreX).toBe(0);
    expect(state.scoreO).toBe(0);
  });
});

describe('checkWin', () => {
  it('returns null for empty board', () => {
    var board = [[null,null,null],[null,null,null],[null,null,null]];
    expect(checkWin(board)).toBeNull();
  });
  it('detects horizontal win row 0', () => {
    var board = [['X','X','X'],[null,null,null],[null,null,null]];
    var result = checkWin(board);
    expect(result).not.toBeNull();
    expect(result.winner).toBe('X');
  });
  it('detects horizontal win row 1', () => {
    var board = [[null,null,null],['O','O','O'],[null,null,null]];
    var result = checkWin(board);
    expect(result.winner).toBe('O');
  });
  it('detects vertical win col 0', () => {
    var board = [['X',null,null],['X',null,null],['X',null,null]];
    var result = checkWin(board);
    expect(result.winner).toBe('X');
  });
  it('detects vertical win col 2', () => {
    var board = [[null,null,'O'],[null,null,'O'],[null,null,'O']];
    var result = checkWin(board);
    expect(result.winner).toBe('O');
  });
  it('detects diagonal win', () => {
    var board = [['X',null,null],[null,'X',null],[null,null,'X']];
    var result = checkWin(board);
    expect(result.winner).toBe('X');
    expect(result.line.length).toBe(3);
  });
  it('detects anti-diagonal win', () => {
    var board = [[null,null,'O'],[null,'O',null],['O',null,null]];
    var result = checkWin(board);
    expect(result.winner).toBe('O');
  });
  it('returns null when no winner', () => {
    var board = [['X','O','X'],['O','X','O'],['O','X','O']];
    expect(checkWin(board)).toBeNull();
  });
  it('returns winLine coordinates', () => {
    var board = [['X','X','X'],[null,null,null],[null,null,null]];
    var result = checkWin(board);
    expect(result.line).toEqual([{x:0,y:0},{x:1,y:0},{x:2,y:0}]);
  });
});

describe('checkDraw', () => {
  it('returns false for empty board', () => {
    var board = [[null,null,null],[null,null,null],[null,null,null]];
    expect(checkDraw(board)).toBe(false);
  });
  it('returns false when board has empty cells and no winner', () => {
    var board = [['X','O',null],['O','X',null],[null,null,null]];
    expect(checkDraw(board)).toBe(false);
  });
  it('returns true for a draw board', () => {
    var board = [['X','O','X'],['X','X','O'],['O','X','O']];
    expect(checkDraw(board)).toBe(true);
  });
  it('returns false when board is full but has a winner', () => {
    var board = [['X','X','X'],['O','O','X'],['O','X','O']];
    expect(checkDraw(board)).toBe(false);
  });
});

describe('getValidMoves', () => {
  it('returns 9 moves for empty board', () => {
    var board = [[null,null,null],[null,null,null],[null,null,null]];
    expect(getValidMoves(board).length).toBe(9);
  });
  it('returns correct moves for partially filled board', () => {
    var board = [['X',null,null],[null,'O',null],[null,null,null]];
    expect(getValidMoves(board).length).toBe(7);
  });
  it('returns empty array for full board', () => {
    var board = [['X','O','X'],['O','X','O'],['O','X','O']];
    expect(getValidMoves(board).length).toBe(0);
  });
  it('returns correct coordinates', () => {
    var board = [['X','O',null],[null,null,null],[null,null,null]];
    var moves = getValidMoves(board);
    expect(moves).toContainEqual({x:2, y:0});
    expect(moves).toContainEqual({x:0, y:1});
  });
});

describe('makeMove', () => {
  it('places piece correctly', () => {
    var board = [[null,null,null],[null,null,null],[null,null,null]];
    var newBoard = makeMove(board, 1, 1, 'X');
    expect(newBoard[1][1]).toBe('X');
  });
  it('does not modify original board', () => {
    var board = [[null,null,null],[null,null,null],[null,null,null]];
    makeMove(board, 0, 0, 'O');
    expect(board[0][0]).toBeNull();
  });
  it('preserves existing pieces', () => {
    var board = [['X',null,null],[null,null,null],[null,null,null]];
    var newBoard = makeMove(board, 2, 2, 'O');
    expect(newBoard[0][0]).toBe('X');
    expect(newBoard[2][2]).toBe('O');
  });
});

describe('getOpponent', () => {
  it('X -> O', () => {
    expect(getOpponent('X')).toBe('O');
  });
  it('O -> X', () => {
    expect(getOpponent('O')).toBe('X');
  });
});

describe('getBestAIMove', () => {
  it('takes winning move when available', () => {
    var board = [['O','O',null],[null,'X',null],['X',null,null]];
    var move = getBestAIMove(board, 'O');
    expect(move).toEqual({x:2, y:0});
  });
  it('blocks opponent winning move', () => {
    var board = [['X','X',null],[null,'O',null],[null,null,null]];
    var move = getBestAIMove(board, 'O');
    expect(move).toEqual({x:2, y:0});
  });
  it('returns null for full board', () => {
    var board = [['X','O','X'],['O','X','O'],['O','X','O']];
    expect(getBestAIMove(board, 'X')).toBeNull();
  });
  it('returns a valid move for empty board', () => {
    var board = [[null,null,null],[null,null,null],[null,null,null]];
    var move = getBestAIMove(board, 'X');
    expect(move).not.toBeNull();
    expect(move.x).toBeGreaterThanOrEqual(0);
    expect(move.x).toBeLessThanOrEqual(2);
    expect(move.y).toBeGreaterThanOrEqual(0);
    expect(move.y).toBeLessThanOrEqual(2);
  });
  it('AI as O does not lose when X plays corner opening', () => {
    // X plays (0,0), AI should play center
    var board = [['X',null,null],[null,null,null],[null,null,null]];
    var move = getBestAIMove(board, 'O');
    expect(move).toEqual({x:1, y:1});
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
  it('returns correct Chinese names', () => {
    expect(getRPSName('rock')).toBe('石头');
    expect(getRPSName('scissors')).toBe('剪刀');
    expect(getRPSName('paper')).toBe('布');
  });
  it('returns original for unknown', () => {
    expect(getRPSName('unknown')).toBe('unknown');
  });
});
