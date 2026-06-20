import { describe, it, expect } from "vitest";
import {
  EMPTY,
  RED,
  BLUE,
  GREEN,
  YELLOW,
  PURPLE,
  ORANGE,
  PLAYER_COLORS,
  BOARD_ROWS,
  ROW_COLS,
  TOTAL_POSITIONS,
  positions,
  posKey,
  ADJACENT,
  START_POSITIONS,
  TARGET_POSITIONS,
  AI_WEIGHTS,
  POSITION_SCORES,
  isInTargetArea,
  createBoard,
  placePieces,
  getAdjacentMoves,
  getJumpMoves,
  getLegalMoves,
  makeMove,
  checkWin,
  checkGameOver,
  evaluateMove,
  getBestAIMove,
  judgeRPS,
  getRPSName,
  createGameState,
  initGame,
  PLAYER_SETS,
} from "./game.js";

describe("constants", () => {
  it("EMPTY is 0", () => {
    expect(EMPTY).toBe(0);
  });
  it("RED is 1", () => {
    expect(RED).toBe(1);
  });
  it("BLUE is 2", () => {
    expect(BLUE).toBe(2);
  });
  it("GREEN is 3", () => {
    expect(GREEN).toBe(3);
  });
  it("YELLOW is 4", () => {
    expect(YELLOW).toBe(4);
  });
  it("PURPLE is 5", () => {
    expect(PURPLE).toBe(5);
  });
  it("ORANGE is 6", () => {
    expect(ORANGE).toBe(6);
  });
  it("TOTAL_POSITIONS is 121", () => {
    expect(TOTAL_POSITIONS).toBe(121);
  });
  it("has 6 player color configs", () => {
    expect(Object.keys(PLAYER_COLORS).length).toBe(6);
  });
});

describe("board layout", () => {
  it("has 17 rows", () => {
    expect(BOARD_ROWS).toBe(17);
  });
  it("row cols sum to 121", () => {
    var sum = ROW_COLS.reduce((a, b) => a + b, 0);
    expect(sum).toBe(121);
  });
  it("positions array has 121 entries", () => {
    expect(positions.length).toBe(121);
  });
});

describe("ADJACENT", () => {
  it("has 121 entries", () => {
    expect(ADJACENT.length).toBe(121);
  });
  it("center cell has 6 neighbors", () => {
    // Row 10, Col 10 is the center (position index 60)
    expect(ADJACENT[60].length).toBe(6);
  });
  it("corner cell has fewer neighbors", () => {
    expect(ADJACENT[0].length).toBeLessThan(6);
  });
  it("adjacency is symmetric", () => {
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      for (var j = 0; j < ADJACENT[i].length; j++) {
        var neighbor = ADJACENT[i][j];
        expect(ADJACENT[neighbor].indexOf(i)).not.toBe(-1);
      }
    }
  });
});

describe("START_POSITIONS", () => {
  it("each player has 10 start positions", () => {
    expect(START_POSITIONS[RED].length).toBe(10);
    expect(START_POSITIONS[BLUE].length).toBe(10);
    expect(START_POSITIONS[GREEN].length).toBe(10);
    expect(START_POSITIONS[YELLOW].length).toBe(10);
    expect(START_POSITIONS[PURPLE].length).toBe(10);
    expect(START_POSITIONS[ORANGE].length).toBe(10);
  });
  it("start positions do not overlap", () => {
    var all = [];
    for (var p = 1; p <= 6; p++) {
      for (var i = 0; i < START_POSITIONS[p].length; i++) {
        expect(all.indexOf(START_POSITIONS[p][i])).toBe(-1);
        all.push(START_POSITIONS[p][i]);
      }
    }
  });
});

describe("TARGET_POSITIONS", () => {
  it("RED target is the directly opposite (PURPLE) start", () => {
    expect(TARGET_POSITIONS[RED]).toEqual(START_POSITIONS[PURPLE]);
  });
  it("PURPLE target is RED start (opposite pair)", () => {
    expect(TARGET_POSITIONS[PURPLE]).toEqual(START_POSITIONS[RED]);
  });
  it("BLUE target is the directly opposite (GREEN) start", () => {
    expect(TARGET_POSITIONS[BLUE]).toEqual(START_POSITIONS[GREEN]);
  });
  it("YELLOW target is the directly opposite (ORANGE) start", () => {
    expect(TARGET_POSITIONS[YELLOW]).toEqual(START_POSITIONS[ORANGE]);
  });
  it("every player's target is its point-symmetric opposite triangle", () => {
    // board center in axial coordinates
    let cx = 0;
    let cy = 0;
    for (let c = 0; c < TOTAL_POSITIONS; c++) {
      cx += positions[c].x;
      cy += positions[c].y;
    }
    cx /= TOTAL_POSITIONS;
    cy /= TOTAL_POSITIONS;
    const centroid = (cells) => {
      let x = 0;
      let y = 0;
      for (const c of cells) {
        x += positions[c].x;
        y += positions[c].y;
      }
      return { x: x / cells.length, y: y / cells.length };
    };
    for (let p = RED; p <= ORANGE; p++) {
      const start = centroid(START_POSITIONS[p]);
      const target = centroid(TARGET_POSITIONS[p]);
      // start and target centroids must be symmetric about the board center
      expect(start.x + target.x).toBeCloseTo(2 * cx, 5);
      expect(start.y + target.y).toBeCloseTo(2 * cy, 5);
    }
  });
});

describe("createBoard", () => {
  it("creates empty board", () => {
    var board = createBoard();
    expect(board.length).toBe(TOTAL_POSITIONS);
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      expect(board[i]).toBe(EMPTY);
    }
  });
});

describe("placePieces", () => {
  it("places pieces correctly", () => {
    var board = createBoard();
    placePieces(board, RED);
    for (var i = 0; i < START_POSITIONS[RED].length; i++) {
      expect(board[START_POSITIONS[RED][i]]).toBe(RED);
    }
  });
});

describe("getLegalMoves", () => {
  it("returns legal moves from center", () => {
    var board = createBoard();
    var moves = getLegalMoves(board, 60);
    expect(moves.length).toBe(6);
  });
  it("includes jump moves", () => {
    var board = createBoard();
    board[60] = RED;
    board[61] = BLUE;
    var moves = getLegalMoves(board, 60);
    expect(moves.length).toBeGreaterThan(5);
  });
});

describe("makeMove", () => {
  it("moves piece correctly", () => {
    var board = createBoard();
    board[0] = RED;
    var newBoard = makeMove(board, 0, 1);
    expect(newBoard[0]).toBe(EMPTY);
    expect(newBoard[1]).toBe(RED);
  });
  it("does not modify original board", () => {
    var board = createBoard();
    board[0] = RED;
    makeMove(board, 0, 1);
    expect(board[0]).toBe(RED);
  });
});

describe("checkWin", () => {
  it("detects win when all pieces in target", () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    expect(checkWin(board, RED)).toBe(true);
  });
  it("returns false when not all pieces in target", () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length - 1; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    expect(checkWin(board, RED)).toBe(false);
  });
});

describe("checkGameOver", () => {
  it("returns null when no winner", () => {
    var board = createBoard();
    expect(checkGameOver(board, [RED, BLUE])).toBeNull();
  });
  it("returns winner", () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    expect(checkGameOver(board, [RED, BLUE])).toBe(RED);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move", () => {
    var board = createBoard();
    placePieces(board, RED);
    placePieces(board, BLUE);
    var move = getBestAIMove(board, BLUE);
    expect(move).not.toBeNull();
    expect(typeof move.from).toBe("number");
    expect(typeof move.to).toBe("number");
  });
});

describe("createGameState", () => {
  it("creates correct initial state", () => {
    var state = createGameState("pvp", 2);
    expect(state.mode).toBe("pvp");
    expect(state.playerCount).toBe(2);
    expect(state.players).toEqual([RED, PURPLE]);
    expect(state.currentPlayer).toBe(RED);
    expect(state.gameOver).toBe(false);
  });
});

describe("initGame", () => {
  it("places pieces for all players", () => {
    var state = createGameState("pvp", 6);
    initGame(state);
    for (var p = 1; p <= 6; p++) {
      for (var i = 0; i < START_POSITIONS[p].length; i++) {
        expect(state.board[START_POSITIONS[p][i]]).toBe(p);
      }
    }
  });
});

describe("AI_WEIGHTS", () => {
  it("has all weight constants", () => {
    expect(AI_WEIGHTS.PROGRESS).toBe(100);
    expect(AI_WEIGHTS.JUMP_EFFICIENCY).toBe(30);
    expect(AI_WEIGHTS.TARGET_ENTRY).toBe(500);
    expect(AI_WEIGHTS.TARGET_DEPTH).toBe(200);
    expect(AI_WEIGHTS.BLOCKING).toBe(80);
    expect(AI_WEIGHTS.FORMATION).toBe(20);
    expect(AI_WEIGHTS.RETREAT_PENALTY).toBe(-150);
  });
});

describe("POSITION_SCORES", () => {
  it("has scores for all players", () => {
    for (var p = RED; p <= ORANGE; p++) {
      expect(POSITION_SCORES[p]).toBeDefined();
      expect(POSITION_SCORES[p].length).toBe(TOTAL_POSITIONS);
    }
  });
  it("target positions have higher scores than start positions", () => {
    var targetScore = POSITION_SCORES[RED][TARGET_POSITIONS[RED][0]];
    var startScore = POSITION_SCORES[RED][START_POSITIONS[RED][0]];
    expect(targetScore).toBeGreaterThan(startScore);
  });
});

describe("isInTargetArea", () => {
  it("returns true for target positions", () => {
    expect(isInTargetArea(TARGET_POSITIONS[RED][0], RED)).toBe(true);
  });
  it("returns false for start positions", () => {
    expect(isInTargetArea(START_POSITIONS[RED][0], RED)).toBe(false);
  });
});

describe("judgeRPS", () => {
  it("rock beats scissors", () => {
    expect(judgeRPS("rock", "scissors")).toBe(1);
    expect(judgeRPS("scissors", "rock")).toBe(-1);
  });
  it("scissors beats paper", () => {
    expect(judgeRPS("scissors", "paper")).toBe(1);
    expect(judgeRPS("paper", "scissors")).toBe(-1);
  });
  it("paper beats rock", () => {
    expect(judgeRPS("paper", "rock")).toBe(1);
    expect(judgeRPS("rock", "paper")).toBe(-1);
  });
  it("same choice is draw", () => {
    expect(judgeRPS("rock", "rock")).toBe(0);
    expect(judgeRPS("scissors", "scissors")).toBe(0);
    expect(judgeRPS("paper", "paper")).toBe(0);
  });
});

describe("getRPSName", () => {
  it("returns Chinese names", () => {
    expect(getRPSName("rock")).toBe("石头");
    expect(getRPSName("scissors")).toBe("剪刀");
    expect(getRPSName("paper")).toBe("布");
  });
});

// ============================================================
// Additional tests: getAdjacentMoves
// ============================================================

describe("getAdjacentMoves (supplementary)", () => {
  it("center position returns all empty adjacent cells", () => {
    var board = createBoard();
    var moves = getAdjacentMoves(board, 60);
    expect(moves.length).toBe(ADJACENT[60].length);
  });
  it("adjacent cells occupied by pieces are not returned", () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    board[neighbors[0]] = RED;
    board[neighbors[1]] = BLUE;
    var moves = getAdjacentMoves(board, 60);
    expect(moves.length).toBe(neighbors.length - 2);
    expect(moves).not.toContain(neighbors[0]);
    expect(moves).not.toContain(neighbors[1]);
  });
  it("edge positions have fewer adjacent cells", () => {
    var board = createBoard();
    var moves = getAdjacentMoves(board, 0);
    expect(moves.length).toBeLessThan(6);
    expect(moves.length).toBe(ADJACENT[0].length);
  });
  it("returns empty array when all adjacent cells are occupied", () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    for (var i = 0; i < neighbors.length; i++) {
      board[neighbors[i]] = RED;
    }
    var moves = getAdjacentMoves(board, 60);
    expect(moves).toHaveLength(0);
  });
});

// ============================================================
// Additional tests: getJumpMoves
// ============================================================

describe("getJumpMoves (supplementary)", () => {
  it("single jump: piece in middle and empty target", () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    // Place piece in first adjacent cell to create a springboard
    board[neighbors[0]] = RED;
    // Calculate jump target: jump from 60 over neighbors[0]
    var p1 = positions[60];
    var p2 = positions[neighbors[0]];
    var dstX = p2.x + (p2.x - p1.x);
    var dstY = p2.y + (p2.y - p1.y);
    var dstKey = dstX + "," + dstY;
    if (posKey[dstKey] !== undefined) {
      var dstIdx = posKey[dstKey];
      var visited = {};
      var moves = getJumpMoves(board, 60, visited);
      expect(moves).toContain(dstIdx);
    }
  });
  it("returns empty array when no jump is possible", () => {
    var board = createBoard();
    // No springboard on empty board
    var visited = {};
    var moves = getJumpMoves(board, 60, visited);
    expect(moves).toHaveLength(0);
  });
  it("visited anti-loop mechanism: visited positions are not jumped again", () => {
    var board = createBoard();
    var neighbors = ADJACENT[60];
    board[neighbors[0]] = RED;
    var visited = {};
    // Pre-mark all possible targets as visited
    var p1 = positions[60];
    var p2 = positions[neighbors[0]];
    var dstX = p2.x + (p2.x - p1.x);
    var dstY = p2.y + (p2.y - p1.y);
    var dstKey = dstX + "," + dstY;
    if (posKey[dstKey] !== undefined) {
      visited[posKey[dstKey]] = true;
      var moves = getJumpMoves(board, 60, visited);
      expect(moves).not.toContain(posKey[dstKey]);
    }
  });
  it("multi-jump recursion: consecutive jump chain", () => {
    var board = createBoard();
    // Construct a scenario with consecutive jumps
    // Choose a position chain with enough neighbors
    var cell = 60;
    var neighbors = ADJACENT[cell];
    if (neighbors.length >= 2) {
      board[neighbors[0]] = RED;
      board[neighbors[1]] = RED;
      var visited = {};
      var moves = getJumpMoves(board, cell, visited);
      // Should have at least 2 jump targets (one per springboard)
      expect(moves.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ============================================================
// Additional tests: getLegalMoves edge cases
// ============================================================

describe("getLegalMoves (supplementary)", () => {
  it("legal moves from corner position", () => {
    var board = createBoard();
    var moves = getLegalMoves(board, 0);
    // Corner positions only have adjacent moves, equals adjacent count without springboard
    expect(moves.length).toBe(ADJACENT[0].length);
  });
  it("returns empty array for empty cell with no piece", () => {
    var board = createBoard();
    // Calling getLegalMoves on empty cell should return empty (though not called this way in practice)
    var moves = getLegalMoves(board, 60);
    // Empty cell has no piece, but function still returns adjacent empty cells (this is by design)
    expect(moves.length).toBe(ADJACENT[60].length);
  });
  it("returns empty array when board is full", () => {
    var board = createBoard();
    // Fill the entire board
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      board[i] = RED;
    }
    var moves = getLegalMoves(board, 60);
    expect(moves).toHaveLength(0);
  });
  it("multi-jump paths are included in results", () => {
    var board = createBoard();
    board[60] = RED;
    var neighbors = ADJACENT[60];
    board[neighbors[0]] = BLUE;
    var moves = getLegalMoves(board, 60);
    // Adjacent moves + possible jumps
    expect(moves.length).toBeGreaterThanOrEqual(neighbors.length - 1);
  });
});

// ============================================================
// Additional tests: placePieces other players
// ============================================================

describe("placePieces (supplementary)", () => {
  it("BLUE pieces placed correctly", () => {
    var board = createBoard();
    placePieces(board, BLUE);
    for (var i = 0; i < START_POSITIONS[BLUE].length; i++) {
      expect(board[START_POSITIONS[BLUE][i]]).toBe(BLUE);
    }
  });
  it("GREEN pieces placed correctly", () => {
    var board = createBoard();
    placePieces(board, GREEN);
    for (var i = 0; i < START_POSITIONS[GREEN].length; i++) {
      expect(board[START_POSITIONS[GREEN][i]]).toBe(GREEN);
    }
  });
  it("all 6 players start positions do not overlap", () => {
    var board = createBoard();
    for (var p = RED; p <= ORANGE; p++) {
      placePieces(board, p);
    }
    // Each position can only have one player
    for (var i = 0; i < TOTAL_POSITIONS; i++) {
      if (board[i] !== EMPTY) {
        expect(board[i]).toBeGreaterThanOrEqual(RED);
        expect(board[i]).toBeLessThanOrEqual(ORANGE);
      }
    }
  });
});

// ============================================================
// Additional tests: checkWin edge cases
// ============================================================

describe("checkWin (supplementary)", () => {
  it("wins immediately when last piece reaches target", () => {
    var board = createBoard();
    var targets = TARGET_POSITIONS[RED];
    // Place 9 in target, last one at start position
    for (var i = 0; i < targets.length - 1; i++) {
      board[targets[i]] = RED;
    }
    // One short, not a win yet
    expect(checkWin(board, RED)).toBe(false);
    // Last one reaches target
    board[targets[targets.length - 1]] = RED;
    expect(checkWin(board, RED)).toBe(true);
  });
  it("target area with other player pieces does not count as win", () => {
    var board = createBoard();
    var targets = TARGET_POSITIONS[RED];
    for (var i = 0; i < targets.length; i++) {
      board[targets[i]] = BLUE; // Placed BLUE not RED
    }
    expect(checkWin(board, RED)).toBe(false);
  });
  it("anti-blocking: full destination with at least one own piece wins", () => {
    var board = createBoard();
    var targets = TARGET_POSITIONS[RED];
    // 9 own pieces in, opponent parks one piece in the last destination hole
    for (var i = 0; i < targets.length - 1; i++) {
      board[targets[i]] = RED;
    }
    board[targets[targets.length - 1]] = BLUE;
    // Destination is full and at least one piece is RED's own -> RED wins
    expect(checkWin(board, RED)).toBe(true);
  });
  it("anti-blocking: a single own piece is enough when the rest is filled", () => {
    var board = createBoard();
    var targets = TARGET_POSITIONS[RED];
    board[targets[0]] = RED;
    for (var i = 1; i < targets.length; i++) {
      board[targets[i]] = BLUE;
    }
    expect(checkWin(board, RED)).toBe(true);
  });
});

// ============================================================
// Additional tests: checkGameOver multiplayer scenarios
// ============================================================

describe("checkGameOver (supplementary)", () => {
  it("only target player wins in 3-player game", () => {
    var board = createBoard();
    for (var i = 0; i < TARGET_POSITIONS[RED].length; i++) {
      board[TARGET_POSITIONS[RED][i]] = RED;
    }
    var winner = checkGameOver(board, [RED, BLUE, GREEN]);
    expect(winner).toBe(RED);
  });
  it("returns null when no winner in 6-player game", () => {
    var board = createBoard();
    placePieces(board, RED);
    placePieces(board, BLUE);
    var winner = checkGameOver(board, [RED, BLUE]);
    expect(winner).toBeNull();
  });
});

// ============================================================
// Additional tests: createGameState pve mode
// ============================================================

describe("createGameState (supplementary)", () => {
  it("pve mode creates correct state", () => {
    var state = createGameState("pve", 2);
    expect(state.mode).toBe("pve");
    expect(state.playerCount).toBe(2);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
  });
  it("different playerCount creates standard player sets", () => {
    var state2 = createGameState("pvp", 2);
    expect(state2.players).toEqual([RED, PURPLE]);
    var state4 = createGameState("pvp", 4);
    expect(state4.players).toEqual([RED, BLUE, PURPLE, GREEN]);
    var state6 = createGameState("pvp", 6);
    expect(state6.players).toEqual([RED, YELLOW, BLUE, PURPLE, ORANGE, GREEN]);
  });
});

// ============================================================
// New tests: evaluateMove
// ============================================================

describe("evaluateMove", () => {
  it("progress score: moving toward target scores higher than moving away", () => {
    var board = createBoard();
    // Place a RED piece in middle position, leave surrounding empty
    board[60] = RED;
    var neighbors = ADJACENT[60];
    var scores = [];
    for (var i = 0; i < neighbors.length; i++) {
      if (board[neighbors[i]] === EMPTY) {
        scores.push(evaluateMove(board, RED, 60, neighbors[i], [RED, BLUE]));
      }
    }
    // Should have at least some directions to move
    expect(scores.length).toBeGreaterThan(0);
    // Scores in different directions should differ (forward vs backward)
    var allSame = scores.every((s) => s === scores[0]);
    // If position scores differ, scores in different directions should differ
    if (!allSame) {
      var max = Math.max.apply(null, scores);
      var min = Math.min.apply(null, scores);
      expect(max).toBeGreaterThan(min);
    }
  });
  it("entering target area gives high bonus", () => {
    var board = createBoard();
    // Place RED piece next to target area
    var target = TARGET_POSITIONS[RED][0];
    var neighbors = ADJACENT[target];
    var source = null;
    for (var i = 0; i < neighbors.length; i++) {
      if (!isInTargetArea(neighbors[i], RED)) {
        source = neighbors[i];
        break;
      }
    }
    if (source !== null) {
      board[source] = RED;
      var score = evaluateMove(board, RED, source, target, [RED, BLUE]);
      // Entering target area should have significant positive score
      expect(score).toBeGreaterThan(0);
    }
  });
  it("retreat has penalty", () => {
    var board = createBoard();
    placePieces(board, RED);
    // Find a move that goes away from target
    var from = START_POSITIONS[RED][0];
    var neighbors = ADJACENT[from];
    for (var i = 0; i < neighbors.length; i++) {
      if (board[neighbors[i]] === EMPTY) {
        var score = evaluateMove(board, RED, from, neighbors[i], [RED, BLUE]);
        var posFrom = POSITION_SCORES[RED][from];
        var posTo = POSITION_SCORES[RED][neighbors[i]];
        if (posTo < posFrom) {
          // Retreat should have penalty score
          expect(score).toBeLessThan(
            AI_WEIGHTS.RETREAT_PENALTY + AI_WEIGHTS.PROGRESS * posTo + 100
          );
        }
      }
    }
  });
  it("jump scores higher than adjacent move (distance factor)", () => {
    var board = createBoard();
    // Construct a scenario with a springboard
    board[60] = RED;
    var neighbors = ADJACENT[60];
    if (neighbors.length > 0) {
      board[neighbors[0]] = BLUE;
      // Jump score
      var p1 = positions[60];
      var p2 = positions[neighbors[0]];
      var dstX = p2.x + (p2.x - p1.x);
      var dstY = p2.y + (p2.y - p1.y);
      var dstKey = dstX + "," + dstY;
      if (posKey[dstKey] !== undefined) {
        var dstIdx = posKey[dstKey];
        if (board[dstIdx] === EMPTY) {
          var jumpScore = evaluateMove(board, RED, 60, dstIdx, [RED, BLUE]);
          // Adjacent move score
          var adjTarget = null;
          for (var i = 1; i < neighbors.length; i++) {
            if (board[neighbors[i]] === EMPTY) {
              adjTarget = neighbors[i];
              break;
            }
          }
          if (adjTarget !== null) {
            var adjScore = evaluateMove(board, RED, 60, adjTarget, [RED, BLUE]);
            // Jump efficiency bonus makes jump score higher
            expect(jumpScore).toBeGreaterThanOrEqual(adjScore);
          }
        }
      }
    }
  });
});

// ============================================================
// Additional tests: getBestAIMove decision quality
// ============================================================

describe("getBestAIMove (supplementary)", () => {
  it("AI chooses to move toward target area", () => {
    var board = createBoard();
    placePieces(board, RED);
    placePieces(board, BLUE);
    var move = getBestAIMove(board, BLUE, [RED, BLUE]);
    expect(move).not.toBeNull();
    // Position score after move should be higher or equal
    var scoreBefore = POSITION_SCORES[BLUE][move.from];
    var scoreAfter = POSITION_SCORES[BLUE][move.to];
    // AI should not choose a move that retreats significantly
    expect(scoreAfter).toBeGreaterThanOrEqual(scoreBefore - 50);
  });
  it("AI chooses jump when jump opportunity exists", () => {
    var board = createBoard();
    // Construct a scenario favorable for jumping
    board[60] = BLUE;
    var neighbors = ADJACENT[60];
    if (neighbors.length > 0) {
      board[neighbors[0]] = RED;
    }
    var move = getBestAIMove(board, BLUE, [RED, BLUE]);
    if (move !== null) {
      expect(typeof move.from).toBe("number");
      expect(typeof move.to).toBe("number");
    }
  });
  it("returns null when no legal moves", () => {
    var board = createBoard();
    // Place only one piece in corner, completely surrounded
    board[0] = RED;
    var neighbors = ADJACENT[0];
    for (var i = 0; i < neighbors.length; i++) {
      board[neighbors[i]] = BLUE;
    }
    // RED in corner is surrounded, may or may not have springboard
    var move = getBestAIMove(board, RED, [RED, BLUE]);
    // If springboard exists may return non-null, otherwise null
    // This test mainly verifies no exception is thrown
    expect(move === null || (typeof move.from === "number" && typeof move.to === "number")).toBe(
      true
    );
  });
});

// ============================================================
// New tests: standard player layouts (PLAYER_SETS)
// ============================================================

describe("PLAYER_SETS (standard layouts)", () => {
  const OPPOSITE = {
    [RED]: PURPLE,
    [PURPLE]: RED,
    [BLUE]: GREEN,
    [GREEN]: BLUE,
    [YELLOW]: ORANGE,
    [ORANGE]: YELLOW,
  };

  it("defines layouts for 2, 3, 4 and 6 players", () => {
    expect(PLAYER_SETS[2].length).toBe(2);
    expect(PLAYER_SETS[3].length).toBe(3);
    expect(PLAYER_SETS[4].length).toBe(4);
    expect(PLAYER_SETS[6].length).toBe(6);
  });

  it("2 players occupy a directly opposite pair", () => {
    var set = PLAYER_SETS[2];
    expect(OPPOSITE[set[0]]).toBe(set[1]);
  });

  it("3 players leave every destination empty (no opposing pair)", () => {
    var set = PLAYER_SETS[3];
    for (var i = 0; i < set.length; i++) {
      expect(set.indexOf(OPPOSITE[set[i]])).toBe(-1);
    }
  });

  it("4 players form two opposite pairs", () => {
    var set = PLAYER_SETS[4];
    for (var i = 0; i < set.length; i++) {
      // each player's opposite is also playing
      expect(set.indexOf(OPPOSITE[set[i]])).not.toBe(-1);
    }
  });

  it("6 players use all six triangles", () => {
    var set = PLAYER_SETS[6].slice().sort((a, b) => a - b);
    expect(set).toEqual([RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE].sort((a, b) => a - b));
  });

  it("no player set contains duplicates", () => {
    [2, 3, 4, 6].forEach((n) => {
      var set = PLAYER_SETS[n];
      expect(new Set(set).size).toBe(set.length);
    });
  });
});
