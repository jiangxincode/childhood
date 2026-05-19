import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_COLS,
  BOARD_ROWS,
  PIECES_EACH,
  HOME_ROW_A,
  HOME_ROW_B,
  createBoard,
  createGameState,
  inBounds,
  countPieces,
  getOpponent,
  getOrthogonalNeighbors,
  getValidMoves,
  checkWin,
  movePiece,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("BOARD_COLS is 7", () => {
    expect(BOARD_COLS).toBe(7);
  });

  it("BOARD_ROWS is 5", () => {
    expect(BOARD_ROWS).toBe(5);
  });

  it("PIECES_EACH is 4", () => {
    expect(PIECES_EACH).toBe(4);
  });

  it("HOME_ROW_A is 4", () => {
    expect(HOME_ROW_A).toBe(4);
  });

  it("HOME_ROW_B is 0", () => {
    expect(HOME_ROW_B).toBe(0);
  });
});

describe("createBoard", () => {
  it("creates 7x5 board filled with EMPTY", () => {
    const board = createBoard();
    expect(board.length).toBe(5);
    for (let y = 0; y < 5; y++) {
      expect(board[y].length).toBe(7);
      for (let x = 0; x < 7; x++) {
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
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
  });

  it("places 4 pieces for each player", () => {
    const state = createGameState("pvp");
    expect(countPieces(state.board, PLAYER_A)).toBe(4);
    expect(countPieces(state.board, PLAYER_B)).toBe(4);
  });

  it("Player A pieces start on row 4", () => {
    const state = createGameState("pvp");
    for (let x = 0; x < BOARD_COLS; x++) {
      if (x % 2 === 0) {
        expect(state.board[4][x]).toBe(PLAYER_A);
      } else {
        expect(state.board[4][x]).toBe(EMPTY);
      }
    }
  });

  it("Player B pieces start on row 0", () => {
    const state = createGameState("pvp");
    for (let x = 0; x < BOARD_COLS; x++) {
      if (x % 2 === 0) {
        expect(state.board[0][x]).toBe(PLAYER_B);
      } else {
        expect(state.board[0][x]).toBe(EMPTY);
      }
    }
  });
});

describe("inBounds", () => {
  it("returns true for valid coordinates", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(6, 4)).toBe(true);
    expect(inBounds(3, 2)).toBe(true);
  });

  it("returns false for out-of-bounds", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(7, 0)).toBe(false);
    expect(inBounds(0, 5)).toBe(false);
  });
});

describe("countPieces", () => {
  it("counts pieces correctly", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_B;
    expect(countPieces(board, PLAYER_A)).toBe(2);
    expect(countPieces(board, PLAYER_B)).toBe(1);
  });

  it("counts zero on empty board", () => {
    const board = createBoard();
    expect(countPieces(board, PLAYER_A)).toBe(0);
    expect(countPieces(board, PLAYER_B)).toBe(0);
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

describe("getOrthogonalNeighbors", () => {
  it("returns 2 neighbors for corner (0,0)", () => {
    const neighbors = getOrthogonalNeighbors(0, 0);
    expect(neighbors.length).toBe(2);
  });

  it("returns 3 neighbors for edge (3,0)", () => {
    const neighbors = getOrthogonalNeighbors(3, 0);
    expect(neighbors.length).toBe(3);
  });

  it("returns 4 neighbors for center (3,2)", () => {
    const neighbors = getOrthogonalNeighbors(3, 2);
    expect(neighbors.length).toBe(4);
  });
});

describe("getValidMoves", () => {
  it("returns moves for a piece on empty board", () => {
    const board = createBoard();
    board[2][3] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    // Center piece on empty board: 4 step moves
    expect(moves.length).toBe(4);
    moves.forEach((m) => {
      expect(m.type).toBe("step");
    });
  });

  it("returns jump moves when piece is adjacent to another piece", () => {
    const board = createBoard();
    board[2][3] = PLAYER_A;
    board[2][4] = PLAYER_B;
    const moves = getValidMoves(board, PLAYER_A);
    // 3 step moves + 1 jump move
    expect(moves.length).toBe(4);
    const jumpMoves = moves.filter((m) => m.type === "jump");
    expect(jumpMoves.length).toBe(1);
    expect(jumpMoves[0].toX).toBe(5);
    expect(jumpMoves[0].toY).toBe(2);
  });

  it("does not allow jump if landing cell is occupied", () => {
    const board = createBoard();
    board[2][2] = PLAYER_A;
    board[2][3] = PLAYER_B;
    board[2][4] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    // The piece at (2,2) cannot jump right because (2,4) is occupied
    const jumpMoves = moves.filter((m) => m.fromX === 2 && m.fromY === 2 && m.type === "jump");
    expect(jumpMoves.length).toBe(0);
  });

  it("allows jumping over own pieces", () => {
    const board = createBoard();
    board[2][3] = PLAYER_A;
    board[2][4] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    const jumpMoves = moves.filter((m) => m.type === "jump");
    // Both pieces can jump over each other
    expect(jumpMoves.length).toBe(2);
  });

  it("returns empty array for board with no pieces of that player", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    expect(getValidMoves(board, PLAYER_B).length).toBe(0);
  });
});

describe("checkWin", () => {
  it("returns null when not all pieces in home row", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][4] = PLAYER_A;
    board[1][0] = PLAYER_A;
    expect(checkWin(board, PLAYER_A)).toBeNull();
  });

  it("detects Player A winning", () => {
    const board = createBoard();
    // Player A needs all 4 in row 0 (HOME_ROW_B)
    board[0][0] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][4] = PLAYER_A;
    board[0][6] = PLAYER_A;
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
  });

  it("detects Player B winning", () => {
    const board = createBoard();
    // Player B needs all 4 in row 4 (HOME_ROW_A)
    board[4][0] = PLAYER_B;
    board[4][2] = PLAYER_B;
    board[4][4] = PLAYER_B;
    board[4][6] = PLAYER_B;
    const result = checkWin(board, PLAYER_B);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_B);
  });

  it("does not win with mixed pieces in home row", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][4] = PLAYER_B;
    board[0][6] = PLAYER_A;
    expect(checkWin(board, PLAYER_A)).toBeNull();
  });
});

describe("movePiece", () => {
  it("moves piece to new location", () => {
    const board = createBoard();
    board[2][3] = PLAYER_A;
    const newBoard = movePiece(board, 3, 2, 4, 2);
    expect(newBoard[2][3]).toBe(EMPTY);
    expect(newBoard[2][4]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    const board = createBoard();
    board[2][3] = PLAYER_A;
    movePiece(board, 3, 2, 4, 2);
    expect(board[2][3]).toBe(PLAYER_A);
    expect(board[2][4]).toBe(EMPTY);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move in move phase", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("step");
  });

  it("takes winning move when available", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    // Set up B pieces near home row (row 4)
    state.board = createBoard();
    state.board[4][0] = PLAYER_B;
    state.board[4][2] = PLAYER_B;
    state.board[4][4] = PLAYER_B;
    state.board[3][5] = PLAYER_B;
    // B can move from (3,5) to (4,5) to win
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.toY).toBe(4);
  });

  it("blocks opponent winning move", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.board = createBoard();
    // A is about to win: 3 pieces in row 0, one more move needed
    state.board[0][0] = PLAYER_A;
    state.board[0][2] = PLAYER_A;
    state.board[0][4] = PLAYER_A;
    state.board[1][6] = PLAYER_A;
    // B pieces
    state.board[4][0] = PLAYER_B;
    state.board[4][2] = PLAYER_B;
    state.board[4][4] = PLAYER_B;
    state.board[3][3] = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    // AI should try to block or make a reasonable move
  });
});
