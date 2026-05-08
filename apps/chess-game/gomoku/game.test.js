import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE, EMPTY, BLACK, WHITE, WIN_COUNT,
  WIN_LINES, WINS_MAP, initWinLines,
  createBoard, getOpponent, getPlayerName,
  checkWinAt, checkDraw, makeMove,
  getBestAIMove, judgeRPS, getRPSName, createGameState
} from './game.js';

describe('constants', () => {
  it('BOARD_SIZE is 15', () => {
    expect(BOARD_SIZE).toBe(15);
  });
  it('EMPTY is 0', () => {
    expect(EMPTY).toBe(0);
  });
  it('BLACK is 1', () => {
    expect(BLACK).toBe(1);
  });
  it('WHITE is 2', () => {
    expect(WHITE).toBe(2);
  });
  it('WIN_COUNT is 5', () => {
    expect(WIN_COUNT).toBe(5);
  });
});

describe('WIN_LINES', () => {
  it('has 572 lines', () => {
    expect(WIN_LINES.length).toBe(572);
  });
  it('each line has 5 positions', () => {
    for (var i = 0; i < WIN_LINES.length; i++) {
      expect(WIN_LINES[i].length).toBe(5);
    }
  });
  it('all positions are within bounds', () => {
    for (var i = 0; i < WIN_LINES.length; i++) {
      for (var j = 0; j < WIN_LINES[i].length; j++) {
        var pos = WIN_LINES[i][j];
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(BOARD_SIZE);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(BOARD_SIZE);
      }
    }
  });
});

describe('WINS_MAP', () => {
  it('every intersection has at least one line', () => {
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        // 中心区域应该有线
        if (x >= 2 && x <= 12 && y >= 2 && y <= 12) {
          expect(WINS_MAP[x][y].length).toBeGreaterThan(0);
        }
      }
    }
  });
  it('center point participates in most lines', () => {
    var center = Math.floor(BOARD_SIZE / 2);
    var centerLines = WINS_MAP[center][center].length;
    // 中心点应该参与4个方向各多条线
    expect(centerLines).toBeGreaterThanOrEqual(10);
  });
});

describe('createBoard', () => {
  it('creates 15x15 empty board', () => {
    var board = createBoard();
    expect(board.length).toBe(15);
    expect(board[0].length).toBe(15);
    expect(board[14].length).toBe(15);
    for (var y = 0; y < 15; y++) {
      for (var x = 0; x < 15; x++) {
        expect(board[y][x]).toBe(EMPTY);
      }
    }
  });
});

describe('getOpponent', () => {
  it('BLACK -> WHITE', () => {
    expect(getOpponent(BLACK)).toBe(WHITE);
  });
  it('WHITE -> BLACK', () => {
    expect(getOpponent(WHITE)).toBe(BLACK);
  });
});

describe('getPlayerName', () => {
  it('BLACK is 黑棋', () => {
    expect(getPlayerName(BLACK)).toBe('黑棋');
  });
  it('WHITE is 白棋', () => {
    expect(getPlayerName(WHITE)).toBe('白棋');
  });
});

describe('checkWinAt', () => {
  it('returns null for empty board', () => {
    var board = createBoard();
    expect(checkWinAt(board, 7, 7, BLACK)).toBeNull();
  });
  it('detects horizontal win', () => {
    var board = createBoard();
    for (var i = 0; i < 5; i++) {
      board[7][3 + i] = BLACK;
    }
    var result = checkWinAt(board, 4, 7, BLACK);
    expect(result).not.toBeNull();
    expect(result.length).toBe(5);
  });
  it('detects vertical win', () => {
    var board = createBoard();
    for (var i = 0; i < 5; i++) {
      board[3 + i][7] = WHITE;
    }
    var result = checkWinAt(board, 7, 5, WHITE);
    expect(result).not.toBeNull();
  });
  it('detects diagonal win (\\)', () => {
    var board = createBoard();
    for (var i = 0; i < 5; i++) {
      board[3 + i][3 + i] = BLACK;
    }
    var result = checkWinAt(board, 5, 5, BLACK);
    expect(result).not.toBeNull();
  });
  it('detects diagonal win (/)', () => {
    var board = createBoard();
    for (var i = 0; i < 5; i++) {
      board[3 + i][11 - i] = WHITE;
    }
    var result = checkWinAt(board, 9, 5, WHITE);
    expect(result).not.toBeNull();
  });
  it('returns null when 4 in a row but not 5', () => {
    var board = createBoard();
    for (var i = 0; i < 4; i++) {
      board[7][3 + i] = BLACK;
    }
    expect(checkWinAt(board, 4, 7, BLACK)).toBeNull();
  });
  it('returns null when opponent blocks', () => {
    var board = createBoard();
    for (var i = 0; i < 4; i++) {
      board[7][3 + i] = BLACK;
    }
    board[7][7] = WHITE;
    expect(checkWinAt(board, 4, 7, BLACK)).toBeNull();
  });
});

describe('checkDraw', () => {
  it('returns false for empty board', () => {
    expect(checkDraw(createBoard())).toBe(false);
  });
  it('returns false when board has empty cells', () => {
    var board = createBoard();
    board[0][0] = BLACK;
    expect(checkDraw(board)).toBe(false);
  });
  it('returns true for full board with no winner', () => {
    var board = [];
    for (var y = 0; y < BOARD_SIZE; y++) {
      var row = [];
      for (var x = 0; x < BOARD_SIZE; x++) {
        row.push((x + y) % 2 === 0 ? BLACK : WHITE);
      }
      board.push(row);
    }
    expect(checkDraw(board)).toBe(true);
  });
});

describe('makeMove', () => {
  it('places stone correctly', () => {
    var board = createBoard();
    var newBoard = makeMove(board, 7, 7, BLACK);
    expect(newBoard[7][7]).toBe(BLACK);
  });
  it('does not modify original board', () => {
    var board = createBoard();
    makeMove(board, 7, 7, WHITE);
    expect(board[7][7]).toBe(EMPTY);
  });
  it('preserves existing stones', () => {
    var board = createBoard();
    board[3][3] = BLACK;
    var newBoard = makeMove(board, 7, 7, WHITE);
    expect(newBoard[3][3]).toBe(BLACK);
    expect(newBoard[7][7]).toBe(WHITE);
  });
});

describe('getBestAIMove', () => {
  it('returns a valid move', () => {
    var board = createBoard();
    var move = getBestAIMove(board, BLACK);
    expect(move).not.toBeNull();
    expect(move.x).toBeGreaterThanOrEqual(0);
    expect(move.x).toBeLessThan(BOARD_SIZE);
    expect(move.y).toBeGreaterThanOrEqual(0);
    expect(move.y).toBeLessThan(BOARD_SIZE);
  });
  it('takes winning move when available', () => {
    var board = createBoard();
    // AI (BLACK) has 4 in a row, needs one more
    board[7][3] = BLACK;
    board[7][4] = BLACK;
    board[7][5] = BLACK;
    board[7][6] = BLACK;
    var move = getBestAIMove(board, BLACK);
    expect(move).toEqual({ x: 7, y: 7 });
  });
  it('blocks opponent winning move', () => {
    var board = createBoard();
    // Human (WHITE) has 4 in a row
    board[7][3] = WHITE;
    board[7][4] = WHITE;
    board[7][5] = WHITE;
    board[7][6] = WHITE;
    var move = getBestAIMove(board, BLACK);
    // AI should block at either end
    expect(move.y).toBe(7);
    expect(move.x === 7 || move.x === 2).toBe(true);
  });
  it('prefers center on empty board', () => {
    var board = createBoard();
    var move = getBestAIMove(board, WHITE);
    var center = Math.floor(BOARD_SIZE / 2);
    expect(move).toEqual({ x: center, y: center });
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
  it('returns correct names', () => {
    expect(getRPSName('rock')).toBe('石头');
    expect(getRPSName('scissors')).toBe('剪刀');
    expect(getRPSName('paper')).toBe('布');
  });
  it('returns original for unknown', () => {
    expect(getRPSName('unknown')).toBe('unknown');
  });
});

describe('createGameState', () => {
  it('creates correct initial state', () => {
    var state = createGameState('pvp');
    expect(state.mode).toBe('pvp');
    expect(state.currentPlayer).toBe(BLACK);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.winLine).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.aiThinking).toBe(false);
    expect(state.scoreBlack).toBe(0);
    expect(state.scoreWhite).toBe(0);
    expect(state.lastMove).toBeNull();
    expect(state.board.length).toBe(15);
  });
  it('pve mode has null teams initially', () => {
    var state = createGameState('pve');
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});
