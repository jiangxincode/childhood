import { describe, it, expect, vi } from "vitest";
import {
  PLAYER_A,
  PLAYER_B,
  TRACK_LENGTH,
  PEAK_POSITION,
  createGameState,
  rollDie,
  movePiece,
  checkWin,
  getOpponent,
  getPlayerPos,
  setPlayerPos,
  getPlayerPhase,
  setPlayerPhase,
  getBestAIMove,
} from "./game.js";

describe("constants", () => {
  it("PLAYER_A and PLAYER_B are different", () => {
    expect(PLAYER_A).not.toBe(PLAYER_B);
  });

  it("TRACK_LENGTH is 20", () => {
    expect(TRACK_LENGTH).toBe(20);
  });

  it("PEAK_POSITION is 10", () => {
    expect(PEAK_POSITION).toBe(10);
  });
});

describe("createGameState", () => {
  it("creates initial state with correct defaults for pvp", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(PLAYER_A);
    expect(state.posA).toBe(0);
    expect(state.posB).toBe(0);
    expect(state.phaseA).toBe("forward");
    expect(state.phaseB).toBe("forward");
    expect(state.turnCount).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.lastRoll).toBe(0);
    expect(state.extraTurn).toBe(false);
    expect(state.aiThinking).toBe(false);
  });

  it("creates initial state with correct defaults for pve", () => {
    const state = createGameState("pve");
    expect(state.mode).toBe("pve");
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});

describe("rollDie", () => {
  it("returns a number between 1 and 6", () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });

  it("produces all values 1-6 over many rolls", () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      seen.add(rollDie());
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(2)).toBe(true);
    expect(seen.has(3)).toBe(true);
    expect(seen.has(4)).toBe(true);
    expect(seen.has(5)).toBe(true);
    expect(seen.has(6)).toBe(true);
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

describe("getPlayerPos / setPlayerPos", () => {
  it("gets and sets position for player A", () => {
    const state = createGameState("pvp");
    expect(getPlayerPos(state, PLAYER_A)).toBe(0);
    setPlayerPos(state, PLAYER_A, 5);
    expect(getPlayerPos(state, PLAYER_A)).toBe(5);
  });

  it("gets and sets position for player B", () => {
    const state = createGameState("pvp");
    expect(getPlayerPos(state, PLAYER_B)).toBe(0);
    setPlayerPos(state, PLAYER_B, 7);
    expect(getPlayerPos(state, PLAYER_B)).toBe(7);
  });
});

describe("getPlayerPhase / setPlayerPhase", () => {
  it("gets and sets phase for player A", () => {
    const state = createGameState("pvp");
    expect(getPlayerPhase(state, PLAYER_A)).toBe("forward");
    setPlayerPhase(state, PLAYER_A, "backward");
    expect(getPlayerPhase(state, PLAYER_A)).toBe("backward");
  });

  it("gets and sets phase for player B", () => {
    const state = createGameState("pvp");
    expect(getPlayerPhase(state, PLAYER_B)).toBe("forward");
    setPlayerPhase(state, PLAYER_B, "backward");
    expect(getPlayerPhase(state, PLAYER_B)).toBe("backward");
  });
});

describe("movePiece - forward movement", () => {
  it("moves player forward by the die value", () => {
    // rollDie: Math.floor(Math.random() * 6) + 1
    // random=0.5 => floor(3)+1 = 4
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const state = createGameState("pvp");
    const result = movePiece(state, PLAYER_A);
    expect(result.die).toBe(4);
    expect(state.posA).toBe(4);
    expect(state.phaseA).toBe("forward");
    vi.restoreAllMocks();
  });

  it("moves player forward by 1 on die roll of 1", () => {
    // random=0 => floor(0)+1 = 1
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = createGameState("pvp");
    const result = movePiece(state, PLAYER_A);
    expect(result.die).toBe(1);
    expect(state.posA).toBe(1);
    vi.restoreAllMocks();
  });

  it("moves player forward by 6 on die roll of 6", () => {
    // random=0.9 => floor(5.4)+1 = 6
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const state = createGameState("pvp");
    const result = movePiece(state, PLAYER_A);
    expect(result.die).toBe(6);
    expect(state.posA).toBe(6);
    vi.restoreAllMocks();
  });
});

describe("movePiece - bounce at peak", () => {
  it("bounces back when reaching peak exactly", () => {
    // Player at 8, rolls 2 => 10, bounces to 10
    // random=0.2 => floor(1.2)+1 = 2
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 8);
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    const result = movePiece(state, PLAYER_A);
    expect(result.die).toBe(2);
    expect(state.posA).toBe(10);
    expect(state.phaseA).toBe("backward");
    expect(result.bounced).toBe(true);
    vi.restoreAllMocks();
  });

  it("bounces back when overshooting peak", () => {
    // Player at 8, rolls 5 => 13, bounces to 10-(13-10)=7
    // random=0.7 => floor(4.2)+1 = 5
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 8);
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    const result = movePiece(state, PLAYER_A);
    expect(result.die).toBe(5);
    expect(state.posA).toBe(7);
    expect(state.phaseA).toBe("backward");
    expect(result.bounced).toBe(true);
    vi.restoreAllMocks();
  });

  it("bounces from position 9 rolling 1", () => {
    // Player at 9, rolls 1 => 10, bounces to 10
    // random=0 => floor(0)+1 = 1
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 9);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = movePiece(state, PLAYER_A);
    expect(state.posA).toBe(10);
    expect(state.phaseA).toBe("backward");
    expect(result.bounced).toBe(true);
    vi.restoreAllMocks();
  });

  it("bounces from position 5 rolling 6", () => {
    // Player at 5, rolls 6 => 11, bounces to 10-(11-10)=9
    // random=0.9 => floor(5.4)+1 = 6
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 5);
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(9);
    expect(state.phaseA).toBe("backward");
    vi.restoreAllMocks();
  });
});

describe("movePiece - backward movement", () => {
  it("moves backward from peak", () => {
    // 10 - 3 = 7
    // random=0.4 => floor(2.4)+1 = 3
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 10);
    setPlayerPhase(state, PLAYER_A, "backward");
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(7);
    expect(state.phaseA).toBe("backward");
    vi.restoreAllMocks();
  });

  it("clamps to 0 when overshooting backward", () => {
    // 3 - 6 = -3, clamped to 0
    // random=0.9 => floor(5.4)+1 = 6
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 3);
    setPlayerPhase(state, PLAYER_A, "backward");
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(0);
    expect(state.phaseA).toBe("backward");
    vi.restoreAllMocks();
  });

  it("lands exactly on 0 while backward", () => {
    // 3 - 3 = 0
    // random=0.4 => floor(2.4)+1 = 3
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 3);
    setPlayerPhase(state, PLAYER_A, "backward");
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(0);
    expect(state.phaseA).toBe("backward");
  });
});

describe("movePiece - landing on opponent", () => {
  it("sends opponent back to start when landing on them", () => {
    // A at 2, B at 5, A rolls 3 => 5, lands on B
    // random=0.4 => floor(2.4)+1 = 3
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 2);
    setPlayerPos(state, PLAYER_B, 5);
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(5);
    expect(state.posB).toBe(0);
    expect(state.phaseB).toBe("forward");
    vi.restoreAllMocks();
  });

  it("does not send opponent back when landing on position 0", () => {
    // A at 7, B at 0, A rolls 6 => 13, bounces to 7, backward
    // random=0.9 => floor(5.4)+1 = 6
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 7);
    setPlayerPos(state, PLAYER_B, 0);
    setPlayerPhase(state, PLAYER_B, "forward");
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    movePiece(state, PLAYER_A);
    expect(state.posB).toBe(0);
    vi.restoreAllMocks();
  });

  it("sends opponent back when landing on their position", () => {
    // A at 0, B at 3, A rolls 3 => 3, lands on B
    // random=0.4 => floor(2.4)+1 = 3
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 0);
    setPlayerPos(state, PLAYER_B, 3);
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(3);
    expect(state.posB).toBe(0);
    vi.restoreAllMocks();
  });

  it("opponent landing on current player sends current player back", () => {
    // B at 2, A at 5, B rolls 3 => 5, lands on A
    // random=0.4 => floor(2.4)+1 = 3
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 5);
    setPlayerPos(state, PLAYER_B, 2);
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    movePiece(state, PLAYER_B);
    expect(state.posB).toBe(5);
    expect(state.posA).toBe(0);
    expect(state.phaseA).toBe("forward");
    vi.restoreAllMocks();
  });
});

describe("movePiece - win condition", () => {
  it("player wins when returning to 0 in backward phase", () => {
    // 3 - 3 = 0, backward => win
    // random=0.4 => floor(2.4)+1 = 3
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 3);
    setPlayerPhase(state, PLAYER_A, "backward");
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const result = movePiece(state, PLAYER_A);
    expect(result.won).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(PLAYER_A);
    vi.restoreAllMocks();
  });

  it("player does not win when overshooting 0 backward (clamped to 0)", () => {
    // 2 - 6 = -4, clamped to 0, backward => win
    // random=0.9 => floor(5.4)+1 = 6
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 2);
    setPlayerPhase(state, PLAYER_A, "backward");
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const result = movePiece(state, PLAYER_A);
    expect(result.won).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(PLAYER_A);
    vi.restoreAllMocks();
  });

  it("does not win when moving forward to position 0", () => {
    // random=0 => floor(0)+1 = 1, 0+1=1, forward
    const state = createGameState("pvp");
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = movePiece(state, PLAYER_A);
    expect(result.won).toBe(false);
    expect(state.gameOver).toBe(false);
    vi.restoreAllMocks();
  });

  it("does not win when at position 0 in forward phase", () => {
    // random=0 => floor(0)+1 = 1, 0+1=1, forward
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 0);
    setPlayerPhase(state, PLAYER_A, "forward");
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = movePiece(state, PLAYER_A);
    expect(result.won).toBe(false);
    vi.restoreAllMocks();
  });
});

describe("movePiece - extra turn on 6", () => {
  it("sets extraTurn to true when rolling 6", () => {
    // random=0.9 => floor(5.4)+1 = 6
    const state = createGameState("pvp");
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    movePiece(state, PLAYER_A);
    expect(state.extraTurn).toBe(true);
    vi.restoreAllMocks();
  });

  it("sets extraTurn to false when rolling other numbers", () => {
    // random=0.5 => floor(3)+1 = 4
    const state = createGameState("pvp");
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    movePiece(state, PLAYER_A);
    expect(state.extraTurn).toBe(false);
    vi.restoreAllMocks();
  });

  it("records lastRoll correctly", () => {
    // random=0.5 => floor(3)+1 = 4
    const state = createGameState("pvp");
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    movePiece(state, PLAYER_A);
    expect(state.lastRoll).toBe(4);
    vi.restoreAllMocks();
  });
});

describe("movePiece - backward then landing on opponent at peak area", () => {
  it("sends opponent back when landing on them during backward phase", () => {
    // A at 12, backward, rolls 3 => 12-3=9, B at 9
    // random=0.4 => floor(2.4)+1 = 3
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 12);
    setPlayerPhase(state, PLAYER_A, "backward");
    setPlayerPos(state, PLAYER_B, 9);
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(9);
    expect(state.posB).toBe(0);
    expect(state.phaseB).toBe("forward");
    vi.restoreAllMocks();
  });
});

describe("checkWin", () => {
  it("returns null when game is not over", () => {
    const state = createGameState("pvp");
    expect(checkWin(state)).toBeNull();
  });

  it("returns winner when game is over", () => {
    const state = createGameState("pvp");
    state.gameOver = true;
    state.winner = PLAYER_A;
    expect(checkWin(state)).toBe(PLAYER_A);
  });

  it("returns B as winner when B wins", () => {
    const state = createGameState("pvp");
    state.gameOver = true;
    state.winner = PLAYER_B;
    expect(checkWin(state)).toBe(PLAYER_B);
  });
});

describe("movePiece - full game simulation", () => {
  it("simulates a player reaching peak and returning to win", () => {
    const state = createGameState("pvp");

    // Player A at 7, forward, rolls 5 => 12, bounces to 10-(12-10)=8, backward
    // random=0.7 => floor(4.2)+1 = 5
    setPlayerPos(state, PLAYER_A, 7);
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(8);
    expect(state.phaseA).toBe("backward");

    // Player A rolls 5 => 8-5=3, backward
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(3);
    expect(state.phaseA).toBe("backward");

    // Player A rolls 3 => 3-3=0, backward => wins
    // random=0.4 => floor(2.4)+1 = 3
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const result = movePiece(state, PLAYER_A);
    expect(state.posA).toBe(0);
    expect(result.won).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(PLAYER_A);
    vi.restoreAllMocks();
  });
});

describe("getBestAIMove", () => {
  it("returns a roll action", () => {
    const state = createGameState("pve");
    const move = getBestAIMove(state);
    expect(move).not.toBeNull();
    expect(move.type).toBe("roll");
  });
});

describe("movePiece - player B movement", () => {
  it("moves player B forward correctly", () => {
    // random=0.5 => floor(3)+1 = 4
    const state = createGameState("pvp");
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    movePiece(state, PLAYER_B);
    expect(state.posB).toBe(4);
    expect(state.phaseB).toBe("forward");
    vi.restoreAllMocks();
  });

  it("moves player B backward correctly", () => {
    // B at 12, backward, rolls 2 => 12-2=10
    // random=0.2 => floor(1.2)+1 = 2
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_B, 12);
    setPlayerPhase(state, PLAYER_B, "backward");
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    movePiece(state, PLAYER_B);
    expect(state.posB).toBe(10);
    expect(state.phaseB).toBe("backward");
    vi.restoreAllMocks();
  });
});

describe("movePiece - edge cases", () => {
  it("handles player at position 0 rolling 1 (stays at 1, forward)", () => {
    // random=0 => floor(0)+1 = 1
    const state = createGameState("pvp");
    vi.spyOn(Math, "random").mockReturnValue(0);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(1);
    expect(state.phaseA).toBe("forward");
    vi.restoreAllMocks();
  });

  it("handles exact peak approach from position 9 rolling 1", () => {
    // 9+1=10, bounces to 10
    // random=0 => floor(0)+1 = 1
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 9);
    vi.spyOn(Math, "random").mockReturnValue(0);
    movePiece(state, PLAYER_A);
    expect(state.posA).toBe(10);
    expect(state.phaseA).toBe("backward");
    vi.restoreAllMocks();
  });

  it("handles exact backward finish from position 1 rolling 1", () => {
    // 1-1=0, backward => wins
    // random=0 => floor(0)+1 = 1
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 1);
    setPlayerPhase(state, PLAYER_A, "backward");
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = movePiece(state, PLAYER_A);
    expect(state.posA).toBe(0);
    expect(result.won).toBe(true);
    vi.restoreAllMocks();
  });

  it("does not land on opponent at position 0", () => {
    // A at 5, B at 0, A rolls 6 => 11, bounces to 9
    // random=0.9 => floor(5.4)+1 = 6
    const state = createGameState("pvp");
    setPlayerPos(state, PLAYER_A, 5);
    setPlayerPos(state, PLAYER_B, 0);
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    movePiece(state, PLAYER_A);
    // A lands at 9, not 0, so B stays
    expect(state.posA).toBe(9);
    expect(state.posB).toBe(0);
    vi.restoreAllMocks();
  });
});
