import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  TOTAL_POSITIONS,
  PIECES_EACH,
  EDGES,
  POSITIONS,
  ADJACENCY,
  createBoard,
  createInitialState,
  getNeighbors,
  getValidMovesForPiece,
  getAllValidMoves,
  canMove,
  checkWin,
  movePiece,
  getOpponent,
  countPieces,
  isMoveLegalOnFirstTurn,
  evaluateBoard,
  minimax,
  getBestAIMove,
} from "./game.js";

// Board layout: Square with center point, well on right replaces edge 1-3
// Pieces cannot move diagonally across two spaces - must go through center
//   0 ---- 1
//   | \  / |
//   |  4   |  (well on right)
//   | /  \ |
//   2 ---- 3
//
// Edges: 0-1, 0-2, 2-3, 0-4, 1-4, 2-4, 3-4
// Note: 1-3 edge is replaced by the well, no diagonal edges 0-3 or 1-2

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("TOTAL_POSITIONS is 5", () => {
    expect(TOTAL_POSITIONS).toBe(5);
  });

  it("PIECES_EACH is 2", () => {
    expect(PIECES_EACH).toBe(2);
  });

  it("EDGES has 7 edges", () => {
    expect(EDGES.length).toBe(7);
  });

  it("POSITIONS has 5 entries", () => {
    expect(POSITIONS.length).toBe(5);
  });

  it("ADJACENCY is built from EDGES", () => {
    expect(ADJACENCY.length).toBe(5);
    // Position 0 (top-left) connects to 1, 2, 4
    expect(ADJACENCY[0]).toContain(1);
    expect(ADJACENCY[0]).toContain(2);
    expect(ADJACENCY[0]).toContain(4);
    expect(ADJACENCY[0].length).toBe(3);
    // Position 1 (top-right) connects to 0, 4 (NOT 3 - well replaces this edge)
    expect(ADJACENCY[1]).toContain(0);
    expect(ADJACENCY[1]).toContain(4);
    expect(ADJACENCY[1].length).toBe(2);
    // Position 2 (bottom-left) connects to 0, 3, 4
    expect(ADJACENCY[2]).toContain(0);
    expect(ADJACENCY[2]).toContain(3);
    expect(ADJACENCY[2]).toContain(4);
    expect(ADJACENCY[2].length).toBe(3);
    // Position 3 (bottom-right) connects to 2, 4 (NOT 1 - well replaces this edge)
    expect(ADJACENCY[3]).toContain(2);
    expect(ADJACENCY[3]).toContain(4);
    expect(ADJACENCY[3].length).toBe(2);
    // Position 4 (center) connects to all corners
    expect(ADJACENCY[4]).toContain(0);
    expect(ADJACENCY[4]).toContain(1);
    expect(ADJACENCY[4]).toContain(2);
    expect(ADJACENCY[4]).toContain(3);
    expect(ADJACENCY[4].length).toBe(4);
  });
});

describe("createBoard", () => {
  it("creates 5-position board filled with EMPTY", () => {
    const board = createBoard();
    expect(board.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(board[i]).toBe(EMPTY);
    }
  });
});

describe("createInitialState", () => {
  it("creates initial state with correct defaults", () => {
    const state = createInitialState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(PLAYER_A);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
  });

  it("places pieces correctly", () => {
    const state = createInitialState("pvp");
    // A at top (0 and 1)
    expect(state.board[0]).toBe(PLAYER_A);
    expect(state.board[1]).toBe(PLAYER_A);
    // B at bottom (2 and 3)
    expect(state.board[2]).toBe(PLAYER_B);
    expect(state.board[3]).toBe(PLAYER_B);
    // Empty at center(4)
    expect(state.board[4]).toBe(EMPTY);
  });

  it("each player has exactly 2 pieces", () => {
    const state = createInitialState("pvp");
    expect(countPieces(state.board, PLAYER_A)).toBe(2);
    expect(countPieces(state.board, PLAYER_B)).toBe(2);
  });
});

describe("getNeighbors", () => {
  it("returns correct neighbors for each position", () => {
    // 0: [1, 2, 4] - NO diagonal to 3
    expect(getNeighbors(0)).toContain(1);
    expect(getNeighbors(0)).toContain(2);
    expect(getNeighbors(0)).toContain(4);
    expect(getNeighbors(0).length).toBe(3);
    // 1: [0, 4] - NO 3 (well), NO diagonal to 2
    expect(getNeighbors(1)).toContain(0);
    expect(getNeighbors(1)).toContain(4);
    expect(getNeighbors(1).length).toBe(2);
    // 2: [0, 3, 4] - NO diagonal to 1
    expect(getNeighbors(2)).toContain(0);
    expect(getNeighbors(2)).toContain(3);
    expect(getNeighbors(2)).toContain(4);
    expect(getNeighbors(2).length).toBe(3);
    // 3: [2, 4] - NO 1 (well), NO diagonal to 0
    expect(getNeighbors(3)).toContain(2);
    expect(getNeighbors(3)).toContain(4);
    expect(getNeighbors(3).length).toBe(2);
    // 4: [0, 1, 2, 3]
    expect(getNeighbors(4)).toContain(0);
    expect(getNeighbors(4)).toContain(1);
    expect(getNeighbors(4)).toContain(2);
    expect(getNeighbors(4)).toContain(3);
    expect(getNeighbors(4).length).toBe(4);
  });
});

describe("getValidMovesForPiece", () => {
  it("returns moves to empty neighbors", () => {
    const state = createInitialState("pvp");
    // A at 0: neighbors 1(A), 2(B), 4(empty) -> can move to 4
    const moves = getValidMovesForPiece(state.board, 0);
    expect(moves.length).toBe(1);
    expect(moves).toContain(4);
  });

  it("returns empty array when all neighbors occupied", () => {
    // All 5 positions occupied, no moves
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, PLAYER_A];
    expect(getValidMovesForPiece(board, 0).length).toBe(0);
  });

  it("returns valid moves when neighbor is empty", () => {
    // A at 0, empty at 4
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    const moves = getValidMovesForPiece(board, 0);
    expect(moves).toContain(4);
    expect(moves.length).toBe(1);
  });
});

describe("getAllValidMoves", () => {
  it("returns all valid moves for a player", () => {
    const state = createInitialState("pvp");
    // A at 0 (neighbors 1,2,4), A at 1 (neighbors 0,4)
    // Board: A,A,B,B,empty
    // Piece at 0: neighbors 1(A),2(B),4(empty) -> can move to 4
    // Piece at 1: neighbors 0(A),4(empty) -> can move to 4
    const moves = getAllValidMoves(state.board, PLAYER_A);
    expect(moves.length).toBe(2);
    expect(moves[0]).toEqual({ from: 0, to: 4 });
    expect(moves[1]).toEqual({ from: 1, to: 4 });
  });

  it("returns moves when positions are available", () => {
    // A at 0 and 1, B at 2 and 3, empty at 4
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    const moves = getAllValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(2);
    expect(moves[0]).toEqual({ from: 0, to: 4 });
    expect(moves[1]).toEqual({ from: 1, to: 4 });
  });

  it("returns empty array for player with no pieces", () => {
    const board = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
    expect(getAllValidMoves(board, PLAYER_A).length).toBe(0);
  });
});

describe("canMove", () => {
  it("returns false when player cannot move", () => {
    // All positions filled, no moves possible
    const board = [PLAYER_A, PLAYER_B, PLAYER_A, PLAYER_B, PLAYER_A];
    expect(canMove(board, PLAYER_B)).toBe(false);
  });

  it("returns true when player can move", () => {
    const board = [PLAYER_A, PLAYER_B, PLAYER_A, PLAYER_B, EMPTY];
    expect(canMove(board, PLAYER_A)).toBe(true);
  });

  it("returns false when piece is trapped", () => {
    // All positions filled - both players stuck
    const board = [PLAYER_A, PLAYER_B, PLAYER_A, PLAYER_B, PLAYER_A];
    expect(canMove(board, PLAYER_A)).toBe(false);
    expect(canMove(board, PLAYER_B)).toBe(false);
  });

  it("returns false for player with no pieces", () => {
    const board = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
    expect(canMove(board, PLAYER_A)).toBe(false);
  });
});

describe("checkWin", () => {
  it("returns null when both can move", () => {
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    expect(checkWin(board)).toBeNull();
  });

  it("returns B when A cannot move", () => {
    // All positions filled, A wins (A cannot move)
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, PLAYER_A];
    expect(checkWin(board)).toBe(PLAYER_B);
  });

  it("returns B when A cannot move (all positions filled)", () => {
    // A at 0,1; B at 2,3,4 - A cannot move
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, PLAYER_B];
    expect(checkWin(board)).toBe(PLAYER_B);
  });
});

describe("movePiece", () => {
  it("moves piece from one position to another", () => {
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    const newBoard = movePiece(board, 0, 4);
    expect(newBoard[0]).toBe(EMPTY);
    expect(newBoard[4]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    movePiece(board, 0, 4);
    expect(board[0]).toBe(PLAYER_A);
    expect(board[4]).toBe(EMPTY);
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

describe("isMoveLegalOnFirstTurn", () => {
  it("returns false when move blocks opponent completely", () => {
    // Board: A,A,B,B,empty
    // A moves from 1 to 4 (center) -> B at 2,3 has no moves
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    expect(isMoveLegalOnFirstTurn(board, 1, 4, PLAYER_A)).toBe(false);
  });

  it("returns true when opponent still has moves after the move", () => {
    // Board: A,A,B,B,empty
    // A moves from 0 to 4 (center) -> B at 2,3: 2 can go to 3, 3 can go to 2
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    expect(isMoveLegalOnFirstTurn(board, 0, 4, PLAYER_A)).toBe(true);
  });

  it("returns true when move does not block opponent", () => {
    // Board: A,A,B,B,empty
    // A moves from 0 to 2 -> but 2 is occupied by B, so this wouldn't be a valid move
    // Use a valid move: A at 0 moves to 4
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    expect(isMoveLegalOnFirstTurn(board, 0, 4, PLAYER_A)).toBe(true);
  });
});

describe("countPieces", () => {
  it("counts pieces correctly", () => {
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    expect(countPieces(board, PLAYER_A)).toBe(2);
    expect(countPieces(board, PLAYER_B)).toBe(2);
  });

  it("counts zero for empty board", () => {
    const board = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
    expect(countPieces(board, PLAYER_A)).toBe(0);
  });
});

describe("evaluateBoard", () => {
  it("returns high score when AI wins", () => {
    // All positions filled, B wins (A cannot move)
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, PLAYER_B];
    expect(evaluateBoard(board, PLAYER_B)).toBe(1000);
  });

  it("returns high score when AI wins (B has more pieces)", () => {
    // All positions filled, B wins (A cannot move)
    const board = [PLAYER_B, PLAYER_B, PLAYER_A, PLAYER_A, PLAYER_B];
    expect(evaluateBoard(board, PLAYER_B)).toBe(1000);
  });

  it("returns higher score when AI controls center", () => {
    // B at center is good for B
    const board1 = [PLAYER_A, EMPTY, PLAYER_A, EMPTY, PLAYER_B];
    const board2 = [PLAYER_A, PLAYER_B, PLAYER_A, EMPTY, EMPTY];
    const score1 = evaluateBoard(board1, PLAYER_B);
    const score2 = evaluateBoard(board2, PLAYER_B);
    expect(score1).toBeGreaterThan(score2);
  });
});

describe("minimax", () => {
  it("returns winning score for forced win", () => {
    // All positions filled, B wins (A cannot move)
    const board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, PLAYER_B];
    const score = minimax(board, 2, -Infinity, Infinity, false, PLAYER_B);
    expect(score).toBeGreaterThan(0);
  });

  it("returns winning score when AI wins", () => {
    // All positions filled, B wins (A cannot move)
    const board = [PLAYER_B, PLAYER_B, PLAYER_A, PLAYER_A, PLAYER_B];
    const score = minimax(board, 2, -Infinity, Infinity, true, PLAYER_B);
    expect(score).toBeGreaterThan(0);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move for AI", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move).toHaveProperty("from");
    expect(move).toHaveProperty("to");
  });

  it("returns null when AI has no moves", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_B;
    // All positions filled, B stuck
    state.board = [PLAYER_B, PLAYER_B, PLAYER_A, PLAYER_A, PLAYER_A];
    const move = getBestAIMove(state);
    expect(move).toBeNull();
  });

  it("takes winning move when available", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_B;
    // B at 2,3; A at 0,1; empty at 4
    // B at 2: neighbors 0(A),3(B),4(empty) -> can move to 4
    // B at 3: neighbors 2(B),4(empty) -> can move to 4
    // Moving to center traps A
    state.board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.to).toBe(4);
  });

  it("does not choose blocking move on first turn as AI (A)", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_A;
    state.currentPlayer = PLAYER_A;
    state.isFirstTurn = true;
    // A at 0,1; B at 2,3; empty at 4
    // Moving 1->4 would block B completely, should be filtered out
    // Only legal first-turn move for A is 0->4
    state.board = [PLAYER_A, PLAYER_A, PLAYER_B, PLAYER_B, EMPTY];
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    // Should NOT be the blocking move (from 1 to 4)
    expect(move.from).toBe(0);
    expect(move.to).toBe(4);
  });
});
