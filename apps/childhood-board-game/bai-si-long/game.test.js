import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_SIZE,
  PIECES_EACH,
  WIN_LINES,
  createBoard,
  createGameState,
  inBounds,
  countPieces,
  getEmptyCells,
  getAdjacentCells,
  getValidMoves,
  checkWin,
  placePiece,
  movePiece,
  getOpponent,
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

  it("WIN_LINES has 10 lines (4 rows + 4 cols + 2 diagonals)", () => {
    expect(WIN_LINES.length).toBe(10);
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

describe("getAdjacentCells", () => {
  it("returns 3 neighbors for corner", () => {
    expect(getAdjacentCells(0, 0).length).toBe(3);
  });

  it("returns 5 neighbors for edge", () => {
    expect(getAdjacentCells(1, 0).length).toBe(5);
  });

  it("returns 8 neighbors for center", () => {
    expect(getAdjacentCells(1, 1).length).toBe(8);
  });
});

describe("getValidMoves", () => {
  it("returns empty array for empty board", () => {
    const board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
  });

  it("returns valid moves for placed piece", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(3);
  });
});

describe("checkWin", () => {
  it("returns null on empty board", () => {
    const board = createBoard();
    expect(checkWin(board, PLAYER_A)).toBeNull();
  });

  it("detects horizontal win", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][3] = PLAYER_A;
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
  });

  it("detects vertical win", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[1][0] = PLAYER_B;
    board[2][0] = PLAYER_B;
    board[3][0] = PLAYER_B;
    const result = checkWin(board, PLAYER_B);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_B);
  });

  it("detects diagonal win", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_A;
    board[3][3] = PLAYER_A;
    expect(checkWin(board, PLAYER_A)).not.toBeNull();
  });

  it("detects anti-diagonal win", () => {
    const board = createBoard();
    board[0][3] = PLAYER_A;
    board[1][2] = PLAYER_A;
    board[2][1] = PLAYER_A;
    board[3][0] = PLAYER_A;
    expect(checkWin(board, PLAYER_A)).not.toBeNull();
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
    const newBoard = movePiece(board, 0, 0, 1, 1);
    expect(newBoard[0][0]).toBe(EMPTY);
    expect(newBoard[1][1]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    movePiece(board, 0, 0, 1, 1);
    expect(board[0][0]).toBe(PLAYER_A);
    expect(board[1][1]).toBe(EMPTY);
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
  it("returns a valid move", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
  });

  it("takes winning move", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    state.board[0][0] = PLAYER_B;
    state.board[0][1] = PLAYER_B;
    state.board[0][2] = PLAYER_B;
    state.placedB = 3;
    const move = getBestAIMove(state);
    expect(move.x).toBe(3);
    expect(move.y).toBe(0);
  });

  it("blocks opponent winning move", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    state.board[0][0] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.board[0][2] = PLAYER_A;
    state.placedA = 3;
    const move = getBestAIMove(state);
    expect(move.x).toBe(3);
    expect(move.y).toBe(0);
  });
});
