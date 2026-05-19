import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_SIZE,
  PIECES_EACH,
  MIN_PIECES_TO_WIN,
  SQUARES,
  LINES,
  FORMATIONS,
  createBoard,
  createGameState,
  inBounds,
  countPieces,
  getEmptyCells,
  getAdjacentCells,
  getValidMoves,
  checkCapture,
  getFormations,
  checkWin,
  placePiece,
  movePiece,
  removePiece,
  getOpponent,
  evaluateBoard,
  getAvailableMoves,
  applyMoveToBoard,
  minimax,
  getBestAIMove,
  getBestCapture,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different strings", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("BOARD_SIZE is 4", () => {
    expect(BOARD_SIZE).toBe(4);
  });

  it("PIECES_EACH is 8", () => {
    expect(PIECES_EACH).toBe(8);
  });

  it("MIN_PIECES_TO_WIN is 3", () => {
    expect(MIN_PIECES_TO_WIN).toBe(3);
  });

  it("SQUARES has 9 entries (3x3 possible 2x2 squares)", () => {
    expect(SQUARES.length).toBe(9);
  });

  it("LINES has 8 entries (4 rows + 4 columns)", () => {
    expect(LINES.length).toBe(8);
  });

  it("FORMATIONS combines SQUARES and LINES (17 total)", () => {
    expect(FORMATIONS.length).toBe(SQUARES.length + LINES.length);
    expect(FORMATIONS.length).toBe(17);
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

  it("returns independent rows", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    expect(board[1][0]).toBe(EMPTY);
  });
});

describe("createGameState", () => {
  it("creates initial state with correct defaults for pvp", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(PLAYER_A);
    expect(state.phase).toBe("place");
    expect(state.placedA).toBe(0);
    expect(state.placedB).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.capturing).toBe(false);
  });

  it("creates initial state for pve", () => {
    const state = createGameState("pve");
    expect(state.mode).toBe("pve");
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
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
  it("counts zero on empty board", () => {
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
  it("returns 2 neighbors for corner (orthogonal only)", () => {
    const adj = getAdjacentCells(0, 0);
    expect(adj.length).toBe(2);
  });

  it("returns 3 neighbors for edge cell", () => {
    const adj = getAdjacentCells(1, 0);
    expect(adj.length).toBe(3);
  });

  it("returns 4 neighbors for center cell", () => {
    const adj = getAdjacentCells(1, 1);
    expect(adj.length).toBe(4);
  });

  it("returns correct neighbor positions for corner", () => {
    const adj = getAdjacentCells(0, 0);
    const positions = adj.map((c) => c.x + "," + c.y).sort();
    expect(positions).toEqual(["0,1", "1,0"]);
  });
});

describe("getValidMoves", () => {
  it("returns empty array for empty board", () => {
    const board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
  });

  it("returns valid moves for a corner piece", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(2);
  });

  it("returns valid moves for a center piece", () => {
    const board = createBoard();
    board[1][1] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(4);
  });

  it("does not include moves to occupied cells", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_B;
    board[1][0] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    // Corner piece at (0,0): neighbors are (0,1) occupied, (1,0) occupied => 0 moves
    const fromOrigin = moves.filter((m) => m.fromX === 0 && m.fromY === 0);
    expect(fromOrigin.length).toBe(0);
  });
});

describe("checkCapture", () => {
  it("returns false on empty board", () => {
    const board = createBoard();
    expect(checkCapture(board, 0, 0, PLAYER_A)).toBe(false);
  });

  it("detects 2x2 square formation", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    expect(checkCapture(board, 0, 0, PLAYER_A)).toBe(true);
    expect(checkCapture(board, 1, 1, PLAYER_A)).toBe(true);
  });

  it("detects horizontal line of 4", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    board[0][2] = PLAYER_B;
    board[0][3] = PLAYER_B;
    expect(checkCapture(board, 0, 0, PLAYER_B)).toBe(true);
    expect(checkCapture(board, 2, 0, PLAYER_B)).toBe(true);
  });

  it("detects vertical line of 4", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[2][0] = PLAYER_A;
    board[3][0] = PLAYER_A;
    expect(checkCapture(board, 0, 0, PLAYER_A)).toBe(true);
    expect(checkCapture(board, 0, 2, PLAYER_A)).toBe(true);
  });

  it("returns false when position is not part of formation", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][3] = PLAYER_A;
    // Position (2,2) is not part of the row-0 line
    expect(checkCapture(board, 2, 2, PLAYER_A)).toBe(false);
  });

  it("returns false when formation has mixed players", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][3] = PLAYER_B;
    expect(checkCapture(board, 0, 0, PLAYER_A)).toBe(false);
  });
});

describe("getFormations", () => {
  it("returns empty array on empty board", () => {
    const board = createBoard();
    expect(getFormations(board, PLAYER_A).length).toBe(0);
  });

  it("finds a 2x2 square", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    const f = getFormations(board, PLAYER_A);
    expect(f.length).toBe(1);
  });

  it("finds a horizontal line", () => {
    const board = createBoard();
    board[2][0] = PLAYER_B;
    board[2][1] = PLAYER_B;
    board[2][2] = PLAYER_B;
    board[2][3] = PLAYER_B;
    const f = getFormations(board, PLAYER_B);
    expect(f.length).toBe(1);
  });

  it("finds multiple formations", () => {
    const board = createBoard();
    // Row 0: all A (line)
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][3] = PLAYER_A;
    // Col 0: all A (line)
    board[1][0] = PLAYER_A;
    board[2][0] = PLAYER_A;
    board[3][0] = PLAYER_A;
    const f = getFormations(board, PLAYER_A);
    // Should find row-0 line, col-0 line, and square at (0,0)-(1,1)
    expect(f.length).toBeGreaterThanOrEqual(2);
  });
});

describe("checkWin", () => {
  it("returns null when opponent has enough pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[1][0] = PLAYER_B;
    board[1][1] = PLAYER_B;
    board[1][2] = PLAYER_B;
    expect(checkWin(board, PLAYER_A, 3, 3)).toBeNull();
  });

  it("returns winner when opponent has fewer than 3 pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][3] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[2][0] = PLAYER_B;
    // B has only 1 piece, but B has placed 3 pieces
    const result = checkWin(board, PLAYER_A, 6, 3);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
  });

  it("detects B wins when A has fewer than 3 pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    board[1][0] = PLAYER_B;
    board[2][0] = PLAYER_B;
    board[3][0] = PLAYER_B;
    board[0][2] = PLAYER_A;
    // A has only 1 piece, but A has placed 3 pieces
    const result = checkWin(board, PLAYER_B, 3, 5);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_B);
  });

  it("returns null during placement when opponent has not placed enough pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    // B has 0 pieces and has placed 0 pieces
    const result = checkWin(board, PLAYER_A, 3, 0);
    expect(result).toBeNull();
  });
});

describe("placePiece", () => {
  it("places piece on empty cell", () => {
    const board = createBoard();
    const newBoard = placePiece(board, 1, 1, PLAYER_A);
    expect(newBoard[1][1]).toBe(PLAYER_A);
  });

  it("does not modify original board (immutability)", () => {
    const board = createBoard();
    placePiece(board, 1, 1, PLAYER_A);
    expect(board[1][1]).toBe(EMPTY);
  });

  it("preserves other cells", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    const newBoard = placePiece(board, 2, 2, PLAYER_A);
    expect(newBoard[0][0]).toBe(PLAYER_B);
    expect(newBoard[2][2]).toBe(PLAYER_A);
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

  it("does not modify original board (immutability)", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    movePiece(board, 0, 0, 1, 0);
    expect(board[0][0]).toBe(PLAYER_A);
    expect(board[0][1]).toBe(EMPTY);
  });
});

describe("removePiece", () => {
  it("removes piece from board", () => {
    const board = createBoard();
    board[1][1] = PLAYER_B;
    const newBoard = removePiece(board, 1, 1);
    expect(newBoard[1][1]).toBe(EMPTY);
  });

  it("does not modify original board (immutability)", () => {
    const board = createBoard();
    board[1][1] = PLAYER_B;
    removePiece(board, 1, 1);
    expect(board[1][1]).toBe(PLAYER_B);
  });

  it("only removes the specified cell", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[1][1] = PLAYER_B;
    const newBoard = removePiece(board, 0, 0);
    expect(newBoard[0][0]).toBe(EMPTY);
    expect(newBoard[1][1]).toBe(PLAYER_B);
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

describe("evaluateBoard", () => {
  it("returns 0 for empty board", () => {
    const board = createBoard();
    expect(evaluateBoard(board, PLAYER_A)).toBe(0);
  });

  it("returns positive score when player has more pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    expect(evaluateBoard(board, PLAYER_A)).toBeGreaterThan(0);
  });

  it("returns negative score when opponent has more pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    board[0][2] = PLAYER_B;
    expect(evaluateBoard(board, PLAYER_A)).toBeLessThan(0);
  });

  it("gives bonus for formations", () => {
    const board1 = createBoard();
    board1[0][0] = PLAYER_A;
    board1[0][1] = PLAYER_A;
    board1[0][2] = PLAYER_A;
    board1[0][3] = PLAYER_A;
    const score1 = evaluateBoard(board1, PLAYER_A);

    const board2 = createBoard();
    board2[0][0] = PLAYER_A;
    board2[0][1] = PLAYER_A;
    board2[1][0] = PLAYER_A;
    board2[2][0] = PLAYER_A;
    const score2 = evaluateBoard(board2, PLAYER_A);

    // Both have 4 pieces, but board1 has a formation (line) => higher score
    expect(score1).toBeGreaterThan(score2);
  });
});

describe("getAvailableMoves", () => {
  it("returns placement moves on empty board", () => {
    const board = createBoard();
    const moves = getAvailableMoves(board, PLAYER_A);
    expect(moves.length).toBe(16);
    expect(moves[0].type).toBe("place");
  });

  it("returns movement moves when player has enough pieces", () => {
    const board = createBoard();
    // Place 8 pieces for A
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[0][3] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[1][1] = PLAYER_A;
    board[1][2] = PLAYER_A;
    board[1][3] = PLAYER_A;
    const moves = getAvailableMoves(board, PLAYER_A);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].type).toBe("move");
  });

  it("returns placement moves when player has fewer than 8 pieces", () => {
    const board = createBoard();
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    const moves = getAvailableMoves(board, PLAYER_A);
    expect(moves.length).toBe(14);
    expect(moves[0].type).toBe("place");
  });
});

describe("applyMoveToBoard", () => {
  it("applies placement move", () => {
    const board = createBoard();
    const move = { type: "place", x: 2, y: 3 };
    const newBoard = applyMoveToBoard(board, move, PLAYER_A);
    expect(newBoard[3][2]).toBe(PLAYER_A);
  });

  it("applies movement move", () => {
    const board = createBoard();
    board[0][0] = PLAYER_B;
    const move = { type: "move", fromX: 0, fromY: 0, toX: 1, toY: 0 };
    const newBoard = applyMoveToBoard(board, move, PLAYER_B);
    expect(newBoard[0][0]).toBe(EMPTY);
    expect(newBoard[0][1]).toBe(PLAYER_B);
  });
});

describe("minimax", () => {
  it("returns a numeric score", () => {
    const board = createBoard();
    const score = minimax(board, 1, true, PLAYER_A, -Infinity, Infinity);
    expect(typeof score).toBe("number");
  });

  it("returns high score for winning position", () => {
    const board = createBoard();
    // B has only 2 pieces -> A wins
    board[0][0] = PLAYER_A;
    board[0][1] = PLAYER_A;
    board[0][2] = PLAYER_A;
    board[1][0] = PLAYER_A;
    board[2][0] = PLAYER_B;
    board[3][0] = PLAYER_B;
    const score = minimax(board, 1, true, PLAYER_A, -Infinity, Infinity);
    expect(score).toBe(1000);
  });

  it("returns low score for losing position", () => {
    const board = createBoard();
    // A has only 2 pieces -> B wins
    board[0][0] = PLAYER_B;
    board[0][1] = PLAYER_B;
    board[0][2] = PLAYER_B;
    board[1][0] = PLAYER_B;
    board[2][0] = PLAYER_A;
    board[3][0] = PLAYER_A;
    const score = minimax(board, 1, true, PLAYER_A, -Infinity, Infinity);
    expect(score).toBe(-1000);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move in placement phase", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
    expect(move.x).toBeGreaterThanOrEqual(0);
    expect(move.x).toBeLessThan(4);
    expect(move.y).toBeGreaterThanOrEqual(0);
    expect(move.y).toBeLessThan(4);
  });

  it("takes winning capture opportunity", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_A;
    state.phase = "place";
    state.placedA = 3;
    // Set up: A has 3 in a row, placing 4th completes line
    state.board[0][0] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.board[0][2] = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move.x).toBe(3);
    expect(move.y).toBe(0);
  });

  it("blocks opponent capture opportunity", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    state.placedA = 3;
    // A is about to complete a line
    state.board[0][0] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.board[0][2] = PLAYER_A;
    const move = getBestAIMove(state);
    expect(move.x).toBe(3);
    expect(move.y).toBe(0);
  });

  it("returns a valid move in movement phase", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_A;
    state.phase = "move";
    // 8 A pieces, 6 B pieces, 2 empty -- A has movable pieces
    // Row 0: A A A A   Row 1: A _ A A   Row 2: B A B B   Row 3: B B B B
    state.board[0][0] = PLAYER_A;
    state.board[0][1] = PLAYER_A;
    state.board[0][2] = PLAYER_A;
    state.board[0][3] = PLAYER_A;
    state.board[1][0] = PLAYER_A;
    state.board[1][1] = EMPTY;
    state.board[1][2] = PLAYER_A;
    state.board[1][3] = PLAYER_A;
    state.board[2][0] = PLAYER_B;
    state.board[2][1] = PLAYER_A;
    state.board[2][2] = PLAYER_B;
    state.board[2][3] = PLAYER_B;
    state.board[3][0] = PLAYER_B;
    state.board[3][1] = PLAYER_B;
    state.board[3][2] = PLAYER_B;
    state.board[3][3] = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("move");
  });

  it("returns capture move when in capturing state", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_A;
    state.capturing = true;
    state.board[0][0] = PLAYER_B;
    state.board[0][1] = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("capture");
  });
});

describe("getBestCapture", () => {
  it("prefers capturing piece from opponent formation", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_A;
    state.capturing = true;
    // B has a line at row 0
    state.board[0][0] = PLAYER_B;
    state.board[0][1] = PLAYER_B;
    state.board[0][2] = PLAYER_B;
    state.board[0][3] = PLAYER_B;
    // B also has an isolated piece
    state.board[3][3] = PLAYER_B;
    const move = getBestCapture(state);
    expect(move.type).toBe("capture");
    // Should capture from the formation (row 0)
    expect(move.y).toBe(0);
  });

  it("captures any opponent piece when no formation exists", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_A;
    state.capturing = true;
    state.board[2][2] = PLAYER_B;
    const move = getBestCapture(state);
    expect(move.type).toBe("capture");
    expect(move.x).toBe(2);
    expect(move.y).toBe(2);
  });
});

describe("SQUARES structure", () => {
  it("each square has 4 cells", () => {
    for (let i = 0; i < SQUARES.length; i++) {
      expect(SQUARES[i].length).toBe(4);
    }
  });

  it("all square cells are in bounds", () => {
    for (let i = 0; i < SQUARES.length; i++) {
      for (let j = 0; j < SQUARES[i].length; j++) {
        expect(inBounds(SQUARES[i][j].x, SQUARES[i][j].y)).toBe(true);
      }
    }
  });
});

describe("LINES structure", () => {
  it("each line has 4 cells", () => {
    for (let i = 0; i < LINES.length; i++) {
      expect(LINES[i].length).toBe(4);
    }
  });

  it("4 horizontal lines (rows)", () => {
    const horizontal = LINES.filter(
      (line) => line[0].y === line[1].y && line[1].y === line[2].y && line[2].y === line[3].y
    );
    expect(horizontal.length).toBe(4);
  });

  it("4 vertical lines (columns)", () => {
    const vertical = LINES.filter(
      (line) => line[0].x === line[1].x && line[1].x === line[2].x && line[2].x === line[3].x
    );
    expect(vertical.length).toBe(4);
  });
});
