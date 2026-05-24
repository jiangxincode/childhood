import { describe, it, expect } from "vitest";
const {
  DIRECTIONS,
  inBounds,
  getValidMoves,
  getValidCaptures,
  flipCard,
  moveCard,
  createBaseState,
} = require("./card-game-core.js");

// Helper: create empty 4x4 board
function emptyBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

// Helper: create a card
function makeCard(team, faceUp) {
  return { team: team, rank: 1, faceUp: faceUp };
}

// Helper: canCapture that always returns true (for testing)
function alwaysCanCapture() {
  return true;
}
function neverCanCapture() {
  return false;
}

describe("DIRECTIONS", () => {
  it("has 4 directions", () => {
    expect(DIRECTIONS.length).toBe(4);
  });
  it("contains up, down, left, right", () => {
    var dxSet = new Set(DIRECTIONS.map((d) => d.dx));
    var dySet = new Set(DIRECTIONS.map((d) => d.dy));
    expect(dxSet.has(-1)).toBe(true);
    expect(dxSet.has(1)).toBe(true);
    expect(dySet.has(-1)).toBe(true);
    expect(dySet.has(1)).toBe(true);
  });
});

describe("inBounds", () => {
  it("accepts 0,0", () => {
    expect(inBounds(0, 0)).toBe(true);
  });
  it("accepts 3,3", () => {
    expect(inBounds(3, 3)).toBe(true);
  });
  it("accepts 1,2", () => {
    expect(inBounds(1, 2)).toBe(true);
  });
  it("rejects 4,0", () => {
    expect(inBounds(4, 0)).toBe(false);
  });
  it("rejects 0,4", () => {
    expect(inBounds(0, 4)).toBe(false);
  });
  it("rejects -1,0", () => {
    expect(inBounds(-1, 0)).toBe(false);
  });
  it("rejects 0,-1", () => {
    expect(inBounds(0, -1)).toBe(false);
  });
});

describe("getValidMoves", () => {
  it("returns empty for null cell", () => {
    var board = emptyBoard();
    expect(getValidMoves(board, 0, 0)).toEqual([]);
  });
  it("returns adjacent empty cells", () => {
    var board = emptyBoard();
    board[1][1] = makeCard("red", true);
    var moves = getValidMoves(board, 1, 1);
    expect(moves.length).toBe(4);
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).toContainEqual({ x: 2, y: 1 });
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 1, y: 2 });
  });
  it("excludes occupied cells", () => {
    var board = emptyBoard();
    board[1][1] = makeCard("red", true);
    board[0][1] = makeCard("blue", true);
    var moves = getValidMoves(board, 1, 1);
    expect(moves.length).toBe(3);
    expect(moves).not.toContainEqual({ x: 1, y: 0 });
  });
  it("excludes out-of-bounds cells", () => {
    var board = emptyBoard();
    board[0][0] = makeCard("red", true);
    var moves = getValidMoves(board, 0, 0);
    expect(moves.length).toBe(2);
    expect(moves).toContainEqual({ x: 1, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
  });
});

describe("getValidCaptures", () => {
  it("returns empty for null cell", () => {
    var board = emptyBoard();
    expect(getValidCaptures(board, 0, 0, "red", alwaysCanCapture)).toEqual([]);
  });
  it("returns empty for face-down card", () => {
    var board = emptyBoard();
    board[1][1] = makeCard("red", false);
    expect(getValidCaptures(board, 1, 1, "red", alwaysCanCapture)).toEqual([]);
  });
  it("returns empty for wrong team", () => {
    var board = emptyBoard();
    board[1][1] = makeCard("blue", true);
    expect(getValidCaptures(board, 1, 1, "red", alwaysCanCapture)).toEqual([]);
  });
  it("returns empty when canCapture returns false", () => {
    var board = emptyBoard();
    board[1][1] = makeCard("red", true);
    board[0][1] = makeCard("blue", true);
    expect(getValidCaptures(board, 1, 1, "red", neverCanCapture)).toEqual([]);
  });
  it("returns valid capture targets", () => {
    var board = emptyBoard();
    board[1][1] = makeCard("red", true);
    board[0][1] = makeCard("blue", true);
    board[1][2] = makeCard("blue", true);
    var captures = getValidCaptures(board, 1, 1, "red", alwaysCanCapture);
    expect(captures.length).toBe(2);
    expect(captures).toContainEqual({ x: 1, y: 0 });
    expect(captures).toContainEqual({ x: 2, y: 1 });
  });
  it("excludes same-team cards", () => {
    var board = emptyBoard();
    board[1][1] = makeCard("red", true);
    board[0][1] = makeCard("red", true);
    expect(getValidCaptures(board, 1, 1, "red", alwaysCanCapture)).toEqual([]);
  });
});

describe("flipCard", () => {
  it("flips a face-down card", () => {
    var state = {
      board: emptyBoard(),
      mode: "pvp",
      currentTeam: "red",
      teamAssigned: true,
      turnCount: 0,
    };
    state.board[1][1] = { team: "red", faceUp: false };
    var result = flipCard(state, 1, 1);
    expect(result).toBe(state);
    expect(state.board[1][1].faceUp).toBe(true);
    expect(state.turnCount).toBe(1);
  });
  it("returns null for empty cell", () => {
    var state = {
      board: emptyBoard(),
      mode: "pvp",
      currentTeam: "red",
      teamAssigned: true,
      turnCount: 0,
    };
    expect(flipCard(state, 0, 0)).toBeNull();
  });
  it("returns null for face-up card", () => {
    var state = {
      board: emptyBoard(),
      mode: "pvp",
      currentTeam: "red",
      teamAssigned: true,
      turnCount: 0,
    };
    state.board[0][0] = { team: "red", faceUp: true };
    expect(flipCard(state, 0, 0)).toBeNull();
  });
  it("switches team after flip", () => {
    var state = {
      board: emptyBoard(),
      mode: "pvp",
      currentTeam: "red",
      teamAssigned: true,
      turnCount: 0,
    };
    state.board[0][0] = { team: "red", faceUp: false };
    flipCard(state, 0, 0);
    expect(state.currentTeam).toBe("blue");
  });
  it("assigns teams on first flip in pvp", () => {
    var state = {
      board: emptyBoard(),
      mode: "pvp",
      currentTeam: null,
      teamAssigned: false,
      turnCount: 0,
      aiFirst: false,
    };
    state.board[0][0] = { team: "red", faceUp: false };
    flipCard(state, 0, 0);
    expect(state.teamAssigned).toBe(true);
    // When currentTeam is null, null !== 'red' so it becomes 'red'
    expect(state.currentTeam).toBe("red");
  });
});

describe("moveCard", () => {
  it("moves a card to adjacent empty cell", () => {
    var state = { board: emptyBoard(), mode: "pvp", currentTeam: "red", turnCount: 0 };
    state.board[1][1] = { team: "red", faceUp: true };
    var result = moveCard(state, { x: 1, y: 1 }, { x: 1, y: 2 });
    expect(result).toBe(state);
    expect(state.board[1][1]).toBeNull();
    expect(state.board[2][1]).toBeTruthy();
    expect(state.currentTeam).toBe("blue");
    expect(state.turnCount).toBe(1);
  });
  it("returns null for non-adjacent move", () => {
    var state = { board: emptyBoard(), mode: "pvp", currentTeam: "red", turnCount: 0 };
    state.board[0][0] = { team: "red", faceUp: true };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });
  it("returns null for occupied target", () => {
    var state = { board: emptyBoard(), mode: "pvp", currentTeam: "red", turnCount: 0 };
    state.board[0][0] = { team: "red", faceUp: true };
    state.board[0][1] = { team: "blue", faceUp: true };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
  it("returns null for wrong team", () => {
    var state = { board: emptyBoard(), mode: "pvp", currentTeam: "red", turnCount: 0 };
    state.board[0][0] = { team: "blue", faceUp: true };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
  it("returns null for face-down card", () => {
    var state = { board: emptyBoard(), mode: "pvp", currentTeam: "red", turnCount: 0 };
    state.board[0][0] = { team: "red", faceUp: false };
    expect(moveCard(state, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

describe("createBaseState", () => {
  it("creates state with correct mode", () => {
    var state = createBaseState("pvp");
    expect(state.mode).toBe("pvp");
  });
  it("has null board", () => {
    var state = createBaseState("pve");
    expect(state.board).toBeNull();
  });
  it("has empty captured arrays", () => {
    var state = createBaseState("pvp");
    expect(state.capturedRed).toEqual([]);
    expect(state.capturedBlue).toEqual([]);
  });
  it("starts with turnCount 0", () => {
    var state = createBaseState("pvp");
    expect(state.turnCount).toBe(0);
  });
  it("starts with gameOver false", () => {
    var state = createBaseState("pvp");
    expect(state.gameOver).toBe(false);
  });
});
// ============================================================
// AI helper utilities tests
// ============================================================
const {
  isPositionUnderThreat,
  simulateMove,
  simulateCapture,
  smartAiDecide,
} = require("./card-game-core.js");

// Standard 1-8 rank capture rule with reversal: rank 8 captures rank 1
function rankCanCapture(att, def) {
  if (att.team === def.team) return false;
  if (att.rank === 8 && def.rank === 1) return true;
  if (att.rank === 1 && def.rank === 8) return false;
  return att.rank <= def.rank;
}

function isMutual(att, def) {
  return att.rank === def.rank;
}

function pieceValueStd(rank) {
  if (rank === 1) return 10;
  if (rank === 8) return 5;
  return 9 - rank;
}

function pieceCard(team, rank, faceUp) {
  return { team: team, rank: rank, faceUp: faceUp !== false };
}

describe("isPositionUnderThreat", () => {
  it("returns false when there are no enemies adjacent", () => {
    var board = emptyBoard();
    board[1][1] = pieceCard("red", 3, true);
    expect(isPositionUnderThreat(board, 1, 1, "red", rankCanCapture)).toBe(false);
  });
  it("returns true when an adjacent enemy can capture", () => {
    var board = emptyBoard();
    board[1][1] = pieceCard("red", 3, true);
    // Lion (rank 2) captures rank 3
    board[1][2] = pieceCard("blue", 2, true);
    expect(isPositionUnderThreat(board, 1, 1, "red", rankCanCapture)).toBe(true);
  });
  it("returns false when adjacent enemy is too weak", () => {
    var board = emptyBoard();
    board[1][1] = pieceCard("red", 1, true);
    // Cat (rank 7) cannot capture elephant (rank 1)
    board[1][2] = pieceCard("blue", 7, true);
    expect(isPositionUnderThreat(board, 1, 1, "red", rankCanCapture)).toBe(false);
  });
  it("ignores face-down enemies", () => {
    var board = emptyBoard();
    board[1][1] = pieceCard("red", 3, true);
    board[1][2] = pieceCard("blue", 1, false);
    expect(isPositionUnderThreat(board, 1, 1, "red", rankCanCapture)).toBe(false);
  });
});

describe("simulateMove", () => {
  it("does not mutate original board", () => {
    var board = emptyBoard();
    board[0][0] = pieceCard("red", 1, true);
    var newBoard = simulateMove(board, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(board[0][0]).not.toBeNull();
    expect(newBoard[0][0]).toBeNull();
    expect(newBoard[0][1]).toBe(board[0][0]);
  });
});

describe("simulateCapture", () => {
  it("normal capture moves attacker into defender", () => {
    var board = emptyBoard();
    board[0][0] = pieceCard("red", 1, true);
    board[0][1] = pieceCard("blue", 2, true);
    var newBoard = simulateCapture(board, { x: 0, y: 0 }, { x: 1, y: 0 }, false);
    expect(newBoard[0][0]).toBeNull();
    expect(newBoard[0][1]).toBe(board[0][0]);
  });
  it("mutual destruction clears both squares", () => {
    var board = emptyBoard();
    board[0][0] = pieceCard("red", 1, true);
    board[0][1] = pieceCard("blue", 1, true);
    var newBoard = simulateCapture(board, { x: 0, y: 0 }, { x: 1, y: 0 }, true);
    expect(newBoard[0][0]).toBeNull();
    expect(newBoard[0][1]).toBeNull();
  });
});

describe("smartAiDecide", () => {
  function makeDeps() {
    return {
      canCapture: rankCanCapture,
      isMutualDestruction: isMutual,
      pieceValue: pieceValueStd,
      getValidCaptures: function (board, x, y, team) {
        return getValidCaptures(board, x, y, team, rankCanCapture);
      },
      getValidMoves: getValidMoves,
    };
  }

  it("prefers a safe high-value capture", () => {
    var board = emptyBoard();
    // red elephant captures blue lion (rank 1 vs rank 2), no enemies adjacent after
    board[1][1] = pieceCard("red", 1, true);
    board[1][2] = pieceCard("blue", 2, true);
    var state = { board: board, currentTeam: "red" };
    var decision = smartAiDecide(state, "red", makeDeps());
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("capture");
    expect(decision.from).toEqual({ x: 1, y: 1 });
    expect(decision.to).toEqual({ x: 2, y: 1 });
  });

  it("avoids a capture that exposes attacker to a stronger enemy", () => {
    var board = emptyBoard();
    // Red lion(2) can capture blue cat(7), but after move would be next to blue elephant(1) and get captured.
    // Red also has a safer capture: red dog(6) captures blue cat... actually let's set:
    // red lion at (1,1) can capture blue dog(6) at (1,2) -> after move at (1,2),
    // adjacent to blue elephant(1) at (1,3) which captures lion(2). Score: 3 - 8 = -5.
    // red wolf(5) at (3,3) can capture blue cat(7) at (3,2) -> after move at (3,2),
    // no enemies adjacent. Score: 2.
    // AI should prefer red wolf capture.
    board[1][1] = pieceCard("red", 2, true); // lion
    board[1][2] = pieceCard("blue", 6, true); // dog
    board[1][3] = pieceCard("blue", 1, true); // elephant adjacent -> threatens after capture
    board[3][3] = pieceCard("red", 5, true); // wolf
    board[3][2] = pieceCard("blue", 7, true); // cat
    var state = { board: board, currentTeam: "red" };
    var decision = smartAiDecide(state, "red", makeDeps());
    expect(decision.type).toBe("capture");
    expect(decision.from).toEqual({ x: 3, y: 3 });
    expect(decision.to).toEqual({ x: 2, y: 3 });
  });

  it("returns flip when no captures and face-down cards exist", () => {
    var board = emptyBoard();
    board[0][0] = pieceCard("red", 1, true);
    board[3][3] = pieceCard("blue", 2, false);
    var state = { board: board, currentTeam: "red" };
    var decision = smartAiDecide(state, "red", makeDeps());
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("flip");
  });

  it("escapes a threatened position via move", () => {
    var board = emptyBoard();
    // Red rank-3 at (1,1), threatened by blue rank-2 at (1,2). Empty cell at (0,1) and (1,0) etc.
    board[1][1] = pieceCard("red", 3, true);
    board[1][2] = pieceCard("blue", 2, true);
    // After moving red to (1,0), no enemy adjacent -> safe.
    var state = { board: board, currentTeam: "red" };
    var decision = smartAiDecide(state, "red", makeDeps());
    expect(decision).not.toBeNull();
    expect(decision.type).toBe("move");
    // Should not move into a threatened cell (e.g. (2,1) is empty too but not threatened either)
    // Just verify it picked a safe cell
    var futureBoard = simulateMove(board, decision.from, decision.to);
    expect(
      isPositionUnderThreat(futureBoard, decision.to.x, decision.to.y, "red", rankCanCapture)
    ).toBe(false);
  });

  it("returns null when there are no legal actions", () => {
    var board = emptyBoard();
    // Red rank-7 surrounded by stronger blue pieces; all adjacent are own-team unable to capture
    board[1][1] = pieceCard("red", 7, true);
    board[1][0] = pieceCard("blue", 2, true);
    board[1][2] = pieceCard("blue", 3, true);
    board[0][1] = pieceCard("blue", 4, true);
    board[2][1] = pieceCard("blue", 5, true);
    var state = { board: board, currentTeam: "red" };
    var decision = smartAiDecide(state, "red", makeDeps());
    expect(decision).toBeNull();
  });
});
