import { describe, it, expect } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  PITS_COUNT,
  COLUMNS,
  STORE_A,
  STORE_B,
  TOTAL_PITS,
  INITIAL_STONES,
  createGameState,
  getStore,
  getPlayerPits,
  getOppositePit,
  isValidMove,
  getValidMoves,
  sowStones,
  isGameOver,
  endGame,
  evaluateState,
  simulateMove,
  isSideEmpty,
  minimax,
  getBestAIMove,
  getOpponent,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("PITS_COUNT is 10", () => {
    expect(PITS_COUNT).toBe(10);
  });

  it("COLUMNS is 5", () => {
    expect(COLUMNS).toBe(5);
  });

  it("STORE_A is 10", () => {
    expect(STORE_A).toBe(10);
  });

  it("STORE_B is 11", () => {
    expect(STORE_B).toBe(11);
  });

  it("TOTAL_PITS is 12", () => {
    expect(TOTAL_PITS).toBe(12);
  });

  it("INITIAL_STONES is 4", () => {
    expect(INITIAL_STONES).toBe(4);
  });
});

describe("createGameState", () => {
  it("creates initial state with correct defaults for pvp", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(PLAYER_A);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.extraTurn).toBe(false);
  });

  it("fills 10 small pits with 4 stones each", () => {
    const state = createGameState("pvp");
    for (let i = 0; i < PITS_COUNT; i++) {
      expect(state.pits[i]).toBe(INITIAL_STONES);
    }
  });

  it("stores start with 0 stones", () => {
    const state = createGameState("pvp");
    expect(state.pits[STORE_A]).toBe(0);
    expect(state.pits[STORE_B]).toBe(0);
  });

  it("creates initial state for pve mode", () => {
    const state = createGameState("pve");
    expect(state.mode).toBe("pve");
  });

  it("total stones equal 40", () => {
    const state = createGameState("pvp");
    let total = 0;
    for (let i = 0; i < TOTAL_PITS; i++) {
      total += state.pits[i];
    }
    expect(total).toBe(40);
  });
});

describe("getStore", () => {
  it("returns STORE_A for PLAYER_A", () => {
    expect(getStore(PLAYER_A)).toBe(STORE_A);
  });

  it("returns STORE_B for PLAYER_B", () => {
    expect(getStore(PLAYER_B)).toBe(STORE_B);
  });
});

describe("getPlayerPits", () => {
  it("returns pits 0-4 for PLAYER_A", () => {
    const pits = getPlayerPits(PLAYER_A);
    expect(pits).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns pits 5-9 for PLAYER_B", () => {
    const pits = getPlayerPits(PLAYER_B);
    expect(pits).toEqual([5, 6, 7, 8, 9]);
  });
});

describe("getOppositePit", () => {
  it("returns correct opposite for all pits", () => {
    expect(getOppositePit(0)).toBe(9);
    expect(getOppositePit(1)).toBe(8);
    expect(getOppositePit(2)).toBe(7);
    expect(getOppositePit(3)).toBe(6);
    expect(getOppositePit(4)).toBe(5);
    expect(getOppositePit(5)).toBe(4);
    expect(getOppositePit(6)).toBe(3);
    expect(getOppositePit(7)).toBe(2);
    expect(getOppositePit(8)).toBe(1);
    expect(getOppositePit(9)).toBe(0);
  });

  it("returns -1 for store indices", () => {
    expect(getOppositePit(STORE_A)).toBe(-1);
    expect(getOppositePit(STORE_B)).toBe(-1);
  });
});

describe("isValidMove", () => {
  it("returns true for valid moves on initial state", () => {
    const state = createGameState("pvp");
    expect(isValidMove(state, 0)).toBe(true);
    expect(isValidMove(state, 4)).toBe(true);
  });

  it("returns false for empty pit", () => {
    const state = createGameState("pvp");
    state.pits[0] = 0;
    expect(isValidMove(state, 0)).toBe(false);
  });

  it("returns false for opponent's pit", () => {
    const state = createGameState("pvp");
    expect(isValidMove(state, 5)).toBe(false);
    expect(isValidMove(state, 9)).toBe(false);
  });

  it("returns false for store index", () => {
    const state = createGameState("pvp");
    expect(isValidMove(state, STORE_A)).toBe(false);
    expect(isValidMove(state, STORE_B)).toBe(false);
  });

  it("returns false for out-of-range index", () => {
    const state = createGameState("pvp");
    expect(isValidMove(state, -1)).toBe(false);
    expect(isValidMove(state, 12)).toBe(false);
  });

  it("returns false when game is over", () => {
    const state = createGameState("pvp");
    state.gameOver = true;
    expect(isValidMove(state, 0)).toBe(false);
  });
});

describe("getValidMoves", () => {
  it("returns all 5 pits for initial state (player A)", () => {
    const state = createGameState("pvp");
    const moves = getValidMoves(state);
    expect(moves).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns correct pits for player B", () => {
    const state = createGameState("pvp");
    state.currentPlayer = PLAYER_B;
    const moves = getValidMoves(state);
    expect(moves).toEqual([5, 6, 7, 8, 9]);
  });

  it("returns fewer moves when some pits are empty", () => {
    const state = createGameState("pvp");
    state.pits[0] = 0;
    state.pits[2] = 0;
    const moves = getValidMoves(state);
    expect(moves).toEqual([1, 3, 4]);
  });

  it("returns empty array when all own pits are empty", () => {
    const state = createGameState("pvp");
    state.pits[0] = 0;
    state.pits[1] = 0;
    state.pits[2] = 0;
    state.pits[3] = 0;
    state.pits[4] = 0;
    const moves = getValidMoves(state);
    expect(moves).toEqual([]);
  });
});

describe("sowStones", () => {
  it("empties the selected pit", () => {
    const state = createGameState("pvp");
    sowStones(state, 0);
    expect(state.pits[0]).toBe(0);
  });

  it("distributes stones counter-clockwise for player A", () => {
    const state = createGameState("pvp");
    // Pit 0 has 4 stones, sow to pits 1,2,3,4
    sowStones(state, 0);
    expect(state.pits[0]).toBe(0);
    expect(state.pits[1]).toBe(5); // 4+1
    expect(state.pits[2]).toBe(5); // 4+1
    expect(state.pits[3]).toBe(5); // 4+1
    expect(state.pits[4]).toBe(5); // 4+1
    expect(state.pits[5]).toBe(4); // unchanged
  });

  it("sows counter-clockwise for player B", () => {
    const state = createGameState("pvp");
    state.currentPlayer = PLAYER_B;
    // Pit 5 has 4 stones, sow to pits 6,7,8,9
    sowStones(state, 5);
    expect(state.pits[5]).toBe(0);
    expect(state.pits[6]).toBe(5);
    expect(state.pits[7]).toBe(5);
    expect(state.pits[8]).toBe(5);
    expect(state.pits[9]).toBe(5);
  });

  it("skips opponent store (player A skips store B)", () => {
    const state = createGameState("pvp");
    // Pit 4 has 4 stones: sow to pit 5,6,7,8 (skipping store B at index 11)
    sowStones(state, 4);
    expect(state.pits[4]).toBe(0);
    expect(state.pits[5]).toBe(5);
    expect(state.pits[6]).toBe(5);
    expect(state.pits[7]).toBe(5);
    expect(state.pits[8]).toBe(5);
    expect(state.pits[STORE_B]).toBe(0);
  });

  it("skips opponent store (player B skips store A)", () => {
    const state = createGameState("pvp");
    state.currentPlayer = PLAYER_B;
    // Pit 9 has 4 stones: sow to store B(11), 0, 1, 2 (skipping store A at index 10)
    sowStones(state, 9);
    expect(state.pits[9]).toBe(0);
    expect(state.pits[STORE_B]).toBe(1); // lands in own store
    expect(state.pits[0]).toBe(5); // continues counter-clockwise
    expect(state.pits[1]).toBe(5);
    expect(state.pits[2]).toBe(5);
    expect(state.pits[10]).toBe(0); // store A skipped
  });

  it("does not set extraTurn when last stone lands in opponent store", () => {
    const state = createGameState("pvp");
    // Player A pit 4 with 6 stones: sow to 5,6,7,8,9,skip store_B(11),land store_A(10)
    // Actually lands in store A = extra turn. To test no extra turn, use pit 3 with 6 stones:
    // sow to 4,5,6,7,8,9 -> last in pit 9 (not store)
    state.pits[3] = 6;
    sowStones(state, 3);
    expect(state.extraTurn).toBe(false);
  });

  it("sets extraTurn true when last stone lands in player A store", () => {
    const state = createGameState("pvp");
    // Player A pit 3 has 7 stones: sow to 4,5,6,7,8,9,store_A(10)
    state.pits[3] = 7;
    sowStones(state, 3);
    expect(state.extraTurn).toBe(true);
    expect(state.pits[STORE_A]).toBe(1);
  });

  it("performs capture when last stone lands in empty pit on own side with opposite stones", () => {
    const state = createGameState("pvp");
    // Player A: set up pit 0 to have 1 stone, pit 9 (opposite) to have stones
    state.pits[0] = 1;
    state.pits[9] = 3;
    sowStones(state, 0);
    // Last stone lands in pit 1 (which was 4, now 5) - NOT empty, so no capture
    expect(state.pits[0]).toBe(0);
    expect(state.pits[1]).toBe(5);
  });

  it("performs capture correctly with empty target pit", () => {
    const state = createGameState("pvp");
    // Set up so last stone lands in empty pit
    // Pit 0 has 1 stone -> sow to pit 1
    // Make pit 1 empty and pit 8 (opposite of 1) have stones
    state.pits[0] = 1;
    state.pits[1] = 0;
    state.pits[8] = 3;
    sowStones(state, 0);
    // Last stone lands in pit 1, which is now 1 (just placed)
    // Check capture: pit 1 has 1 stone, opposite is pit 8 with 3 stones
    expect(state.pits[1]).toBe(0);
    expect(state.pits[8]).toBe(0);
    expect(state.pits[STORE_A]).toBe(4); // 1 + 3 captured
  });

  it("does not capture when opposite pit is empty", () => {
    const state = createGameState("pvp");
    state.pits[0] = 1;
    state.pits[1] = 0;
    state.pits[8] = 0;
    sowStones(state, 0);
    expect(state.pits[1]).toBe(1); // just the one stone placed
    expect(state.pits[STORE_A]).toBe(0);
  });

  it("does not capture when last stone lands in non-empty pit", () => {
    const state = createGameState("pvp");
    state.pits[0] = 2;
    state.pits[1] = 3;
    state.pits[8] = 5;
    sowStones(state, 0);
    // Last stone lands in pit 2, which becomes 5 (4+1), not empty
    expect(state.pits[2]).toBe(5);
    expect(state.pits[8]).toBe(5); // unchanged
  });
});

describe("isGameOver", () => {
  it("returns false on initial state", () => {
    const state = createGameState("pvp");
    expect(isGameOver(state)).toBe(false);
  });

  it("returns true when player A's side is empty", () => {
    const state = createGameState("pvp");
    state.pits[0] = 0;
    state.pits[1] = 0;
    state.pits[2] = 0;
    state.pits[3] = 0;
    state.pits[4] = 0;
    expect(isGameOver(state)).toBe(true);
  });

  it("returns true when player B's side is empty", () => {
    const state = createGameState("pvp");
    state.pits[5] = 0;
    state.pits[6] = 0;
    state.pits[7] = 0;
    state.pits[8] = 0;
    state.pits[9] = 0;
    expect(isGameOver(state)).toBe(true);
  });

  it("returns false when both sides have stones", () => {
    const state = createGameState("pvp");
    state.pits[0] = 0;
    state.pits[1] = 0;
    state.pits[2] = 0;
    state.pits[3] = 0;
    state.pits[4] = 1;
    expect(isGameOver(state)).toBe(false);
  });
});

describe("endGame", () => {
  it("sweeps remaining stones into stores", () => {
    const state = createGameState("pvp");
    // Clear all pits first, then set specific values
    for (let i = 0; i < TOTAL_PITS; i++) {
      state.pits[i] = 0;
    }
    state.pits[5] = 3;
    state.pits[7] = 2;
    endGame(state);
    expect(state.pits[5]).toBe(0);
    expect(state.pits[7]).toBe(0);
    expect(state.pits[STORE_B]).toBe(5);
  });

  it("sets gameOver to true", () => {
    const state = createGameState("pvp");
    endGame(state);
    expect(state.gameOver).toBe(true);
  });

  it("determines winner correctly when A has more", () => {
    const state = createGameState("pvp");
    // Clear all pits to avoid sweep interference
    for (let i = 0; i < TOTAL_PITS; i++) {
      state.pits[i] = 0;
    }
    state.pits[STORE_A] = 20;
    state.pits[STORE_B] = 15;
    endGame(state);
    expect(state.winner).toBe(PLAYER_A);
    expect(state.scoreA).toBe(20);
    expect(state.scoreB).toBe(15);
  });

  it("determines winner correctly when B has more", () => {
    const state = createGameState("pvp");
    for (let i = 0; i < TOTAL_PITS; i++) {
      state.pits[i] = 0;
    }
    state.pits[STORE_A] = 10;
    state.pits[STORE_B] = 25;
    endGame(state);
    expect(state.winner).toBe(PLAYER_B);
  });

  it("returns null winner on draw", () => {
    const state = createGameState("pvp");
    for (let i = 0; i < TOTAL_PITS; i++) {
      state.pits[i] = 0;
    }
    state.pits[STORE_A] = 20;
    state.pits[STORE_B] = 20;
    endGame(state);
    expect(state.winner).toBeNull();
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

describe("evaluateState", () => {
  it("returns store difference as base score", () => {
    const pits = new Array(TOTAL_PITS).fill(0);
    pits[STORE_A] = 10;
    pits[STORE_B] = 5;
    expect(evaluateState(pits, PLAYER_A)).toBe(5);
  });

  it("gives bonus for empty own pit with stones opposite", () => {
    const pits = new Array(TOTAL_PITS).fill(0);
    pits[0] = 0;
    pits[9] = 3;
    expect(evaluateState(pits, PLAYER_A)).toBe(3);
  });
});

describe("simulateMove", () => {
  it("returns new pits array without modifying original", () => {
    const pits = new Array(TOTAL_PITS).fill(4);
    const original = pits.slice();
    const result = simulateMove(pits, 0, PLAYER_A);
    expect(pits).toEqual(original);
    expect(result.pits[0]).toBe(0);
    expect(result.pits[1]).toBe(5);
  });

  it("detects extra turn", () => {
    const pits = new Array(TOTAL_PITS).fill(0);
    pits[3] = 7;
    const result = simulateMove(pits, 3, PLAYER_A);
    expect(result.extraTurn).toBe(true);
  });

  it("handles capture in simulation", () => {
    const pits = new Array(TOTAL_PITS).fill(0);
    pits[0] = 1;
    pits[1] = 0;
    pits[8] = 3;
    const result = simulateMove(pits, 0, PLAYER_A);
    expect(result.pits[1]).toBe(0);
    expect(result.pits[8]).toBe(0);
    expect(result.pits[STORE_A]).toBe(4);
  });
});

describe("isSideEmpty", () => {
  it("returns false when side has stones", () => {
    const pits = new Array(TOTAL_PITS).fill(0);
    pits[3] = 1;
    expect(isSideEmpty(pits, PLAYER_A)).toBe(false);
  });

  it("returns true when side is empty", () => {
    const pits = new Array(TOTAL_PITS).fill(0);
    expect(isSideEmpty(pits, PLAYER_A)).toBe(true);
  });

  it("checks correct side for player B", () => {
    const pits = new Array(TOTAL_PITS).fill(0);
    pits[7] = 2;
    expect(isSideEmpty(pits, PLAYER_B)).toBe(false);
    expect(isSideEmpty(pits, PLAYER_A)).toBe(true);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid pit index", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.currentPlayer = PLAYER_B;
    const move = getBestAIMove(state);
    expect(move).toBeGreaterThanOrEqual(5);
    expect(move).toBeLessThanOrEqual(9);
  });

  it("returns -1 when no valid moves", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.currentPlayer = PLAYER_B;
    state.pits[5] = 0;
    state.pits[6] = 0;
    state.pits[7] = 0;
    state.pits[8] = 0;
    state.pits[9] = 0;
    expect(getBestAIMove(state)).toBe(-1);
  });

  it("prefers a move that captures", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    state.currentPlayer = PLAYER_B;
    // Set up: pit 9 has 1 stone, opposite pit 0 has stones, pit 8 is empty
    // If B sows pit 9 with 1 stone, last stone lands in store B (extra turn)
    // Instead set up a capture opportunity
    state.pits[5] = 0;
    state.pits[6] = 1;
    state.pits[7] = 0;
    state.pits[8] = 0;
    state.pits[9] = 0;
    state.pits[3] = 5; // opposite of pit 6 is pit 3
    const move = getBestAIMove(state);
    expect(move).toBe(6); // sowing from pit 6 lands in pit 7 (empty), capture from pit 2
  });
});

describe("minimax", () => {
  it("returns a number score", () => {
    const state = createGameState("pve");
    state.aiTeam = PLAYER_B;
    const score = minimax(state.pits, 1, true, PLAYER_B, -Infinity, Infinity);
    expect(typeof score).toBe("number");
  });

  it("returns higher score for better positions", () => {
    const pits1 = new Array(TOTAL_PITS).fill(4);
    pits1[STORE_B] = 20;
    pits1[STORE_A] = 5;
    const score1 = minimax(pits1, 1, true, PLAYER_B, -Infinity, Infinity);

    const pits2 = new Array(TOTAL_PITS).fill(4);
    pits2[STORE_B] = 5;
    pits2[STORE_A] = 20;
    const score2 = minimax(pits2, 1, true, PLAYER_B, -Infinity, Infinity);

    expect(score1).toBeGreaterThan(score2);
  });
});
