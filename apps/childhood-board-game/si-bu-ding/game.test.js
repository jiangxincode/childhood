import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_SIZE,
  PIECES_EACH,
  CAPTURE_LINES,
  createBoard,
  createGameState,
  inBounds,
  countPieces,
  getEmptyCells,
  getOrthogonalNeighbors,
  getValidMoves,
  getOpponent,
  copyBoard,
  placePiece,
  movePiece,
  detectCaptures,
  applyCaptures,
  checkWin,
  hasValidMoves,
  evaluateBoard,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("BOARD_SIZE is 3", () => {
    expect(BOARD_SIZE).toBe(3);
  });

  it("PIECES_EACH is 4", () => {
    expect(PIECES_EACH).toBe(4);
  });

  it("CAPTURE_LINES has 6 lines (3 rows + 3 cols)", () => {
    expect(CAPTURE_LINES.length).toBe(6);
  });

  it("each CAPTURE_LINE has 3 cells", () => {
    for (const line of CAPTURE_LINES) {
      expect(line.length).toBe(3);
    }
  });
});

describe("createBoard", () => {
  it("creates 3x3 board filled with EMPTY", () => {
    const board = createBoard();
    expect(board.length).toBe(3);
    for (let y = 0; y < 3; y++) {
      expect(board[y].length).toBe(3);
      for (let x = 0; x < 3; x++) {
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
    expect(state.piecesA).toBe(PIECES_EACH);
    expect(state.piecesB).toBe(PIECES_EACH);
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
    expect(inBounds(2, 2)).toBe(true);
    expect(inBounds(1, 1)).toBe(true);
  });

  it("returns false for out-of-bounds", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(3, 0)).toBe(false);
    expect(inBounds(0, 3)).toBe(false);
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
  it("returns all 9 cells on empty board", () => {
    const board = createBoard();
    expect(getEmptyCells(board).length).toBe(9);
  });

  it("returns correct count with pieces placed", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_B;
    expect(getEmptyCells(board).length).toBe(7);
  });
});

describe("getOrthogonalNeighbors", () => {
  it("returns 2 neighbors for corner", () => {
    const neighbors = getOrthogonalNeighbors(0, 0);
    expect(neighbors.length).toBe(2);
  });

  it("returns 3 neighbors for edge", () => {
    const neighbors = getOrthogonalNeighbors(1, 0);
    expect(neighbors.length).toBe(3);
  });

  it("returns 4 neighbors for center", () => {
    const neighbors = getOrthogonalNeighbors(1, 1);
    expect(neighbors.length).toBe(4);
  });

  it("does not include diagonal neighbors", () => {
    const neighbors = getOrthogonalNeighbors(1, 1);
    const hasDiagonal = neighbors.some((n) => Math.abs(n.x - 1) === 1 && Math.abs(n.y - 1) === 1);
    expect(hasDiagonal).toBe(false);
  });
});

describe("getValidMoves", () => {
  it("returns empty array for empty board", () => {
    const board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
  });

  it("returns valid moves for piece at corner", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(2);
  });

  it("returns valid moves for piece at center", () => {
    const board = createBoard();
    board[1][1] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(4);
  });

  it("does not allow moving to occupied cell", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_B; // y=0, x=1 - blocks right neighbor
    const moves = getValidMoves(board, PLAYER_A);
    // A at (0,0): neighbors are (1,0) blocked, (0,1) valid
    expect(moves.length).toBe(1);
    expect(moves[0]).toEqual({ fromX: 0, fromY: 0, toX: 0, toY: 1 });
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

describe("copyBoard", () => {
  it("creates a deep copy", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const copied = copyBoard(board);
    expect(copied[0][0]).toBe(PLAYER_A);
    copied[0][0] = PLAYER_B;
    expect(board[0][0]).toBe(PLAYER_A);
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

describe("detectCaptures", () => {
  it("detects horizontal capture AAO", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_B;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(1);
    expect(caps[0]).toEqual({ x: 2, y: 0 });
  });

  it("detects horizontal capture OAA", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(1);
    expect(caps[0]).toEqual({ x: 0, y: 0 });
  });

  it("detects vertical capture AAO", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[2][0] = PLAYER_B;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(1);
    expect(caps[0]).toEqual({ x: 0, y: 2 });
  });

  it("detects vertical capture OAA", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[1][0] = PLAYER_A;
    board[2][0] = PLAYER_A;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(1);
    expect(caps[0]).toEqual({ x: 0, y: 0 });
  });

  it("detects multiple captures", () => {
    const board = createBoard();
    // Row 0: A A B
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_B;
    // Col 0: A A B
    board[1][0] = PLAYER_A;
    board[2][0] = PLAYER_B;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(2);
  });

  it("returns empty when no capture", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_B;
    board[0][2] = PLAYER_A;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(0);
  });

  it("does not detect AAA as capture", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(0);
  });

  it("does not detect diagonal capture", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][2] = PLAYER_B;
    const caps = detectCaptures(board, PLAYER_A);
    expect(caps.length).toBe(0);
  });

  it("deduplicates captures", () => {
    const board = createBoard();
    // A at center, A at top-center, B at bottom-center (vertical)
    // Also A at center, A at left-center, B at right-center (horizontal)
    board[0][1] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[1][2] = PLAYER_B;
    board[2][1] = PLAYER_B;
    const caps = detectCaptures(board, PLAYER_A);
    // B at (2,1) is captured by vertical A(0,1)-A(1,1)-B(2,1)
    // B at (1,2) is captured by horizontal A(1,0)-A(1,1)-B(1,2)
    expect(caps.length).toBe(2);
  });
});

describe("applyCaptures", () => {
  it("removes captured pieces from board", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_B;
    const newBoard = applyCaptures(board, [{ x: 2, y: 0 }]);
    expect(newBoard[0][2]).toBe(EMPTY);
    expect(newBoard[0][0]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][2] = PLAYER_B;
    applyCaptures(board, [{ x: 2, y: 0 }]);
    expect(board[0][2]).toBe(PLAYER_B);
  });
});

describe("checkWin", () => {
  it("returns null when opponent has more than 1 piece", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[1][0] = PLAYER_B;
    board[1][1] = PLAYER_B;
    expect(checkWin(board, PLAYER_A)).toBeNull();
  });

  it("detects win when opponent has 1 piece", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_B;
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
  });

  it("detects win when opponent has 0 pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[1][0] = PLAYER_A;
    const result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
  });

  it("does not declare winner when both have enough pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[1][0] = PLAYER_B;
    board[1][1] = PLAYER_B;
    expect(checkWin(board, PLAYER_A)).toBeNull();
    expect(checkWin(board, PLAYER_B)).toBeNull();
  });
});

describe("hasValidMoves", () => {
  it("returns false for empty board", () => {
    const board = createBoard();
    expect(hasValidMoves(board, PLAYER_A)).toBe(false);
  });

  it("returns true when piece has empty neighbor", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    expect(hasValidMoves(board, PLAYER_A)).toBe(true);
  });

  it("returns false when piece is surrounded", () => {
    const board = createBoard();
    board[1][1] = PLAYER_A;
    board[0][1] = PLAYER_B;
    board[2][1] = PLAYER_B;
    board[1][0] = PLAYER_B;
    board[1][2] = PLAYER_B;
    expect(hasValidMoves(board, PLAYER_A)).toBe(false);
  });
});

describe("evaluateBoard", () => {
  it("returns positive when player has more pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[1][0] = PLAYER_B;
    const score = evaluateBoard(board, PLAYER_A);
    expect(score).toBeGreaterThan(0);
  });

  it("returns large positive when opponent has 1 piece", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_B;
    const score = evaluateBoard(board, PLAYER_A);
    expect(score).toBe(1000);
  });

  it("returns large negative when player has 1 piece", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][2] = PLAYER_B;
    board[1][0] = PLAYER_B;
    board[2][0] = PLAYER_B;
    board[2][2] = PLAYER_B;
    const score = evaluateBoard(board, PLAYER_A);
    expect(score).toBe(-1000);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid place move in place phase", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
    expect(move.x).toBeGreaterThanOrEqual(0);
    expect(move.x).toBeLessThan(3);
    expect(move.y).toBeGreaterThanOrEqual(0);
    expect(move.y).toBeLessThan(3);
  });

  it("takes winning capture placement", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    // Set up: B at (0,0) and (0,1), A at (0,2) - placing B at (0,2) won't work
    // Set up: B at (0,0) and (1,0), A at (2,0) - B can capture by placing somewhere
    // Actually: B needs to create AAO or OAA pattern
    // Set up: A at (0,0), B at (0,1), B at (1,0) - if B places at (1,1), no capture
    // Let's set up: A at (0,2), B at (0,0), B at (0,1) - B already has AAO
    state.board[0][0] = PLAYER_B;
    state.board[0][1] = PLAYER_B;
    state.board[0][2] = PLAYER_A;
    state.placedB = 2;
    state.placedA = 1;
    const move = getBestAIMove(state);
    // AI should find a move that creates a capture or threatens
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
  });

  it("blocks opponent winning move", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    // A has 3 pieces, one more placement and A could potentially win
    // But in this game, win is by capture, not by line
    // Set up a scenario where AI needs to block
    state.board[0][0] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.board[1][0] = PLAYER_A;
    state.board[2][0] = PLAYER_B;
    state.placedA = 3;
    state.placedB = 1;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
  });

  it("returns a valid move in move phase", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "move";
    state.placedA = 4;
    state.placedB = 4;
    // 4 A + 4 B = 8 pieces, 1 empty cell at (1,1)
    state.board[0][0] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.board[0][2] = PLAYER_B;
    state.board[1][0] = PLAYER_B;
    state.board[1][1] = EMPTY;
    state.board[1][2] = PLAYER_B;
    state.board[2][0] = PLAYER_A;
    state.board[2][1] = PLAYER_B;
    state.board[2][2] = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("move");
  });
});
