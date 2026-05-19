import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_SIZE,
  PIECES_EACH,
  MIN_PIECES,
  CONNECTIONS,
  getConnections,
  cloneBoard,
  createBoard,
  createGameState,
  inBounds,
  countPieces,
  getEmptyCells,
  getJumpCaptures,
  getSurroundCaptures,
  getValidMoves,
  checkWin,
  placePiece,
  movePiece,
  capturePiece,
  getOpponent,
  evaluate,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("BOARD_SIZE is 4", () => {
    expect(BOARD_SIZE).toBe(4);
  });

  it("PIECES_EACH is 8", () => {
    expect(PIECES_EACH).toBe(8);
  });

  it("MIN_PIECES is 3", () => {
    expect(MIN_PIECES).toBe(3);
  });
});

describe("CONNECTIONS", () => {
  it("has entries for all 16 positions", () => {
    expect(Object.keys(CONNECTIONS).length).toBe(16);
  });

  it("corner (0,0) has 2 connections", () => {
    expect(getConnections(0, 0).length).toBe(2);
  });

  it("corner (3,3) has 2 connections", () => {
    expect(getConnections(3, 3).length).toBe(2);
  });

  it("center (1,1) has 6 connections", () => {
    expect(getConnections(1, 1).length).toBe(6);
  });

  it("center (2,2) has 7 connections", () => {
    expect(getConnections(2, 2).length).toBe(7);
  });

  it("edge (1,0) has 5 connections including diamond diagonals", () => {
    var conns = getConnections(1, 0);
    expect(conns.length).toBe(5);
    // Should connect to (0,1) and (2,1) diagonally
    var keys = conns.map((c) => c[0] + "," + c[1]);
    expect(keys).toContain("0,1");
    expect(keys).toContain("2,1");
  });

  it("all connections are bidirectional", () => {
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        var conns = getConnections(x, y);
        for (var i = 0; i < conns.length; i++) {
          var reverse = getConnections(conns[i][0], conns[i][1]);
          var found = false;
          for (var j = 0; j < reverse.length; j++) {
            if (reverse[j][0] === x && reverse[j][1] === y) {
              found = true;
              break;
            }
          }
          expect(found).toBe(true);
        }
      }
    }
  });
});

describe("createBoard", () => {
  it("creates 4x4 board filled with EMPTY", () => {
    const board = createBoard();
    expect(board.length).toBe(4);
    for (let y = 0; y < 4; y++) {
      expect(board[y].length).toBe(4);
      for (let x = 0; x < 4; x++) {
        expect(board[y][x]).toBe(EMPTY);
      }
    }
  });
});

describe("createGameState", () => {
  it("creates initial state with correct defaults", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(PLAYER_A);
    expect(state.phase).toBe("place");
    expect(state.piecesA).toBe(0);
    expect(state.piecesB).toBe(0);
    expect(state.placedA).toBe(0);
    expect(state.placedB).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
  });
});

describe("inBounds", () => {
  it("returns true for valid coordinates", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(3, 3)).toBe(true);
    expect(inBounds(1, 2)).toBe(true);
  });

  it("returns false for out-of-bounds", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(4, 0)).toBe(false);
    expect(inBounds(0, 4)).toBe(false);
  });
});

describe("cloneBoard", () => {
  it("creates independent copy", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const cloned = cloneBoard(board);
    cloned[0][0] = PLAYER_B;
    expect(board[0][0]).toBe(PLAYER_A);
    expect(cloned[0][0]).toBe(PLAYER_B);
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

describe("getEmptyCells", () => {
  it("returns all 16 cells on empty board", () => {
    const board = createBoard();
    expect(getEmptyCells(board).length).toBe(16);
  });

  it("returns correct count with pieces placed", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_B;
    expect(getEmptyCells(board).length).toBe(14);
  });
});

describe("getValidMoves", () => {
  it("returns empty array for empty board", () => {
    const board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
  });

  it("returns valid moves for corner piece (2 neighbors)", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(2);
  });

  it("returns valid moves for center piece (6 neighbors)", () => {
    const board = createBoard();
    board[1][1] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(6);
  });

  it("respects connection map for moves", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    const targets = moves.map((m) => m.toX + "," + m.toY);
    expect(targets).toContain("1,0");
    expect(targets).toContain("0,1");
    expect(targets).not.toContain("1,1");
  });

  it("does not move to occupied cells", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(0);
  });
});

describe("getJumpCaptures", () => {
  it("detects jump capture opportunity", () => {
    const board = createBoard();
    // A at (x=0, y=0), B at (x=0, y=1) -> vertical jump to (x=0, y=2)
    board[0][0] = PLAYER_A;
    board[1][0] = PLAYER_B;
    const captures = getJumpCaptures(board, PLAYER_A);
    expect(captures.length).toBeGreaterThan(0);
    // Check that the specific A(0,0) jumps over B(0,1) to (0,2) is found
    const hasJumpTo02 = captures.some(
      (c) => c.fromX === 0 && c.fromY === 0 && c.toX === 0 && c.toY === 2
    );
    expect(hasJumpTo02).toBe(true);
  });

  it("detects diagonal jump capture", () => {
    const board = createBoard();
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_B;
    // (1,0)-(1,1)-(1,2): vertical jump
    const captures = getJumpCaptures(board, PLAYER_A);
    expect(captures.length).toBeGreaterThan(0);
  });

  it("does not detect capture when landing spot is occupied", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_B;
    // Fill all empty neighbors of B at (0,1): (1,1), (1,0), (1,2)
    board[0][2] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][2] = PLAYER_A;
    const captures = getJumpCaptures(board, PLAYER_A);
    expect(captures.length).toBe(0);
  });

  it("does not detect capture when no opponent adjacent", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const captures = getJumpCaptures(board, PLAYER_A);
    expect(captures.length).toBe(0);
  });
});

describe("getSurroundCaptures", () => {
  it("detects surround capture", () => {
    const board = createBoard();
    // Surround (1,1) with A pieces
    board[1][1] = PLAYER_B;
    // (1,1) connections: (0,1),(2,1),(1,0),(1,2),(2,0),(2,2)
    // Set all 6 neighbors to A: board[y][x]
    board[1][0] = PLAYER_A; // (0,1)
    board[1][2] = PLAYER_A; // (2,1)
    board[0][1] = PLAYER_A; // (1,0)
    board[2][1] = PLAYER_A; // (1,2)
    board[0][2] = PLAYER_A; // (2,0)
    board[2][2] = PLAYER_A; // (2,2)
    const captures = getSurroundCaptures(board, PLAYER_A);
    expect(captures.length).toBe(1);
    expect(captures[0].x).toBe(1);
    expect(captures[0].y).toBe(1);
  });

  it("does not detect surround when not all neighbors are opponent", () => {
    const board = createBoard();
    board[1][1] = PLAYER_B;
    board[0][1] = PLAYER_A;
    board[2][1] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][2] = PLAYER_A;
    // Missing (2,0) and (2,2)
    const captures = getSurroundCaptures(board, PLAYER_A);
    expect(captures.length).toBe(0);
  });

  it("corner piece needs only 2 neighbors to be surrounded", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[1][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    const captures = getSurroundCaptures(board, PLAYER_A);
    expect(captures.length).toBe(1);
  });
});

describe("checkWin", () => {
  it("returns null on empty board", () => {
    const board = createBoard();
    expect(checkWin(board, PLAYER_A)).toBeNull();
  });

  it("detects win when opponent has fewer than 3 pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_A;
    // Player A has 3, B has 0 (< 3)
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
    expect(result.reason).toBe("insufficient");
  });

  it("detects win when opponent has no valid moves", () => {
    const board = createBoard();
    // B has 3 pieces but all surrounded by A
    // B at (x=0,y=0), (x=1,y=0), (x=0,y=1) - all neighbors occupied
    board[0][0] = PLAYER_B; // (x=0, y=0)
    board[0][1] = PLAYER_B; // (x=1, y=0)
    board[1][0] = PLAYER_B; // (x=0, y=1)
    // Fill all empty neighbors of B pieces with A
    board[0][2] = PLAYER_A; // (x=2, y=0) - neighbor of (1,0)
    board[1][1] = PLAYER_A; // (x=1, y=1) - neighbor of (0,1) and (1,0)
    board[1][2] = PLAYER_A; // (x=2, y=1) - neighbor of (1,0)
    board[2][0] = PLAYER_A; // (x=0, y=2) - neighbor of (0,1)
    board[2][1] = PLAYER_A; // (x=1, y=2) - neighbor of (0,1)
    // checkWin(PLAYER_A) checks if opponent (B) has no valid moves -> A wins
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
    expect(result.reason).toBe("no_moves");
  });

  it("returns null when game is not over", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_A;
    board[0][1] = PLAYER_B;
    board[1][0] = PLAYER_B;
    board[2][1] = PLAYER_B;
    const result = checkWin(board, PLAYER_A);
    expect(result).toBeNull();
  });
});

describe("placePiece", () => {
  it("places piece on empty cell", () => {
    const board = createBoard();
    const newBoard = placePiece(board, 1, 1, PLAYER_A);
    expect(newBoard[1][1]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    const board = createBoard();
    placePiece(board, 1, 1, PLAYER_A);
    expect(board[1][1]).toBe(EMPTY);
  });
});

describe("movePiece", () => {
  it("moves piece to new location", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const newBoard = movePiece(board, 0, 0, 1, 0);
    expect(newBoard[0][0]).toBe(EMPTY);
    expect(newBoard[0][1]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    movePiece(board, 0, 0, 1, 0);
    expect(board[0][0]).toBe(PLAYER_A);
    expect(board[0][1]).toBe(EMPTY);
  });
});

describe("capturePiece", () => {
  it("removes piece from board", () => {
    const board = createBoard();
    board[1][1] = PLAYER_B;
    const newBoard = capturePiece(board, 1, 1);
    expect(newBoard[1][1]).toBe(EMPTY);
  });

  it("does not modify original board", () => {
    const board = createBoard();
    board[1][1] = PLAYER_B;
    capturePiece(board, 1, 1);
    expect(board[1][1]).toBe(PLAYER_B);
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

describe("evaluate", () => {
  it("returns 0 for empty board", () => {
    const board = createBoard();
    expect(evaluate(board, PLAYER_A)).toBe(0);
  });

  it("returns positive for material advantage", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_A;
    expect(evaluate(board, PLAYER_A)).toBeGreaterThan(0);
  });

  it("returns large negative when AI has few pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    // AI (A) has only 2 pieces < MIN_PIECES
    expect(evaluate(board, PLAYER_A)).toBe(-1000);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move in place phase", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
  });

  it("takes winning placement move", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    state.board[0][0] = PLAYER_B;
    state.board[0][1] = PLAYER_B;
    state.board[0][2] = PLAYER_B;
    state.board[1][0] = PLAYER_B;
    state.board[1][1] = PLAYER_B;
    state.board[1][2] = PLAYER_B;
    state.board[2][0] = PLAYER_B;
    state.placedB = 7;
    // B has 7 pieces, placing 8th. A has 0 (<3), so B wins
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
  });

  it("blocks opponent winning placement", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    state.board[0][0] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.board[0][2] = PLAYER_A;
    state.board[1][0] = PLAYER_A;
    state.board[1][1] = PLAYER_A;
    state.board[1][2] = PLAYER_A;
    state.board[2][0] = PLAYER_A;
    state.board[3][0] = PLAYER_B;
    state.placedA = 7;
    state.placedB = 1;
    // A has 7 pieces, placing 8th will leave B with 1 (<3)
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
  });

  it("returns a valid move in move phase", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "move";
    state.board[0][0] = PLAYER_B;
    state.board[1][1] = PLAYER_B;
    state.board[2][2] = PLAYER_B;
    state.board[3][3] = PLAYER_B;
    state.board[0][1] = PLAYER_A;
    state.board[1][0] = PLAYER_A;
    state.board[2][1] = PLAYER_A;
    state.board[1][2] = PLAYER_A;
    state.piecesA = 4;
    state.piecesB = 4;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("move");
  });

  it("returns null when no valid moves", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "move";
    // B has no pieces
    state.board[0][0] = PLAYER_A;
    state.board[1][1] = PLAYER_A;
    state.board[2][2] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.piecesA = 4;
    state.piecesB = 0;
    const move = getBestAIMove(state);
    expect(move).toBeNull();
  });
});
