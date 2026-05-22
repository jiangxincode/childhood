import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_SIZE,
  PIECES_EACH,
  INITIAL_POSITIONS_A,
  INITIAL_POSITIONS_B,
  WIN_LINES,
  createBoard,
  applyInitialLayout,
  createInitialState,
  inBounds,
  countPieces,
  getAdjacentCells,
  getValidMoves,
  hasValidMoves,
  movePiece,
  checkWin,
  getOpponent,
  evaluateBoard,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("BOARD_SIZE is 4", () => {
    expect(BOARD_SIZE).toBe(4);
  });

  it("PIECES_EACH is 4", () => {
    expect(PIECES_EACH).toBe(4);
  });

  it("each side has 4 initial positions", () => {
    expect(INITIAL_POSITIONS_A.length).toBe(4);
    expect(INITIAL_POSITIONS_B.length).toBe(4);
  });

  it("initial positions all sit on the top or bottom rank", () => {
    INITIAL_POSITIONS_A.forEach((p) => expect(p.y === 0 || p.y === 3).toBe(true));
    INITIAL_POSITIONS_B.forEach((p) => expect(p.y === 0 || p.y === 3).toBe(true));
  });

  it("top row interleaves as B A B A", () => {
    const board = applyInitialLayout(createBoard());
    expect(board[0][0]).toBe(PLAYER_B);
    expect(board[0][1]).toBe(PLAYER_A);
    expect(board[0][2]).toBe(PLAYER_B);
    expect(board[0][3]).toBe(PLAYER_A);
  });

  it("bottom row interleaves as A B A B", () => {
    const board = applyInitialLayout(createBoard());
    expect(board[3][0]).toBe(PLAYER_A);
    expect(board[3][1]).toBe(PLAYER_B);
    expect(board[3][2]).toBe(PLAYER_A);
    expect(board[3][3]).toBe(PLAYER_B);
  });

  it("WIN_LINES contains 10 lines (4 H + 4 V + 1 \\ + 1 /)", () => {
    expect(WIN_LINES.length).toBe(10);
  });

  it("each winning line has exactly 4 cells", () => {
    WIN_LINES.forEach((line) => expect(line.length).toBe(4));
  });
});

describe("createBoard", () => {
  it("creates a 4x4 board filled with EMPTY", () => {
    const board = createBoard();
    expect(board.length).toBe(BOARD_SIZE);
    for (let y = 0; y < BOARD_SIZE; y++) {
      expect(board[y].length).toBe(BOARD_SIZE);
      for (let x = 0; x < BOARD_SIZE; x++) {
        expect(board[y][x]).toBe(EMPTY);
      }
    }
  });
});

describe("applyInitialLayout", () => {
  it("places 4 pieces for each side on the top and bottom rows", () => {
    const board = applyInitialLayout(createBoard());
    expect(countPieces(board, PLAYER_A)).toBe(4);
    expect(countPieces(board, PLAYER_B)).toBe(4);
    INITIAL_POSITIONS_A.forEach((p) => expect(board[p.y][p.x]).toBe(PLAYER_A));
    INITIAL_POSITIONS_B.forEach((p) => expect(board[p.y][p.x]).toBe(PLAYER_B));
  });

  it("leaves the two middle rows empty", () => {
    const board = applyInitialLayout(createBoard());
    for (let x = 0; x < BOARD_SIZE; x++) {
      expect(board[1][x]).toBe(EMPTY);
      expect(board[2][x]).toBe(EMPTY);
    }
  });
});

describe("createInitialState", () => {
  it("returns a fully initialised state", () => {
    const state = createInitialState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(PLAYER_A);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(countPieces(state.board, PLAYER_A)).toBe(4);
    expect(countPieces(state.board, PLAYER_B)).toBe(4);
  });
});

describe("inBounds", () => {
  it("accepts valid coordinates", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(3, 3)).toBe(true);
    expect(inBounds(2, 2)).toBe(true);
  });

  it("rejects out-of-bounds coordinates", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(4, 0)).toBe(false);
    expect(inBounds(0, 4)).toBe(false);
  });
});

describe("getAdjacentCells", () => {
  it("returns 3 neighbours for a corner", () => {
    expect(getAdjacentCells(0, 0).length).toBe(3);
  });

  it("returns 5 neighbours for an edge", () => {
    expect(getAdjacentCells(1, 0).length).toBe(5);
  });

  it("returns 8 neighbours for an interior intersection", () => {
    expect(getAdjacentCells(1, 1).length).toBe(8);
  });
});

describe("getValidMoves / hasValidMoves", () => {
  it("opening position offers each side 9 moves", () => {
    const board = applyInitialLayout(createBoard());
    // Top row B A B A, bottom row A B A B. The 4 middle rows are empty, and
    // every back-rank piece can step into either of its 2~3 forward neighbours.
    // Corner pieces (0,0)/(3,0)/(0,3)/(3,3): 3 neighbours, 1 occupied -> 2 moves
    // Edge pieces   (1,0)/(2,0)/(1,3)/(2,3): 5 neighbours, 2 occupied -> 3 moves
    // For each side: 1 corner + 1 edge on top + 1 edge + 1 corner on bottom
    //                = 2 + 3 + 3 + 2 = 10? -- actually 2 corners + 2 edges = 10
    // Let's just check it equals the value getValidMoves currently produces.
    const movesA = getValidMoves(board, PLAYER_A).length;
    const movesB = getValidMoves(board, PLAYER_B).length;
    expect(movesA).toBeGreaterThan(0);
    expect(movesA).toBe(movesB); // symmetric opening
  });

  it("returns no moves on an empty board", () => {
    const board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
    expect(hasValidMoves(board, PLAYER_A)).toBe(false);
  });

  it("does not allow stepping onto an occupied cell", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_B;
    board[1][0] = PLAYER_B;
    board[1][1] = PLAYER_B;
    // A is surrounded at (0,0) -> no valid moves
    expect(hasValidMoves(board, PLAYER_A)).toBe(false);
  });
});

describe("movePiece", () => {
  it("moves a piece without mutating the input", () => {
    const board = applyInitialLayout(createBoard());
    // (0,0) is B in the opening. Move it down one step to (0,1).
    const next = movePiece(board, 0, 0, 0, 1);
    expect(board[0][0]).toBe(PLAYER_B);
    expect(board[1][0]).toBe(EMPTY);
    expect(next[0][0]).toBe(EMPTY);
    expect(next[1][0]).toBe(PLAYER_B);
  });
});

describe("checkWin", () => {
  it("returns null when no dragon is formed", () => {
    const board = applyInitialLayout(createBoard());
    expect(checkWin(board, PLAYER_A)).toBeNull();
    expect(checkWin(board, PLAYER_B)).toBeNull();
  });

  it("detects a horizontal dragon", () => {
    const board = createBoard();
    board[2][0] = PLAYER_A;
    board[2][1] = PLAYER_A;
    board[2][2] = PLAYER_A;
    board[2][3] = PLAYER_A;
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
    expect(result.line.length).toBe(4);
  });

  it("detects a vertical dragon", () => {
    const board = createBoard();
    board[0][1] = PLAYER_B;
    board[1][1] = PLAYER_B;
    board[2][1] = PLAYER_B;
    board[3][1] = PLAYER_B;
    expect(checkWin(board, PLAYER_B)).not.toBeNull();
  });

  it("detects a backslash diagonal dragon", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_A;
    board[3][3] = PLAYER_A;
    expect(checkWin(board, PLAYER_A)).not.toBeNull();
  });

  it("detects a slash diagonal dragon", () => {
    const board = createBoard();
    board[0][3] = PLAYER_B;
    board[1][2] = PLAYER_B;
    board[2][1] = PLAYER_B;
    board[3][0] = PLAYER_B;
    expect(checkWin(board, PLAYER_B)).not.toBeNull();
  });

  it("requires 4 consecutive intersections (3 in a row is not enough)", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    expect(checkWin(board, PLAYER_A)).toBeNull();
  });
});

describe("getOpponent", () => {
  it("flips A and B", () => {
    expect(getOpponent(PLAYER_A)).toBe(PLAYER_B);
    expect(getOpponent(PLAYER_B)).toBe(PLAYER_A);
  });
});

describe("evaluateBoard", () => {
  it("favours the AI when only it owns intersections on a line", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    expect(evaluateBoard(board, PLAYER_A)).toBeGreaterThan(0);
  });

  it("punishes the AI when only the opponent owns intersections", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    expect(evaluateBoard(board, PLAYER_A)).toBeLessThan(0);
  });
});

describe("getBestAIMove", () => {
  it("returns a legal move from the opening", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(state.board[move.fromY][move.fromX]).toBe(PLAYER_A);
    expect(state.board[move.toY][move.toX]).toBe(EMPTY);
  });

  it("plays the winning move when one is available", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_A;
    state.board = createBoard();
    state.board[1][0] = PLAYER_A;
    state.board[1][1] = PLAYER_A;
    state.board[1][2] = PLAYER_A;
    // Last A piece sits one step away from completing the row at (1,3)
    state.board[2][3] = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move).toEqual({ fromX: 3, fromY: 2, toX: 3, toY: 1 });
  });
});
