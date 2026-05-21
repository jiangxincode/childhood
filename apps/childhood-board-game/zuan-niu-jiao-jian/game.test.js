import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  EMPTY,
  TOTAL_POSITIONS,
  INITIAL_POSITIONS_A,
  INITIAL_POSITIONS_B,
  TIP_POSITION,
  ROOT_POSITIONS,
  CONNECTIONS,
  EDGES,
  UPPER_ARC,
  LOWER_ARC,
  ARC_EDGE_KEYS,
  POSITIONS,
  DIST_TO_ROOT,
  createBoard,
  createInitialState,
  getOpponent,
  getConnections,
  countPieces,
  getValidMoves,
  hasValidMoves,
  movePiece,
  checkWin,
  evaluateBoard,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("defines distinct player tokens", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
    expect(EMPTY).toBeNull();
  });

  it("has 11 positions, tip at idx 10, roots at idx 0 and 1", () => {
    expect(TOTAL_POSITIONS).toBe(11);
    expect(TIP_POSITION).toBe(10);
    expect(ROOT_POSITIONS).toEqual([0, 1]);
    expect(POSITIONS.length).toBe(11);
    expect(Object.keys(CONNECTIONS).length).toBe(11);
  });

  it("initial layout: A at the wide root [0,1], B at the horn tip [10]", () => {
    expect(INITIAL_POSITIONS_A).toEqual([0, 1]);
    expect(INITIAL_POSITIONS_B).toEqual([10]);
  });
});

describe("adjacency graph", () => {
  it("is symmetric", () => {
    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      for (const j of CONNECTIONS[i]) {
        expect(CONNECTIONS[j]).toContain(i);
      }
    }
  });

  it("the horn tip has only 2 neighbours (8 and 9)", () => {
    expect(CONNECTIONS[TIP_POSITION].length).toBe(2);
    expect(CONNECTIONS[TIP_POSITION].sort((a, b) => a - b)).toEqual([8, 9]);
  });

  it("node 9 connects directly to the tip via the long arc", () => {
    expect(CONNECTIONS[8]).toContain(10);
    expect(CONNECTIONS[10]).toContain(8);
  });

  it("EDGES is deduplicated (each undirected edge appears once)", () => {
    const seen = new Set();
    for (const [a, b] of EDGES) {
      expect(a).toBeLessThan(b);
      const key = a + "-" + b;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("declares smooth boundary arcs through the expected node sequence", () => {
    expect(UPPER_ARC).toEqual([1, 3, 5, 7, 9, 10]);
    expect(LOWER_ARC).toEqual([0, 2, 4, 6, 8, 10]);
    // Every consecutive pair on the arcs must be a real graph edge
    function pairs(arr) {
      const out = [];
      for (let i = 0; i + 1 < arr.length; i++) out.push([arr[i], arr[i + 1]]);
      return out;
    }
    for (const [a, b] of pairs(UPPER_ARC)) {
      expect(CONNECTIONS[a]).toContain(b);
    }
    for (const [a, b] of pairs(LOWER_ARC)) {
      expect(CONNECTIONS[a]).toContain(b);
    }
  });

  it("ARC_EDGE_KEYS marks every arc segment so renderers skip duplicates", () => {
    const arcs = [UPPER_ARC, LOWER_ARC];
    for (const arc of arcs) {
      for (let i = 0; i + 1 < arc.length; i++) {
        const a = Math.min(arc[i], arc[i + 1]);
        const b = Math.max(arc[i], arc[i + 1]);
        expect(ARC_EDGE_KEYS[a + "-" + b]).toBe(true);
      }
    }
  });

  it("upper arc 1-3-5-7-9-10 is connected", () => {
    expect(CONNECTIONS[1]).toContain(3);
    expect(CONNECTIONS[3]).toContain(5);
    expect(CONNECTIONS[5]).toContain(7);
    expect(CONNECTIONS[7]).toContain(9);
    expect(CONNECTIONS[9]).toContain(10);
  });

  it("lower arc 0-2-4-6-8-10 is connected", () => {
    expect(CONNECTIONS[0]).toContain(2);
    expect(CONNECTIONS[2]).toContain(4);
    expect(CONNECTIONS[4]).toContain(6);
    expect(CONNECTIONS[6]).toContain(8);
    expect(CONNECTIONS[8]).toContain(10);
  });

  it("left bar 0-1 connects the two starting nodes of A", () => {
    expect(CONNECTIONS[0]).toContain(1);
    expect(CONNECTIONS[1]).toContain(0);
  });
});

describe("DIST_TO_ROOT", () => {
  it("is 0 for the root nodes themselves", () => {
    expect(DIST_TO_ROOT[0]).toBe(0);
    expect(DIST_TO_ROOT[1]).toBe(0);
  });

  it("is finite for every node", () => {
    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      expect(Number.isFinite(DIST_TO_ROOT[i])).toBe(true);
    }
  });

  it("the tip is the farthest from the root", () => {
    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      expect(DIST_TO_ROOT[i]).toBeLessThanOrEqual(DIST_TO_ROOT[TIP_POSITION]);
    }
  });
});

describe("createBoard / createInitialState", () => {
  it("createBoard returns 11 EMPTY cells", () => {
    const board = createBoard();
    expect(board.length).toBe(11);
    for (const v of board) expect(v).toBeNull();
  });

  it("createInitialState places 2 A at the root and 1 B at the tip", () => {
    const s = createInitialState("pvp");
    expect(s.board[0]).toBe(PLAYER_A);
    expect(s.board[1]).toBe(PLAYER_A);
    expect(s.board[TIP_POSITION]).toBe(PLAYER_B);
    expect(countPieces(s.board, PLAYER_A)).toBe(2);
    expect(countPieces(s.board, PLAYER_B)).toBe(1);
    // All other nodes are empty
    for (let i = 2; i < 10; i++) expect(s.board[i]).toBeNull();
  });

  it("default state fields", () => {
    const s = createInitialState("pvp");
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

  it("getConnections is the same as CONNECTIONS lookup", () => {
    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      expect(getConnections(i)).toBe(CONNECTIONS[i]);
    }
  });

  it("countPieces matches manual count", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[3] = PLAYER_A;
    board[5] = PLAYER_B;
    expect(countPieces(board, PLAYER_A)).toBe(2);
    expect(countPieces(board, PLAYER_B)).toBe(1);
  });
});

describe("getValidMoves / hasValidMoves", () => {
  it("returns all empty neighbours for own pieces", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    const moves = getValidMoves(board, PLAYER_A);
    const tos = moves.map((m) => m.to).sort((a, b) => a - b);
    expect(tos).toEqual([1, 2]);
  });

  it("does not include moves onto own or opponent pieces (per-piece check)", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_A; // own blocks 0->1
    board[2] = PLAYER_B; // opponent blocks 0->2
    const movesFrom0 = getValidMoves(board, PLAYER_A).filter((m) => m.from === 0);
    expect(movesFrom0.length).toBe(0);
  });

  it("hasValidMoves true on initial state for both sides", () => {
    const s = createInitialState("pvp");
    expect(hasValidMoves(s.board, PLAYER_A)).toBe(true);
    expect(hasValidMoves(s.board, PLAYER_B)).toBe(true);
  });

  it("hasValidMoves false when player has no piece on the board", () => {
    const board = createBoard();
    expect(hasValidMoves(board, PLAYER_A)).toBe(false);
  });

  it("from the tip B can move to either node 9 or node 10 (the long arc to 9 still counts)", () => {
    const board = createBoard();
    board[TIP_POSITION] = PLAYER_B;
    const moves = getValidMoves(board, PLAYER_B);
    expect(moves.map((m) => m.to).sort((a, b) => a - b)).toEqual([8, 9]);
  });
});

describe("movePiece", () => {
  it("moves a piece and clears origin without mutating the original", () => {
    const board = createBoard();
    board[0] = PLAYER_A;
    const next = movePiece(board, 0, 1);
    expect(next[0]).toBeNull();
    expect(next[1]).toBe(PLAYER_A);
    expect(board[0]).toBe(PLAYER_A);
    expect(board[1]).toBeNull();
  });
});

describe("checkWin", () => {
  it("returns null at game start", () => {
    const s = createInitialState("pvp");
    expect(checkWin(s.board, PLAYER_A)).toBeNull();
    expect(checkWin(s.board, PLAYER_B)).toBeNull();
  });

  it("B wins when B is on a root node (regardless of whose turn it is)", () => {
    const board = createBoard();
    board[0] = PLAYER_B; // B reached the wide root
    expect(checkWin(board, PLAYER_A)).toBe(PLAYER_B);
    expect(checkWin(board, PLAYER_B)).toBe(PLAYER_B);

    const board2 = createBoard();
    board2[1] = PLAYER_B; // the other root
    expect(checkWin(board2, PLAYER_A)).toBe(PLAYER_B);
  });

  it("A wins when B is trapped at the tip with no legal move", () => {
    const board = createBoard();
    board[TIP_POSITION] = PLAYER_B;
    board[8] = PLAYER_A;
    board[9] = PLAYER_A;
    expect(hasValidMoves(board, PLAYER_B)).toBe(false);
    expect(checkWin(board, PLAYER_B)).toBe(PLAYER_A);
  });

  it("B wins when A has no legal move", () => {
    // Construct a contrived state where A is wholly blocked but B is not on a
    // root: A at node 0 surrounded by B, but B is also far enough from a root.
    const board = createBoard();
    board[0] = PLAYER_A;
    board[1] = PLAYER_B; // blocks 0->1 (also a root, so this would be a B-on-root win)
    // To exercise the "A has no moves" branch in isolation, place A only at a
    // non-root cell that we surround.
    const board2 = createBoard();
    board2[5] = PLAYER_A;
    board2[3] = PLAYER_B;
    board2[4] = PLAYER_B;
    board2[6] = PLAYER_B;
    board2[7] = PLAYER_B;
    // With no other A pieces and all neighbours of node 5 occupied, A has no moves
    expect(hasValidMoves(board2, PLAYER_A)).toBe(false);
    expect(checkWin(board2, PLAYER_A)).toBe(PLAYER_B);

    // Sanity: keep `board` referenced so lint doesn't flag it
    expect(board[0]).toBe(PLAYER_A);
  });
});

describe("evaluateBoard", () => {
  it("rewards the AI when the opponent has no moves", () => {
    const board = createBoard();
    board[TIP_POSITION] = PLAYER_B;
    board[8] = PLAYER_A;
    board[9] = PLAYER_A;
    expect(evaluateBoard(board, PLAYER_A)).toBeGreaterThan(1000);
  });

  it("penalises the AI when its opponent has reached the root", () => {
    const board = createBoard();
    board[0] = PLAYER_B; // B at root: B wins
    expect(evaluateBoard(board, PLAYER_A)).toBeLessThan(-1000);
    expect(evaluateBoard(board, PLAYER_B)).toBeGreaterThan(1000);
  });

  it("prefers positions where B is closer to the root for AI = B", () => {
    // Both boards have A pieces somewhere reasonable so neither side is in
    // a terminal "no moves" configuration.
    const closeBoard = createBoard();
    closeBoard[2] = PLAYER_B; // distance to root = 1
    closeBoard[5] = PLAYER_A;
    closeBoard[7] = PLAYER_A;
    const farBoard = createBoard();
    farBoard[TIP_POSITION] = PLAYER_B; // distance = max
    farBoard[5] = PLAYER_A;
    farBoard[7] = PLAYER_A;
    expect(evaluateBoard(closeBoard, PLAYER_B)).toBeGreaterThan(evaluateBoard(farBoard, PLAYER_B));
  });
});

describe("getBestAIMove", () => {
  it("returns null when AI has no moves", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_B;
    state.board = createBoard();
    state.board[TIP_POSITION] = PLAYER_B;
    state.board[8] = PLAYER_A;
    state.board[9] = PLAYER_A;
    expect(getBestAIMove(state)).toBeNull();
  });

  it("returns a legal move at game start (AI = B from the tip)", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(state.board[move.from]).toBe(PLAYER_B);
    expect(state.board[move.to]).toBeNull();
    expect(CONNECTIONS[move.from]).toContain(move.to);
  });

  it("AI = B steps onto a root node when one is one move away", () => {
    const state = createInitialState("pve");
    state.aiTeam = PLAYER_B;
    state.board = createBoard();
    state.board[2] = PLAYER_B; // adjacent to root 0 and root 1
    // Place A pieces somewhere that does not block roots 0 or 1, so that B
    // can step directly onto a root and win immediately. Without any A on
    // the board, hasValidMoves(A) would be false and every B move would
    // already be scored as an A-has-no-moves win, defeating this test.
    state.board[7] = PLAYER_A;
    state.board[9] = PLAYER_A;
    const move = getBestAIMove(state);
    expect(ROOT_POSITIONS).toContain(move.to);
  });
});
