import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  ROW_COUNT,
  COL_COUNT,
  INITIAL_A,
  INITIAL_B,
  MIN_A_TO_LOSE,
  DIRECTIONS,
  createBoard,
  getInitialBoard,
  createGameState,
  inBounds,
  countPieces,
  getAdjacentCells,
  getStepMoves,
  getJumpMoves,
  getValidMoves,
  checkWin,
  cloneBoard,
  applyMove,
  getOpponent,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("ROW_COUNT is 5", () => {
    expect(ROW_COUNT).toBe(5);
  });

  it("COL_COUNT is 5", () => {
    expect(COL_COUNT).toBe(5);
  });

  it("INITIAL_A is 15", () => {
    expect(INITIAL_A).toBe(15);
  });

  it("INITIAL_B is 3", () => {
    expect(INITIAL_B).toBe(3);
  });

  it("MIN_A_TO_LOSE is 4", () => {
    expect(MIN_A_TO_LOSE).toBe(4);
  });

  it("DIRECTIONS has 4 entries", () => {
    expect(DIRECTIONS.length).toBe(4);
  });
});

describe("createBoard", () => {
  it("creates 5x5 board filled with EMPTY", () => {
    const board = createBoard();
    expect(board.length).toBe(5);
    for (let r = 0; r < 5; r++) {
      expect(board[r].length).toBe(5);
      for (let c = 0; c < 5; c++) {
        expect(board[r][c]).toBe(EMPTY);
      }
    }
  });
});

describe("getInitialBoard", () => {
  it("has 3 B (wolf) pieces at top row middle (col 1,2,3)", () => {
    const board = getInitialBoard();
    expect(board[0][0]).toBe(EMPTY);
    expect(board[0][1]).toBe(PLAYER_B);
    expect(board[0][2]).toBe(PLAYER_B);
    expect(board[0][3]).toBe(PLAYER_B);
    expect(board[0][4]).toBe(EMPTY);
  });

  it("has 15 A (sheep) pieces in rows 2-4", () => {
    const board = getInitialBoard();
    let countA = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (board[r][c] === PLAYER_A) countA++;
      }
    }
    expect(countA).toBe(15);
  });

  it("row 2 has A in all 5 columns", () => {
    const board = getInitialBoard();
    for (let c = 0; c < 5; c++) {
      expect(board[2][c]).toBe(PLAYER_A);
    }
  });

  it("row 3 has A in all 5 columns", () => {
    const board = getInitialBoard();
    for (let c = 0; c < 5; c++) {
      expect(board[3][c]).toBe(PLAYER_A);
    }
  });

  it("row 4 has A in all 5 columns", () => {
    const board = getInitialBoard();
    for (let c = 0; c < 5; c++) {
      expect(board[4][c]).toBe(PLAYER_A);
    }
  });

  it("row 1 has no pieces", () => {
    const board = getInitialBoard();
    for (let c = 0; c < 5; c++) {
      expect(board[1][c]).toBe(EMPTY);
    }
  });
});

describe("createGameState", () => {
  it("creates initial state with correct defaults", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(PLAYER_B); // Wolf always moves first
    expect(state.piecesA).toBe(INITIAL_A);
    expect(state.piecesB).toBe(INITIAL_B);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.lastJump).toBeNull();
  });
});

describe("inBounds", () => {
  it("returns true for valid coordinates", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(4, 4)).toBe(true);
    expect(inBounds(2, 1)).toBe(true);
  });

  it("returns false for out-of-bounds", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(5, 0)).toBe(false);
    expect(inBounds(0, 5)).toBe(false);
  });
});

describe("countPieces", () => {
  it("counts pieces on empty board", () => {
    const board = createBoard();
    expect(countPieces(board, PLAYER_A)).toBe(0);
    expect(countPieces(board, PLAYER_B)).toBe(0);
  });

  it("counts pieces correctly", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_B;
    expect(countPieces(board, PLAYER_A)).toBe(2);
    expect(countPieces(board, PLAYER_B)).toBe(1);
  });
});

describe("getAdjacentCells", () => {
  it("returns 2 neighbors for corner (0,0)", () => {
    const adj = getAdjacentCells(0, 0);
    expect(adj.length).toBe(2);
  });

  it("returns 2 neighbors for corner (0,4)", () => {
    const adj = getAdjacentCells(0, 4);
    expect(adj.length).toBe(2);
  });

  it("returns 3 neighbors for edge (0,1)", () => {
    const adj = getAdjacentCells(0, 1);
    expect(adj.length).toBe(3);
  });

  it("returns 4 neighbors for center (2,2)", () => {
    const adj = getAdjacentCells(2, 2);
    expect(adj.length).toBe(4);
  });
});

describe("getStepMoves", () => {
  it("returns empty array for piece with no empty neighbors", () => {
    const board = createBoard();
    board[3][1] = PLAYER_A;
    board[3][0] = PLAYER_A;
    board[3][2] = PLAYER_A;
    board[2][1] = PLAYER_A;
    board[4][1] = PLAYER_A;
    const moves = getStepMoves(board, 3, 1);
    expect(moves.length).toBe(0);
  });

  it("returns step moves for piece with empty neighbors", () => {
    const board = createBoard();
    board[2][1] = PLAYER_A;
    const moves = getStepMoves(board, 2, 1);
    expect(moves.length).toBe(4);
    for (let i = 0; i < moves.length; i++) {
      expect(moves[i].type).toBe("step");
    }
  });
});

describe("getJumpMoves", () => {
  it("returns empty for A pieces (only wolf can jump)", () => {
    const board = createBoard();
    board[2][0] = PLAYER_B;
    board[3][0] = PLAYER_A;
    const moves = getJumpMoves(board, 2, 0);
    expect(moves.length).toBe(0);
  });

  it("detects valid jump capture", () => {
    const board = createBoard();
    // Wolf at (0,1), empty at (1,1), sheep at (2,1)
    board[0][1] = PLAYER_B;
    board[1][1] = EMPTY;
    board[2][1] = PLAYER_A;
    const moves = getJumpMoves(board, 0, 1);
    expect(moves.length).toBe(1);
    expect(moves[0].type).toBe("jump");
    expect(moves[0].toR).toBe(2);
    expect(moves[0].toC).toBe(1);
    expect(moves[0].captureR).toBe(2);
    expect(moves[0].captureC).toBe(1);
  });

  it("does not jump over occupied middle", () => {
    const board = createBoard();
    board[0][1] = PLAYER_B;
    board[1][1] = PLAYER_A; // occupied, cannot jump
    board[2][1] = PLAYER_A;
    const moves = getJumpMoves(board, 0, 1);
    expect(moves.length).toBe(0);
  });

  it("does not jump off board", () => {
    const board = createBoard();
    board[4][1] = PLAYER_B;
    board[3][1] = EMPTY;
    board[2][1] = PLAYER_A;
    const moves = getJumpMoves(board, 4, 1);
    expect(moves.length).toBe(1);
    expect(moves[0].toR).toBe(2);
  });

  it("detects multiple jump directions", () => {
    const board = createBoard();
    board[2][1] = PLAYER_B;
    board[1][1] = EMPTY;
    board[0][1] = PLAYER_A;
    board[3][1] = EMPTY;
    board[4][1] = PLAYER_A;
    const moves = getJumpMoves(board, 2, 1);
    expect(moves.length).toBe(2);
  });
});

describe("getValidMoves", () => {
  it("returns step moves for A pieces", () => {
    const board = createBoard();
    board[0][2] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    // (0,2) has 3 neighbors: (0,1), (0,3), (1,2)
    expect(moves.length).toBe(3);
    for (let i = 0; i < moves.length; i++) {
      expect(moves[i].type).toBe("step");
    }
  });

  it("returns step and jump moves for B pieces", () => {
    const board = createBoard();
    board[0][2] = PLAYER_B;
    // (0,1), (0,3), (1,2) are empty
    const moves = getValidMoves(board, PLAYER_B);
    const stepMoves = moves.filter((m) => m.type === "step");
    const jumpMoves = moves.filter((m) => m.type === "jump");
    expect(stepMoves.length).toBe(3);
    expect(jumpMoves.length).toBe(0);
  });

  it("wolf can jump over empty to capture sheep", () => {
    const board = createBoard();
    board[0][1] = PLAYER_B;
    board[1][1] = EMPTY;
    board[2][1] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_B);
    const jumpMoves = moves.filter((m) => m.type === "jump");
    expect(jumpMoves.length).toBe(1);
    expect(jumpMoves[0].toR).toBe(2);
  });
});

describe("checkWin", () => {
  it("returns null when game is ongoing", () => {
    const board = getInitialBoard();
    expect(checkWin(board)).toBeNull();
  });

  it("wolf wins when sheep pieces drop to 3 or below", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    board[0][2] = PLAYER_B;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[1][2] = PLAYER_A;
    // Exactly 3 sheep pieces - wolf wins
    expect(checkWin(board)).toBe(PLAYER_B);
  });

  it("wolf wins when sheep pieces drop below 3", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    board[0][2] = PLAYER_B;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    // Only 2 sheep pieces
    expect(checkWin(board)).toBe(PLAYER_B);
  });

  it("sheep wins when wolf has no valid moves", () => {
    const board = createBoard();
    // Wolf at (0,0) surrounded by sheep pieces
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_A;
    board[1][0] = PLAYER_A;
    // Wolf has no step moves, and no valid jumps
    board[2][0] = PLAYER_A;
    board[2][1] = PLAYER_A;
    board[2][2] = PLAYER_A;
    board[2][3] = PLAYER_A;
    board[2][4] = PLAYER_A;
    board[3][0] = PLAYER_A;
    board[3][1] = PLAYER_A;
    board[3][2] = PLAYER_A;
    board[3][3] = PLAYER_A;
    board[3][4] = PLAYER_A;
    board[4][0] = PLAYER_A;
    board[4][1] = PLAYER_A;
    board[4][2] = PLAYER_A;
    board[4][3] = PLAYER_A;
    board[4][4] = PLAYER_A;
    // 16 sheep pieces, wolf has no moves
    expect(checkWin(board)).toBe(PLAYER_A);
  });

  it("sheep wins when wolf pieces are captured (count = 0)", () => {
    const board = createBoard();
    // No wolf pieces at all, many sheep pieces
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][3] = PLAYER_A;
    board[0][4] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    expect(checkWin(board)).toBe(PLAYER_A);
  });

  it("does not declare winner if sheep > 3 and wolf has moves", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = EMPTY; // wolf can move here
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[1][2] = PLAYER_A;
    board[1][3] = PLAYER_A;
    // 4 sheep pieces (> 3), wolf has moves - game continues
    expect(checkWin(board)).toBeNull();
  });
});

describe("cloneBoard", () => {
  it("creates independent copy", () => {
    const board = getInitialBoard();
    const copy = cloneBoard(board);
    copy[0][0] = PLAYER_A;
    expect(board[0][0]).toBe(EMPTY);
    expect(copy[0][0]).toBe(PLAYER_A);
  });
});

describe("applyMove", () => {
  it("applies step move correctly", () => {
    const board = getInitialBoard();
    const move = { fromR: 0, fromC: 1, toR: 0, toC: 0, type: "step" };
    const newBoard = applyMove(board, move);
    expect(newBoard[0][1]).toBe(EMPTY);
    expect(newBoard[0][0]).toBe(PLAYER_B);
    // Original unchanged
    expect(board[0][1]).toBe(PLAYER_B);
    expect(board[0][0]).toBe(EMPTY);
  });

  it("applies jump move and removes captured piece", () => {
    const board = createBoard();
    board[0][2] = PLAYER_B;
    board[2][2] = PLAYER_A;
    const move = {
      fromR: 0,
      fromC: 2,
      toR: 2,
      toC: 2,
      captureR: 2,
      captureC: 2,
      type: "jump",
    };
    const newBoard = applyMove(board, move);
    expect(newBoard[0][2]).toBe(EMPTY);
    expect(newBoard[1][2]).toBe(EMPTY);
    expect(newBoard[2][2]).toBe(PLAYER_B); // Wolf lands on captured position
  });
});

describe("getOpponent", () => {
  it("returns B for A", () => {
    expect(getOpponent(PLAYER_A)).toBe(PLAYER_B);
  });

  it("returns A for B", () => {
    expect(getOpponent(PLAYER_B)).toBe(PLAYER_A);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move for wolf (B)", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(["step", "jump"]).toContain(move.type);
  });

  it("wolf takes jump capture when available", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.board = createBoard();
    state.board[0][2] = PLAYER_B;
    state.board[1][2] = EMPTY;
    state.board[2][2] = PLAYER_A;
    state.board[2][0] = PLAYER_A;
    state.board[2][1] = PLAYER_A;
    state.board[2][3] = PLAYER_A;
    state.board[2][4] = PLAYER_A;
    state.board[3][0] = PLAYER_A;
    state.board[3][1] = PLAYER_A;
    state.board[3][2] = PLAYER_A;
    state.board[3][3] = PLAYER_A;
    state.board[3][4] = PLAYER_A;
    state.board[4][0] = PLAYER_A;
    state.board[4][1] = PLAYER_A;
    state.board[4][2] = PLAYER_A;
    state.board[4][3] = PLAYER_A;
    state.board[4][4] = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move.type).toBe("jump");
    expect(move.toR).toBe(2);
    expect(move.toC).toBe(2);
  });

  it("returns a valid move for sheep (A)", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("step");
  });
});
