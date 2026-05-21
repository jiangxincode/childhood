import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  PIECES_EACH,
  BOARD_POSITIONS,
  ADJACENCY,
  INITIAL_POSITIONS_A,
  INITIAL_POSITIONS_B,
  GRID_COLS,
  GRID_ROWS,
  MOVE_SINGLE,
  MOVE_TRIPLE,
  createBoard,
  createGameState,
  getOpponent,
  getPlayerPieces,
  countPieces,
  isLandable,
  getSingleMovesForPiece,
  getTripleMovesForPiece,
  getValidMoves,
  hasValidMoves,
  applyMove,
  checkWin,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B differ", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("EMPTY is null", () => {
    expect(EMPTY).toBeNull();
  });

  it("PIECES_EACH is 4", () => {
    expect(PIECES_EACH).toBe(4);
  });

  it("board has 12 positions", () => {
    expect(BOARD_POSITIONS.length).toBe(12);
    expect(ADJACENCY.length).toBe(12);
  });

  it("initial positions are A:[0,1,3,4] and B:[7,8,10,11]", () => {
    expect(INITIAL_POSITIONS_A).toEqual([0, 1, 3, 4]);
    expect(INITIAL_POSITIONS_B).toEqual([7, 8, 10, 11]);
  });

  it("grid is 4x4", () => {
    expect(GRID_COLS).toBe(4);
    expect(GRID_ROWS).toBe(4);
  });

  it("move type identifiers are distinct strings", () => {
    expect(MOVE_SINGLE).toBe("single");
    expect(MOVE_TRIPLE).toBe("triple");
  });
});

describe("adjacency graph (cross of 5 squares)", () => {
  it("is symmetric", () => {
    for (let i = 0; i < ADJACENCY.length; i++) {
      for (const j of ADJACENCY[i]) {
        expect(ADJACENCY[j]).toContain(i);
      }
    }
  });

  it("has the expected edge count", () => {
    let edges = 0;
    for (let i = 0; i < ADJACENCY.length; i++) {
      for (const j of ADJACENCY[i]) {
        if (j > i) edges++;
      }
    }
    expect(edges).toBe(16);
  });

  it("center nodes 3, 4, 7, 8 have 4 neighbors", () => {
    expect(ADJACENCY[3].length).toBe(4);
    expect(ADJACENCY[4].length).toBe(4);
    expect(ADJACENCY[7].length).toBe(4);
    expect(ADJACENCY[8].length).toBe(4);
  });

  it("tip nodes have 2 neighbors", () => {
    [0, 1, 2, 5, 6, 9, 10, 11].forEach((tip) => {
      expect(ADJACENCY[tip].length).toBe(2);
    });
  });
});

describe("createBoard / createGameState", () => {
  it("createBoard returns 12 EMPTY cells", () => {
    const board = createBoard();
    expect(board.length).toBe(12);
    for (const v of board) expect(v).toBeNull();
  });

  it("createGameState places A on top block, B on bottom block", () => {
    const s = createGameState("pvp");
    [0, 1, 3, 4].forEach((p) => expect(s.board[p]).toBe(PLAYER_A));
    [7, 8, 10, 11].forEach((p) => expect(s.board[p]).toBe(PLAYER_B));
    expect(countPieces(s.board, PLAYER_A)).toBe(4);
    expect(countPieces(s.board, PLAYER_B)).toBe(4);
    // The "elbow" cells 2, 5, 6, 9 start empty
    [2, 5, 6, 9].forEach((p) => expect(s.board[p]).toBeNull());
  });

  it("createGameState defaults", () => {
    const s = createGameState("pvp");
    expect(s.currentPlayer).toBe(PLAYER_A);
    expect(s.gameOver).toBe(false);
    expect(s.winner).toBeNull();
    expect(s.turnCount).toBe(0);
    expect(s.lastMove).toBeNull();
  });
});

describe("helpers", () => {
  it("getOpponent flips player", () => {
    expect(getOpponent(PLAYER_A)).toBe(PLAYER_B);
    expect(getOpponent(PLAYER_B)).toBe(PLAYER_A);
  });

  it("getPlayerPieces filters by player", () => {
    const s = createGameState("pvp");
    expect(getPlayerPieces(s.board, PLAYER_A).sort((a, b) => a - b)).toEqual([0, 1, 3, 4]);
    expect(getPlayerPieces(s.board, PLAYER_B).sort((a, b) => a - b)).toEqual([7, 8, 10, 11]);
  });

  it("isLandable: empty is landable, opponent is landable, own is not", () => {
    const board = createBoard();
    board[3] = PLAYER_A;
    board[4] = PLAYER_B;
    expect(isLandable(board, 0, PLAYER_A)).toBe(true);
    expect(isLandable(board, 3, PLAYER_A)).toBe(false);
    expect(isLandable(board, 4, PLAYER_A)).toBe(true);
    expect(isLandable(board, 4, PLAYER_B)).toBe(false);
    expect(isLandable(board, 3, PLAYER_B)).toBe(true);
  });
});

describe("getSingleMovesForPiece", () => {
  it("from 0 on empty board reaches 1 and 3", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    const moves = getSingleMovesForPiece(board, 0, PLAYER_A);
    expect(moves.map((m) => m.to).sort()).toEqual([1, 3]);
    moves.forEach((m) => {
      expect(m.type).toBe(MOVE_SINGLE);
      expect(m.from).toBe(0);
      expect(m.path).toEqual([0, m.to]);
    });
  });

  it("blocks own piece as target", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    const moves = getSingleMovesForPiece(board, 0, PLAYER_A);
    expect(moves.map((m) => m.to)).toEqual([3]);
  });

  it("captures opponent on adjacent node", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_B;
    const moves = getSingleMovesForPiece(board, 0, PLAYER_A);
    const cap = moves.find((m) => m.to === 1);
    expect(cap).toBeDefined();
    expect(cap.capture).toBe(1);
  });
});

describe("getTripleMovesForPiece (鸡毛蒜皮)", () => {
  it("returns nothing if there is no opponent to capture", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    expect(getTripleMovesForPiece(board, 0, PLAYER_A).length).toBe(0);
  });

  it("path length is 4 (origin + 3 hops) and each move captures opponent", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[8] = PLAYER_B;
    const moves = getTripleMovesForPiece(board, 0, PLAYER_A);
    expect(moves.length).toBeGreaterThan(0);
    moves.forEach((m) => {
      expect(m.path.length).toBe(4);
      expect(m.path[0]).toBe(0);
      expect(m.type).toBe(MOVE_TRIPLE);
      expect(m.capture).toBe(m.to);
      expect(board[m.to]).toBe(PLAYER_B);
    });
  });

  it("path nodes are unique (no revisits)", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[8] = PLAYER_B;
    const moves = getTripleMovesForPiece(board, 0, PLAYER_A);
    moves.forEach((m) => {
      const set = new Set(m.path);
      expect(set.size).toBe(m.path.length);
    });
  });

  it("each consecutive pair in path is adjacent", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[8] = PLAYER_B;
    const moves = getTripleMovesForPiece(board, 0, PLAYER_A);
    moves.forEach((m) => {
      for (let i = 0; i + 1 < m.path.length; i++) {
        expect(ADJACENCY[m.path[i]]).toContain(m.path[i + 1]);
      }
    });
  });

  it("intermediate steps may pass through occupied cells", () => {
    // A at 0, B at 7 and 8. Path 0 -> 1 -> 4 -> 8 captures, but goes through
    // an own-side empty 1/4. To prove we can also pass own pieces:
    const board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A; // own occupies intermediate slot
    board[8] = PLAYER_B; // capture target
    const moves = getTripleMovesForPiece(board, 0, PLAYER_A);
    // Path 0 -> 1 -> 4 -> 8 should be valid (intermediate 1 is own-color but allowed)
    const found = moves.find(
      (m) => m.path[0] === 0 && m.path[1] === 1 && m.path[2] === 4 && m.path[3] === 8
    );
    expect(found).toBeDefined();
  });

  it("cannot land on empty (triple is capture-only)", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    // No opponent on board: even though paths exist, none are valid landings
    const moves = getTripleMovesForPiece(board, 0, PLAYER_A);
    expect(moves.length).toBe(0);
  });

  it("cannot land on own piece", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[8] = PLAYER_A;
    expect(getTripleMovesForPiece(board, 0, PLAYER_A).length).toBe(0);
  });
});

describe("getValidMoves / hasValidMoves", () => {
  it("initial state: A has single moves only (no opponent in 3-step range to capture)", () => {
    const s = createGameState("pvp");
    const moves = getValidMoves(s.board, PLAYER_A);
    expect(moves.some((m) => m.type === MOVE_SINGLE)).toBe(true);
    expect(hasValidMoves(s.board, PLAYER_A)).toBe(true);
    // Check that triples, if any, all capture an opponent
    moves.filter((m) => m.type === MOVE_TRIPLE).forEach((m) => expect(m.capture).not.toBeNull());
  });

  it("hasValidMoves false for absent player", () => {
    const board = createBoard();
    expect(hasValidMoves(board, PLAYER_A)).toBe(false);
  });

  it("a piece surrounded by own and with no opponent on board has no moves", () => {
    // B at 0; both neighbors (1, 3) are own; no opponent exists -> no triple capture
    const board = createBoard();
    board[0] = PLAYER_B;
    board[1] = PLAYER_B;
    board[3] = PLAYER_B;
    expect(getSingleMovesForPiece(board, 0, PLAYER_B).length).toBe(0);
    expect(getTripleMovesForPiece(board, 0, PLAYER_B).length).toBe(0);
  });

  it("hasValidMoves is false when the board is filled entirely with own pieces", () => {
    // No empty cells, no opponent: nothing to step into and nothing to capture
    const board = [];
    for (let i = 0; i < 12; i++) board.push(PLAYER_B);
    expect(hasValidMoves(board, PLAYER_B)).toBe(false);
  });
});

describe("applyMove", () => {
  it("moves a piece and clears origin", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    const move = { type: MOVE_SINGLE, from: 0, to: 1, path: [0, 1], capture: null };
    const next = applyMove(board, move);
    expect(next[0]).toBeNull();
    expect(next[1]).toBe(PLAYER_A);
    // original unchanged
    expect(board[0]).toBe(PLAYER_A);
  });

  it("captures: opponent piece on the landing is removed", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_B;
    const move = { type: MOVE_SINGLE, from: 0, to: 1, path: [0, 1], capture: 1 };
    const next = applyMove(board, move);
    expect(next[1]).toBe(PLAYER_A);
    expect(countPieces(next, PLAYER_B)).toBe(0);
  });

  it("triple move only changes origin and landing", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A;
    board[4] = PLAYER_A;
    board[8] = PLAYER_B;
    const move = {
      type: MOVE_TRIPLE,
      from: 0,
      to: 8,
      path: [0, 1, 4, 8],
      capture: 8,
    };
    const next = applyMove(board, move);
    expect(next[0]).toBeNull();
    expect(next[1]).toBe(PLAYER_A); // intermediate untouched
    expect(next[4]).toBe(PLAYER_A); // intermediate untouched
    expect(next[8]).toBe(PLAYER_A); // captured & landed
    expect(countPieces(next, PLAYER_B)).toBe(0);
  });
});

describe("checkWin", () => {
  it("returns null at game start", () => {
    const s = createGameState("pvp");
    expect(checkWin(s.board, PLAYER_A)).toBeNull();
    expect(checkWin(s.board, PLAYER_B)).toBeNull();
  });

  it("returns A when B has no pieces left", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    expect(checkWin(board, PLAYER_B)).toBe(PLAYER_A);
  });

  it("returns B when A has no pieces left", () => {
    const board = createBoard();
    board[10] = PLAYER_B;
    expect(checkWin(board, PLAYER_A)).toBe(PLAYER_B);
  });
});

describe("getBestAIMove", () => {
  it("returns null when no moves are available", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.board = [];
    for (let i = 0; i < 12; i++) state.board.push(PLAYER_B);
    expect(getBestAIMove(state)).toBeNull();
  });

  it("returns a valid move at game start", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect([MOVE_SINGLE, MOVE_TRIPLE]).toContain(move.type);
    expect(state.board[move.from]).toBe(PLAYER_B);
  });

  it("prefers an immediate winning capture", () => {
    // Set up a board where B can capture A's last remaining piece in one step
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.board = createBoard();
    state.board[3] = PLAYER_A; // A's last piece
    state.board[0] = PLAYER_B; // B can step 0 -> 3 to capture and win
    const move = getBestAIMove(state);
    expect(move.to).toBe(3);
    expect(move.capture).toBe(3);
  });
});
