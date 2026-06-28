import { describe, expect, it } from "vitest";
const {
  CARD_NAMES,
  dealCards,
  findCardHolder,
  determinePenaltyTarget,
  calculatePenaltyCount,
  resolveRoyalDecision,
  formatPenaltyResult,
  createGameState,
  shouldRevealPlayer,
  isValidChoice,
  PHASES,
  getPhaseChoices,
  applyChoice,
} = require("./game.js");
const { chooseSuspect } = require("./ai.js");

function fixedPlayers() {
  return [
    { id: 0, name: "你", cards: ["布告", "强盗", "花样官", "皇帝"] },
    { id: 1, name: "小明", cards: ["法官", "指挥官", "数量官", "皇后"] },
    { id: 2, name: "小红", cards: ["警长", "小偷", "加减官", "打手"] },
    { id: 3, name: "小军", cards: ["警察1", "警察2", "土匪", "轻重官"] },
  ];
}

describe("游戏模式", () => {
  it("本地模式由4名真人轮流操作", () => {
    const state = createGameState("pvp", () => 0.5);
    expect(state.players.every((player) => player.isHuman)).toBe(true);
    expect(state.players.map((player) => player.name)).toEqual([
      "玩家1",
      "玩家2",
      "玩家3",
      "玩家4",
    ]);
  });

  it("人机模式由1名真人和3名电脑组成", () => {
    const state = createGameState("pve", () => 0.5);
    expect(state.players.filter((player) => player.isHuman)).toHaveLength(1);
  });

  it("联网模式由2名真人和2名电脑组成", () => {
    const state = createGameState("online", () => 0.5);
    expect(state.players.filter((player) => player.isHuman)).toHaveLength(2);
    expect(state.players.filter((player) => !player.isHuman)).toHaveLength(2);
  });

  it("只向当前玩家展示私人手牌", () => {
    const state = createGameState("pvp", () => 0.5);
    expect(shouldRevealPlayer(state, 2, 2)).toBe(true);
    expect(shouldRevealPlayer(state, 1, 2)).toBe(false);
    expect(shouldRevealPlayer(state, 1, null, true)).toBe(true);
  });

  it("校验联网玩家提交的阶段选项", () => {
    const state = createGameState("online", () => 0.5);
    expect(isValidChoice(state, "wanted", "小偷")).toBe(true);
    expect(isValidChoice(state, "wanted", "皇帝")).toBe(false);
  });
});
describe("布告棋发牌", () => {
  it("将16张不同的牌平均分给4名玩家", () => {
    const players = dealCards(() => 0.5);
    expect(players).toHaveLength(4);
    expect(players.every((player) => player.cards.length === 4)).toBe(true);
    expect(new Set(players.flatMap((player) => player.cards))).toEqual(new Set(CARD_NAMES));
  });

  it("能找到每张牌的持有者", () => {
    expect(findCardHolder(fixedPlayers(), "小偷")).toBe(2);
    expect(findCardHolder(fixedPlayers(), "不存在")).toBe(-1);
  });
});

describe("完整回合", () => {
  it.each(["pvp", "pve", "online"])("%s模式可以完成全部判罚阶段", (mode) => {
    const state = createGameState(mode, () => 0.5);
    while (PHASES[state.phaseIndex] !== "result") {
      const phase = PHASES[state.phaseIndex];
      const choice = getPhaseChoices(state, phase)[0];
      applyChoice(state, phase, choice.value, () => 0);
      state.phaseIndex++;
    }
    expect(formatPenaltyResult(state.players, state.round)).toContain("判罚结果");
  });
});
describe("抓捕判定", () => {
  it("抓对时处罚坏人", () => {
    const result = determinePenaltyTarget(fixedPlayers(), "小偷", "指挥官", 2);
    expect(result.caught).toBe(true);
    expect(result.targetId).toBe(2);
  });

  it("抓错时处罚抓捕者", () => {
    const result = determinePenaltyTarget(fixedPlayers(), "小偷", "指挥官", 3);
    expect(result.caught).toBe(false);
    expect(result.targetId).toBe(1);
  });

  it("电脑持有通缉牌时会指认自己", () => {
    expect(chooseSuspect(fixedPlayers(), 2, "小偷", () => 0)).toBe(2);
  });
});

describe("判罚规则", () => {
  it("加减后的处罚次数至少为1", () => {
    expect(calculatePenaltyCount(1, -2)).toBe(1);
    expect(calculatePenaltyCount(4, 2)).toBe(6);
  });

  it("皇帝皇后意见一致时直接采用共同决定", () => {
    expect(resolveRoyalDecision(true, true)).toEqual({ execute: true, winner: null });
    expect(resolveRoyalDecision(false, false)).toEqual({ execute: false, winner: null });
  });

  it("意见不同时由猜拳胜者的意见决定", () => {
    expect(resolveRoyalDecision(true, false, () => 0)).toEqual({ execute: true, winner: "皇帝" });
    expect(resolveRoyalDecision(true, false, () => 0.9)).toEqual({
      execute: false,
      winner: "皇后",
    });
  });

  it("生成仅用于展示的判罚文本", () => {
    const round = {
      target: { targetId: 2 },
      royal: { execute: true },
      baseCount: 3,
      adjustment: -1,
      severity: "light",
      style: "做鬼脸",
    };
    expect(formatPenaltyResult(fixedPlayers(), round)).toBe(
      "判罚结果：小红监督小红轻轻地做鬼脸2次。"
    );
  });
});
