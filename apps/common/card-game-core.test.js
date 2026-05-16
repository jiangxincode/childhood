import { describe, it, expect } from 'vitest';
const {
  DIRECTIONS, inBounds, getValidMoves, getValidCaptures,
  flipCard, moveCard, createBaseState
} = require('./card-game-core.js');

// Helper: create empty 4x4 board
function emptyBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

// Helper: create a card
function makeCard(team, faceUp) {
  return { team: team, rank: 1, faceUp: faceUp };
}

// Helper: canCapture that always returns true (for testing)
function alwaysCanCapture() { return true; }
function neverCanCapture() { return false; }

describe('DIRECTIONS', () => {
  it('has 4 directions', () => {
    expect(DIRECTIONS.length).toBe(4);
  });
  it('contains up, down, left, right', () => {
    var dxSet = new Set(DIRECTIONS.map(function(d) { return d.dx; }));
    var dySet = new Set(DIRECTIONS.map(function(d) { return d.dy; }));
    expect(dxSet.has(-1)).toBe(true);
    expect(dxSet.has(1)).toBe(true);
    expect(dySet.has(-1)).toBe(true);
    expect(dySet.has(1)).toBe(true);
  });
});

describe('inBounds', () => {
  it('accepts 0,0', () => { expect(inBounds(0, 0)).toBe(true); });
  it('accepts 3,3', () => { expect(inBounds(3, 3)).toBe(true); });
  it('accepts 1,2', () => { expect(inBounds(1, 2)).toBe(true); });
  it('rejects 4,0', () => { expect(inBounds(4, 0)).toBe(false); });
  it('rejects 0,4', () => { expect(inBounds(0, 4)).toBe(false); });
  it('rejects -1,0', () => { expect(inBounds(-1, 0)).toBe(false); });
  it('rejects 0,-1', () => { expect(inBounds(0, -1)).toBe(false); });
});

describe('getValidMoves', () => {
  it('returns empty for null cell', () => {
    var board = emptyBoard();
    expect(getValidMoves(board, 0, 0)).toEqual([]);
  });
  it('returns adjacent empty cells', () => {
    var board = emptyBoard();
    board[1][1] = makeCard('red', true);
    var moves = getValidMoves(board, 1, 1);
    expect(moves.length).toBe(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });
  it('excludes occupied cells', () => {
    var board = emptyBoard();
    board[1][1] = makeCard('red', true);
    board[0][1] = makeCard('blue', true);
    var moves = getValidMoves(board, 1, 1);
    expect(moves.length).toBe(3);
    expect(moves).not.toContainEqual({ x: 1, y: 0 });
  });
  it('excludes out-of-bounds cells', () => {
    var board = emptyBoard();
    board[0][0] = makeCard('red', true);
    var moves = getValidMoves(board, 0, 0);
    expect(moves.length).toBe(2);
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
  });
});

describe('getValidCaptures', () => {
  it('returns empty for null cell', () => {
    var board = emptyBoard();
    expect(getValidCaptures(board, 0, 0, 'red', alwaysCanCapture)).toEqual([]);
  });
  it('returns empty for face-down card', () => {
    var board = emptyBoard();
    board[1][1] = makeCard('red', false);
    expect(getValidCaptures(board, 1, 1, 'red', alwaysCanCapture)).toEqual([]);
  });
  it('returns empty for wrong team', () => {
    var board = emptyBoard();
    board[1][1] = makeCard('blue', true);
    expect(getValidCaptures(board, 1, 1, 'red', alwaysCanCapture)).toEqual([]);
  });
  it('returns empty when canCapture returns false', () => {
    var board = emptyBoard();
    board[1][1] = makeCard('red', true);
    board[0][1] = makeCard('blue', true);
    expect(getValidCaptures(board, 1, 1, 'red', neverCanCapture)).toEqual([]);
  });
  it('returns valid capture targets', () => {
    var board = emptyBoard();
    board[1][1] = makeCard('red', true);
    board[0][1] = makeCard('blue', true);
    board[1][2] = makeCard('blue', true);
    var captures = getValidCaptures(board, 1, 1, 'red', alwaysCanCapture);
    expect(captures.length).toBe(2);
    expect(captures).toContainEqual({ x: 1, y: 0 });
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });
  it('excludes same-team cards', () => {
    var board = emptyBoard();
    board[1][1] = makeCard('red', true);
    board[0][1] = makeCard('red', true);
    expect(getValidCaptures(board, 1, 1, 'red', alwaysCanCapture)).toEqual([]);
  });
});

describe('flipCard', () => {
  it('flips a face-down card', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', teamAssigned: true, turnCount: 0 };
    state.board[1][1] = { team: 'red', faceUp: false };
    var result = flipCard(state, 1, 1);
    expect(result).toBe(state);
    expect(state.board[1][1].faceUp).toBe(true);
    expect(state.turnCount).toBe(1);
  });
  it('returns null for empty cell', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', teamAssigned: true, turnCount: 0 };
    expect(flipCard(state, 0, 0)).toBeNull();
  });
  it('returns null for face-up card', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', teamAssigned: true, turnCount: 0 };
    state.board[0][0] = { team: 'red', faceUp: true };
    expect(flipCard(state, 0, 0)).toBeNull();
  });
  it('switches team after flip', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', teamAssigned: true, turnCount: 0 };
    state.board[0][0] = { team: 'red', faceUp: false };
    flipCard(state, 0, 0);
    expect(state.currentTeam).toBe('blue');
  });
  it('assigns teams on first flip in pvp', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: null, teamAssigned: false, turnCount: 0, aiFirst: false };
    state.board[0][0] = { team: 'red', faceUp: false };
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    // When currentTeam is null, null !== 'red' so it becomes 'red'
    expect(state.currentTeam).toBe('red');
  });
});

describe('moveCard', () => {
  it('moves a card to adjacent empty cell', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', turnCount: 0 };
    state.board[1][1] = { team: 'red', faceUp: true };
    var result = moveCard(state, { x: 1, y: 1 }, { x: 1, y: 2 });
    expect(result).toBe(state);
    expect(state.board[1][1]).toBeNull();
    expect(state.board[2][1]).toBeTruthy();
    expect(state.currentTeam).toBe('blue');
    expect(state.turnCount).toBe(1);
  });
  it('returns null for non-adjacent move', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', turnCount: 0 };
    state.board[0][0] = { team: 'red', faceUp: true };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });
  it('returns null for occupied target', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', turnCount: 0 };
    state.board[0][0] = { team: 'red', faceUp: true };
    state.board[0][1] = { team: 'blue', faceUp: true };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
  it('returns null for wrong team', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', turnCount: 0 };
    state.board[0][0] = { team: 'blue', faceUp: true };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
  it('returns null for face-down card', () => {
    var state = { board: emptyBoard(), mode: 'pvp', currentTeam: 'red', turnCount: 0 };
    state.board[0][0] = { team: 'red', faceUp: false };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

describe('createBaseState', () => {
  it('creates state with correct mode', () => {
    var state = createBaseState('pvp');
    expect(state.mode).toBe('pvp');
  });
  it('has null board', () => {
    var state = createBaseState('pve');
    expect(state.board).toBeNull();
  });
  it('has empty captured arrays', () => {
    var state = createBaseState('pvp');
    expect(state.capturedRed).toEqual([]);
    expect(state.capturedBlue).toEqual([]);
  });
  it('starts with turnCount 0', () => {
    var state = createBaseState('pvp');
    expect(state.turnCount).toBe(0);
  });
  it('starts with gameOver false', () => {
    var state = createBaseState('pvp');
    expect(state.gameOver).toBe(false);
  });
});
