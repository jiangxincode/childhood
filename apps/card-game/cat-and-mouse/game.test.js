import { describe, it, expect } from "vitest";
const {
  PIECE_NAMES,
  RANK_MAP,
  DIRECTIONS,
  getImagePath,
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

function makeCard(name, team, faceUp = true) {
  return { name, team, rank: RANK_MAP[name], faceUp };
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
// Constants verification
// ============================================================
describe("constants - 常量验证", () => {
  it("PIECE_NAMES 应包含 8 个棋子名", () => {
    expect(PIECE_NAMES).toHaveLength(8);
  });

  it("RANK_MAP 应有 8 个映射", () => {
    expect(Object.keys(RANK_MAP)).toHaveLength(8);
    for (const name of PIECE_NAMES) {
      expect(RANK_MAP).toHaveProperty(name);
    }
  });

  it("DIRECTIONS 应有 4 个方向", () => {
    expect(DIRECTIONS).toHaveLength(4);
    expect(DIRECTIONS).toContainEqual({ dx: -1, dy: 0 });
    expect(DIRECTIONS).toContainEqual({ dx: 1, dy: 0 });
    expect(DIRECTIONS).toContainEqual({ dx: 0, dy: -1 });
    expect(DIRECTIONS).toContainEqual({ dx: 0, dy: 1 });
  });

  it("棋子等级范围应为 0-7", () => {
    const ranks = PIECE_NAMES.map((name) => RANK_MAP[name]);
    expect(ranks).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

// ============================================================
// getImagePath - image path
// ============================================================
describe("getImagePath - 图片路径", () => {
  it("红方大黄猫应返回 images/红-大黄猫.png", () => {
    expect(getImagePath("red", "大黄猫")).toBe("images/红-大黄猫.png");
  });

  it("蓝方大黄猫应返回 images/蓝-大黄猫.png", () => {
    expect(getImagePath("blue", "大黄猫")).toBe("images/蓝-大黄猫.png");
  });

  it("红方油滑鼠应返回 images/红-油滑鼠.png", () => {
    expect(getImagePath("red", "油滑鼠")).toBe("images/红-油滑鼠.png");
  });

  it("蓝方小花猫应返回 images/蓝-小花猫.png", () => {
    expect(getImagePath("blue", "小花猫")).toBe("images/蓝-小花猫.png");
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
describe("inBounds - 边界判定", () => {
  it("board内坐标 (0,0) 返回 true", () => {
    expect(inBounds(0, 0)).toBe(true);
  });
  it("board内坐标 (3,3) 返回 true", () => {
    expect(inBounds(3, 3)).toBe(true);
  });
  it("board内坐标 (1,2) 返回 true", () => {
    expect(inBounds(1, 2)).toBe(true);
  });
  it("越界坐标 (-1,0) 返回 false", () => {
    expect(inBounds(-1, 0)).toBe(false);
  });
  it("越界坐标 (4,0) 返回 false", () => {
    expect(inBounds(4, 0)).toBe(false);
  });
  it("越界坐标 (0,-1) 返回 false", () => {
    expect(inBounds(0, -1)).toBe(false);
  });
  it("越界坐标 (0,4) 返回 false", () => {
    expect(inBounds(0, 4)).toBe(false);
  });
});

// ============================================================
// canCapture - capture judgment (no reversal, pure rank comparison)
// ============================================================
describe("canCapture - 吃牌判定", () => {
  it("高等级吃低等级：大黄猫(0)吃小花猫(1) → true", () => {
    const attacker = makeCard("大黄猫", "red");
    const defender = makeCard("小花猫", "blue");
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("低等级不能吃高等级：油滑鼠(7)吃大黄猫(0) → false（无逆袭）", () => {
    const attacker = makeCard("油滑鼠", "red");
    const defender = makeCard("大黄猫", "blue");
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("同级吃牌：大黄猫(0)吃大黄猫(0) → true（同归于尽）", () => {
    const attacker = makeCard("大黄猫", "red");
    const defender = makeCard("大黄猫", "blue");
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("同级吃牌：油滑鼠(7)吃油滑鼠(7) → true（同归于尽）", () => {
    const attacker = makeCard("油滑鼠", "red");
    const defender = makeCard("油滑鼠", "blue");
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("同阵营不能吃：红方大黄猫不能吃红方小花猫", () => {
    const attacker = makeCard("大黄猫", "red");
    const defender = makeCard("小花猫", "red");
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("中等级吃低等级：大灰鼠(2)吃米老鼠(3) → true", () => {
    const attacker = makeCard("大灰鼠", "red");
    const defender = makeCard("米老鼠", "blue");
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("低等级不能吃中等级：白老鼠(4)吃大灰鼠(2) → false", () => {
    const attacker = makeCard("白老鼠", "red");
    const defender = makeCard("大灰鼠", "blue");
    expect(canCapture(attacker, defender)).toBe(false);
  });
});

// ============================================================
// isMutualDestruction - mutual destruction check
// ============================================================
describe("isMutualDestruction - 同归于尽判定", () => {
  it("同级棋子应判定为同归于尽", () => {
    const attacker = makeCard("大黄猫", "red");
    const defender = makeCard("大黄猫", "blue");
    expect(isMutualDestruction(attacker, defender)).toBe(true);
  });

  it("不同级棋子不应判定为同归于尽", () => {
    const attacker = makeCard("大黄猫", "red");
    const defender = makeCard("小花猫", "blue");
    expect(isMutualDestruction(attacker, defender)).toBe(false);
  });

  it("不同级棋子（低吃高差距大）不应判定为同归于尽", () => {
    const attacker = makeCard("大黄猫", "red");
    const defender = makeCard("油滑鼠", "blue");
    expect(isMutualDestruction(attacker, defender)).toBe(false);
  });
});

// ============================================================
// createGameState - initial game state
// ============================================================
describe("createGameState - 初始Game state", () => {
  it("pvp 模式应返回包含所有必要字段的Game state", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentTeam).toBeNull();
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
    expect(state.teamAssigned).toBe(false);
    expect(state.firstPlayer).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.capturedRed).toEqual([]);
    expect(state.capturedBlue).toEqual([]);
    expect(state.selectedCell).toBeNull();
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.aiThinking).toBe(false);
    expect(state.aiFirst).toBe(false);
  });

  it("board应为 4x4，包含恰好 16 张牌", () => {
    const state = createGameState("pvp");
    expect(state.board).toHaveLength(4);
    let cardCount = 0;
    for (let y = 0; y < 4; y++) {
      expect(state.board[y]).toHaveLength(4);
      for (let x = 0; x < 4; x++) {
        expect(state.board[y][x]).not.toBeNull();
        cardCount++;
      }
    }
    expect(cardCount).toBe(16);
  });

  it("红蓝各 8 张，每方 8 种棋子各一张", () => {
    const state = createGameState("pvp");
    const redNames = [];
    const blueNames = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        if (card.team === "red") redNames.push(card.name);
        else blueNames.push(card.name);
      }
    }
    expect(redNames.sort()).toEqual([...PIECE_NAMES].sort());
    expect(blueNames.sort()).toEqual([...PIECE_NAMES].sort());
  });

  it("所有牌初始为背面朝上", () => {
    const state = createGameState("pvp");
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(state.board[y][x].faceUp).toBe(false);
      }
    }
  });

  it("每张牌应包含 name、team、rank、faceUp 属性", () => {
    const state = createGameState("pvp");
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        expect(card).toHaveProperty("name");
        expect(card).toHaveProperty("team");
        expect(card).toHaveProperty("rank");
        expect(card).toHaveProperty("faceUp");
        expect(["red", "blue"]).toContain(card.team);
        expect(PIECE_NAMES).toContain(card.name);
      }
    }
  });

  it("pve 模式应正确设置 mode", () => {
    const state = createGameState("pve");
    expect(state.mode).toBe("pve");
  });
});

// ============================================================
// getValidMoves - valid move detection
// ============================================================
describe("getValidMoves - 合法移动检测", () => {
  it("中间位置四周都为空时返回 4 个合法目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it("角落位置只有 2 个合法目标", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    const moves = getValidMoves(board, 0, 0);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
  });

  it("相邻位置有牌时不能移动到该位置", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][0] = makeCard("小花猫", "blue");
    board[0][1] = makeCard("大灰鼠", "red");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it("四周全被占据时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][0] = makeCard("小花猫", "blue");
    board[1][2] = makeCard("大灰鼠", "red");
    board[0][1] = makeCard("米老鼠", "blue");
    board[2][1] = makeCard("白老鼠", "red");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(0);
  });

  it("空位没有棋子时返回空数组", () => {
    const board = emptyBoard();
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(0);
  });
});

// ============================================================
// getValidCaptures - valid capture detection
// ============================================================
describe("getValidCaptures - 合法吃牌检测", () => {
  it("相邻有可吃的对方已翻开的牌时返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("相邻有同阵营牌时不返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "red");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("相邻有未翻开的对方牌时不返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue", false);
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("棋子未翻开时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red", false);
    board[1][2] = makeCard("小花猫", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("棋子不属于指定阵营时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "blue");
    board[1][2] = makeCard("小花猫", "red");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("多个方向有可吃目标时全部返回", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][0] = makeCard("小花猫", "blue");
    board[1][2] = makeCard("大灰鼠", "blue");
    board[0][1] = makeCard("米老鼠", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(3);
  });

  it("同级相邻可吃（同归于尽）也返回目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("大黄猫", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });
});

// ============================================================
// flipCard - flip operation
// ============================================================
describe("flipCard - 翻牌操作", () => {
  it("翻开一张背面朝上的牌", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red", false);
    const state = makeState(board, "red");
    const result = flipCard(state, 0, 0);
    expect(result).not.toBeNull();
    expect(result.board[0][0].faceUp).toBe(true);
  });

  it("翻牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red", false);
    const state = makeState(board, "red");
    flipCard(state, 0, 0);
    expect(state.currentTeam).toBe("blue");
  });

  it("翻牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red", false);
    const state = makeState(board, "red", { turnCount: 5 });
    flipCard(state, 0, 0);
    expect(state.turnCount).toBe(6);
  });

  it("空位返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("已翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red", true);
    const state = makeState(board, "red");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("坐标越界返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(flipCard(state, -1, 0)).toBeNull();
    expect(flipCard(state, 4, 0)).toBeNull();
  });

  it("首次翻牌时确定阵营分配（PVE 模式）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red", false);
    const state = makeState(board, "red", { teamAssigned: false, mode: "pve" });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.playerTeam).toBe("red");
    expect(state.aiTeam).toBe("blue");
  });

  it("首次翻牌为蓝方牌时，玩家为蓝方（PVE 模式）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("小花猫", "blue", false);
    const state = makeState(board, "red", { teamAssigned: false, mode: "pve" });
    flipCard(state, 0, 0);
    expect(state.playerTeam).toBe("blue");
    expect(state.aiTeam).toBe("red");
  });
});

// ============================================================
// moveCard - move operation
// ============================================================
describe("moveCard - 走牌操作", () => {
  it("将牌移动到相邻空位", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    const state = makeState(board, "red");
    const result = moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].name).toBe("大黄猫");
  });

  it("走牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    const state = makeState(board, "red");
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("blue");
  });

  it("走牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    const state = makeState(board, "red", { turnCount: 3 });
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(4);
  });

  it("目标位置非空时返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("曼哈顿距离不为 1 时返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("斜向移动返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it("移动对方的牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "blue");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("移动未翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red", false);
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("起始位置为空返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

// ============================================================
// captureCard - capture operation
// ============================================================
describe("captureCard - 吃牌操作", () => {
  it("普通吃牌：攻击方移到被吃方位置，原位置清空", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].name).toBe("大黄猫");
    expect(result.board[1][2].team).toBe("red");
  });

  it("被吃角色加入对应阵营的被吃列表（蓝方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedBlue).toContain("小花猫");
  });

  it("被吃角色加入对应阵营的被吃列表（红方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "blue");
    board[1][2] = makeCard("小花猫", "red");
    const state = makeState(board, "blue");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain("小花猫");
  });

  it("吃牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("blue");
  });

  it("吃牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red", { turnCount: 7 });
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(8);
  });

  it("不满足等级关系返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("油滑鼠", "red");
    board[1][2] = makeCard("大黄猫", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue", false);
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方为己方牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "red");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("曼哈顿距离不为 1 返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    board[0][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("攻击方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red", false);
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("同级吃牌同归于尽：双方都从board移除", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("大黄猫", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2]).toBeNull();
  });

  it("同归于尽时双方都加入被吃列表", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("大黄猫", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain("大黄猫");
    expect(state.capturedBlue).toContain("大黄猫");
  });

  it("被吃方位置为空返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });
});

// ============================================================
// hasAnyLegalAction - legal action detection
// ============================================================
describe("hasAnyLegalAction - 合法操作检测", () => {
  it("有未翻开的牌时返回 true", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red", false);
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("己方已翻开的牌有合法移动时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("己方已翻开的牌有合法吃牌时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    board[1][0] = makeCard("大灰鼠", "red");
    board[0][1] = makeCard("米老鼠", "red");
    board[2][1] = makeCard("白老鼠", "red");
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("board上无己方牌且无未翻开的牌时返回 false", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "blue");
    expect(hasAnyLegalAction(board, "red")).toBe(false);
  });

  it("己方牌被完全包围且无吃牌机会且无未翻开的牌时返回 false", () => {
    const board = emptyBoard();
    // Slippery rat(rank=7) surrounded by higher rank cards, cannot capture any, no empty cells
    board[1][1] = makeCard("油滑鼠", "red");
    board[1][0] = makeCard("大黄猫", "blue");
    board[1][2] = makeCard("小花猫", "blue");
    board[0][1] = makeCard("大灰鼠", "blue");
    board[2][1] = makeCard("米老鼠", "blue");
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
    board[0][0] = makeCard("大黄猫", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("blue");
  });

  it("蓝方无牌时红方获胜", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    const result = checkGameOver(board, "blue");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("red");
  });

  it("当前行动方无合法操作时对方获胜", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("油滑鼠", "red");
    board[1][0] = makeCard("大黄猫", "blue");
    board[1][2] = makeCard("小花猫", "blue");
    board[0][1] = makeCard("大灰鼠", "blue");
    board[2][1] = makeCard("米老鼠", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("blue");
  });

  it("双方都有牌且有合法操作时游戏未结束", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    board[3][3] = makeCard("小花猫", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("有未翻开的牌时游戏未结束", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    board[3][3] = makeCard("小花猫", "blue", false);
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
});

// ============================================================
// aiDecide - AI decision function
// ============================================================
describe("aiDecide - AI 决策函数", () => {
  it("存在吃牌机会时优先返回 capture 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("优先非同归于尽的吃牌", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    // Same rank mutual destruction
    board[0][1] = makeCard("大黄猫", "blue");
    // Non-mutual destruction (higher rank captures lower rank)
    board[1][2] = makeCard("小花猫", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Should choose non-mutual-destruction capture
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("只有未翻开的牌可用时返回 flip 操作", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("油滑鼠", "red");
    board[0][1] = makeCard("大黄猫", "blue");
    board[1][0] = makeCard("小花猫", "blue");
    // Face-down card
    board[3][3] = makeCard("大灰鼠", "red", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
    expect(decision.x).toBe(3);
    expect(decision.y).toBe(3);
  });

  it("只有走牌可用时返回 move 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
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
    board[1][1] = makeCard("油滑鼠", "red");
    board[1][0] = makeCard("大黄猫", "blue");
    board[1][2] = makeCard("小花猫", "blue");
    board[0][1] = makeCard("大灰鼠", "blue");
    board[2][1] = makeCard("米老鼠", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).toBeNull();
  });

  it("吃牌优先于翻牌", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    board[1][2] = makeCard("小花猫", "blue");
    board[3][3] = makeCard("大灰鼠", "blue", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
  });

  it("翻牌优先于走牌", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("大黄猫", "red");
    board[3][3] = makeCard("小花猫", "blue", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
  });

  it("多个吃牌选项时优先吃 rank 小的高价值目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("大黄猫", "red");
    // rank=1 kitten (high value target)
    board[1][2] = makeCard("小花猫", "blue");
    // rank=7 slippery rat (low value target)
    board[0][1] = makeCard("油滑鼠", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Should prefer capturing kitten with smaller rank
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });
});
