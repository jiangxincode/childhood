import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_SIZE,
  PIECES_EACH,
  CENTER_X,
  CENTER_Y,
  TIAN_YUAN,
  START_A,
  START_B,
  HOME_OF_A,
  HOME_OF_B,
  inBounds,
  isTianYuan,
  getOpponent,
  createBoard,
  applyInitialLayout,
  createInitialState,
  countPieces,
  getValidMoves,
  hasValidMoves,
  movePiece,
  checkWin,
  distanceToHome,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("BOARD_SIZE is 9 and PIECES_EACH is 4", () => {
    expect(BOARD_SIZE).toBe(9);
    expect(PIECES_EACH).toBe(4);
  });

  it("TIAN_YUAN sits at the centre (4, 4)", () => {
    expect(CENTER_X).toBe(4);
    expect(CENTER_Y).toBe(4);
    expect(TIAN_YUAN).toEqual({ x: 4, y: 4 });
  });

  it("each side has 4 starting points on the central column", () => {
    expect(START_A.length).toBe(4);
    expect(START_B.length).toBe(4);
    START_A.forEach((p) => expect(p.x).toBe(4));
    START_B.forEach((p) => expect(p.x).toBe(4));
  });

  it("A occupies the top half, B the bottom half (avoiding tian-yuan)", () => {
    START_A.forEach((p) => expect(p.y).toBeLessThan(4));
    START_B.forEach((p) => expect(p.y).toBeGreaterThan(4));
  });
});

describe("isTianYuan / inBounds", () => {
  it("identifies the tian-yuan", () => {
    expect(isTianYuan(4, 4)).toBe(true);
    expect(isTianYuan(0, 0)).toBe(false);
    expect(isTianYuan(4, 3)).toBe(false);
  });

  it("rejects out-of-bounds coordinates", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(8, 8)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(9, 0)).toBe(false);
  });
});

describe("createBoard / applyInitialLayout", () => {
  it("creates a 9x9 board filled with EMPTY", () => {
    const board = createBoard();
    expect(board.length).toBe(BOARD_SIZE);
    for (let y = 0; y < BOARD_SIZE; y++) {
      expect(board[y].length).toBe(BOARD_SIZE);
      for (let x = 0; x < BOARD_SIZE; x++) {
        expect(board[y][x]).toBe(EMPTY);
      }
    }
  });

  it("places 4 pieces per side at their starting points", () => {
    const board = applyInitialLayout(createBoard());
    expect(countPieces(board, PLAYER_A)).toBe(4);
    expect(countPieces(board, PLAYER_B)).toBe(4);
    START_A.forEach((p) => expect(board[p.y][p.x]).toBe(PLAYER_A));
    START_B.forEach((p) => expect(board[p.y][p.x]).toBe(PLAYER_B));
  });

  it("leaves the tian-yuan empty in the initial layout", () => {
    const board = applyInitialLayout(createBoard());
    expect(board[CENTER_Y][CENTER_X]).toBe(EMPTY);
  });
});

describe("getValidMoves", () => {
  it("includes single-step moves but no diagonals", () => {
    const board = applyInitialLayout(createBoard());
    const moves = getValidMoves(board, PLAYER_A);
    moves.forEach((m) => {
      const dx = Math.abs(m.toX - m.fromX);
      const dy = Math.abs(m.toY - m.fromY);
      // Single step or two-step jump along a single axis
      expect((dx === 0) !== (dy === 0)).toBe(true);
      expect(dx + dy === 1 || dx + dy === 2).toBe(true);
    });
  });

  it("from the opening, only the front-most pieces have moves", () => {
    const board = applyInitialLayout(createBoard());
    // A's front piece is (4,3), it can only step left or right
    // (the spot south is the tian-yuan and is impassable).
    const movesA = getValidMoves(board, PLAYER_A);
    const fromFront = movesA.filter((m) => m.fromX === 4 && m.fromY === 3);
    expect(fromFront.length).toBe(2);
    expect(fromFront.some((m) => m.toX === 3 && m.toY === 3)).toBe(true);
    expect(fromFront.some((m) => m.toX === 5 && m.toY === 3)).toBe(true);

    // B's front piece is (4,5), symmetric situation.
    const movesB = getValidMoves(board, PLAYER_B);
    const fromBFront = movesB.filter((m) => m.fromX === 4 && m.fromY === 5);
    expect(fromBFront.length).toBe(2);
  });

  it("forbids stepping onto the tian-yuan", () => {
    const board = applyInitialLayout(createBoard());
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.some((m) => m.toX === CENTER_X && m.toY === CENTER_Y)).toBe(false);
  });

  it("allows jumping over an adjacent piece into the empty cell behind", () => {
    const board = createBoard();
    board[2][2] = PLAYER_A; // jumper
    board[2][3] = PLAYER_B; // pivot
    // (2,4) is empty -> jump should land here
    const moves = getValidMoves(board, PLAYER_A);
    const jump = moves.find((m) => m.fromX === 2 && m.fromY === 2 && m.toX === 4 && m.toY === 2);
    expect(jump).toBeDefined();
    expect(jump.jump).toBe(true);
    expect(jump.jumpedX).toBe(3);
    expect(jump.jumpedY).toBe(2);
  });

  it("forbids a jump whose pivot or landing cell is the tian-yuan", () => {
    const board = createBoard();
    // Try to jump from (2,4) over (3,4) onto tian-yuan? Actually
    // (3,4) is the pivot, (4,4) is the landing -> tian-yuan.
    board[4][2] = PLAYER_A;
    board[4][3] = PLAYER_B;
    const moves = getValidMoves(board, PLAYER_A);
    const badLand = moves.find((m) => m.fromX === 2 && m.fromY === 4 && m.toX === 4 && m.toY === 4);
    expect(badLand).toBeUndefined();

    // Pivot is the tian-yuan
    const board2 = createBoard();
    board2[4][3] = PLAYER_A;
    // (4,4) tian-yuan is empty, so even if "treated as a piece" we want
    // to make sure it cannot be a pivot. Place a real piece beyond just
    // to make the geometry valid.
    board2[4][5] = PLAYER_B;
    const moves2 = getValidMoves(board2, PLAYER_A);
    const overTY = moves2.find((m) => m.fromX === 3 && m.fromY === 4 && m.toX === 5 && m.toY === 4);
    // Pivot would be the tian-yuan (which is empty), so it's not a valid jump.
    expect(overTY).toBeUndefined();
  });
});

describe("movePiece", () => {
  it("moves a piece without mutating the input board", () => {
    const board = applyInitialLayout(createBoard());
    const next = movePiece(board, 4, 3, 3, 3);
    expect(board[3][4]).toBe(PLAYER_A);
    expect(next[3][4]).toBe(EMPTY);
    expect(next[3][3]).toBe(PLAYER_A);
  });
});

describe("checkWin", () => {
  it("returns null when neither side has fully occupied the opponent's home", () => {
    const board = applyInitialLayout(createBoard());
    expect(checkWin(board, PLAYER_A)).toBeNull();
    expect(checkWin(board, PLAYER_B)).toBeNull();
  });

  it("declares A the winner when A occupies all of B's home", () => {
    const board = createBoard();
    HOME_OF_B.forEach((p) => (board[p.y][p.x] = PLAYER_A));
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
  });

  it("declares B the winner when B occupies all of A's home", () => {
    const board = createBoard();
    HOME_OF_A.forEach((p) => (board[p.y][p.x] = PLAYER_B));
    expect(checkWin(board, PLAYER_B)).not.toBeNull();
  });
});

describe("distanceToHome", () => {
  it("is zero when all pieces already sit in the opponent's home", () => {
    const board = createBoard();
    HOME_OF_B.forEach((p) => (board[p.y][p.x] = PLAYER_A));
    expect(distanceToHome(board, PLAYER_A)).toBe(0);
  });

  it("is positive in the opening (still need to march across)", () => {
    const board = applyInitialLayout(createBoard());
    expect(distanceToHome(board, PLAYER_A)).toBeGreaterThan(0);
    expect(distanceToHome(board, PLAYER_B)).toBeGreaterThan(0);
  });
});

describe("getOpponent / hasValidMoves / getBestAIMove", () => {
  it("flips A and B", () => {
    expect(getOpponent(PLAYER_A)).toBe(PLAYER_B);
    expect(getOpponent(PLAYER_B)).toBe(PLAYER_A);
  });

  it("opening position has legal moves for both sides", () => {
    const board = applyInitialLayout(createBoard());
    expect(hasValidMoves(board, PLAYER_A)).toBe(true);
    expect(hasValidMoves(board, PLAYER_B)).toBe(true);
  });

  it("returns a legal AI move from the opening", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(state.board[move.fromY][move.fromX]).toBe(PLAYER_A);
    expect(state.board[move.toY][move.toX]).toBe(EMPTY);
  });
});
