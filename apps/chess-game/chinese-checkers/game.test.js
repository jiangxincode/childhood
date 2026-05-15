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
