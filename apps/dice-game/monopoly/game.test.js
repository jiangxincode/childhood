import { describe, it, expect } from "vitest";
import {
  BOARD_DATA,
  FATE_CARDS,
  createGameState,
  generateNum,
  rollDice,
  movePlayer,
  calculateRent,
  handleLanding,
  buyProperty,
  upgradeProperty,
  checkBankrupt,
  confiscateProperties,
  checkGameOver,
  npcDecision,
  advanceTurn,
} from "./game.js";

describe("Monopoly - Constants", () => {
  it("should have 30 board squares", () => {
    expect(BOARD_DATA).toHaveLength(30);
  });

  it("should have 31 fate cards", () => {
    expect(FATE_CARDS).toHaveLength(31);
  });

  it("first square should be Go (起点)", () => {
    expect(BOARD_DATA[0].name).toBe("起点");
    expect(BOARD_DATA[0].type).toBe("goodEvent");
  });

  it("jail should be at position 11", () => {
    expect(BOARD_DATA[11].name).toBe("监狱");
    expect(BOARD_DATA[11].type).toBe("jail");
  });
});

describe("Monopoly - generateNum", () => {
  it("should return value in [min, max] inclusive", () => {
    for (let i = 0; i < 200; i++) {
      const result = generateNum(1, 6);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });

  it("should be able to return 6 (bug fix)", () => {
    let found6 = false;
    for (let i = 0; i < 200; i++) {
      if (generateNum(1, 6) === 6) found6 = true;
    }
    expect(found6).toBe(true);
  });

  it("should handle range [0, 30] for fate cards", () => {
    for (let i = 0; i < 300; i++) {
      const result = generateNum(0, 30);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(30);
    }
  });
});

describe("Monopoly - createGameState", () => {
  it("should create correct number of players", () => {
    const state = createGameState(2, 1, 15000);
    expect(state.players).toHaveLength(3);
  });

  it("first N players should be human", () => {
    const state = createGameState(2, 2, 15000);
    expect(state.players[0].isHuman).toBe(true);
    expect(state.players[1].isHuman).toBe(true);
    expect(state.players[2].isHuman).toBe(false);
    expect(state.players[3].isHuman).toBe(false);
  });

  it("all players start at position 0 with startMoney", () => {
    const state = createGameState(2, 0, 20000);
    state.players.forEach((p) => {
      expect(p.position).toBe(0);
      expect(p.money).toBe(20000);
      expect(p.state).toBe("active");
      expect(p.stop).toBe(0);
    });
  });

  it("board should have correct initial state", () => {
    const state = createGameState(2, 0, 15000);
    state.board.forEach((place) => {
      expect(place.owner).toBe(-1);
      expect(place.level).toBe(0);
    });
  });
});

describe("Monopoly - rollDice", () => {
  it("should return value between 1 and 6", () => {
    for (let i = 0; i < 100; i++) {
      expect(rollDice()).toBeGreaterThanOrEqual(1);
      expect(rollDice()).toBeLessThanOrEqual(6);
    }
  });
});

describe("Monopoly - movePlayer", () => {
  it("should move player forward by steps", () => {
    const state = createGameState(2, 0, 15000);
    movePlayer(state, 0, 3);
    expect(state.players[0].position).toBe(3);
  });

  it("should handle passing start (position wraps)", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].position = 28;
    movePlayer(state, 0, 4);
    expect(state.players[0].position).toBe(2);
  });
});

describe("Monopoly - calculateRent", () => {
  it("should return 20% of value for level 0", () => {
    const rent = calculateRent({ type: "property", value: 5000, level: 0 });
    expect(rent).toBe(1000); // 5000/5
  });

  it("should return 50% of value for level 1", () => {
    const rent = calculateRent({ type: "property", value: 5000, level: 1 });
    expect(rent).toBe(2500); // 5000/2
  });

  it("should return 100% of value for level 2", () => {
    const rent = calculateRent({ type: "property", value: 5000, level: 2 });
    expect(rent).toBe(5000);
  });

  it("should return ~200% for level 3", () => {
    const rent = calculateRent({ type: "property", value: 5000, level: 3 });
    expect(rent).toBeGreaterThan(5000);
  });

  it("should return 0 for non-property", () => {
    expect(calculateRent({ type: "jail", value: 0, level: 0 })).toBe(0);
  });
});

describe("Monopoly - buyProperty", () => {
  it("should buy unowned property", () => {
    const state = createGameState(2, 0, 15000);
    const result = buyProperty(state, 0, 1); // China $5000
    expect(result).toBe(true);
    expect(state.board[1].owner).toBe(0);
    expect(state.players[0].money).toBe(10000);
  });

  it("should not buy already owned property", () => {
    const state = createGameState(2, 0, 15000);
    state.board[1].owner = 1;
    expect(buyProperty(state, 0, 1)).toBe(false);
  });

  it("should not buy if insufficient funds (money <= value)", () => {
    const state = createGameState(2, 0, 5000);
    expect(buyProperty(state, 0, 1)).toBe(false); // need > 5000
  });
});

describe("Monopoly - upgradeProperty", () => {
  it("should upgrade own property", () => {
    const state = createGameState(2, 0, 15000);
    state.board[1].owner = 0;
    const result = upgradeProperty(state, 0, 1);
    expect(result).toBe(true);
    expect(state.board[1].level).toBe(1);
  });

  it("should not upgrade others property", () => {
    const state = createGameState(2, 0, 15000);
    state.board[1].owner = 1;
    expect(upgradeProperty(state, 0, 1)).toBe(false);
  });

  it("should not upgrade past level 3", () => {
    const state = createGameState(2, 0, 100000);
    state.board[1].owner = 0;
    state.board[1].level = 3;
    expect(upgradeProperty(state, 0, 1)).toBe(false);
  });

  it("should not upgrade if insufficient funds (money <= cost)", () => {
    const state = createGameState(2, 0, 2500);
    state.board[1].owner = 0;
    expect(upgradeProperty(state, 0, 1)).toBe(false); // 2500 <= 2500
  });
});

describe("Monopoly - checkBankrupt", () => {
  it("should detect bankruptcy when money < 0", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].money = -100;
    expect(checkBankrupt(state, 0)).toBe(true);
  });

  it("should not detect bankruptcy when money >= 0", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].money = 0;
    expect(checkBankrupt(state, 0)).toBe(false);
  });
});

describe("Monopoly - confiscateProperties", () => {
  it("should reset all properties of bankrupt player", () => {
    const state = createGameState(2, 0, 15000);
    state.board[1].owner = 0;
    state.board[1].level = 2;
    confiscateProperties(state, 0);
    expect(state.board[1].owner).toBe(-1);
    expect(state.board[1].level).toBe(0);
  });
});

describe("Monopoly - checkGameOver", () => {
  it("should detect game over with 1 active player", () => {
    const state = createGameState(2, 0, 15000);
    state.players[1].state = "bankrupt";
    expect(checkGameOver(state)).toBe(true);
    expect(state.winner).toBe(0);
  });

  it("should not detect game over with 2+ active players", () => {
    const state = createGameState(2, 0, 15000);
    expect(checkGameOver(state)).toBe(false);
  });
});

describe("Monopoly - npcDecision", () => {
  it("should buy if money - value > 3000", () => {
    const state = createGameState(0, 2, 10000);
    expect(npcDecision(state, 0, "buyOffer", { value: 5000 })).toBe(true);
  });

  it("should not buy if money - value <= 3000", () => {
    const state = createGameState(0, 2, 7000);
    expect(npcDecision(state, 0, "buyOffer", { value: 5000 })).toBe(false);
  });

  it("should upgrade if money - cost > 2000", () => {
    const state = createGameState(0, 2, 10000);
    expect(npcDecision(state, 0, "upgradeOffer", { cost: 2500 })).toBe(true);
  });

  it("should not upgrade if money - cost <= 2000", () => {
    const state = createGameState(0, 2, 4000);
    expect(npcDecision(state, 0, "upgradeOffer", { cost: 2500 })).toBe(false);
  });
});

describe("Monopoly - advanceTurn", () => {
  it("should advance to next active player", () => {
    const state = createGameState(3, 0, 15000);
    state.currentPlayer = 0;
    const next = advanceTurn(state);
    expect(next).toBe(1);
  });

  it("should skip bankrupt players", () => {
    const state = createGameState(3, 0, 15000);
    state.players[1].state = "bankrupt";
    state.currentPlayer = 0;
    const next = advanceTurn(state);
    expect(next).toBe(2);
  });

  it("should skip players with stop > 0", () => {
    const state = createGameState(3, 0, 15000);
    state.players[1].stop = 2;
    state.currentPlayer = 0;
    const next = advanceTurn(state);
    expect(next).toBe(2);
    expect(state.players[1].stop).toBe(1);
  });
});

describe("Monopoly - handleLanding", () => {
  it("should offer to buy unowned property", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].position = 1;
    const result = handleLanding(state, 0);
    expect(result.type).toBe("buyOffer");
  });

  it("should offer upgrade for own property", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].position = 1;
    state.board[1].owner = 0;
    const result = handleLanding(state, 0);
    expect(result.type).toBe("upgradeOffer");
  });

  it("should charge rent for others property", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].position = 1;
    state.board[1].owner = 1;
    const result = handleLanding(state, 0);
    expect(result.type).toBe("payRent");
    expect(result.data.rent).toBe(1000);
  });

  it("should handle airport teleport", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].position = 7;
    const result = handleLanding(state, 0);
    expect(result.type).toBe("airport");
    expect(state.players[0].position).toBe(23); // 30 - 7
    expect(state.players[0].money).toBe(14200);
  });

  it("should send player to jail on jail square", () => {
    const state = createGameState(2, 0, 15000);
    state.players[0].position = 11;
    const result = handleLanding(state, 0);
    expect(result.type).toBe("jail");
    expect(state.players[0].stop).toBeGreaterThan(0);
  });
});
