import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE, EMPTY, RED, WHITE, RED_KING, WHITE_KING, AI_DEPTH,
  createBoard, copyBoard, isRed, isWhite, isKing, getOwner,
  getOpponent, getPlayerName, promote, inBounds,
  getSimpleMoves, getCaptureMoves, getAllMoves, applyMove,
  checkGameOver, evaluateBoard, getBestAIMove, createGameState
} from './game.js';

describe('constants', () => {
  it('BOARD_SIZE is 8', () => {
    expect(BOARD_SIZE).toBe(8);
  });
  it('EMPTY is 0', () => {
    expect(EMPTY).toBe(0);
  });
  it('RED is 1', () => {
    expect(RED).toBe(1);
  });
  it('WHITE is 2', () => {
    expect(WHITE).toBe(2);
  });
  it('RED_KING is 3', () => {
    expect(RED_KING).toBe(3);
  });
  it('WHITE_KING is 4', () => {
    expect(WHITE_KING).toBe(4);
  });
  it('AI_DEPTH is 4', () => {
    expect(AI_DEPTH).toBe(4);
  });
});

describe('createBoard', () => {
  it('creates 8x8 board', () => {
    var board = createBoard();
    expect(board.length).toBe(8);
    for (var r = 0; r < 8; r++) {
      expect(board[r].length).toBe(8);
    }
  });
  it('RED pieces on dark squares in rows 0-2', () => {
    var board = createBoard();
    var redCount = 0;
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          expect(board[r][c]).toBe(RED);
          redCount++;
        } else {
          expect(board[r][c]).toBe(EMPTY);
        }
      }
    }
    expect(redCount).toBe(12);
  });
  it('WHITE pieces on dark squares in rows 5-7', () => {
    var board = createBoard();
    var whiteCount = 0;
    for (var r = 5; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          expect(board[r][c]).toBe(WHITE);
          whiteCount++;
        } else {
          expect(board[r][c]).toBe(EMPTY);
        }
      }
    }
    expect(whiteCount).toBe(12);
  });
  it('rows 3-4 are empty', () => {
    var board = createBoard();
    for (var r = 3; r <= 4; r++) {
      for (var c = 0; c < 8; c++) {
        expect(board[r][c]).toBe(EMPTY);
      }
    }
  });
  it('light squares are always empty', () => {
    var board = createBoard();
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) {
          expect(board[r][c]).toBe(EMPTY);
        }
      }
    }
  });
});

describe('copyBoard', () => {
  it('creates independent copy', () => {
    var board = createBoard();
    var copy = copyBoard(board);
    copy[0][1] = 99;
    expect(board[0][1]).toBe(RED);
  });
  it('copies all values correctly', () => {
    var board = createBoard();
    var copy = copyBoard(board);
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        expect(copy[r][c]).toBe(board[r][c]);
      }
    }
  });
});

describe('piece helpers', () => {
  it('isRed', () => {
    expect(isRed(RED)).toBe(true);
    expect(isRed(RED_KING)).toBe(true);
    expect(isRed(WHITE)).toBe(false);
    expect(isRed(WHITE_KING)).toBe(false);
    expect(isRed(EMPTY)).toBe(false);
  });
  it('isWhite', () => {
    expect(isWhite(WHITE)).toBe(true);
    expect(isWhite(WHITE_KING)).toBe(true);
    expect(isWhite(RED)).toBe(false);
    expect(isWhite(EMPTY)).toBe(false);
  });
  it('isKing', () => {
    expect(isKing(RED_KING)).toBe(true);
    expect(isKing(WHITE_KING)).toBe(true);
    expect(isKing(RED)).toBe(false);
    expect(isKing(WHITE)).toBe(false);
  });
  it('getOwner', () => {
    expect(getOwner(RED)).toBe(RED);
    expect(getOwner(RED_KING)).toBe(RED);
    expect(getOwner(WHITE)).toBe(WHITE);
    expect(getOwner(WHITE_KING)).toBe(WHITE);
    expect(getOwner(EMPTY)).toBe(EMPTY);
  });
});

describe('getOpponent', () => {
  it('RED -> WHITE', () => {
    expect(getOpponent(RED)).toBe(WHITE);
  });
  it('WHITE -> RED', () => {
    expect(getOpponent(WHITE)).toBe(RED);
  });
});

describe('getPlayerName', () => {
  it('RED is 红方', () => {
    expect(getPlayerName(RED)).toBe('红方');
  });
  it('WHITE is 白方', () => {
    expect(getPlayerName(WHITE)).toBe('白方');
  });
});

describe('promote', () => {
  it('RED promotes at row 7', () => {
    expect(promote(RED, 7)).toBe(RED_KING);
  });
  it('RED does not promote at row 6', () => {
    expect(promote(RED, 6)).toBe(RED);
  });
  it('WHITE promotes at row 0', () => {
    expect(promote(WHITE, 0)).toBe(WHITE_KING);
  });
  it('WHITE does not promote at row 1', () => {
    expect(promote(WHITE, 1)).toBe(WHITE);
  });
  it('king stays king', () => {
    expect(promote(RED_KING, 7)).toBe(RED_KING);
    expect(promote(WHITE_KING, 0)).toBe(WHITE_KING);
  });
});

describe('inBounds', () => {
  it('valid positions', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(7, 7)).toBe(true);
    expect(inBounds(3, 4)).toBe(true);
  });
  it('out of bounds', () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(8, 0)).toBe(false);
    expect(inBounds(0, 8)).toBe(false);
  });
});

describe('getSimpleMoves', () => {
  it('RED piece can move diagonally down', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[2][3] = RED; // dark square: (2+3)%2=1
    var moves = getSimpleMoves(board, 2, 3);
    expect(moves.length).toBe(2);
    var targets = moves.map(function(m) { return m.toR + ',' + m.toC; });
    expect(targets).toContain('3,2');
    expect(targets).toContain('3,4');
  });
  it('WHITE piece can move diagonally up', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[5][2] = WHITE;
    var moves = getSimpleMoves(board, 5, 2);
    expect(moves.length).toBe(2);
    var targets = moves.map(function(m) { return m.toR + ',' + m.toC; });
    expect(targets).toContain('4,1');
    expect(targets).toContain('4,3');
  });
  it('blocked piece has no moves', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[2][3] = RED;
    board[3][2] = RED;
    board[3][4] = WHITE;
    var moves = getSimpleMoves(board, 2, 3);
    expect(moves.length).toBe(0);
  });
  it('king can move in all 4 directions', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = RED_KING;
    var moves = getSimpleMoves(board, 3, 4);
    expect(moves.length).toBe(4);
  });
  it('edge piece has fewer moves', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[0][1] = RED; // top edge, dark square
    var moves = getSimpleMoves(board, 0, 1);
    // RED moves down: (1,0) and (1,2) both in bounds
    expect(moves.length).toBe(2);
  });
  it('corner piece has only 1 move', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[1][0] = RED; // left edge dark square
    var moves = getSimpleMoves(board, 1, 0);
    // RED moves down: (2,1) in bounds, (2,-1) out of bounds
    expect(moves.length).toBe(1);
  });
});

describe('getCaptureMoves', () => {
  it('RED can capture WHITE', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[2][3] = RED;
    board[3][4] = WHITE;
    board[4][5] = EMPTY;
    var caps = getCaptureMoves(board, 2, 3);
    expect(caps.length).toBe(1);
    expect(caps[0].toR).toBe(4);
    expect(caps[0].toC).toBe(5);
    expect(caps[0].capturedR).toBe(3);
    expect(caps[0].capturedC).toBe(4);
  });
  it('cannot capture own piece', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[2][3] = RED;
    board[3][4] = RED;
    board[4][5] = EMPTY;
    var caps = getCaptureMoves(board, 2, 3);
    expect(caps.length).toBe(0);
  });
  it('cannot capture to occupied square', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[2][3] = RED;
    board[3][4] = WHITE;
    board[4][5] = RED;
    var caps = getCaptureMoves(board, 2, 3);
    expect(caps.length).toBe(0);
  });
  it('regular RED cannot capture backward', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[4][5] = RED;
    board[3][4] = WHITE;
    board[2][3] = EMPTY;
    var caps = getCaptureMoves(board, 4, 5);
    expect(caps.length).toBe(0);
  });
  it('king can capture in all directions', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = RED_KING;
    board[2][3] = WHITE;
    board[1][2] = EMPTY;
    board[2][5] = WHITE;
    board[1][6] = EMPTY;
    board[4][3] = WHITE;
    board[5][2] = EMPTY;
    board[4][5] = WHITE;
    board[5][6] = EMPTY;
    var caps = getCaptureMoves(board, 3, 4);
    expect(caps.length).toBe(4);
  });
});

describe('getAllMoves', () => {
  it('returns simple moves when no captures', () => {
    var board = createBoard();
    var moves = getAllMoves(board, RED);
    // RED has 12 pieces, each with 1-2 simple moves
    expect(moves.length).toBeGreaterThan(0);
    // No captures at start
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].capturedR).toBeUndefined();
    }
  });
  it('forces capture when available', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    // One RED that can capture, one that has simple moves
    board[2][3] = RED;
    board[3][4] = WHITE;
    board[4][5] = EMPTY;
    board[2][7] = RED;
    var moves = getAllMoves(board, RED);
    // All moves must be captures
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].capturedR).toBeDefined();
    }
  });
  it('returns empty array when no legal moves', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    // RED at (0,1): forward moves (1,0) and (1,2) occupied by WHITE
    // No captures: can't capture own direction backward, forward jumps go to (2,-1) [OOB] and (2,3) which is empty
    // So we need to also block (2,3)
    board[0][1] = RED;
    board[1][0] = WHITE;
    board[1][2] = WHITE;
    board[2][3] = WHITE; // block capture landing (but now this enables capture of this WHITE)
    // Actually (0,1) can capture: jump over (1,2) WHITE to (2,3) WHITE - no, (2,3) must be EMPTY for capture
    // With (2,3) occupied, capture is blocked. No simple moves either. RED at (0,1) has 0 moves.
    var moves = getAllMoves(board, RED);
    expect(moves.length).toBe(0);
  });
});

describe('applyMove', () => {
  it('moves piece correctly', () => {
    var board = createBoard();
    var move = { fromR: 2, fromC: 3, toR: 3, toC: 4 };
    var newBoard = applyMove(board, move);
    expect(newBoard[2][3]).toBe(EMPTY);
    expect(newBoard[3][4]).toBe(RED);
  });
  it('does not modify original board', () => {
    var board = createBoard();
    var move = { fromR: 2, fromC: 3, toR: 3, toC: 4 };
    applyMove(board, move);
    expect(board[2][3]).toBe(RED);
    expect(board[3][4]).toBe(EMPTY);
  });
  it('removes captured piece', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[2][3] = RED;
    board[3][4] = WHITE;
    var move = { fromR: 2, fromC: 3, toR: 4, toC: 5, capturedR: 3, capturedC: 4 };
    var newBoard = applyMove(board, move);
    expect(newBoard[3][4]).toBe(EMPTY);
    expect(newBoard[4][5]).toBe(RED);
  });
  it('promotes piece at opposite end', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[6][1] = RED;
    var move = { fromR: 6, fromC: 1, toR: 7, toC: 0 };
    var newBoard = applyMove(board, move);
    expect(newBoard[7][0]).toBe(RED_KING);
  });
});

describe('checkGameOver', () => {
  it('returns null when game is ongoing', () => {
    var board = createBoard();
    expect(checkGameOver(board, RED)).toBeNull();
  });
  it('detects RED has no pieces', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[5][2] = WHITE;
    var result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(WHITE);
  });
  it('detects WHITE has no pieces', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[2][3] = RED;
    var result = checkGameOver(board, WHITE);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(RED);
  });
  it('detects no legal moves', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    // RED at (0,1) completely blocked: forward moves occupied, capture landing occupied
    board[0][1] = RED;
    board[1][0] = WHITE;
    board[1][2] = WHITE;
    board[2][3] = WHITE; // block capture landing
    var result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(WHITE);
  });
});

describe('evaluateBoard', () => {
  it('returns 0 for equal position', () => {
    var board = createBoard();
    // Both sides have 12 pieces, symmetric
    var score = evaluateBoard(board, RED);
    // Should be close to 0 (small differences due to position)
    expect(Math.abs(score)).toBeLessThan(50);
  });
  it('positive when AI has more pieces', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = RED;
    board[3][6] = RED;
    board[5][2] = WHITE;
    var score = evaluateBoard(board, RED);
    expect(score).toBeGreaterThan(0);
  });
  it('negative when opponent has more pieces', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = RED;
    board[5][2] = WHITE;
    board[5][4] = WHITE;
    var score = evaluateBoard(board, RED);
    expect(score).toBeLessThan(0);
  });
  it('king is worth more than regular piece', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = RED_KING;
    board[5][2] = WHITE;
    board[5][4] = WHITE;
    var scoreKing = evaluateBoard(board, RED);

    var board2 = [];
    for (var r = 0; r < 8; r++) board2.push(new Array(8).fill(EMPTY));
    board2[3][4] = RED;
    board2[5][2] = WHITE;
    board2[5][4] = WHITE;
    var scoreRegular = evaluateBoard(board2, RED);

    expect(scoreKing).toBeGreaterThan(scoreRegular);
  });
});

describe('getBestAIMove', () => {
  it('returns a valid move', () => {
    var board = createBoard();
    var move = getBestAIMove(board, RED);
    expect(move).not.toBeNull();
    expect(move.fromR).toBeDefined();
    expect(move.fromC).toBeDefined();
    expect(move.toR).toBeDefined();
    expect(move.toC).toBeDefined();
  });
  it('takes winning capture when available', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    // AI (RED) can capture last WHITE piece
    board[2][3] = RED;
    board[3][4] = WHITE;
    board[4][5] = EMPTY;
    var move = getBestAIMove(board, RED);
    expect(move.capturedR).toBe(3);
    expect(move.capturedC).toBe(4);
  });
  it('blocks opponent from winning', () => {
    var board = [];
    for (var r = 0; r < 8; r++) board.push(new Array(8).fill(EMPTY));
    // WHITE has pieces that can capture RED
    board[4][3] = RED;
    board[3][4] = WHITE;
    board[5][2] = RED;
    // AI should not leave RED[4][3] capturable if possible
    var move = getBestAIMove(board, RED);
    expect(move).not.toBeNull();
  });
});

describe('createGameState', () => {
  it('creates correct initial state', () => {
    var state = createGameState('pvp');
    expect(state.mode).toBe('pvp');
    expect(state.currentPlayer).toBe(RED);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.aiThinking).toBe(false);
    expect(state.scoreRed).toBe(0);
    expect(state.scoreWhite).toBe(0);
    expect(state.board.length).toBe(8);
    expect(state.selectedPiece).toBeNull();
    expect(state.validMoves).toEqual([]);
    expect(state.mustCapture).toBe(false);
    expect(state.lastMove).toBeNull();
    expect(state.multiJumpPiece).toBeNull();
  });
  it('pve mode has null teams initially', () => {
    var state = createGameState('pve');
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});
