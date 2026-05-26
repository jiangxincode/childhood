import { describe, it, expect } from "vitest";
const {
  ANIMAL_NAMES,
  RANK_MAP,
  DIRECTIONS,
  getImagePath,
  getRank,
  judgeRPS,
  inBounds,
  canCapture,
  isMutualDestruction,
  createGameState,
  getValidMoves,
  getValidCaptures,
  flipCard,
  moveCard,
  captureCard,
  hasAnyLegalAction,
  checkGameOver,
  aiDecide,
} = require("./game.js");

// ============================================================
// Helper Functions
// ============================================================
function emptyBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

function makeCard(animal, team, faceUp = true) {
  return { animal, team, rank: RANK_MAP[animal], faceUp };
}

function makeState(board, currentTeam, opts = {}) {
  return {
    mode: opts.mode || "pvp",
    board,
    currentTeam,
    playerTeam: opts.playerTeam || null,
    aiTeam: opts.aiTeam || null,
    teamAssigned: opts.teamAssigned !== undefined ? opts.teamAssigned : true,
    firstPlayer: opts.firstPlayer || null,
    turnCount: opts.turnCount || 0,
    capturedRed: opts.capturedRed || [],
    capturedBlue: opts.capturedBlue || [],
    selectedCell: null,
    gameOver: opts.gameOver || false,
    winner: opts.winner || null,
    aiThinking: false,
    aiFirst: opts.aiFirst || false,
  };
}

// ============================================================
// constants - constant definitions
// ============================================================
describe("constants - 常量定义", () => {
  it("ANIMAL_NAMES 包含 8 种动物", () => {
    expect(ANIMAL_NAMES).toHaveLength(8);
    expect(ANIMAL_NAMES).toEqual(["象", "狮", "虎", "豹", "狼", "狗", "猫", "鼠"]);
  });

  it("RANK_MAP 包含 8 个等级映射", () => {
    expect(Object.keys(RANK_MAP)).toHaveLength(8);
    expect(RANK_MAP["象"]).toBe(1);
    expect(RANK_MAP["狮"]).toBe(2);
    expect(RANK_MAP["虎"]).toBe(3);
    expect(RANK_MAP["豹"]).toBe(4);
    expect(RANK_MAP["狼"]).toBe(5);
    expect(RANK_MAP["狗"]).toBe(6);
    expect(RANK_MAP["猫"]).toBe(7);
    expect(RANK_MAP["鼠"]).toBe(8);
  });

  it("DIRECTIONS 包含 4 个方向偏移量", () => {
    expect(DIRECTIONS).toHaveLength(4);
    expect(DIRECTIONS).toContainEqual({ dx: -1, dy: 0 });
    expect(DIRECTIONS).toContainEqual({ dx: 1, dy: 0 });
    expect(DIRECTIONS).toContainEqual({ dx: 0, dy: -1 });
    expect(DIRECTIONS).toContainEqual({ dx: 0, dy: 1 });
  });
});

// ============================================================
// getImagePath - image path
// ============================================================
describe("getImagePath - 图片路径", () => {
  it('红方棋子返回 "红-动物" 格式路径', () => {
    expect(getImagePath("red", "象")).toBe("images/红-象.png");
    expect(getImagePath("red", "鼠")).toBe("images/红-鼠.png");
  });

  it('蓝方棋子返回 "蓝-动物" 格式路径', () => {
    expect(getImagePath("blue", "象")).toBe("images/蓝-象.png");
    expect(getImagePath("blue", "鼠")).toBe("images/蓝-鼠.png");
  });
});

// ============================================================
// getRank - get rank
// ============================================================
describe("getRank - 获取等级", () => {
  it("各动物等级正确", () => {
    expect(getRank("象")).toBe(1);
    expect(getRank("狮")).toBe(2);
    expect(getRank("虎")).toBe(3);
    expect(getRank("豹")).toBe(4);
    expect(getRank("狼")).toBe(5);
    expect(getRank("狗")).toBe(6);
    expect(getRank("猫")).toBe(7);
    expect(getRank("鼠")).toBe(8);
  });
});

// ============================================================
// judgeRPS - Rock-Paper-Scissors judgment (9 combinations)
// ============================================================
describe("judgeRPS - Rock-Paper-Scissors判定", () => {
  // Draw
  it("rock vs rock = 0（平局）", () => {
    expect(judgeRPS("rock", "rock")).toBe(0);
  });
  it("scissors vs scissors = 0（平局）", () => {
    expect(judgeRPS("scissors", "scissors")).toBe(0);
  });
  it("paper vs paper = 0（平局）", () => {
    expect(judgeRPS("paper", "paper")).toBe(0);
  });

  // First player wins
  it("rock vs scissors = 1（第一方胜）", () => {
    expect(judgeRPS("rock", "scissors")).toBe(1);
  });
  it("scissors vs paper = 1（第一方胜）", () => {
    expect(judgeRPS("scissors", "paper")).toBe(1);
  });
  it("paper vs rock = 1（第一方胜）", () => {
    expect(judgeRPS("paper", "rock")).toBe(1);
  });

  // Second player wins
  it("rock vs paper = -1（第二方胜）", () => {
    expect(judgeRPS("rock", "paper")).toBe(-1);
  });
  it("scissors vs rock = -1（第二方胜）", () => {
    expect(judgeRPS("scissors", "rock")).toBe(-1);
  });
  it("paper vs scissors = -1（第二方胜）", () => {
    expect(judgeRPS("paper", "scissors")).toBe(-1);
  });
});

// ============================================================
// inBounds - boundary check
// ============================================================
describe("inBounds - 边界检测", () => {
  it("(0,0) 在board内", () => {
    expect(inBounds(0, 0)).toBe(true);
  });
  it("(3,3) 在board内", () => {
    expect(inBounds(3, 3)).toBe(true);
  });
  it("(-1,0) 在board外", () => {
    expect(inBounds(-1, 0)).toBe(false);
  });
  it("(4,0) 在board外", () => {
    expect(inBounds(4, 0)).toBe(false);
  });
  it("(0,-1) 在board外", () => {
    expect(inBounds(0, -1)).toBe(false);
  });
  it("(0,4) 在board外", () => {
    expect(inBounds(0, 4)).toBe(false);
  });
});

// ============================================================
// canCapture - capture judgment (key)
// ============================================================
describe("canCapture - 吃牌判定", () => {
  it("高等级吃低等级：象(1)吃狮(2) → true", () => {
    const attacker = { animal: "象", team: "red", rank: 1, faceUp: true };
    const defender = { animal: "狮", team: "blue", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("低等级不能吃高等级：猫(7)吃虎(3) → false", () => {
    const attacker = { animal: "猫", team: "red", rank: 7, faceUp: true };
    const defender = { animal: "虎", team: "blue", rank: 3, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("同级同归于尽：象(1)吃象(1) → true", () => {
    const attacker = { animal: "象", team: "red", rank: 1, faceUp: true };
    const defender = { animal: "象", team: "blue", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("逆袭：鼠(8)吃象(1) → true", () => {
    const attacker = { animal: "鼠", team: "red", rank: 8, faceUp: true };
    const defender = { animal: "象", team: "blue", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("逆袭限制：象(1)吃鼠(8) → false", () => {
    const attacker = { animal: "象", team: "red", rank: 1, faceUp: true };
    const defender = { animal: "鼠", team: "blue", rank: 8, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("同阵营不能吃：red象吃red狮 → false", () => {
    const attacker = { animal: "象", team: "red", rank: 1, faceUp: true };
    const defender = { animal: "狮", team: "red", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });
});

// ============================================================
// isMutualDestruction - mutual destruction check
// ============================================================
describe("isMutualDestruction - 同归于尽判定", () => {
  it("同级返回 true", () => {
    const attacker = { animal: "象", team: "red", rank: 1, faceUp: true };
    const defender = { animal: "象", team: "blue", rank: 1, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(true);
  });

  it("不同级返回 false", () => {
    const attacker = { animal: "象", team: "red", rank: 1, faceUp: true };
    const defender = { animal: "狮", team: "blue", rank: 2, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(false);
  });
});

// ============================================================
// createGameState - initial game state creation
// ============================================================
describe("createGameState - 初始Game state", () => {
  it("pvp 模式初始状态验证", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentTeam).toBeNull();
    expect(state.teamAssigned).toBe(false);
    expect(state.turnCount).toBe(0);
    expect(state.capturedRed).toEqual([]);
    expect(state.capturedBlue).toEqual([]);
    expect(state.selectedCell).toBeNull();
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.aiThinking).toBe(false);
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
    expect(state.firstPlayer).toBeNull();
  });

  it("board为 4x4，包含恰好 16 张暗牌", () => {
    const state = createGameState("pvp");
    expect(state.board).toHaveLength(4);
    let cardCount = 0;
    for (let y = 0; y < 4; y++) {
      expect(state.board[y]).toHaveLength(4);
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        expect(card).not.toBeNull();
        expect(card.faceUp).toBe(false);
        cardCount++;
      }
    }
    expect(cardCount).toBe(16);
  });

  it("红蓝各 8 张，每方 8 种动物各一张", () => {
    const state = createGameState("pvp");
    const redAnimals = [];
    const blueAnimals = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        if (card.team === "red") redAnimals.push(card.animal);
        else blueAnimals.push(card.animal);
      }
    }
    expect(redAnimals.sort()).toEqual([...ANIMAL_NAMES].sort());
    expect(blueAnimals.sort()).toEqual([...ANIMAL_NAMES].sort());
  });

  it("每张牌包含 animal、team、rank、faceUp 属性", () => {
    const state = createGameState("pvp");
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        expect(card).toHaveProperty("animal");
        expect(card).toHaveProperty("team");
        expect(card).toHaveProperty("rank");
        expect(card).toHaveProperty("faceUp");
        expect(["red", "blue"]).toContain(card.team);
        expect(ANIMAL_NAMES).toContain(card.animal);
      }
    }
  });
});

// ============================================================
// getValidMoves - valid move detection
// ============================================================
describe("getValidMoves - 合法移动检测", () => {
  it("中心位置四周为空时返回 4 个相邻空位", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it("角落位置返回 2 个相邻空位", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("鼠", "blue");
    const moves = getValidMoves(board, 0, 0);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
  });

  it("四周被占据时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[0][1] = makeCard("狮", "blue");
    board[2][1] = makeCard("虎", "blue");
    board[1][0] = makeCard("豹", "blue");
    board[1][2] = makeCard("狼", "red");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(0);
  });

  it("空位返回空数组", () => {
    const board = emptyBoard();
    const moves = getValidMoves(board, 0, 0);
    expect(moves).toHaveLength(0);
  });
});

// ============================================================
// getValidCaptures - valid capture detection
// ============================================================
describe("getValidCaptures - 合法吃牌检测", () => {
  it("相邻有可吃的对方已翻开牌时返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("同阵营不可吃", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "red");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("暗牌不可吃", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue", false);
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("逆袭：鼠可以吃相邻的象", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("鼠", "red");
    board[1][2] = makeCard("象", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("象不能吃相邻的鼠（逆袭限制）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("鼠", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("棋子未翻开时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red", false);
    board[1][2] = makeCard("狮", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("棋子不属于指定阵营时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "blue");
    board[1][2] = makeCard("狮", "red");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });
});

// ============================================================
// flipCard - flip operation
// ============================================================
describe("flipCard - 翻牌操作", () => {
  it("翻开暗牌成功", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red", false);
    const state = makeState(board, "red");
    const result = flipCard(state, 0, 0);
    expect(result).not.toBeNull();
    expect(result.board[0][0].faceUp).toBe(true);
  });

  it("已翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red", true);
    const state = makeState(board, "red");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("空位返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("坐标越界返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(flipCard(state, -1, 0)).toBeNull();
    expect(flipCard(state, 4, 0)).toBeNull();
  });

  it("首次翻牌设置 teamAssigned 和 currentTeam（PVP 模式）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red", false);
    const state = makeState(board, null, { teamAssigned: false, mode: "pvp" });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    // PVP mode: currentTeam should switch after first flip
    expect(state.currentTeam).not.toBeNull();
  });

  it("首次翻牌设置 playerTeam 和 aiTeam（PVE 模式）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red", false);
    const state = makeState(board, null, { teamAssigned: false, mode: "pve" });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.playerTeam).toBe("red");
    expect(state.aiTeam).toBe("blue");
  });

  it("翻牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red", false);
    const state = makeState(board, "red");
    flipCard(state, 0, 0);
    expect(state.currentTeam).toBe("blue");
  });

  it("翻牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red", false);
    const state = makeState(board, "red", { turnCount: 3 });
    flipCard(state, 0, 0);
    expect(state.turnCount).toBe(4);
  });
});

// ============================================================
// moveCard - move operation
// ============================================================
describe("moveCard - 走牌操作", () => {
  it("正常移动到相邻空位", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    const state = makeState(board, "red");
    const result = moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].animal).toBe("象");
    expect(result.board[1][2].team).toBe("red");
  });

  it("非相邻位置返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("斜向移动返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it("目标非空返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("非己方牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "blue");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("未翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red", false);
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("起始位置为空返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });

  it("走牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    const state = makeState(board, "red");
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("blue");
  });

  it("走牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    const state = makeState(board, "red", { turnCount: 5 });
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(6);
  });
});

// ============================================================
// captureCard - capture operation
// ============================================================
describe("captureCard - 吃牌操作", () => {
  it("普通吃牌：高吃低，攻击方移到被吃方位置", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].animal).toBe("象");
    expect(result.board[1][2].team).toBe("red");
  });

  it("同归于尽：同级双方都移除", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("象", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2]).toBeNull();
  });

  it("同归于尽时双方都加入被吃列表", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("虎", "red");
    board[1][2] = makeCard("虎", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain("虎");
    expect(state.capturedBlue).toContain("虎");
  });

  it("被吃方加入对应阵营的被吃列表（蓝方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedBlue).toContain("狮");
  });

  it("被吃方加入对应阵营的被吃列表（红方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "blue");
    board[1][2] = makeCard("狮", "red");
    const state = makeState(board, "blue");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain("狮");
  });

  it("吃牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("blue");
  });

  it("吃牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    const state = makeState(board, "red", { turnCount: 3 });
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(4);
  });

  it("不满足吃牌规则返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("猫", "red");
    board[1][2] = makeCard("虎", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue", false);
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方为己方牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "red");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("曼哈顿距离不为 1 返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    board[0][2] = makeCard("狮", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("攻击方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red", false);
    board[1][2] = makeCard("狮", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("攻击方不属于当前行动方返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "blue");
    board[1][2] = makeCard("狮", "red");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方位置为空返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("逆袭吃牌：鼠吃象成功", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("鼠", "red");
    board[1][2] = makeCard("象", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].animal).toBe("鼠");
    expect(state.capturedBlue).toContain("象");
  });
});

// ============================================================
// hasAnyLegalAction - legal action detection
// ============================================================
describe("hasAnyLegalAction - 合法操作检测", () => {
  it("有未翻开的牌时返回 true", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red", false);
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("己方已翻开的牌有合法走牌时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    // Surrounding has empty cells
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("己方已翻开的牌有合法吃牌时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    // Surrounding occupied but can capture lion
    board[1][0] = makeCard("虎", "red");
    board[0][1] = makeCard("豹", "red");
    board[2][1] = makeCard("狼", "red");
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("全被占且无吃牌机会且无未翻开的牌时返回 false", () => {
    const board = emptyBoard();
    // Red rat surrounded by higher-rank blue cards, rat cannot capture them (except elephant, not placed here)
    board[1][1] = makeCard("猫", "red");
    board[1][0] = makeCard("狮", "blue");
    board[1][2] = makeCard("虎", "blue");
    board[0][1] = makeCard("豹", "blue");
    board[2][1] = makeCard("狼", "blue");
    // Cat(7) cannot capture lion(2), tiger(3), leopard(4), wolf(5)
    expect(hasAnyLegalAction(board, "red")).toBe(false);
  });

  it("board上无己方牌且无未翻开的牌时返回 false", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "blue");
    expect(hasAnyLegalAction(board, "red")).toBe(false);
  });

  it("空board返回 false", () => {
    const board = emptyBoard();
    expect(hasAnyLegalAction(board, "red")).toBe(false);
  });
});

// ============================================================
// checkGameOver - game over check
// ============================================================
describe("checkGameOver - 游戏结束判定", () => {
  it("红方无牌时蓝方获胜", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("blue");
  });

  it("蓝方无牌时红方获胜", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    const result = checkGameOver(board, "blue");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("red");
  });

  it("当前方无合法操作时对方获胜", () => {
    const board = emptyBoard();
    // Red cat completely surrounded and cannot capture any card
    board[1][1] = makeCard("猫", "red");
    board[1][0] = makeCard("狮", "blue");
    board[1][2] = makeCard("虎", "blue");
    board[0][1] = makeCard("豹", "blue");
    board[2][1] = makeCard("狼", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("blue");
  });

  it("游戏进行中返回 ended=false", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    board[3][3] = makeCard("狮", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("有未翻开的牌时游戏未结束", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    board[3][3] = makeCard("狮", "blue", false);
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("双方棋子都被同归于尽吃光时为平局", () => {
    const board = emptyBoard();
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("draw");
  });

  it("无吃子动作连续达到上限时判平局（防止死循环）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    board[3][3] = makeCard("象", "blue");
    const state = makeState(board, "red");
    state.noCaptureActions = 50;
    const result = checkGameOver(state.board, state.currentTeam, state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("draw");
  });

  it("局面重复达到上限时判平局（防止死循环）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("象", "red");
    board[3][3] = makeCard("象", "blue");
    const state = makeState(board, "red");
    // Simulate the same position appearing 3 times in history.
    const fakeKey = JSON.stringify(state.board) + "|red";
    state.positionHistory = { [fakeKey]: 3 };
    const result = checkGameOver(state.board, state.currentTeam, state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("draw");
  });

  it("反复来回移动触发平局（端到端）", () => {
    // Two pieces that cannot capture each other (both face-up rats; same rank
    // would mutually destruct, so we use rank 4 vs 5 isolated by distance so
    // they cannot capture). Each side just shuffles back and forth.
    const board = emptyBoard();
    board[0][0] = makeCard("豹", "red"); // rank 4
    board[3][3] = makeCard("豹", "blue"); // rank 4 (different team, far apart)
    const state = makeState(board, "red", { teamAssigned: true });
    state.noCaptureActions = 0;
    state.positionHistory = {};
    // Keep moving the red piece between (0,0) and (1,0); blue between (3,3) and (2,3).
    let endResult = null;
    for (let i = 0; i < 200 && !endResult; i++) {
      // Red move
      const rFrom = i % 2 === 0 ? { x: 0, y: 0 } : { x: 1, y: 0 };
      const rTo = i % 2 === 0 ? { x: 1, y: 0 } : { x: 0, y: 0 };
      moveCard(state, rFrom, rTo);
      let r = checkGameOver(state.board, state.currentTeam, state);
      if (r.ended) {
        endResult = r;
        break;
      }
      // Blue move
      const bFrom = i % 2 === 0 ? { x: 3, y: 3 } : { x: 2, y: 3 };
      const bTo = i % 2 === 0 ? { x: 2, y: 3 } : { x: 3, y: 3 };
      moveCard(state, bFrom, bTo);
      r = checkGameOver(state.board, state.currentTeam, state);
      if (r.ended) {
        endResult = r;
        break;
      }
    }
    expect(endResult).not.toBeNull();
    expect(endResult.winner).toBe("draw");
  });
});

// ============================================================
// aiDecide - AI decision function
// ============================================================
describe("aiDecide - AI 决策函数", () => {
  it("存在吃牌机会时返回 capture 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("吃牌优先于翻牌", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    board[1][2] = makeCard("狮", "blue");
    board[3][3] = makeCard("虎", "red", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
  });

  it("无吃牌机会但有暗牌时返回 flip 操作", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("猫", "red");
    board[0][1] = makeCard("狮", "blue");
    board[1][0] = makeCard("虎", "blue");
    // Cat surrounded and cannot capture, but has face-down cards
    board[3][3] = makeCard("象", "red", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
  });

  it("全翻开且有走牌时返回 move 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("象", "red");
    // Surrounding has empty cells, no opponent cards to capture, no face-down cards
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("move");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    const validTargets = [
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
    ];
    expect(validTargets).toContainEqual(decision.to);
  });

  it("无任何合法操作时返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("猫", "red");
    board[1][0] = makeCard("狮", "blue");
    board[1][2] = makeCard("虎", "blue");
    board[0][1] = makeCard("豹", "blue");
    board[2][1] = makeCard("狼", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).toBeNull();
  });

  it("优先吃非同归于尽的目标", () => {
    const board = emptyBoard();
    // Red elephant can capture blue lion (non-mutual), red tiger and blue tiger same rank (mutual destruction)
    board[0][0] = makeCard("象", "red");
    board[0][1] = makeCard("狮", "blue");
    board[2][2] = makeCard("虎", "red");
    board[2][3] = makeCard("虎", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Should prefer non-mutual-destruction capture
    expect(decision.from).toEqual({ x: 0, y: 0 });
    expect(decision.to).toEqual({ x: 1, y: 0 });
  });
});
