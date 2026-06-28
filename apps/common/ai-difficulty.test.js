import { describe, expect, it } from "vitest";
const AIDifficulty = require("./ai-difficulty.js");

describe("AI difficulty", () => {
  it("defaults invalid levels to normal", () => {
    expect(AIDifficulty.normalizeLevel("unknown")).toBe("normal");
    expect(AIDifficulty.normalizeLevel("master")).toBe("master");
  });

  it("selects the requested profile", () => {
    const profiles = { normal: { depth: 3 }, hard: { depth: 4 } };
    expect(AIDifficulty.getProfile("hard", profiles)).toEqual({ depth: 4 });
    expect(AIDifficulty.getProfile("invalid", profiles)).toEqual({ depth: 3 });
  });

  it("picks from legal candidates", () => {
    expect(AIDifficulty.pickRandom(["a", "b"], () => 0.99)).toBe("b");
    expect(AIDifficulty.pickRandom([], () => 0)).toBeNull();
  });
});
