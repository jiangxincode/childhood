import { describe, it, expect } from "vitest";
const {
  DRAGON_PIECES,
  TIGER_PIECES,
  RANK_MAP,
  IMAGE_MAP,
  TEAM_MAP,
  DIRECTIONS,
  getImagePath,
  getTeam,
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

function makeCard(piece, team, faceUp = true) {
  return { piece, team, rank: RANK_MAP[piece], faceUp };
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
    capturedDragon: opts.capturedDragon || [],
    capturedTiger: opts.capturedTiger || [],
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
describe("constants - 常量定义", () => {
  it("DRAGON_PIECES 应包含8个龙队棋子", () => {
    expect(DRAGON_PIECES).toHaveLength(8);
    expect(DRAGON_PIECES).toEqual([
      "龙王",
      "神龙",
      "金龙",
      "青龙",
      "赤龙",
      "白龙",
      "风雨龙",
      "变形龙",
    ]);
  });

  it("TIGER_PIECES 应包含8个虎队棋子", () => {
    expect(TIGER_PIECES).toHaveLength(8);
    expect(TIGER_PIECES).toEqual([
      "虎王",
      "东北虎",
      "大头虎",
      "下山虎",
      "绿虎",
      "妖虎",
      "白虎",
      "小王虎",
    ]);
  });

  it("RANK_MAP 应包含16个棋子的等级映射", () => {
    expect(Object.keys(RANK_MAP)).toHaveLength(16);
    // Dragon team
    expect(RANK_MAP["龙王"]).toBe(1);
    expect(RANK_MAP["神龙"]).toBe(2);
    expect(RANK_MAP["金龙"]).toBe(3);
    expect(RANK_MAP["青龙"]).toBe(4);
    expect(RANK_MAP["赤龙"]).toBe(5);
    expect(RANK_MAP["白龙"]).toBe(6);
    expect(RANK_MAP["风雨龙"]).toBe(7);
    expect(RANK_MAP["变形龙"]).toBe(8);
    // Tiger team
    expect(RANK_MAP["虎王"]).toBe(1);
    expect(RANK_MAP["东北虎"]).toBe(2);
    expect(RANK_MAP["大头虎"]).toBe(3);
    expect(RANK_MAP["下山虎"]).toBe(4);
    expect(RANK_MAP["绿虎"]).toBe(5);
    expect(RANK_MAP["妖虎"]).toBe(6);
    expect(RANK_MAP["白虎"]).toBe(7);
    expect(RANK_MAP["小王虎"]).toBe(8);
  });

  it("IMAGE_MAP 应包含16个棋子的图片映射", () => {
    expect(Object.keys(IMAGE_MAP)).toHaveLength(16);
    expect(IMAGE_MAP["龙王"]).toBe("龙1.jpg");
    expect(IMAGE_MAP["变形龙"]).toBe("龙8.jpg");
    expect(IMAGE_MAP["虎王"]).toBe("虎1.jpg");
    expect(IMAGE_MAP["小王虎"]).toBe("虎8.jpg");
  });

  it("TEAM_MAP 应包含16个棋子的阵营映射", () => {
    expect(Object.keys(TEAM_MAP)).toHaveLength(16);
    for (const p of DRAGON_PIECES) {
      expect(TEAM_MAP[p]).toBe("dragon");
    }
    for (const p of TIGER_PIECES) {
      expect(TEAM_MAP[p]).toBe("tiger");
    }
  });
});

// ============================================================
// getImagePath - image path (only 1 parameter)
// ============================================================
describe("getImagePath - 图片路径", () => {
  it("龙队棋子返回正确的图片路径", () => {
    expect(getImagePath("龙王")).toBe("images/龙1.jpg");
    expect(getImagePath("神龙")).toBe("images/龙2.jpg");
    expect(getImagePath("金龙")).toBe("images/龙3.jpg");
    expect(getImagePath("青龙")).toBe("images/龙4.jpg");
    expect(getImagePath("赤龙")).toBe("images/龙5.jpg");
    expect(getImagePath("白龙")).toBe("images/龙6.jpg");
    expect(getImagePath("风雨龙")).toBe("images/龙7.jpg");
    expect(getImagePath("变形龙")).toBe("images/龙8.jpg");
  });

  it("虎队棋子返回正确的图片路径", () => {
    expect(getImagePath("虎王")).toBe("images/虎1.jpg");
    expect(getImagePath("东北虎")).toBe("images/虎2.jpg");
    expect(getImagePath("大头虎")).toBe("images/虎3.jpg");
    expect(getImagePath("下山虎")).toBe("images/虎4.jpg");
    expect(getImagePath("绿虎")).toBe("images/虎5.jpg");
    expect(getImagePath("妖虎")).toBe("images/虎6.jpg");
    expect(getImagePath("白虎")).toBe("images/虎7.jpg");
    expect(getImagePath("小王虎")).toBe("images/虎8.jpg");
  });
});

// ============================================================
// getTeam - get team
// ============================================================
describe("getTeam - 获取棋子阵营", () => {
  it("龙队棋子返回 dragon", () => {
    for (const p of DRAGON_PIECES) {
      expect(getTeam(p)).toBe("dragon");
    }
  });

  it("虎队棋子返回 tiger", () => {
    for (const p of TIGER_PIECES) {
      expect(getTeam(p)).toBe("tiger");
    }
  });
});

// ============================================================
// getRank - get rank
// ============================================================
describe("getRank - 获取棋子等级", () => {
  it("龙队各棋子等级正确", () => {
    expect(getRank("龙王")).toBe(1);
    expect(getRank("神龙")).toBe(2);
    expect(getRank("金龙")).toBe(3);
    expect(getRank("青龙")).toBe(4);
    expect(getRank("赤龙")).toBe(5);
    expect(getRank("白龙")).toBe(6);
    expect(getRank("风雨龙")).toBe(7);
    expect(getRank("变形龙")).toBe(8);
  });

  it("虎队各棋子等级正确", () => {
    expect(getRank("虎王")).toBe(1);
    expect(getRank("东北虎")).toBe(2);
    expect(getRank("大头虎")).toBe(3);
    expect(getRank("下山虎")).toBe(4);
    expect(getRank("绿虎")).toBe(5);
    expect(getRank("妖虎")).toBe(6);
    expect(getRank("白虎")).toBe(7);
    expect(getRank("小王虎")).toBe(8);
  });
});

// ============================================================
// judgeRPS - Rock-Paper-Scissors judgment (9 combinations)
// ============================================================
describe("judgeRPS - Rock-Paper-Scissors判定", () => {
  // Draw
  it("rock vs rock = 0 (平局)", () => {
    expect(judgeRPS("rock", "rock")).toBe(0);
  });
  it("scissors vs scissors = 0 (平局)", () => {
    expect(judgeRPS("scissors", "scissors")).toBe(0);
  });
  it("paper vs paper = 0 (平局)", () => {
    expect(judgeRPS("paper", "paper")).toBe(0);
  });

  // First player wins
  it("rock vs scissors = 1 (第一方胜)", () => {
    expect(judgeRPS("rock", "scissors")).toBe(1);
  });
  it("scissors vs paper = 1 (第一方胜)", () => {
    expect(judgeRPS("scissors", "paper")).toBe(1);
  });
  it("paper vs rock = 1 (第一方胜)", () => {
    expect(judgeRPS("paper", "rock")).toBe(1);
  });

  // Second player wins
  it("rock vs paper = -1 (第二方胜)", () => {
    expect(judgeRPS("rock", "paper")).toBe(-1);
  });
  it("scissors vs rock = -1 (第二方胜)", () => {
    expect(judgeRPS("scissors", "rock")).toBe(-1);
  });
  it("paper vs scissors = -1 (第二方胜)", () => {
    expect(judgeRPS("paper", "scissors")).toBe(-1);
  });
});

// ============================================================
// inBounds - boundary check
// ============================================================
describe("inBounds - 边界检测", () => {
  it("board范围内返回 true", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(3, 3)).toBe(true);
    expect(inBounds(1, 2)).toBe(true);
    expect(inBounds(0, 3)).toBe(true);
    expect(inBounds(3, 0)).toBe(true);
  });

  it("board范围外返回 false", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(4, 0)).toBe(false);
    expect(inBounds(0, 4)).toBe(false);
    expect(inBounds(-1, -1)).toBe(false);
    expect(inBounds(4, 4)).toBe(false);
  });
});

// ============================================================
// canCapture - capture judgment (with reversal rules)
// ============================================================
describe("canCapture - 吃牌判定", () => {
  it("高等级吃低等级: 龙王(1)吃神龙(2) → false（同阵营不能吃）", () => {
    const attacker = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    const defender = { piece: "神龙", team: "dragon", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("高等级吃低等级: 龙王(1)吃东北虎(2) → true", () => {
    const attacker = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    const defender = { piece: "东北虎", team: "tiger", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("低等级不能吃高等级: 赤龙(5)吃龙王(1) → false（同阵营不能吃）", () => {
    const attacker = { piece: "赤龙", team: "dragon", rank: 5, faceUp: true };
    const defender = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("低等级不能吃高等级: 赤龙(5)吃虎王(1) → false", () => {
    const attacker = { piece: "赤龙", team: "dragon", rank: 5, faceUp: true };
    const defender = { piece: "虎王", team: "tiger", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("跨阵营同级: 龙王(1)吃虎王(1) → true（同归于尽）", () => {
    const attacker = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    const defender = { piece: "虎王", team: "tiger", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("逆袭: 变形龙(8)吃虎王(1) → true", () => {
    const attacker = { piece: "变形龙", team: "dragon", rank: 8, faceUp: true };
    const defender = { piece: "虎王", team: "tiger", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("逆袭: 小王虎(8)吃龙王(1) → true", () => {
    const attacker = { piece: "小王虎", team: "tiger", rank: 8, faceUp: true };
    const defender = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(true);
  });

  it("逆袭限制: 龙王(1)吃小王虎(8) → false", () => {
    const attacker = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    const defender = { piece: "小王虎", team: "tiger", rank: 8, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("逆袭限制: 虎王(1)吃变形龙(8) → false", () => {
    const attacker = { piece: "虎王", team: "tiger", rank: 1, faceUp: true };
    const defender = { piece: "变形龙", team: "dragon", rank: 8, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("同阵营不能吃: 龙王吃神龙 → false", () => {
    const attacker = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    const defender = { piece: "神龙", team: "dragon", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });

  it("同阵营不能吃: 虎王吃东北虎 → false", () => {
    const attacker = { piece: "虎王", team: "tiger", rank: 1, faceUp: true };
    const defender = { piece: "东北虎", team: "tiger", rank: 2, faceUp: true };
    expect(canCapture(attacker, defender)).toBe(false);
  });
});

// ============================================================
// isMutualDestruction - mutual destruction check
// ============================================================
describe("isMutualDestruction - 同归于尽判定", () => {
  it("同级棋子返回 true", () => {
    const attacker = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    const defender = { piece: "虎王", team: "tiger", rank: 1, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(true);
  });

  it("不同级棋子返回 false", () => {
    const attacker = { piece: "龙王", team: "dragon", rank: 1, faceUp: true };
    const defender = { piece: "东北虎", team: "tiger", rank: 2, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(false);
  });

  it("等级8和等级1不是同归于尽", () => {
    const attacker = { piece: "变形龙", team: "dragon", rank: 8, faceUp: true };
    const defender = { piece: "虎王", team: "tiger", rank: 1, faceUp: true };
    expect(isMutualDestruction(attacker, defender)).toBe(false);
  });
});

// ============================================================
// createGameState - initial game state
// ============================================================
describe("createGameState - 初始Game state", () => {
  it("PVP模式应返回包含所有必要字段的Game state", () => {
    const state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentTeam).toBeNull();
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
    expect(state.teamAssigned).toBe(false);
    expect(state.firstPlayer).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.capturedDragon).toEqual([]);
    expect(state.capturedTiger).toEqual([]);
    expect(state.selectedCell).toBeNull();
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.aiThinking).toBe(false);
  });

  it("PVE模式应正确设置mode", () => {
    const state = createGameState("pve");
    expect(state.mode).toBe("pve");
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

  it("龙虎各8张，每方8种棋子各一张", () => {
    const state = createGameState("pvp");
    const dragonPieces = [];
    const tigerPieces = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        if (card.team === "dragon") dragonPieces.push(card.piece);
        else tigerPieces.push(card.piece);
      }
    }
    expect(dragonPieces.sort()).toEqual([...DRAGON_PIECES].sort());
    expect(tigerPieces.sort()).toEqual([...TIGER_PIECES].sort());
  });

  it("所有牌初始为背面朝上", () => {
    const state = createGameState("pvp");
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(state.board[y][x].faceUp).toBe(false);
      }
    }
  });

  it("每张牌应包含 piece、team、rank、faceUp 属性", () => {
    const state = createGameState("pvp");
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const card = state.board[y][x];
        expect(card).toHaveProperty("piece");
        expect(card).toHaveProperty("team");
        expect(card).toHaveProperty("rank");
        expect(card).toHaveProperty("faceUp");
        expect(["dragon", "tiger"]).toContain(card.team);
        expect(RANK_MAP[card.piece]).toBe(card.rank);
      }
    }
  });
});

// ============================================================
// getValidMoves - valid move detection
// ============================================================
describe("getValidMoves - 合法移动检测", () => {
  it("中间位置四周都为空时返回4个合法目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it("角落位置只有2个合法目标", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("虎王", "tiger");
    const moves = getValidMoves(board, 0, 0);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
  });

  it("相邻位置有牌时不能移动到该位置", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][0] = makeCard("虎王", "tiger");
    board[0][1] = makeCard("东北虎", "tiger");
    const moves = getValidMoves(board, 1, 1);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });

  it("四周全被占据时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][0] = makeCard("虎王", "tiger");
    board[1][2] = makeCard("东北虎", "tiger");
    board[0][1] = makeCard("大头虎", "tiger");
    board[2][1] = makeCard("下山虎", "tiger");
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
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("相邻有不可吃的对方牌时不返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("变形龙", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    // Shape dragon(rank8) can capture tiger king(rank1) - reversal
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("低等级不能吃高等级时返回空", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("风雨龙", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    // Storm dragon(rank7) cannot capture tiger king(rank1)
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(0);
  });

  it("相邻有己方牌时不返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("神龙", "dragon");
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(0);
  });

  it("相邻有未翻开的对方牌时不返回该目标", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("虎王", "tiger", false);
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(0);
  });

  it("棋子未翻开时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon", false);
    board[1][2] = makeCard("虎王", "tiger");
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(0);
  });

  it("棋子不属于指定阵营时返回空数组", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("虎王", "tiger");
    board[1][2] = makeCard("龙王", "dragon");
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(0);
  });

  it("逆袭: 变形龙(8)可以吃虎王(1)", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("变形龙", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(1);
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });

  it("逆袭限制: 龙王(1)不能吃小王虎(8)", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("小王虎", "tiger");
    const captures = getValidCaptures(board, 1, 1, "dragon");
    expect(captures).toHaveLength(0);
  });
});

// ============================================================
// flipCard - flip operation
// ============================================================
describe("flipCard - 翻牌操作", () => {
  it("翻开一张背面朝上的牌", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", false);
    const state = makeState(board, "dragon");
    const result = flipCard(state, 0, 0);
    expect(result).not.toBeNull();
    expect(result.board[0][0].faceUp).toBe(true);
  });

  it("翻牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", false);
    const state = makeState(board, "dragon");
    flipCard(state, 0, 0);
    expect(state.currentTeam).toBe("tiger");
  });

  it("翻牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", false);
    const state = makeState(board, "dragon", { turnCount: 5 });
    flipCard(state, 0, 0);
    expect(state.turnCount).toBe(6);
  });

  it("空位返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "dragon");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("已翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", true);
    const state = makeState(board, "dragon");
    expect(flipCard(state, 0, 0)).toBeNull();
  });

  it("坐标越界返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "dragon");
    expect(flipCard(state, -1, 0)).toBeNull();
    expect(flipCard(state, 4, 0)).toBeNull();
  });

  it("第一张翻牌时确定阵营分配（PVE模式，玩家翻到龙队）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", false);
    const state = makeState(board, null, { teamAssigned: false, mode: "pve" });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.playerTeam).toBe("dragon");
    expect(state.aiTeam).toBe("tiger");
  });

  it("第一张翻牌为虎队牌时，玩家为虎队（PVE模式）", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("虎王", "tiger", false);
    const state = makeState(board, null, { teamAssigned: false, mode: "pve" });
    flipCard(state, 0, 0);
    expect(state.playerTeam).toBe("tiger");
    expect(state.aiTeam).toBe("dragon");
  });

  it("PVE模式电脑先手时，翻牌后阵营分配正确", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", false);
    const state = makeState(board, null, { teamAssigned: false, mode: "pve", aiFirst: true });
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    expect(state.aiTeam).toBe("dragon");
    expect(state.playerTeam).toBe("tiger");
  });

  it("PVP模式下第一张翻牌不设置 playerTeam/aiTeam", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", false);
    const state = makeState(board, null, { teamAssigned: false, mode: "pvp" });
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
  it("将牌移动到相邻空位", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    const state = makeState(board, "dragon");
    const result = moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].piece).toBe("龙王");
  });

  it("走牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    const state = makeState(board, "dragon");
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("tiger");
  });

  it("走牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    const state = makeState(board, "dragon", { turnCount: 3 });
    moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(4);
  });

  it("目标位置非空时返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    const state = makeState(board, "dragon");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("曼哈顿距离不为1时返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon");
    const state = makeState(board, "dragon");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("斜向移动返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon");
    const state = makeState(board, "dragon");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it("移动对方的牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("虎王", "tiger");
    const state = makeState(board, "dragon");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("移动未翻开的牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon", false);
    const state = makeState(board, "dragon");
    expect(moveCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("起始位置为空返回 null", () => {
    const board = emptyBoard();
    const state = makeState(board, "dragon");
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

// ============================================================
// captureCard - capture operation
// ============================================================
describe("captureCard - 吃牌操作", () => {
  it("成功吃牌：攻击方移到被吃方位置，原位置清空", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2].piece).toBe("龙王");
    expect(result.board[1][2].team).toBe("dragon");
  });

  it("被吃棋子加入对应阵营的被吃列表（虎方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedTiger).toContain("东北虎");
  });

  it("被吃棋子加入对应阵营的被吃列表（龙方被吃）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("虎王", "tiger");
    board[1][2] = makeCard("神龙", "dragon");
    const state = makeState(board, "tiger");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedDragon).toContain("神龙");
  });

  it("被吃列表使用 piece 属性（棋子名）", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedTiger[0]).toBe("东北虎");
    expect(typeof state.capturedTiger[0]).toBe("string");
  });

  it("吃牌后切换当前行动方", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.currentTeam).toBe("tiger");
  });

  it("吃牌后 turnCount 递增", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon", { turnCount: 7 });
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.turnCount).toBe(8);
  });

  it("同归于尽：同级棋子相遇时双方均被移除", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    const state = makeState(board, "dragon");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][1]).toBeNull();
    expect(result.board[1][2]).toBeNull();
  });

  it("同归于尽时双方都加入被吃列表", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    const state = makeState(board, "dragon");
    captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(state.capturedDragon).toContain("龙王");
    expect(state.capturedTiger).toContain("虎王");
  });

  it("不满足吃牌条件返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("风雨龙", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    // Storm dragon(rank7) cannot capture tiger king(rank1)
    const state = makeState(board, "dragon");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger", false);
    const state = makeState(board, "dragon");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("被吃方为己方牌返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("神龙", "dragon");
    const state = makeState(board, "dragon");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("攻击方未翻开返回 null", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon", false);
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    expect(captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 })).toBeNull();
  });

  it("曼哈顿距离不为1返回 null", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon");
    board[0][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    expect(captureCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("逆袭吃牌：变形龙吃虎王成功", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("变形龙", "dragon");
    board[1][2] = makeCard("虎王", "tiger");
    const state = makeState(board, "dragon");
    const result = captureCard(state, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(result).not.toBeNull();
    expect(result.board[1][2].piece).toBe("变形龙");
    expect(state.capturedTiger).toContain("虎王");
  });
});

// ============================================================
// hasAnyLegalAction - legal action detection
// ============================================================
describe("hasAnyLegalAction - 合法操作检测", () => {
  it("有未翻开的牌时返回 true", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon", false);
    expect(hasAnyLegalAction(board, "dragon")).toBe(true);
  });

  it("己方已翻开的牌有合法移动时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    expect(hasAnyLegalAction(board, "dragon")).toBe(true);
  });

  it("己方已翻开的牌有合法吃牌时返回 true", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    // Dragon king surrounded but can capture northeast tiger
    board[1][0] = makeCard("神龙", "dragon");
    board[0][1] = makeCard("金龙", "dragon");
    board[2][1] = makeCard("青龙", "dragon");
    expect(hasAnyLegalAction(board, "dragon")).toBe(true);
  });

  it("board上无己方牌且无未翻开的牌时返回 false", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("虎王", "tiger");
    expect(hasAnyLegalAction(board, "dragon")).toBe(false);
  });

  it("己方牌被完全包围且无吃牌机会且无未翻开的牌时返回 false", () => {
    // Fill 4x4 board, all dragon pieces cannot move or capture
    // Dragon 4 pieces rank 2-5, tiger 12 pieces all tiger king(rank 1)
    // Dragon rank 2-5 > tiger rank 1, so dragon cannot capture tiger
    // Dragon ranks are all different, no mutual destruction possible
    // All positions occupied, no empty cells to move
    const board = [
      [
        makeCard("虎王", "tiger"),
        makeCard("虎王", "tiger"),
        makeCard("虎王", "tiger"),
        makeCard("虎王", "tiger"),
      ],
      [
        makeCard("虎王", "tiger"),
        makeCard("神龙", "dragon"),
        makeCard("金龙", "dragon"),
        makeCard("虎王", "tiger"),
      ],
      [
        makeCard("虎王", "tiger"),
        makeCard("青龙", "dragon"),
        makeCard("赤龙", "dragon"),
        makeCard("虎王", "tiger"),
      ],
      [
        makeCard("虎王", "tiger"),
        makeCard("虎王", "tiger"),
        makeCard("虎王", "tiger"),
        makeCard("虎王", "tiger"),
      ],
    ];
    expect(hasAnyLegalAction(board, "dragon")).toBe(false);
  });

  it("空board返回 false", () => {
    const board = emptyBoard();
    expect(hasAnyLegalAction(board, "dragon")).toBe(false);
  });
});

// ============================================================
// checkGameOver - game over check
// ============================================================
describe("checkGameOver - 游戏结束判定", () => {
  it("dragon无牌时tiger获胜", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("虎王", "tiger");
    const result = checkGameOver(board, "dragon");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("tiger");
  });

  it("tiger无牌时dragon获胜", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon");
    const result = checkGameOver(board, "tiger");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("dragon");
  });

  it("当前行动方无合法操作时对方获胜", () => {
    const board = emptyBoard();
    // dragon has no pieces, necessarily no legal actions
    board[0][0] = makeCard("虎王", "tiger");
    const result = checkGameOver(board, "dragon");
    expect(result.ended).toBe(true);
    expect(result.winner).toBe("tiger");
  });

  it("双方都有牌且有合法操作时游戏未结束", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon");
    board[3][3] = makeCard("虎王", "tiger");
    const result = checkGameOver(board, "dragon");
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("有未翻开的牌时游戏未结束", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon");
    board[3][3] = makeCard("虎王", "tiger", false);
    const result = checkGameOver(board, "dragon");
    expect(result.ended).toBe(false);
    expect(result.winner).toBeNull();
  });
});

// ============================================================
// aiDecide - AI decision function
// ============================================================
describe("aiDecide - AI决策函数", () => {
  it("存在吃牌机会时返回 capture 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("吃牌优先于翻牌", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    board[3][3] = makeCard("虎王", "tiger", false);
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
  });

  it("吃牌优先于走牌", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][2] = makeCard("东北虎", "tiger");
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
  });

  it("有多个吃牌机会时优先吃高等级（rank值小）的棋子", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][0] = makeCard("东北虎", "tiger"); // rank 2
    board[0][1] = makeCard("白虎", "tiger"); // rank 7
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Should prefer capturing northeast tiger(rank2) over white tiger(rank7)
    expect(decision.to).toEqual({ x: 0, y: 1 });
  });

  it("优先选择非同归于尽的吃牌", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    board[1][0] = makeCard("虎王", "tiger"); // Same rank, mutual destruction
    board[0][1] = makeCard("东北虎", "tiger"); // Non-mutual destruction
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    // Should prefer capturing northeast tiger (non-mutual destruction)
    expect(decision.to).toEqual({ x: 1, y: 0 });
  });

  it("只有未翻开的牌可用时返回 flip 操作", () => {
    const board = emptyBoard();
    // dragon cards surrounded by own team, cannot move
    board[0][0] = makeCard("龙王", "dragon");
    board[0][1] = makeCard("神龙", "dragon");
    board[1][0] = makeCard("金龙", "dragon");
    // There is one face-down card
    board[3][3] = makeCard("虎王", "tiger", false);
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
    expect(decision.x).toBe(3);
    expect(decision.y).toBe(3);
  });

  it("翻牌优先于走牌", () => {
    const board = emptyBoard();
    board[0][0] = makeCard("龙王", "dragon");
    // Dragon king has empty cells around, but also has face-down cards
    board[3][3] = makeCard("虎王", "tiger", false);
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
  });

  it("只有走牌可用时返回 move 操作", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("龙王", "dragon");
    // Surrounding has empty cells, no opponent cards to capture, no face-down cards
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("move");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    // Target should be one of adjacent empty cells
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
    // dragon has no pieces, necessarily no legal actions
    board[0][0] = makeCard("虎王", "tiger");
    const state = makeState(board, "dragon");
    const decision = aiDecide(state, "dragon");
    expect(decision).toBeNull();
  });

  it("虎方AI也能正确决策", () => {
    const board = emptyBoard();
    board[1][1] = makeCard("虎王", "tiger");
    board[1][2] = makeCard("神龙", "dragon");
    const state = makeState(board, "tiger");
    const decision = aiDecide(state, "tiger");
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });
});
