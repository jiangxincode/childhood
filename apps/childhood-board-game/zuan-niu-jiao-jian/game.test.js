import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  TOTAL_POSITIONS,
  WIDE_END,
  CONNECTIONS,
  EDGES,
  POSITIONS,
  createBoard,
  createInitialState,
  getConnections,
  countPieces,
  getValidMoves,
  checkWin,
  movePiece,
  getOpponent,
  evaluateBoard,
  minimax,
  getBestAIMove,
} from "./game.js";

// ============================================================
// Constants
// ============================================================
describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("TOTAL_POSITIONS is 10", () => {
    expect(TOTAL_POSITIONS).toBe(10);
  });

  it("WIDE_END contains positions 0 and 3", () => {
    expect(WIDE_END).toEqual([0, 3]);
  });

  it("POSITIONS has 10 entries", () => {
    expect(POSITIONS.length).toBe(10);
  });

  it("EDGES has 15 unique edges", () => {
    expect(EDGES.length).toBe(15);
  });
});

// ============================================================
// Connections
// ============================================================
describe("CONNECTIONS", () => {
  it("position 0 connects to 1 and 4", () => {
    expect(CONNECTIONS[0]).toEqual([1, 4]);
  });

  it("position 9 connects to 6 and 8", () => {
    expect(CONNECTIONS[9]).toEqual([6, 8]);
  });

  it("position 6 has 5 connections (most connected node)", () => {
    expect(CONNECTIONS[6].length).toBe(5);
  });

  it("all connections are bidirectional", () => {
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      var neighbors = CONNECTIONS[i];
      for (var j = 0; j < neighbors.length; j++) {
        expect(CONNECTIONS[neighbors[j]]).toContain(i);
      }
    }
  });

  it("each position has at least 2 connections", () => {
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      expect(CONNECTIONS[i].length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ============================================================
// createBoard
// ============================================================
describe("createBoard", () => {
  it("creates array of 10 EMPTY positions", () => {
    var board = createBoard();
    expect(board.length).toBe(10);
    for (var i = 0; i < 10; i++) {
      expect(board[i]).toBe(EMPTY);
    }
  });
});

// ============================================================
// createInitialState
// ============================================================
describe("createInitialState", () => {
  it("places A at positions 0 and 3", () => {
    var state = createInitialState("pvp");
    expect(state.board[0]).toBe(PLAYER_A);
    expect(state.board[3]).toBe(PLAYER_A);
  });

  it("places B at position 9", () => {
    var state = createInitialState("pvp");
    expect(state.board[9]).toBe(PLAYER_B);
  });

  it("other positions are empty", () => {
    var state = createInitialState("pvp");
    for (var i = 0; i < 10; i++) {
      if (i !== 0 && i !== 3 && i !== 9) {
        expect(state.board[i]).toBe(EMPTY);
      }
    }
  });

  it("starts with player A", () => {
    var state = createInitialState("pvp");
    expect(state.currentPlayer).toBe(PLAYER_A);
  });

  it("game is not over initially", () => {
    var state = createInitialState("pvp");
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
  });
});

// ============================================================
// getConnections
// ============================================================
describe("getConnections", () => {
  it("returns correct connections for position 0", () => {
    expect(getConnections(0)).toEqual([1, 4]);
  });

  it("returns correct connections for position 5", () => {
    expect(getConnections(5)).toEqual([1, 4, 6, 8]);
  });
});

// ============================================================
// countPieces
// ============================================================
describe("countPieces", () => {
  it("counts 2 A pieces and 1 B piece on initial board", () => {
    var state = createInitialState("pvp");
    expect(countPieces(state.board, PLAYER_A)).toBe(2);
    expect(countPieces(state.board, PLAYER_B)).toBe(1);
  });

  it("counts zero on empty board", () => {
    var board = createBoard();
    expect(countPieces(board, PLAYER_A)).toBe(0);
    expect(countPieces(board, PLAYER_B)).toBe(0);
  });
});

// ============================================================
// getValidMoves
// ============================================================
describe("getValidMoves", () => {
  it("returns 4 moves for A at start (2 pieces x 2 neighbors each)", () => {
    var state = createInitialState("pvp");
    var moves = getValidMoves(state.board, PLAYER_A);
    expect(moves.length).toBe(4);
  });

  it("returns 2 moves for B at start (position 9 neighbors are 6 and 8)", () => {
    var state = createInitialState("pvp");
    var moves = getValidMoves(state.board, PLAYER_B);
    expect(moves.length).toBe(2);
  });

  it("returns empty array for player with no pieces", () => {
    var board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
  });

  it("returns empty when B is surrounded by A", () => {
    var board = createBoard();
    board[9] = PLAYER_B;
    board[6] = PLAYER_A;
    board[8] = PLAYER_A;
    expect(getValidMoves(board, PLAYER_B).length).toBe(0);
  });

  it("returns valid move objects with from and to fields", () => {
    var state = createInitialState("pvp");
    var moves = getValidMoves(state.board, PLAYER_B);
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i]).toHaveProperty("from");
      expect(moves[i]).toHaveProperty("to");
    }
  });
});

// ============================================================
// checkWin
// ============================================================
describe("checkWin", () => {
  it("returns null when game is ongoing (initial state)", () => {
    var state = createInitialState("pvp");
    expect(checkWin(state.board)).toBeNull();
  });

  it("A wins when B has no valid moves (surrounded)", () => {
    var board = createBoard();
    board[6] = PLAYER_A;
    board[8] = PLAYER_A;
    board[9] = PLAYER_B;
    expect(checkWin(board)).toBe(PLAYER_A);
  });

  it("B wins when at position 0 (wide end)", () => {
    var board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    expect(checkWin(board)).toBe(PLAYER_B);
  });

  it("B wins when at position 3 (wide end)", () => {
    var board = createBoard();
    board[3] = PLAYER_B;
    board[5] = PLAYER_A;
    board[6] = PLAYER_A;
    expect(checkWin(board)).toBe(PLAYER_B);
  });

  it("no winner when B has moves and is not at wide end", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[3] = PLAYER_A;
    board[2] = PLAYER_B;
    // B at 2, neighbors [1, 3, 6]: positions 1 and 6 are empty
    expect(checkWin(board)).toBeNull();
  });
});

// ============================================================
// movePiece
// ============================================================
describe("movePiece", () => {
  it("moves piece to new location", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    var newBoard = movePiece(board, 0, 1);
    expect(newBoard[0]).toBe(EMPTY);
    expect(newBoard[1]).toBe(PLAYER_A);
  });

  it("does not modify original board (immutability)", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    movePiece(board, 0, 1);
    expect(board[0]).toBe(PLAYER_A);
    expect(board[1]).toBe(EMPTY);
  });

  it("returns new array reference", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    var newBoard = movePiece(board, 0, 1);
    expect(newBoard).not.toBe(board);
  });
});

// ============================================================
// getOpponent
// ============================================================
describe("getOpponent", () => {
  it("returns B for A", () => {
    expect(getOpponent(PLAYER_A)).toBe(PLAYER_B);
  });

  it("returns A for B", () => {
    expect(getOpponent(PLAYER_B)).toBe(PLAYER_A);
  });
});

// ============================================================
// evaluateBoard
// ============================================================
describe("evaluateBoard", () => {
  it("returns 1000 for AI win", () => {
    var board = createBoard();
    board[6] = PLAYER_A;
    board[8] = PLAYER_A;
    board[9] = PLAYER_B;
    expect(evaluateBoard(board, PLAYER_A)).toBe(1000);
  });

  it("returns -1000 for AI loss", () => {
    var board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    expect(evaluateBoard(board, PLAYER_A)).toBe(-1000);
  });

  it("returns positive score when B is close to tip (good for A)", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[3] = PLAYER_A;
    board[9] = PLAYER_B;
    var score = evaluateBoard(board, PLAYER_A);
    expect(score).toBeGreaterThan(0);
  });
});

// ============================================================
// minimax
// ============================================================
describe("minimax", () => {
  it("returns winning score at depth 0 for winning board", () => {
    var board = createBoard();
    board[6] = PLAYER_A;
    board[8] = PLAYER_A;
    board[9] = PLAYER_B;
    var score = minimax(board, 0, -Infinity, Infinity, true, PLAYER_A);
    expect(score).toBe(1000);
  });

  it("returns losing score for opponent win", () => {
    var board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    var score = minimax(board, 0, -Infinity, Infinity, true, PLAYER_A);
    expect(score).toBe(-1000);
  });
});

// ============================================================
// getBestAIMove
// ============================================================
describe("getBestAIMove", () => {
  it("returns a valid move for AI as A", () => {
    var state = createInitialState("pve");
    state.aiTeam = PLAYER_A;
    var move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move).toHaveProperty("from");
    expect(move).toHaveProperty("to");
  });

  it("returns a valid move for AI as B", () => {
    var state = createInitialState("pve");
    state.aiTeam = PLAYER_B;
    var move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move).toHaveProperty("from");
    expect(move).toHaveProperty("to");
  });

  it("returns null when AI has no moves", () => {
    var board = createBoard();
    board[6] = PLAYER_A;
    board[8] = PLAYER_A;
    board[9] = PLAYER_B;
    var state = createInitialState("pve");
    state.board = board;
    state.aiTeam = PLAYER_B;
    var move = getBestAIMove(state);
    expect(move).toBeNull();
  });

  it("AI as A tries to surround B", () => {
    // Set up: B at position 7, A at positions 4 and 6
    // A should try to move to block B's escape
    var board = createBoard();
    board[4] = PLAYER_A;
    board[6] = PLAYER_A;
    board[7] = PLAYER_B;
    var state = createInitialState("pve");
    state.board = board;
    state.aiTeam = PLAYER_A;
    var move = getBestAIMove(state);
    expect(move).not.toBeNull();
    // AI should try to move toward B
    var newBoard = movePiece(board, move.from, move.to);
    // After move, check that A has a piece adjacent to B's position 7
    var bNeighbors = CONNECTIONS[7];
    var aNearB = false;
    for (var i = 0; i < bNeighbors.length; i++) {
      if (newBoard[bNeighbors[i]] === PLAYER_A) aNearB = true;
    }
    expect(aNearB).toBe(true);
  });
});
