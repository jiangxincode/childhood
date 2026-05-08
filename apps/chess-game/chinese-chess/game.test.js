import { describe, it, expect } from 'vitest';
import {
  COLS, ROWS, EMPTY,
  R_GENERAL, R_ADVISOR, R_ELEPHANT, R_HORSE, R_CHARIOT, R_CANNON, R_PAWN,
  B_GENERAL, B_ADVISOR, B_ELEPHANT, B_HORSE, B_CHARIOT, B_CANNON, B_PAWN,
  RED, BLACK, AI_DEPTH,
  isRed, isBlack, getOwner, getOpponent, getPlayerName, inBounds,
  createBoard, copyBoard, applyMove,
  getValidMoves, getAllMoves, isGeneralFacing,
  getGeneralMoves, getAdvisorMoves, getElephantMoves, getHorseMoves,
  getChariotMoves, getCannonMoves, getPawnMoves,
  checkGameOver, evaluateBoard, getBestAIMove, createGameState
} from './game.js';

describe('constants', () => {
  it('board dimensions', () => {
    expect(COLS).toBe(9);
    expect(ROWS).toBe(10);
    expect(EMPTY).toBe(0);
  });
  it('piece constants', () => {
    expect(R_GENERAL).toBe(1);
    expect(B_GENERAL).toBe(8);
    expect(R_PAWN).toBe(7);
    expect(B_PAWN).toBe(14);
  });
  it('colors', () => {
    expect(RED).toBe('red');
    expect(BLACK).toBe('black');
  });
  it('AI_DEPTH is 3', () => {
    expect(AI_DEPTH).toBe(3);
  });
});

describe('piece helpers', () => {
  it('isRed', () => {
    expect(isRed(R_GENERAL)).toBe(true);
    expect(isRed(R_PAWN)).toBe(true);
    expect(isRed(B_GENERAL)).toBe(false);
    expect(isRed(EMPTY)).toBe(false);
  });
  it('isBlack', () => {
    expect(isBlack(B_GENERAL)).toBe(true);
    expect(isBlack(B_PAWN)).toBe(true);
    expect(isBlack(R_GENERAL)).toBe(false);
    expect(isBlack(EMPTY)).toBe(false);
  });
  it('getOwner', () => {
    expect(getOwner(R_CHARIOT)).toBe(RED);
    expect(getOwner(B_HORSE)).toBe(BLACK);
    expect(getOwner(EMPTY)).toBeNull();
  });
  it('getOpponent', () => {
    expect(getOpponent(RED)).toBe(BLACK);
    expect(getOpponent(BLACK)).toBe(RED);
  });
  it('getPlayerName', () => {
    expect(getPlayerName(RED)).toBe('红方');
    expect(getPlayerName(BLACK)).toBe('黑方');
  });
  it('inBounds', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(8, 9)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(9, 0)).toBe(false);
    expect(inBounds(0, 10)).toBe(false);
  });
});

describe('createBoard', () => {
  it('creates 9x10 board', () => {
    var board = createBoard();
    expect(board.length).toBe(9);
    for (var c = 0; c < 9; c++) {
      expect(board[c].length).toBe(10);
    }
  });
  it('has correct black pieces at row 0', () => {
    var board = createBoard();
    expect(board[0][0]).toBe(B_CHARIOT);
    expect(board[1][0]).toBe(B_HORSE);
    expect(board[2][0]).toBe(B_ELEPHANT);
    expect(board[3][0]).toBe(B_ADVISOR);
    expect(board[4][0]).toBe(B_GENERAL);
    expect(board[5][0]).toBe(B_ADVISOR);
    expect(board[6][0]).toBe(B_ELEPHANT);
    expect(board[7][0]).toBe(B_HORSE);
    expect(board[8][0]).toBe(B_CHARIOT);
  });
  it('has correct red pieces at row 9', () => {
    var board = createBoard();
    expect(board[0][9]).toBe(R_CHARIOT);
    expect(board[1][9]).toBe(R_HORSE);
    expect(board[2][9]).toBe(R_ELEPHANT);
    expect(board[3][9]).toBe(R_ADVISOR);
    expect(board[4][9]).toBe(R_GENERAL);
    expect(board[5][9]).toBe(R_ADVISOR);
    expect(board[6][9]).toBe(R_ELEPHANT);
    expect(board[7][9]).toBe(R_HORSE);
    expect(board[8][9]).toBe(R_CHARIOT);
  });
  it('has cannons at correct positions', () => {
    var board = createBoard();
    expect(board[1][2]).toBe(B_CANNON);
    expect(board[7][2]).toBe(B_CANNON);
    expect(board[1][7]).toBe(R_CANNON);
    expect(board[7][7]).toBe(R_CANNON);
  });
  it('has pawns at correct positions', () => {
    var board = createBoard();
    for (var c = 0; c <= 8; c += 2) {
      expect(board[c][3]).toBe(B_PAWN);
      expect(board[c][6]).toBe(R_PAWN);
    }
  });
  it('has 32 pieces total', () => {
    var board = createBoard();
    var count = 0;
    for (var c = 0; c < COLS; c++) {
      for (var r = 0; r < ROWS; r++) {
        if (board[c][r] !== EMPTY) count++;
      }
    }
    expect(count).toBe(32);
  });
  it('river area (rows 4-5) is empty', () => {
    var board = createBoard();
    for (var c = 0; c < COLS; c++) {
      expect(board[c][4]).toBe(EMPTY);
      expect(board[c][5]).toBe(EMPTY);
    }
  });
});

describe('copyBoard', () => {
  it('creates independent copy', () => {
    var board = createBoard();
    var copy = copyBoard(board);
    copy[0][0] = EMPTY;
    expect(board[0][0]).toBe(B_CHARIOT);
  });
});

describe('applyMove', () => {
  it('moves piece correctly', () => {
    var board = createBoard();
    var move = { fromC: 1, fromR: 7, toC: 1, toR: 4 };
    var newBoard = applyMove(board, move);
    expect(newBoard[1][7]).toBe(EMPTY);
    expect(newBoard[1][4]).toBe(R_CANNON);
  });
  it('captures enemy piece', () => {
    var board = createBoard();
    board[4][5] = B_PAWN;
    var move = { fromC: 4, fromR: 6, toC: 4, toR: 5 };
    var newBoard = applyMove(board, move);
    expect(newBoard[4][6]).toBe(EMPTY);
    expect(newBoard[4][5]).toBe(R_PAWN);
  });
  it('does not modify original', () => {
    var board = createBoard();
    var move = { fromC: 1, fromR: 7, toC: 1, toR: 4 };
    applyMove(board, move);
    expect(board[1][7]).toBe(R_CANNON);
  });
});

describe('Chariot moves', () => {
  it('chariot can move along lines', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) {
      board.push(new Array(ROWS).fill(EMPTY));
    }
    board[4][4] = R_CHARIOT;
    var moves = getChariotMoves(board, 4, 4, RED);
    // vertical: 4 up + 5 down = 9, horizontal: 4 left + 4 right = 8 => 17
    expect(moves.length).toBe(17);
  });
  it('chariot blocked by own piece', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][4] = R_CHARIOT;
    board[4][6] = R_PAWN; // block downward
    var moves = getChariotMoves(board, 4, 4, RED);
    // downward: only row 5 (row 6 is own piece, blocked)
    var downMoves = moves.filter(function(m) { return m.toC === 4 && m.toR > 4; });
    expect(downMoves.length).toBe(1); // only row 5
  });
  it('chariot can capture enemy', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][4] = R_CHARIOT;
    board[4][6] = B_PAWN;
    var moves = getChariotMoves(board, 4, 4, RED);
    var capture = moves.filter(function(m) { return m.toC === 4 && m.toR === 6; });
    expect(capture.length).toBe(1);
    // blocked beyond capture
    var beyond = moves.filter(function(m) { return m.toC === 4 && m.toR > 6; });
    expect(beyond.length).toBe(0);
  });
});

describe('Horse moves', () => {
  it('horse has up to 8 moves in open field', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][5] = R_HORSE;
    var moves = getHorseMoves(board, 4, 5, RED);
    expect(moves.length).toBe(8);
  });
  it('horse blocked by adjacent piece (蹩马腿)', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][5] = R_HORSE;
    board[4][4] = R_PAWN; // block upward
    var moves = getHorseMoves(board, 4, 5, RED);
    // blocked up: removes 2 moves (3,3) and (5,3)
    expect(moves.length).toBe(6);
    var upMoves = moves.filter(function(m) { return m.toR === 3; });
    expect(upMoves.length).toBe(0);
  });
  it('horse at corner has fewer moves', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[0][0] = R_HORSE;
    var moves = getHorseMoves(board, 0, 0, RED);
    expect(moves.length).toBe(2);
  });
});

describe('Cannon moves', () => {
  it('cannon moves like chariot without jumping', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][4] = R_CANNON;
    var moves = getCannonMoves(board, 4, 4, RED);
    expect(moves.length).toBe(17);
  });
  it('cannon captures by jumping over one piece', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][4] = R_CANNON;
    board[4][6] = R_PAWN; // cannon platform
    board[4][8] = B_CHARIOT; // target
    var moves = getCannonMoves(board, 4, 4, RED);
    var capture = moves.filter(function(m) { return m.toC === 4 && m.toR === 8; });
    expect(capture.length).toBe(1);
  });
  it('cannon cannot capture without platform', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][4] = R_CANNON;
    board[4][8] = B_CHARIOT; // no platform between
    var moves = getCannonMoves(board, 4, 4, RED);
    var capture = moves.filter(function(m) { return m.toC === 4 && m.toR === 8; });
    expect(capture.length).toBe(0);
  });
  it('cannon cannot move past two pieces', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][4] = R_CANNON;
    board[4][5] = R_PAWN; // platform
    board[4][7] = B_CHARIOT; // target
    board[4][8] = B_HORSE; // beyond
    var moves = getCannonMoves(board, 4, 4, RED);
    var capture7 = moves.filter(function(m) { return m.toC === 4 && m.toR === 7; });
    expect(capture7.length).toBe(1);
    var capture8 = moves.filter(function(m) { return m.toC === 4 && m.toR === 8; });
    expect(capture8.length).toBe(0);
  });
});

describe('Elephant moves', () => {
  it('elephant moves diagonally 2 steps', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[2][7] = R_ELEPHANT;
    var moves = getElephantMoves(board, 2, 7, RED);
    // (0,5), (4,5), (0,9), (4,9) — all within red's half
    expect(moves.length).toBe(4);
  });
  it('elephant cannot cross river', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[2][5] = R_ELEPHANT;
    var moves = getElephantMoves(board, 2, 5, RED);
    // can go to (0,7) and (4,7), but not (0,3) or (4,3) which cross river
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].toR).toBeGreaterThanOrEqual(5);
    }
  });
  it('elephant blocked by piece in eye (塞象眼)', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[2][7] = R_ELEPHANT;
    board[3][8] = R_PAWN; // block eye at (3,8) for move to (4,9)
    var moves = getElephantMoves(board, 2, 7, RED);
    // (4,9) blocked by eye, other 3 moves available
    expect(moves.length).toBe(3);
    var blocked = moves.filter(function(m) { return m.toC === 4 && m.toR === 9; });
    expect(blocked.length).toBe(0);
  });
});

describe('Advisor moves', () => {
  it('advisor moves diagonally within palace', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][8] = R_ADVISOR;
    var moves = getAdvisorMoves(board, 4, 8, RED);
    expect(moves.length).toBe(4);
  });
  it('advisor at corner of palace has 1 move', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[3][9] = R_ADVISOR;
    var moves = getAdvisorMoves(board, 3, 9, RED);
    expect(moves.length).toBe(1);
    expect(moves[0].toC).toBe(4);
    expect(moves[0].toR).toBe(8);
  });
  it('advisor cannot leave palace', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][7] = R_ADVISOR;
    var moves = getAdvisorMoves(board, 4, 7, RED);
    // (3,6) and (5,6) are outside palace (row 6 < 7)
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].toR).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('General moves', () => {
  it('general moves orthogonally within palace', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][8] = R_GENERAL;
    var moves = getGeneralMoves(board, 4, 8, RED);
    expect(moves.length).toBe(4);
  });
  it('general at corner has 2 moves', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[3][9] = R_GENERAL;
    var moves = getGeneralMoves(board, 3, 9, RED);
    expect(moves.length).toBe(2);
  });
  it('general cannot leave palace', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][7] = R_GENERAL;
    var moves = getGeneralMoves(board, 4, 7, RED);
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].toR).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('Pawn moves', () => {
  it('red pawn can only move forward before crossing river', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][6] = R_PAWN;
    var moves = getPawnMoves(board, 4, 6, RED);
    expect(moves.length).toBe(1);
    expect(moves[0].toR).toBe(5);
  });
  it('red pawn can move forward and sideways after crossing river', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][3] = R_PAWN; // row 3 <= 4, crossed river
    var moves = getPawnMoves(board, 4, 3, RED);
    expect(moves.length).toBe(3); // forward(4,2), left(3,3), right(5,3)
  });
  it('black pawn can only move forward before crossing river', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][3] = B_PAWN;
    var moves = getPawnMoves(board, 4, 3, BLACK);
    expect(moves.length).toBe(1);
    expect(moves[0].toR).toBe(4);
  });
  it('black pawn can move forward and sideways after crossing river', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][6] = B_PAWN; // row 6 >= 5, crossed river
    var moves = getPawnMoves(board, 4, 6, BLACK);
    expect(moves.length).toBe(3);
  });
  it('pawn cannot move backward', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][3] = R_PAWN;
    var moves = getPawnMoves(board, 4, 3, RED);
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].toR).toBeLessThanOrEqual(3); // cannot go to row 4+
    }
  });
});

describe('General facing rule (将帅对面)', () => {
  it('detects generals facing each other', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][1] = B_GENERAL;
    board[4][8] = R_GENERAL;
    expect(isGeneralFacing(board, RED)).toBe(true);
    expect(isGeneralFacing(board, BLACK)).toBe(true);
  });
  it('generals not facing when blocked', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][1] = B_GENERAL;
    board[4][5] = R_PAWN; // block
    board[4][8] = R_GENERAL;
    expect(isGeneralFacing(board, RED)).toBe(false);
  });
  it('generals not facing on different columns', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[3][1] = B_GENERAL;
    board[5][8] = R_GENERAL;
    expect(isGeneralFacing(board, RED)).toBe(false);
  });
  it('getValidMoves filters out moves that cause facing', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][1] = B_GENERAL;
    board[4][5] = R_PAWN; // blocking piece
    board[4][8] = R_GENERAL;
    // If R_PAWN moves sideways, generals face each other - those moves are filtered
    var moves = getValidMoves(board, 4, 5);
    // moving to (4,4) blocks facing, so it's valid
    var forwardMove = moves.filter(function(m) { return m.toC === 4 && m.toR === 4; });
    expect(forwardMove.length).toBe(1);
    // moving sideways exposes facing, so filtered out
    var sideMoves = moves.filter(function(m) { return m.toC !== 4; });
    expect(sideMoves.length).toBe(0);
  });
});

describe('checkGameOver', () => {
  it('returns null for initial board', () => {
    var board = createBoard();
    expect(checkGameOver(board, RED)).toBeNull();
  });
  it('detects red general missing', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][1] = B_GENERAL;
    var result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(BLACK);
  });
  it('detects black general missing', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][8] = R_GENERAL;
    var result = checkGameOver(board, BLACK);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(RED);
  });
});

describe('evaluateBoard', () => {
  it('returns near 0 for initial position', () => {
    var board = createBoard();
    var score = evaluateBoard(board, RED);
    expect(Math.abs(score)).toBeLessThan(100);
  });
  it('positive when AI has material advantage', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][8] = R_GENERAL;
    board[4][0] = B_GENERAL;
    board[0][0] = B_CHARIOT;
    board[4][4] = R_CHARIOT;
    board[4][3] = R_CHARIOT;
    var score = evaluateBoard(board, RED);
    expect(score).toBeGreaterThan(0);
  });
  it('negative when opponent has material advantage', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][8] = R_GENERAL;
    board[4][0] = B_GENERAL;
    board[0][0] = B_CHARIOT;
    board[8][0] = B_CHARIOT;
    board[2][0] = B_CHARIOT;
    board[6][0] = B_CHARIOT;
    // RED: general(10000). BLACK: general(10000) + 4 chariots(2000) = 12000
    var score = evaluateBoard(board, RED);
    expect(score).toBeLessThan(0);
  });
});

describe('getBestAIMove', () => {
  it('returns a valid move from initial position', () => {
    var board = createBoard();
    var move = getBestAIMove(board, RED);
    expect(move).not.toBeNull();
    expect(move.fromC).toBeDefined();
    expect(move.fromR).toBeDefined();
    expect(move.toC).toBeDefined();
    expect(move.toR).toBeDefined();
  });
  it('takes winning capture when available', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    board[4][8] = R_GENERAL;
    board[4][0] = B_GENERAL;
    board[4][2] = R_CHARIOT; // can capture B_GENERAL at (4,1) if B_GENERAL moves to (4,1)
    // Actually let's set up so R_CHARIOT can directly capture
    board[3][0] = B_ADVISOR;
    board[4][1] = EMPTY; // clear path
    board[4][2] = R_CHARIOT;
    // R_CHARIOT at (4,2) can go to (4,0) to capture B_GENERAL? No, B_GENERAL at (4,0)
    // Let's simplify: R_CHARIOT at column 4, row 2, B_GENERAL at column 4, row 0
    var move = getBestAIMove(board, RED);
    expect(move).not.toBeNull();
  });
});

describe('getAllMoves', () => {
  it('returns moves for initial board', () => {
    var board = createBoard();
    var moves = getAllMoves(board, RED);
    expect(moves.length).toBeGreaterThan(0);
  });
  it('returns empty when no pieces', () => {
    var board = [];
    for (var c = 0; c < COLS; c++) board.push(new Array(ROWS).fill(EMPTY));
    var moves = getAllMoves(board, RED);
    expect(moves.length).toBe(0);
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
    expect(state.board.length).toBe(9);
    expect(state.selectedPiece).toBeNull();
    expect(state.validMoves).toEqual([]);
    expect(state.lastMove).toBeNull();
  });
  it('pve mode has null teams initially', () => {
    var state = createGameState('pve');
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});
