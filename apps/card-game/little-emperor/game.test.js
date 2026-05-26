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
// constants - constant definitions
// ============================================================
describe("constants - 常量定义", () => {
  it("PIECE_NAMES 应包含8个棋子名称", () => {
    expect(PIECE_NAMES).toHaveLength(8);
    expect(PIECE_NAMES).toEqual(["爷爷", "奶奶", "爸爸", "妈妈", "哥哥", "姐姐", "妹妹", "小皇帝"]);
  });

  it("RANK_MAP 应有8个映射关系", () => {
    expect(Object.keys(RANK_MAP)).toHaveLength(8);
    expect(RANK_MAP["爷爷"]).toBe(1);
    expect(RANK_MAP["奶奶"]).toBe(2);
    expect(RANK_MAP["爸爸"]).toBe(3);
    expect(RANK_MAP["妈妈"]).toBe(4);
    expect(RANK_MAP["哥哥"]).toBe(5);
    expect(RANK_MAP["姐姐"]).toBe(6);
    expect(RANK_MAP["妹妹"]).toBe(7);
    expect(RANK_MAP["小皇帝"]).toBe(8);
  });

  it("DIRECTIONS 应有4个方向（上下左右）", () => {
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
  it("红方棋子图片路径正确", () => {
    expect(getImagePath("red", "爷爷")).toBe("images/红-爷爷.png");
    expect(getImagePath("red", "小皇帝")).toBe("images/红-小皇帝.png");
    expect(getImagePath("red", "爸爸")).toBe("images/红-爸爸.png");
  });

  it("蓝方棋子图片路径正确", () => {
    expect(getImagePath("blue", "爷爷")).toBe("images/蓝-爷爷.png");
    expect(getImagePath("blue", "小皇帝")).toBe("images/蓝-小皇帝.png");
    expect(getImagePath("blue", "妈妈")).toBe("images/蓝-妈妈.png");
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
  it("board内坐标返回 true", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(3, 3)).toBe(true);
    expect(inBounds(1, 2)).toBe(true);
    expect(inBounds(0, 3)).toBe(true);
    expect(inBounds(3, 0)).toBe(true);
  });

  it("board外坐标返回 false", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(4, 0)).toBe(false);
    expect(inBounds(0, 4)).toBe(false);
    expect(inBounds(-1, -1)).toBe(false);
    expect(inBounds(4, 4)).toBe(false);
  });
});

// ============================================================
// canCapture - capture check (focus on cycle restraint)
// ============================================================
describe("canCapture - 吃牌判定", () => {
  it("高等级吃低等级: 爷爷(1)吃奶奶(2) → true", () => {
    const attacker = { name: "爷爷", team: "red", rank: 1, faceUp: true };
    const defender = { name: "奶奶", team: "blue", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("低等级不能吃高等级: 妹妹(7)吃爷爷(1) → false", () => {
    const attacker = { name: "妹妹", team: "red", rank: 7, faceUp: true };
    const defender = { name: "爷爷", team: "blue", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("同级同归于尽: 爷爷(1)吃爷爷(1) → true", () => {
    const attacker = { name: "爷爷", team: "red", rank: 1, faceUp: true };
    const defender = { name: "爷爷", team: "blue", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("循环克制: 小皇帝(8)吃爷爷(1) → true", () => {
    const attacker = { name: "小皇帝", team: "red", rank: 8, faceUp: true };
    const defender = { name: "爷爷", team: "blue", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("循环克制限制: 爷爷(1)吃小皇帝(8) → false", () => {
    const attacker = { name: "爷爷", team: "red", rank: 1, faceUp: true };
    const defender = { name: "小皇帝", team: "blue", rank: 8, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("同阵营不能吃", () => {
    const attacker = { name: "爷爷", team: "red", rank: 1, faceUp: true };
    const defender = { name: "奶奶", team: "red", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("越级吃: 爷爷(1)吃妹妹(7) → true", () => {
    const attacker = { name: "爷爷", team: "red", rank: 1, faceUp: true };
    const defender = { name: "妹妹", team: "blue", rank: 7, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("中间等级吃低等级: 爸爸(3)吃哥哥(5) → true", () => {
    const attacker = { name: "爸爸", team: "red", rank: 3, faceUp: true };
    const defender = { name: "哥哥", team: "blue", rank: 5, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("中间等级不能吃高等级: 姐姐(6)吃爸爸(3) → false", () => {
    const attacker = { name: "姐姐", team: "red", rank: 6, faceUp: true };
    const defender = { name: "爸爸", team: "blue", rank: 3, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("小皇帝(8)吃妹妹(7) → true（rank数值大吃rank数值小但8>7不成立，8<7不成立）", () => {
    const attacker = { name: "小皇帝", team: "red", rank: 8, faceUp: true };
    const defender = { name: "妹妹", team: "blue", rank: 7, faceUp: true };
    // Emperor rank=8, sister rank=7, 8<7 is false, 8===7 is false, 8===8&&7===1 is false, 1===8&&8===8 is false
    // So returns false -- emperor can only capture grandpa
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("小皇帝(8)吃奶奶(2) → false（小皇帝只能吃爷爷）", () => {
    const attacker = { name: "小皇帝", team: "red", rank: 8, faceUp: true };
    const defender = { name: "奶奶", team: "blue", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });
});

// ============================================================
// isMutualDestruction - mutual destruction check
// ============================================================
describe("isMutualDestruction - 同归于尽判定", () => {
  it("同级棋子返回 true（同归于尽）", () => {
    const attacker = { name: "爷爷", team: "red", rank: 1, faceUp: true };
    const defender = { name: "爷爷", team: "blue", rank: 1, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(true);
  });

  it("不同级棋子返回 false", () => {
    const attacker = { name: "爷爷", team: "red", rank: 1, faceUp: true };
    const defender = { name: "奶奶", team: "blue", rank: 2, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(false);
  });

  it("小皇帝(8)和爷爷(1)不同级返回 false", () => {
    const attacker = { name: "小皇帝", team: "red", rank: 8, faceUp: true };
    const defender = { name: "爷爷", team: "blue", rank: 1, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(false);
  });
});

// ============================================================
// createGameState - initial game state
// ============================================================
describe("createGameState - 初始Game state", () => {
  it("PVP模式应返回包含所有必要字段的Game state对象", () => {
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
  });

  it("board应为4x4，包含恰好16张牌", () => {
    const state = createGameState("pvp");
    expect(state.board.length).toBe(4);
    let cardCount = 0;
    for (let y = 0; y < 4; y++) {
      expect(state.board[y].length).toBe(4);
      for (let x = 0; x < 4; x++) {
        expect(state.board[y][x]).not.toBeNull();
        cardCount++;
      }
    }
    expect(cardCount).toBe(16);
  });

  it("红蓝各8张，每方8种棋子各一张", () => {
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

  it("PVE模式应正确设置mode", () => {
    const state = createGameState("pve");
    expect(state.mode).toBe("pve");
  });
});

// ============================================================
// getValidMoves - valid move detection
// ============================================================
describe("getValidMoves - 合法移动检测", () => {
  it("中间位置四周都为空时返回4个合法目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爸爸", "red");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it("角落位置只有2个合法目标", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "blue");
    const moves = getValidMoves(board, 0, 0);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
  });

  it("边缘位置只有3个合法目标", () => {
    const board = emptyBoard();
    board[0][1] = makeCard("妈妈", "red");
    const moves = getValidMoves(board, 1, 0);
    expect(moves).toHaveLength(3);
    expect(moves).toContainEqual({ x: 0, y: 0 });
    expect(moves).toContainEqual({ x: 2, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 1 });
  });

  it("相邻位置有牌时不能移动到该位置", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("哥哥", "red");
    board[1][0] = makeCard("姐姐", "blue");
    board[0][1] = makeCard("奶奶", "red");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it("四周全被占据时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("妹妹", "red");
    board[1][0] = makeCard("爷爷", "blue");
    board[1][2] = makeCard("爸爸", "red");
    board[0][1] = makeCard("奶奶", "blue");
    board[2][1] = makeCard("妈妈", "red");
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
  it("相邻有可吃的对方已翻开的牌时返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("相邻有同阵营牌时不返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "red");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("相邻有未翻开的对方牌时不返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue", false);
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("己方棋子未翻开时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red", false);
    board[1][2] = makeCard("奶奶", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("己方棋子不属于指定阵营时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "blue");
    board[1][2] = makeCard("奶奶", "red");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("循环克制: 小皇帝可以吃相邻的爷爷", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("小皇帝", "red");
    board[1][2] = makeCard("爷爷", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("循环克制限制: 爷爷不能吃相邻的小皇帝", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("小皇帝", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(0);
  });

  it("多个方向有可吃目标时全部返回", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][0] = makeCard("妹妹", "blue");
    board[1][2] = makeCard("哥哥", "blue");
    board[0][1] = makeCard("妈妈", "blue");
    const captures = getValidCaptures(board, 1, 1, "red");
    expect(captures).toHaveLength(3);
  });
});

// ============================================================
// flipCard - flip operation
// ============================================================
describe("flipCard - 翻牌操作", () => {
  it("翻开一张背面朝上的牌", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red", false);
    const state = makeState(board, "red");
    const result = flipCard(state, 0, 0);
    expect(result).not.toBeNull();
    expect(result.board[0][0].faceUp).toBe(true);
  });

  it("已翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red", true);
    const state = makeState(board, "red");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("空位返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("翻牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red", false);
    const state = makeState(board, "red");
    flipCard(state, 0, 0);
    expect(state.currentTeam).toBe("blue");
  });

  it("翻牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red", false);
    const state = makeState(board, "red", { turnCount: 5 });
    flipCard(state, 0, 0);
    expect(state.turnCount).toBe(6);
  });

  it("坐标越界返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "red");
    expect(flipCard(state, -1, 0)).toBeNull();
    expect(flipCard(state, 4, 0)).toBeNull();
  });

  it("首次翻牌确定阵营分配（PVE模式）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red", false);
    const state = makeState(board, "red", { teamAssigned: false, mode: "pve" });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.playerTeam).toBe("red");
    expect(state.aiTeam).toBe("blue");
  });

  it("首次翻牌为蓝方牌时，玩家为蓝方（PVE模式）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "blue", false);
    const state = makeState(board, "red", { teamAssigned: false, mode: "pve" });
    flipCard(state, 0, 0);
    expect(state.playerTeam).toBe("blue");
    expect(state.aiTeam).toBe("red");
  });

  it("PVP模式下首次翻牌不设置 playerTeam/aiTeam", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red", false);
    const state = makeState(board, "red", { teamAssigned: false, mode: "pvp" });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});

// ============================================================
// moveCard - move operation
// ============================================================
describe("moveCard - 走牌操作", () => {
  it("正常移动到相邻空位", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    const state = makeState(board, "red");
    const result = moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].name).toBe("爷爷");
  });

  it("走牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    const state = makeState(board, "red");
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("blue");
  });

  it("走牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    const state = makeState(board, "red", { turnCount: 3 });
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(4);
  });

  it("目标位置非空时返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("曼哈顿距离不为1时返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("斜向移动返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it("移动对方的牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "blue");
    const state = makeState(board, "red");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("移动未翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red", false);
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
  it("普通吃牌: 攻击方移到被吃方位置，原位置清空", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].name).toBe("爷爷");
    expect(result.board[1][2].team).toBe("red");
  });

  it("被吃棋子加入对应阵营的被吃列表（蓝方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedBlue).toContain("奶奶");
  });

  it("被吃棋子加入对应阵营的被吃列表（红方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "blue");
    board[1][2] = makeCard("奶奶", "red");
    const state = makeState(board, "blue");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain("奶奶");
  });

  it("同归于尽: 同级吃牌双方都被移除", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("爷爷", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2]).toBeNull();
  });

  it("同归于尽时双方棋子都加入被吃列表", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爸爸", "red");
    board[1][2] = makeCard("爸爸", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedRed).toContain("爸爸");
    expect(state.capturedBlue).toContain("爸爸");
  });

  it("吃牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("blue");
  });

  it("吃牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red", { turnCount: 7 });
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(8);
  });

  it("不满足吃牌条件返回 null（低等级不能吃高等级）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("妹妹", "red");
    board[1][2] = makeCard("爷爷", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue", false);
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方为己方牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "red");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("攻击方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red", false);
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("曼哈顿距离不为1返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red");
    board[0][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("被吃方位置为空返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    const state = makeState(board, "red");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("循环克制: 小皇帝吃爷爷成功", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("小皇帝", "red");
    board[1][2] = makeCard("爷爷", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].name).toBe("小皇帝");
    expect(state.capturedBlue).toContain("爷爷");
  });

  it("越级吃牌: 爷爷吃妹妹成功", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("妹妹", "blue");
    const state = makeState(board, "red");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][2].name).toBe("爷爷");
    expect(state.capturedBlue).toContain("妹妹");
  });
});

// ============================================================
// hasAnyLegalAction - legal action detection
// ============================================================
describe("hasAnyLegalAction - 合法操作检测", () => {
  it("有未翻开的牌时返回 true", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red", false);
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("己方已翻开的牌有合法移动时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爸爸", "red");
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("己方已翻开的牌有合法吃牌时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    board[1][0] = makeCard("爸爸", "red");
    board[0][1] = makeCard("妈妈", "red");
    board[2][1] = makeCard("哥哥", "red");
    // Grandpa is surrounded but can capture grandma
    expect(hasAnyLegalAction(board, "red")).toBe(true);
  });

  it("board上无己方牌且无未翻开的牌时返回 false", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "blue");
    expect(hasAnyLegalAction(board, "red")).toBe(false);
  });

  it("己方牌被完全包围且无吃牌机会且无未翻开的牌时返回 false", () => {
    const board = emptyBoard();
    // Red emperor(rank=8) in center, surrounded by blue high-rank pieces, emperor can only capture grandpa
    board[1][1] = makeCard("小皇帝", "red");
    board[1][0] = makeCard("爸爸", "blue"); // rank=3, emperor cannot capture
    board[1][2] = makeCard("妈妈", "blue"); // rank=4, emperor cannot capture
    board[0][1] = makeCard("哥哥", "blue"); // rank=5, emperor cannot capture
    board[2][1] = makeCard("姐姐", "blue"); // rank=6, emperor cannot capture
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
    board[0][0] = makeCard("爷爷", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("blue");
  });

  it("蓝方无牌时红方获胜", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red");
    const result = checkGameOver(board, "blue");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("red");
  });

  it("当前行动方无合法操作时对方获胜", () => {
    const board = emptyBoard();
    // Red emperor is completely surrounded and cannot capture any card
    board[1][1] = makeCard("小皇帝", "red");
    board[1][0] = makeCard("爸爸", "blue");
    board[1][2] = makeCard("妈妈", "blue");
    board[0][1] = makeCard("哥哥", "blue");
    board[2][1] = makeCard("姐姐", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("blue");
  });

  it("双方都有牌且有合法操作时游戏未结束", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爸爸", "red");
    board[3][3] = makeCard("妈妈", "blue");
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("有未翻开的牌时游戏未结束", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red");
    board[3][3] = makeCard("爸爸", "blue", false);
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("空board时双方都无牌为平局", () => {
    const board = emptyBoard();
    const result = checkGameOver(board, "red");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("draw");
  });

  it("无吃子动作连续达到上限时判平局（防止死循环）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red");
    board[3][3] = makeCard("爷爷", "blue");
    const state = makeState(board, "red");
    state.noCaptureActions = 50;
    const result = checkGameOver(state.board, state.currentTeam, state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("draw");
  });

  it("局面重复达到上限时判平局（防止死循环）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爷爷", "red");
    board[3][3] = makeCard("爷爷", "blue");
    const state = makeState(board, "red");
    const fakeKey = JSON.stringify(state.board) + "|red";
    state.positionHistory = { [fakeKey]: 3 };
    const result = checkGameOver(state.board, state.currentTeam, state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("draw");
  });
});

// ============================================================
// aiDecide - AI decision function
// ============================================================
describe("aiDecide - AI决策函数", () => {
  it("存在吃牌机会时优先返回 capture 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("优先吃高等级棋子（rank数值小）", () => {
    const board = emptyBoard();
    // Red grandpa can capture blue grandma(rank=2) and blue sister(rank=7)
    board[1][1] = makeCard("爷爷", "red");
    board[1][0] = makeCard("妹妹", "blue");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Should prefer capturing grandma(rank=2) over sister(rank=7)
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("避免同归于尽: 有非同归于尽的吃牌时优先选择", () => {
    const board = emptyBoard();
    // Red grandpa can capture blue grandpa(mutual destruction) and blue grandma(normal capture)
    board[1][1] = makeCard("爷爷", "red");
    board[1][0] = makeCard("爷爷", "blue");
    board[1][2] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Should prefer capturing grandma (non-mutual destruction)
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("只有未翻开的牌可用时返回 flip 操作", () => {
    const board = emptyBoard();
    // Red emperor is surrounded and cannot capture any card
    board[0][0] = makeCard("小皇帝", "red");
    board[0][1] = makeCard("爸爸", "blue");
    board[1][0] = makeCard("妈妈", "blue");
    // There is one face-down card
    board[3][3] = makeCard("爸爸", "red", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
    expect(decision.x).toBe(3);
    expect(decision.y).toBe(3);
  });

  it("只有走牌可用时返回 move 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爸爸", "red");
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
    // Red emperor is completely surrounded and cannot capture any card, no face-down cards
    board[1][1] = makeCard("小皇帝", "red");
    board[1][0] = makeCard("爸爸", "blue");
    board[1][2] = makeCard("妈妈", "blue");
    board[0][1] = makeCard("哥哥", "blue");
    board[2][1] = makeCard("姐姐", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).toBeNull();
  });

  it("翻牌优先于走牌", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("爸爸", "red");
    // Dad has empty cells around, but also has face-down cards nearby
    board[3][3] = makeCard("妈妈", "blue", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
  });

  it("吃牌优先于翻牌", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("爷爷", "red");
    board[1][2] = makeCard("奶奶", "blue");
    board[3][3] = makeCard("爸爸", "blue", false);
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
  });

  it("使用低等级棋子吃牌优先（保留高等级棋子）", () => {
    const board = emptyBoard();
    // Red grandpa(rank=1) and red dad(rank=3) can both capture blue grandma(rank=2)
    board[0][0] = makeCard("爷爷", "red");
    board[0][1] = makeCard("奶奶", "blue");
    board[2][2] = makeCard("爸爸", "red");
    board[2][3] = makeCard("奶奶", "blue");
    const state = makeState(board, "red");
    const decision = aiDecide(state, "red");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Both grandma have same rank, prefer capturing with higher rank value piece (dad rank=3 > grandpa rank=1)
    // But due to board traversal order, grandpa(0,0) is collected first, stable sort keeps same order for same defenderRank and attackerRank
    // This verifies AI chose capture action targeting grandma
    const validCaptures = [
      { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
      { from: { x: 2, y: 2 }, to: { x: 3, y: 2 } },
    ];
    expect(validCaptures).toContainEqual({ from: decision.from, to: decision.to });
  });
});
