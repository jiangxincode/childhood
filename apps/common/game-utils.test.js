import { describe, it, expect } from "vitest";
const { judgeRPS, getRPSName, shuffleArray } = require("./game-utils.js");

describe("judgeRPS", () => {
  it("returns 0 for draw (rock vs rock)", () => {
    expect(judgeRPS("rock", "rock")).toBe(0);
  });
  it("returns 0 for draw (scissors vs scissors)", () => {
    expect(judgeRPS("scissors", "scissors")).toBe(0);
  });
  it("returns 0 for draw (paper vs paper)", () => {
    expect(judgeRPS("paper", "paper")).toBe(0);
  });
  it("rock beats scissors", () => {
    expect(judgeRPS("rock", "scissors")).toBe(1);
  });
  it("scissors beats paper", () => {
    expect(judgeRPS("scissors", "paper")).toBe(1);
  });
  it("paper beats rock", () => {
    expect(judgeRPS("paper", "rock")).toBe(1);
  });
  it("scissors loses to rock", () => {
    expect(judgeRPS("scissors", "rock")).toBe(-1);
  });
  it("paper loses to scissors", () => {
    expect(judgeRPS("paper", "scissors")).toBe(-1);
  });
  it("rock loses to paper", () => {
    expect(judgeRPS("rock", "paper")).toBe(-1);
  });
});

describe("getRPSName", () => {
  it("translates rock to 石头", () => {
    expect(getRPSName("rock")).toBe("石头");
  });
  it("translates scissors to 剪刀", () => {
    expect(getRPSName("scissors")).toBe("剪刀");
  });
  it("translates paper to 布", () => {
    expect(getRPSName("paper")).toBe("布");
  });
  it("returns original value for unknown", () => {
    expect(getRPSName("unknown")).toBe("unknown");
  });
});

describe("shuffleArray", () => {
  it("preserves all elements", () => {
    var arr = [1, 2, 3, 4, 5];
    shuffleArray(arr);
    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("preserves array length", () => {
    var arr = [1, 2, 3, 4, 5, 6, 7, 8];
    shuffleArray(arr);
    expect(arr.length).toBe(8);
  });
  it("works with empty array", () => {
    var arr = [];
    shuffleArray(arr);
    expect(arr).toEqual([]);
  });
  it("works with single element", () => {
    var arr = [42];
    shuffleArray(arr);
    expect(arr).toEqual([42]);
  });
  it("returns the same array reference", () => {
    var arr = [1, 2, 3];
    var result = shuffleArray(arr);
    expect(result).toBe(arr);
  });
});

const { getCurrentPlayerLabel } = require("./game-utils.js");

describe("getCurrentPlayerLabel", () => {
  it("returns dash when currentSide is null", () => {
    const r = getCurrentPlayerLabel({ mode: "pve", currentSide: null, playerSide: "red" });
    expect(r.text).toBe("—");
    expect(r.role).toBe("unknown");
  });

  it("returns dash when not assigned and aiFirst is unknown", () => {
    const r = getCurrentPlayerLabel({
      mode: "pve",
      currentSide: "red",
      playerSide: null,
      assigned: false,
    });
    expect(r.text).toBe("—");
    expect(r.role).toBe("unknown");
  });

  it("uses aiFirst when PVE is not assigned yet (player first)", () => {
    const r = getCurrentPlayerLabel({
      mode: "pve",
      currentSide: "red",
      assigned: false,
      aiFirst: false,
    });
    expect(r.text).toBe("玩家");
    expect(r.role).toBe("player");
  });

  it("uses aiFirst when PVE is not assigned yet (AI first)", () => {
    const r = getCurrentPlayerLabel({
      mode: "pve",
      currentSide: "red",
      assigned: false,
      aiFirst: true,
    });
    expect(r.text).toBe("电脑");
    expect(r.role).toBe("ai");
  });

  it("returns 玩家 in PVE when current side equals player side", () => {
    const r = getCurrentPlayerLabel({ mode: "pve", currentSide: "red", playerSide: "red" });
    expect(r.text).toBe("玩家");
    expect(r.role).toBe("player");
  });

  it("returns 电脑 in PVE when current side differs from player side", () => {
    const r = getCurrentPlayerLabel({ mode: "pve", currentSide: "blue", playerSide: "red" });
    expect(r.text).toBe("电脑");
    expect(r.role).toBe("ai");
  });

  it("returns 玩家1 in PVP when current side is the first side", () => {
    const r = getCurrentPlayerLabel({
      mode: "pvp",
      currentSide: "red",
      sidesOrder: ["red", "blue"],
    });
    expect(r.text).toBe("玩家1");
    expect(r.role).toBe("playerN");
  });

  it("returns 玩家2 in PVP when current side is the second side", () => {
    const r = getCurrentPlayerLabel({
      mode: "pvp",
      currentSide: "blue",
      sidesOrder: ["red", "blue"],
    });
    expect(r.text).toBe("玩家2");
    expect(r.role).toBe("playerN");
  });

  it("supports more than two players in PVP", () => {
    const r = getCurrentPlayerLabel({
      mode: "pvp",
      currentSide: 3,
      sidesOrder: [1, 2, 3, 4],
    });
    expect(r.text).toBe("玩家3");
  });

  it("returns dash in PVE when playerSide is missing and aiFirst is unknown", () => {
    const r = getCurrentPlayerLabel({ mode: "pve", currentSide: "red" });
    expect(r.text).toBe("—");
  });
});
