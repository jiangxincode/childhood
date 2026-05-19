import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  BOARD_POSITIONS,
  PIECES_EACH,
  CONNECTIONS,
  WIN_LINES,
  createBoard,
  createGameState,
  getNeighbors,
  countPieces,
  getEmptyPositions,
  getValidMoves,
  getWinningLines,
  checkWin,
  capturePiece,
  placePiece,
  movePiece,
  getOpponent,
  evaluateBoard,
  minimax,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("BOARD_POSITIONS is 12", () => {
    expect(BOARD_POSITIONS).toBe(12);
  });

  it("PIECES_EACH is 6", () => {
    expect(PIECES_EACH).toBe(6);
  });

  it("WIN_LINES has 24 lines", () => {
    expect(WIN_LINES.length).toBe(24);
  });

  it("each WIN_LINE has exactly 3 positions", () => {
    WIN_LINES.forEach((line) => {
      expect(line.length).toBe(3);
    });
  });

  it("all WIN_LINE positions are within bounds", () => {
    WIN_LINES.forEach((line) => {
      line.forEach((pos) => {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(BOARD_POSITIONS);
      });
    });
  });

  it("CONNECTIONS has entries for all 12 positions", () => {
    expect(Object.keys(CONNECTIONS).length).toBe(BOARD_POSITIONS);
  });

  it("each position has at least 2 neighbors", () => {
    for (var i = 0; i < BOARD_POSITIONS; i++) {
      expect(CONNECTIONS[i].length).toBeGreaterThanOrEqual(2);
    }
  });

  it("connections are bidirectional", () => {
    for (var i = 0; i < BOARD_POSITIONS; i++) {
      var neighbors = CONNECTIONS[i];
      for (var j = 0; j < neighbors.length; j++) {
        expect(CONNECTIONS[neighbors[j]]).toContain(i);
      }
    }
  });
});

describe("createBoard", () => {
  it("creates array of 12 EMPTY positions", () => {
    var board = createBoard();
    expect(board.length).toBe(BOARD_POSITIONS);
    for (var i = 0; i < BOARD_POSITIONS; i++) {
      expect(board[i]).toBe(EMPTY);
    }
  });
});

describe("createGameState", () => {
  it("creates initial state with correct defaults", () => {
    var state = createGameState("pvp");
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

  it("creates board with all empty positions", () => {
    var state = createGameState("pve");
    for (var i = 0; i < BOARD_POSITIONS; i++) {
      expect(state.board[i]).toBe(EMPTY);
    }
  });
});

describe("getNeighbors", () => {
  it("returns correct neighbors for position 0 (outer top-left)", () => {
    var neighbors = getNeighbors(0);
    expect(neighbors).toContain(1);
    expect(neighbors).toContain(3);
    expect(neighbors).toContain(4);
    expect(neighbors.length).toBe(3);
  });

  it("returns correct neighbors for position 4 (middle top-left)", () => {
    var neighbors = getNeighbors(4);
    expect(neighbors).toContain(0);
    expect(neighbors).toContain(5);
    expect(neighbors).toContain(7);
    expect(neighbors).toContain(8);
    expect(neighbors.length).toBe(4);
  });

  it("returns correct neighbors for position 8 (inner top-left)", () => {
    var neighbors = getNeighbors(8);
    expect(neighbors).toContain(4);
    expect(neighbors).toContain(9);
    expect(neighbors).toContain(11);
    expect(neighbors.length).toBe(3);
  });

  it("returns empty array for invalid position", () => {
    expect(getNeighbors(99)).toEqual([]);
  });
});

describe("countPieces", () => {
  it("counts 0 pieces on empty board", () => {
    var board = createBoard();
    expect(countPieces(board, PLAYER_A)).toBe(0);
    expect(countPieces(board, PLAYER_B)).toBe(0);
  });

  it("counts pieces correctly", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[4] = PLAYER_B;
    expect(countPieces(board, PLAYER_A)).toBe(2);
    expect(countPieces(board, PLAYER_B)).toBe(1);
  });
});

describe("getEmptyPositions", () => {
  it("returns all 12 positions on empty board", () => {
    var board = createBoard();
    expect(getEmptyPositions(board).length).toBe(BOARD_POSITIONS);
  });

  it("returns correct count with pieces placed", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[5] = PLAYER_B;
    expect(getEmptyPositions(board).length).toBe(10);
  });

  it("returns empty array on full board", () => {
    var board = [];
    for (var i = 0; i < BOARD_POSITIONS; i++) {
      board.push(PLAYER_A);
    }
    expect(getEmptyPositions(board).length).toBe(0);
  });
});

describe("getValidMoves", () => {
  it("returns empty array for empty board", () => {
    var board = createBoard();
    expect(getValidMoves(board, PLAYER_A).length).toBe(0);
  });

  it("returns valid moves for piece at position 0", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    var moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(3);
    var targets = moves.map((m) => m.to);
    expect(targets).toContain(1);
    expect(targets).toContain(3);
    expect(targets).toContain(4);
  });

  it("does not include occupied positions as targets", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_B;
    board[3] = PLAYER_B;
    board[4] = PLAYER_B;
    // Position 0 neighbors: 1(B), 3(B), 4(B) - all occupied
    var moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBe(0);
  });

  it("returns moves from multiple pieces", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[9] = PLAYER_A;
    var moves = getValidMoves(board, PLAYER_A);
    expect(moves.length).toBeGreaterThan(3);
  });
});

describe("getWinningLines", () => {
  it("returns empty array on empty board", () => {
    var board = createBoard();
    expect(getWinningLines(board, PLAYER_A).length).toBe(0);
  });

  it("detects outer square line 0-1-2", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    var lines = getWinningLines(board, PLAYER_A);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("detects middle square line 4-5-6", () => {
    var board = createBoard();
    board[4] = PLAYER_B;
    board[5] = PLAYER_B;
    board[6] = PLAYER_B;
    var lines = getWinningLines(board, PLAYER_B);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("detects inner square line 8-9-10", () => {
    var board = createBoard();
    board[8] = PLAYER_A;
    board[9] = PLAYER_A;
    board[10] = PLAYER_A;
    var lines = getWinningLines(board, PLAYER_A);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("detects radial line 0-4-8", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[4] = PLAYER_A;
    board[8] = PLAYER_A;
    var lines = getWinningLines(board, PLAYER_A);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("detects radial line 1-5-9", () => {
    var board = createBoard();
    board[1] = PLAYER_B;
    board[5] = PLAYER_B;
    board[9] = PLAYER_B;
    var lines = getWinningLines(board, PLAYER_B);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("does not detect line with mixed players", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[2] = PLAYER_B;
    expect(getWinningLines(board, PLAYER_A).length).toBe(0);
  });

  it("detects multiple winning lines simultaneously", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    board[4] = PLAYER_A;
    var lines = getWinningLines(board, PLAYER_A);
    // Line 0-1-2 and possibly others
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});

describe("checkWin", () => {
  it("returns null when both players have >= 3 pieces", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    board[4] = PLAYER_B;
    board[5] = PLAYER_B;
    board[6] = PLAYER_B;
    expect(checkWin(board, PLAYER_A)).toBeNull();
    expect(checkWin(board, PLAYER_B)).toBeNull();
  });

  it("returns win when opponent has < 3 pieces", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    board[3] = PLAYER_A;
    board[4] = PLAYER_A;
    board[5] = PLAYER_A;
    board[8] = PLAYER_B;
    // B has 1 piece < 3
    var result = checkWin(board, PLAYER_A);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_A);
  });

  it("returns win for B when A has < 3 pieces", () => {
    var board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_B;
    board[2] = PLAYER_B;
    board[3] = PLAYER_B;
    board[4] = PLAYER_B;
    board[5] = PLAYER_B;
    board[8] = PLAYER_A;
    // A has 1 piece < 3
    var result = checkWin(board, PLAYER_B);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(PLAYER_B);
  });
});

describe("capturePiece", () => {
  it("removes piece at specified position", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_B;
    var newBoard = capturePiece(board, 1);
    expect(newBoard[0]).toBe(PLAYER_A);
    expect(newBoard[1]).toBe(EMPTY);
  });

  it("does not modify original board", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_B;
    capturePiece(board, 1);
    expect(board[1]).toBe(PLAYER_B);
  });
});

describe("placePiece", () => {
  it("places piece at specified position", () => {
    var board = createBoard();
    var newBoard = placePiece(board, 5, PLAYER_A);
    expect(newBoard[5]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    var board = createBoard();
    placePiece(board, 5, PLAYER_A);
    expect(board[5]).toBe(EMPTY);
  });

  it("overwrites existing piece", () => {
    var board = createBoard();
    board[5] = PLAYER_A;
    var newBoard = placePiece(board, 5, PLAYER_B);
    expect(newBoard[5]).toBe(PLAYER_B);
  });
});

describe("movePiece", () => {
  it("moves piece from one position to another", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    var newBoard = movePiece(board, 0, 1);
    expect(newBoard[0]).toBe(EMPTY);
    expect(newBoard[1]).toBe(PLAYER_A);
  });

  it("does not modify original board", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    movePiece(board, 0, 1);
    expect(board[0]).toBe(PLAYER_A);
    expect(board[1]).toBe(EMPTY);
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
  it("returns 0 for balanced empty board", () => {
    var board = createBoard();
    expect(evaluateBoard(board, PLAYER_A)).toBe(0);
  });

  it("gives bonus for material advantage", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[4] = PLAYER_B;
    var score = evaluateBoard(board, PLAYER_A);
    expect(score).toBeGreaterThan(0);
  });

  it("gives penalty for material disadvantage", () => {
    var board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_B;
    board[4] = PLAYER_A;
    var score = evaluateBoard(board, PLAYER_A);
    expect(score).toBeLessThan(0);
  });

  it("gives bonus for formation potential", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    // Position 2 is empty, forming potential line 0-1-2
    var scoreWithFormation = evaluateBoard(board, PLAYER_A);
    var board2 = createBoard();
    board2[0] = PLAYER_A;
    board2[5] = PLAYER_A;
    // No adjacent formation potential
    var scoreWithout = evaluateBoard(board2, PLAYER_A);
    expect(scoreWithFormation).toBeGreaterThan(scoreWithout);
  });

  it("gives bonus for center control", () => {
    var board = createBoard();
    board[4] = PLAYER_A;
    board[5] = PLAYER_A;
    var score = evaluateBoard(board, PLAYER_A);
    expect(score).toBeGreaterThan(0);
  });

  it("penalizes opponent formation potential", () => {
    var board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_B;
    // B has 2 in a row on line 0-1-2, threatening
    var score = evaluateBoard(board, PLAYER_A);
    var board2 = createBoard();
    board2[0] = PLAYER_B;
    board2[5] = PLAYER_B;
    // B pieces not adjacent, no threat
    var score2 = evaluateBoard(board2, PLAYER_A);
    expect(score).toBeLessThan(score2);
  });
});

describe("minimax", () => {
  it("returns evaluation at depth 0", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[4] = PLAYER_B;
    var score = minimax(board, 0, -Infinity, Infinity, true, PLAYER_A);
    expect(typeof score).toBe("number");
  });

  it("returns win score for winning position", () => {
    var board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[2] = PLAYER_A;
    board[3] = PLAYER_A;
    board[4] = PLAYER_A;
    board[5] = PLAYER_A;
    board[8] = PLAYER_B;
    var score = minimax(board, 2, -Infinity, Infinity, false, PLAYER_A);
    expect(score).toBeGreaterThan(900);
  });

  it("returns loss score for losing position", () => {
    var board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_B;
    board[2] = PLAYER_B;
    board[3] = PLAYER_B;
    board[4] = PLAYER_B;
    board[5] = PLAYER_B;
    board[8] = PLAYER_A;
    var score = minimax(board, 2, -Infinity, Infinity, false, PLAYER_A);
    expect(score).toBeLessThan(-900);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid placement move in placement phase", () => {
    var state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    var move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("place");
    expect(move.pos).toBeGreaterThanOrEqual(0);
    expect(move.pos).toBeLessThan(BOARD_POSITIONS);
  });

  it("takes winning placement move", () => {
    var state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    state.board[0] = PLAYER_B;
    state.board[1] = PLAYER_B;
    state.placedB = 2;
    var move = getBestAIMove(state);
    expect(move.type).toBe("place");
    expect(move.pos).toBe(2);
  });

  it("blocks opponent winning placement move", () => {
    var state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "place";
    state.board[0] = PLAYER_A;
    state.board[1] = PLAYER_A;
    state.placedA = 2;
    var move = getBestAIMove(state);
    expect(move.type).toBe("place");
    expect(move.pos).toBe(2);
  });

  it("returns a valid move in movement phase", () => {
    var state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "move";
    // A: 0,1,4,5,8,9 | B: 2,3,6,7 | empty: 10,11
    // B at 6 can move to 10, B at 7 can move to 11
    state.board[0] = PLAYER_A;
    state.board[1] = PLAYER_A;
    state.board[4] = PLAYER_A;
    state.board[5] = PLAYER_A;
    state.board[8] = PLAYER_A;
    state.board[9] = PLAYER_A;
    state.board[2] = PLAYER_B;
    state.board[3] = PLAYER_B;
    state.board[6] = PLAYER_B;
    state.board[7] = PLAYER_B;
    state.piecesA = 6;
    state.piecesB = 4;
    var move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("move");
    expect(typeof move.from).toBe("number");
    expect(typeof move.to).toBe("number");
  });

  it("returns null when no valid moves", () => {
    var state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.phase = "move";
    // AI pieces completely surrounded
    state.board[0] = PLAYER_B;
    state.board[1] = PLAYER_A;
    state.board[3] = PLAYER_A;
    state.board[4] = PLAYER_A;
    var move = getBestAIMove(state);
    expect(move).toBeNull();
  });
});
