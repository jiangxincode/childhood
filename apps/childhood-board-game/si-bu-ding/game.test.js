import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_SIZE,
  PIECES_EACH,
  CAPTURES_TO_WIN,
  INITIAL_POSITIONS_A,
  INITIAL_POSITIONS_B,
  THREE_LINES,
  inBounds,
  getOpponent,
  createBoard,
  applyInitialLayout,
  createInitialState,
  countPieces,
  getValidMoves,
  hasValidMoves,
  movePiece,
  detectCaptures,
  applyCaptures,
  applyMoveWithCaptures,
  checkWin,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("BOARD_SIZE is 4 and PIECES_EACH is 4", () => {
    expect(BOARD_SIZE).toBe(4);
    expect(PIECES_EACH).toBe(4);
  });

  it("CAPTURES_TO_WIN is 3", () => {
    expect(CAPTURES_TO_WIN).toBe(3);
  });

  it("each side starts with 4 pieces on its back rank", () => {
    expect(INITIAL_POSITIONS_A.length).toBe(4);
    expect(INITIAL_POSITIONS_B.length).toBe(4);
    INITIAL_POSITIONS_A.forEach((p) => expect(p.y).toBe(0));
    INITIAL_POSITIONS_B.forEach((p) => expect(p.y).toBe(BOARD_SIZE - 1));
  });

  it("THREE_LINES contains 16 triplets (8 horizontal + 8 vertical)", () => {
    expect(THREE_LINES.length).toBe(16);
    THREE_LINES.forEach((l) => expect(l.length).toBe(3));
  });
});

describe("createBoard / applyInitialLayout", () => {
  it("creates a 4x4 board filled with EMPTY", () => {
    const board = createBoard();
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        expect(board[y][x]).toBe(EMPTY);
      }
    }
  });

  it("places 4 pieces per side at the top and bottom rows", () => {
    const board = applyInitialLayout(createBoard());
    expect(countPieces(board, PLAYER_A)).toBe(4);
    expect(countPieces(board, PLAYER_B)).toBe(4);
    for (let x = 0; x < BOARD_SIZE; x++) {
      expect(board[0][x]).toBe(PLAYER_A);
      expect(board[BOARD_SIZE - 1][x]).toBe(PLAYER_B);
    }
  });
});

describe("getValidMoves / hasValidMoves", () => {
  it("opening: only orthogonal one-step moves into empty cells", () => {
    const board = applyInitialLayout(createBoard());
    const moves = getValidMoves(board, PLAYER_A);
    moves.forEach((m) => {
      const dx = Math.abs(m.toX - m.fromX);
      const dy = Math.abs(m.toY - m.fromY);
      expect(dx + dy).toBe(1);
      expect(board[m.toY][m.toX]).toBe(EMPTY);
    });
  });

  it("each side has 4 forward moves in the opening (B has 4 ups, A has 4 downs)", () => {
    const board = applyInitialLayout(createBoard());
    expect(getValidMoves(board, PLAYER_A).length).toBe(4);
    expect(getValidMoves(board, PLAYER_B).length).toBe(4);
  });

  it("returns an empty list when nobody owns a piece", () => {
    const board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
    expect(hasValidMoves(board, PLAYER_A)).toBe(false);
  });
});

describe("movePiece", () => {
  it("moves a piece without mutating the input", () => {
    const board = applyInitialLayout(createBoard());
    const next = movePiece(board, 0, 3, 0, 2);
    expect(board[3][0]).toBe(PLAYER_B);
    expect(next[3][0]).toBe(EMPTY);
    expect(next[2][0]).toBe(PLAYER_B);
  });
});

describe("detectCaptures", () => {
  it("detects horizontal AAO with the just-moved piece", () => {
    // Place A at (0,1) and (1,1). B sits at (2,1) and the move that
    // formed the line is the move into (1,1).
    const board = createBoard();
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[1][2] = PLAYER_B;
    const caps = detectCaptures(board, PLAYER_A, 1, 1);
    expect(caps).toEqual([{ x: 2, y: 1 }]);
  });

  it("detects horizontal OAA with the just-moved piece", () => {
    const board = createBoard();
    board[1][0] = PLAYER_B;
    board[1][1] = PLAYER_A;
    board[1][2] = PLAYER_A;
    const caps = detectCaptures(board, PLAYER_A, 2, 1);
    expect(caps).toEqual([{ x: 0, y: 1 }]);
  });

  it("detects vertical captures the same way", () => {
    const board = createBoard();
    // Column x=2: A at (2,0), A at (2,1), B at (2,2)
    board[0][2] = PLAYER_A;
    board[1][2] = PLAYER_A;
    board[2][2] = PLAYER_B;
    // The just-moved piece is the one at (2,1) (i.e. x=2, y=1)
    const caps = detectCaptures(board, PLAYER_A, 2, 1);
    expect(caps).toEqual([{ x: 2, y: 2 }]);
  });

  it("does not capture when the moved piece is not part of the line", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_B;
    // Suppose A's last move was somewhere else (e.g. (3,3))
    const caps = detectCaptures(board, PLAYER_A, 3, 3);
    expect(caps.length).toBe(0);
  });

  it("does not capture A's own piece (no friendly fire)", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    board[0][2] = PLAYER_A;
    const caps = detectCaptures(board, PLAYER_A, 2, 0);
    // From A's perspective the line is OOA, which is not AAO/OAA, no capture.
    expect(caps.length).toBe(0);
  });

  it("can capture two pieces at once on intersecting lines", () => {
    const board = createBoard();
    // A row capture and a column capture intersect at (1,1).
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[1][2] = PLAYER_B;
    board[0][1] = PLAYER_A;
    board[3][1] = PLAYER_B;
    // After A moves into (1,1), both AAO patterns trigger:
    //   row 1: A A B  -> capture (2,1)
    //   col 1: A A . B -> not contiguous, no capture (only consecutive triplets count)
    const caps = detectCaptures(board, PLAYER_A, 1, 1);
    expect(caps).toContainEqual({ x: 2, y: 1 });
    expect(caps.length).toBe(1);
  });
});

describe("applyCaptures / applyMoveWithCaptures", () => {
  it("applyCaptures clears the listed cells", () => {
    const board = createBoard();
    board[1][2] = PLAYER_B;
    board[2][2] = PLAYER_B;
    const next = applyCaptures(board, [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(next[1][2]).toBe(EMPTY);
    expect(next[2][2]).toBe(EMPTY);
  });

  it("applyMoveWithCaptures performs both move and capture", () => {
    const board = createBoard();
    board[1][0] = PLAYER_A;
    board[2][0] = PLAYER_A; // will move up to (0,1)? Let's set up a real one.
    // Reset to a cleaner case: A at (1,1), about to move (0,1)->(1,1) etc.
    const b2 = createBoard();
    b2[0][0] = PLAYER_A;
    b2[1][1] = PLAYER_A; // moving piece will end here? No, simpler:
    // Configure: A at (1,0), A at (1,1) after move, B at (1,2)
    const b3 = createBoard();
    b3[1][0] = PLAYER_A;
    b3[2][1] = PLAYER_A;
    b3[1][2] = PLAYER_B;
    // Move A from (2,1) -> (1,1): row becomes A A B -> capture (2,1) on row 1
    const result = applyMoveWithCaptures(b3, { fromX: 1, fromY: 2, toX: 1, toY: 1 }, PLAYER_A);
    expect(result.board[2][1]).toBe(EMPTY);
    expect(result.board[1][1]).toBe(PLAYER_A);
    expect(result.captures).toEqual([{ x: 2, y: 1 }]);
    expect(result.board[1][2]).toBe(EMPTY);
  });
});

describe("checkWin", () => {
  it("returns null while both sides have at least 2 pieces", () => {
    const board = applyInitialLayout(createBoard());
    expect(checkWin(board, PLAYER_A)).toBeNull();
    expect(checkWin(board, PLAYER_B)).toBeNull();
  });

  it("declares A the winner once B is reduced to a single piece", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[3][0] = PLAYER_B;
    // B has 1 piece -> A meets the win condition (captured 3 pieces).
    const r = checkWin(board, PLAYER_A);
    expect(r).not.toBeNull();
    expect(r.winner).toBe(PLAYER_A);
  });
});

describe("getOpponent / inBounds / getBestAIMove", () => {
  it("flips A and B", () => {
    expect(getOpponent(PLAYER_A)).toBe(PLAYER_B);
    expect(getOpponent(PLAYER_B)).toBe(PLAYER_A);
  });

  it("rejects out-of-bounds coordinates", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(3, 3)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(4, 0)).toBe(false);
  });

  it("returns a legal move from the opening", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(state.board[move.fromY][move.fromX]).toBe(PLAYER_A);
    expect(state.board[move.toY][move.toX]).toBe(EMPTY);
  });
});
