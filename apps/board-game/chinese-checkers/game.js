/* eslint-disable no-var, no-undef */
// ============================================================
// Chinese Checkers - Game core logic
// ============================================================
// Reference: anchengjian/chinese_checkers implementation
// 17x17 axial coordinate system, 121 valid positions forming a hexagram

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const EMPTY = 0;
const RED = 1;
const BLUE = 2;
const GREEN = 3;
const YELLOW = 4;
const PURPLE = 5;
const ORANGE = 6;

const PLAYER_COLORS = {
  1: { name: "红方", color: "#e53935", textClass: "text-red" },
  2: { name: "蓝方", color: "#1565c0", textClass: "text-blue" },
  3: { name: "绿方", color: "#2e7d32", textClass: "text-green" },
  4: { name: "黄方", color: "#f9a825", textClass: "text-yellow" },
  5: { name: "紫方", color: "#7b1fa2", textClass: "text-purple" },
  6: { name: "橙方", color: "#ef6c00", textClass: "text-orange" },
};

// ============================================================
// Board definition - 17-column axial coordinates, posRegions defines valid row range per column
// ============================================================

const BOARD_ROWS = 17;

// Row (y) range [yMin, yMax] for each column (x) (1-based)
const POS_REGIONS = [
  [5, 5], // x=1:  1 cell
  [5, 6], // x=2:  2 cells
  [5, 7], // x=3:  3 cells
  [5, 8], // x=4:  4 cells
  [1, 13], // x=5:  13 cells
  [2, 13], // x=6:  12 cells
  [3, 13], // x=7:  11 cells
  [4, 13], // x=8:  10 cells
  [5, 13], // x=9:  9 cells
  [5, 14], // x=10: 10 cells
  [5, 15], // x=11: 11 cells
  [5, 16], // x=12: 12 cells
  [5, 17], // x=13: 13 cells
  [10, 13], // x=14: 4 cells
  [11, 13], // x=15: 3 cells
  [12, 13], // x=16: 2 cells
  [13, 13], // x=17: 1 cell
];

const TOTAL_POSITIONS = 121;
const ROW_COLS = [];
let positions = [];
let posKey = {};

function initBoard() {
  positions = [];
  posKey = {};
  let idx = 0;
  for (let xi = 0; xi < POS_REGIONS.length; xi++) {
    const x = xi + 1;
    const yMin = POS_REGIONS[xi][0];
    const yMax = POS_REGIONS[xi][1];
    ROW_COLS.push(yMax - yMin + 1);
    for (let y = yMin; y <= yMax; y++) {
      const key = x + "-" + y;
      posKey[key] = idx;
      positions.push({ x: x, y: y });
      idx++;
    }
  }
  return idx;
}

initBoard();

// ============================================================
// Adjacency - 6 fixed directions in axial coordinates
// ============================================================

const DIRECTION_VECTORS = [
  { x: -1, y: -1 }, // Upper-left
  { x: 0, y: -1 }, // Up
  { x: 1, y: 0 }, // Right
  { x: 1, y: 1 }, // Lower-right
  { x: 0, y: 1 }, // Down
  { x: -1, y: 0 }, // Left
];

// AI scoring weight constants
const AI_WEIGHTS = {
  PROGRESS: 100, // Progress score weight
  JUMP_EFFICIENCY: 30, // Jump efficiency weight (per cell)
  TARGET_ENTRY: 500, // Target area entry bonus
  TARGET_DEPTH: 200, // Target area depth bonus
  BLOCKING: 80, // Blocking opponent weight
  FORMATION: 20, // Formation cooperation weight
  RETREAT_PENALTY: -150, // Retreat penalty
};

let ADJACENT = [];

function getPosKey(x, y) {
  return x + "-" + y;
}

function isValidPos(x, y) {
  return posKey[getPosKey(x, y)] !== undefined;
}

function initAdjacency() {
  ADJACENT = [];
  for (let i = 0; i < TOTAL_POSITIONS; i++) {
    ADJACENT[i] = [];
  }

  for (let i = 0; i < TOTAL_POSITIONS; i++) {
    const p = positions[i];
    for (let d = 0; d < DIRECTION_VECTORS.length; d++) {
      const nx = p.x + DIRECTION_VECTORS[d].x;
      const ny = p.y + DIRECTION_VECTORS[d].y;
      const nKey = getPosKey(nx, ny);
      if (posKey[nKey] !== undefined) {
        ADJACENT[i].push(posKey[nKey]);
      }
    }
  }
}

initAdjacency();

// ============================================================
// Player start and target positions
// ============================================================

const START_POSITIONS = {};
const TARGET_POSITIONS = {};

function initPlayerPositions() {
  // Player A (Red): top triangle area x=5,y=1 non-special
  START_POSITIONS[RED] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i; j < 4; j++) {
      START_POSITIONS[RED].push(posKey[getPosKey(5 + i, 1 + j)]);
    }
  }

  // Player C (Blue): bottom-right triangle area x=14,y=10 non-special
  START_POSITIONS[BLUE] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i; j < 4; j++) {
      START_POSITIONS[BLUE].push(posKey[getPosKey(14 + i, 10 + j)]);
    }
  }

  // Player E (Green): upper-left triangle area x=1,y=5 special
  START_POSITIONS[GREEN] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      START_POSITIONS[GREEN].push(posKey[getPosKey(1 + i, 5 + j)]);
    }
  }

  // Player B (Yellow): right triangle area x=10,y=5 special
  START_POSITIONS[YELLOW] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      START_POSITIONS[YELLOW].push(posKey[getPosKey(10 + i, 5 + j)]);
    }
  }

  // Player D (Purple): bottom triangle area x=10,y=14 special
  START_POSITIONS[PURPLE] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      START_POSITIONS[PURPLE].push(posKey[getPosKey(10 + i, 14 + j)]);
    }
  }

  // Player F (Orange): left triangle area x=5,y=10 non-special
  START_POSITIONS[ORANGE] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i; j < 4; j++) {
      START_POSITIONS[ORANGE].push(posKey[getPosKey(5 + i, 10 + j)]);
    }
  }

  // Target positions: the directly opposite triangle (180° across the board)
  TARGET_POSITIONS[RED] = START_POSITIONS[PURPLE].slice();
  TARGET_POSITIONS[PURPLE] = START_POSITIONS[RED].slice();
  TARGET_POSITIONS[BLUE] = START_POSITIONS[GREEN].slice();
  TARGET_POSITIONS[GREEN] = START_POSITIONS[BLUE].slice();
  TARGET_POSITIONS[YELLOW] = START_POSITIONS[ORANGE].slice();
  TARGET_POSITIONS[ORANGE] = START_POSITIONS[YELLOW].slice();
}

initPlayerPositions();

// ============================================================
// AI: Pre-computed position scores
// ============================================================

const POSITION_SCORES = {};

function initPositionScores() {
  for (let player = RED; player <= ORANGE; player++) {
    POSITION_SCORES[player] = [];
    const targets = TARGET_POSITIONS[player];
    const targetSet = {};
    for (const t of targets) {
      targetSet[t] = true;
    }

    // Calculate target area centroid
    let cx = 0,
      cy = 0;
    for (const t of targets) {
      cx += positions[t].x;
      cy += positions[t].y;
    }
    cx /= targets.length;
    cy /= targets.length;

    // Calculate target area depth reference point (farthest vertex)
    let maxDistFromCenter = 0;
    let tipIdx = targets[0];
    for (const t of targets) {
      const dx = positions[t].x - cx;
      const dy = positions[t].y - cy;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist > maxDistFromCenter) {
        maxDistFromCenter = dist;
        tipIdx = t;
      }
    }
    const tipPos = positions[tipIdx];

    for (let cell = 0; cell < TOTAL_POSITIONS; cell++) {
      const pos = positions[cell];
      if (targetSet[cell]) {
        // Inside target area: high base score + depth bonus
        const depthDist = Math.abs(pos.x - tipPos.x) + Math.abs(pos.y - tipPos.y);
        POSITION_SCORES[player][cell] = 2000 + (maxDistFromCenter - depthDist) * 100;
      } else {
        // Outside target area: based on distance to target centroid
        const distToTarget = Math.abs(pos.x - cx) + Math.abs(pos.y - cy);
        POSITION_SCORES[player][cell] = 1000 - distToTarget * 50;
      }
    }
  }
}

initPositionScores();

// ============================================================
// Board operations
// ============================================================

function createBoard() {
  const board = [];
  for (let i = 0; i < TOTAL_POSITIONS; i++) {
    board[i] = EMPTY;
  }
  return board;
}

function placePieces(board, player) {
  const pos = START_POSITIONS[player];
  for (const p of pos) {
    board[p] = player;
  }
}

function getAdjacentMoves(board, cell) {
  const moves = [];
  const neighbors = ADJACENT[cell];
  for (const n of neighbors) {
    if (board[n] === EMPTY) {
      moves.push(n);
    }
  }
  return moves;
}

function getJumpMoves(board, cell, visited) {
  let moves = [];
  const neighbors = ADJACENT[cell];

  for (const mid of neighbors) {
    if (board[mid] !== EMPTY) {
      const p1 = positions[cell];
      const p2 = positions[mid];
      const dstX = p2.x + (p2.x - p1.x);
      const dstY = p2.y + (p2.y - p1.y);

      const dstKey = getPosKey(dstX, dstY);
      if (posKey[dstKey] !== undefined) {
        const dstIdx = posKey[dstKey];
        if (board[dstIdx] === EMPTY && !visited[dstIdx]) {
          moves.push(dstIdx);
          visited[dstIdx] = true;
          const furtherMoves = getJumpMoves(board, dstIdx, visited);
          moves = moves.concat(furtherMoves);
        }
      }
    }
  }
  return moves;
}

function getLegalMoves(board, cell) {
  let moves = [];
  const adjacentMoves = getAdjacentMoves(board, cell);
  moves = moves.concat(adjacentMoves);

  const visited = {};
  for (const am of adjacentMoves) {
    visited[am] = true;
  }
  const jumpMoves = getJumpMoves(board, cell, visited);
  moves = moves.concat(jumpMoves);

  return moves;
}

function makeMove(board, from, to) {
  const newBoard = board.slice();
  const player = newBoard[from];
  newBoard[from] = EMPTY;
  newBoard[to] = player;
  return newBoard;
}

// ============================================================
// Win/loss determination
// ============================================================

function checkWin(board, player) {
  const targets = TARGET_POSITIONS[player];
  let ownCount = 0;
  for (const t of targets) {
    // The destination must be completely filled
    if (board[t] === EMPTY) {
      return false;
    }
    if (board[t] === player) {
      ownCount++;
    }
  }
  // Anti-blocking rule: a full destination wins as long as at least one piece
  // is the player's own, so an opponent parked in the destination cannot deny the win.
  return ownCount > 0;
}

function checkGameOver(board, players) {
  for (const player of players) {
    if (checkWin(board, player)) {
      return player;
    }
  }
  return null;
}

// ============================================================
// AI: Multi-factor greedy strategy
// ============================================================

function isInTargetArea(cell, player) {
  const targets = TARGET_POSITIONS[player];
  for (const t of targets) {
    if (t === cell) return true;
  }
  return false;
}

function calculateBlockingScore(board, player, position) {
  let score = 0;
  const neighbors = ADJACENT[position];
  for (const neighborCell of neighbors) {
    if (board[neighborCell] !== EMPTY && board[neighborCell] !== player) {
      // Opponent piece next to target position, forming a block
      const opponent = board[neighborCell];
      if (!isInTargetArea(position, opponent)) {
        score += 1;
      }
    }
  }
  return score;
}

function calculateFormationScore(board, player, position) {
  let score = 0;
  const neighbors = ADJACENT[position];
  for (const n of neighbors) {
    if (board[n] === player) {
      score += 1;
    }
  }
  return score;
}

function evaluateMove(board, player, from, to, allPlayers) {
  let score = 0;
  const fromPos = positions[from];
  const toPos = positions[to];

  // Factor 1: Progress score (based on pre-computed position scores)
  const progressScore = POSITION_SCORES[player][to] - POSITION_SCORES[player][from];
  score += progressScore * AI_WEIGHTS.PROGRESS;

  // Factor 2: Jump efficiency
  const xDiff = Math.abs(toPos.x - fromPos.x);
  const yDiff = Math.abs(toPos.y - fromPos.y);
  const jumpDistance = Math.max(xDiff, yDiff);
  if (jumpDistance > 1) {
    score += jumpDistance * AI_WEIGHTS.JUMP_EFFICIENCY;
  }

  // Factor 3: Target area entry bonus
  const wasInTarget = isInTargetArea(from, player);
  const nowInTarget = isInTargetArea(to, player);
  if (!wasInTarget && nowInTarget) {
    score += AI_WEIGHTS.TARGET_ENTRY;
  }

  // Factor 4: Target area depth bonus
  if (nowInTarget) {
    const depthBefore = POSITION_SCORES[player][from];
    const depthAfter = POSITION_SCORES[player][to];
    if (depthAfter > depthBefore) {
      score += AI_WEIGHTS.TARGET_DEPTH;
    }
  }

  // Factor 5: Blocking opponents
  const blockingScore = calculateBlockingScore(board, player, to);
  score += blockingScore * AI_WEIGHTS.BLOCKING;

  // Factor 6: Formation cooperation
  const formationScore = calculateFormationScore(board, player, to);
  score += formationScore * AI_WEIGHTS.FORMATION;

  // Factor 7: Retreat penalty
  if (progressScore < 0) {
    score += AI_WEIGHTS.RETREAT_PENALTY;
  }

  return score;
}

function getBestAIMove(board, player, allPlayers) {
  let bestScore = -Infinity;
  let bestMove = null;

  for (let cell = 0; cell < TOTAL_POSITIONS; cell++) {
    if (board[cell] === player) {
      const moves = getLegalMoves(board, cell);
      for (const m of moves) {
        const score = evaluateMove(board, player, cell, m, allPlayers);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { from: cell, to: m };
        }
      }
    }
  }

  return bestMove;
}

// ============================================================
// Game state
// ============================================================

// Standard player layouts per player count (mainstream Chinese checkers setup).
// Opposite pairs are RED-PURPLE, BLUE-GREEN, YELLOW-ORANGE.
// - 2 players: one opposite pair
// - 3 players: three triangles 120° apart (each destination is empty)
// - 4 players: two opposite pairs (one opposite pair left empty)
// - 6 players: every triangle
// Lists are ordered around the board for natural turn rotation.
const PLAYER_SETS = {
  2: [RED, PURPLE],
  3: [RED, BLUE, ORANGE],
  4: [RED, BLUE, PURPLE, GREEN],
  6: [RED, YELLOW, BLUE, PURPLE, ORANGE, GREEN],
};

function createGameState(mode, playerCount) {
  const players = PLAYER_SETS[playerCount]
    ? PLAYER_SETS[playerCount].slice()
    : Array.from({ length: playerCount }, (_, i) => i + 1);

  return {
    mode: mode,
    playerCount: playerCount,
    players: players,
    board: createBoard(),
    currentPlayer: players[0],
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    selectedPiece: null,
    validMoves: [],
    aiThinking: false,
  };
}

function initGame(state) {
  for (const player of state.players) {
    placePieces(state.board, player);
  }
}

// ============================================================
// Browser UI
// ============================================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EMPTY: EMPTY,
    RED: RED,
    BLUE: BLUE,
    GREEN: GREEN,
    YELLOW: YELLOW,
    PURPLE: PURPLE,
    ORANGE: ORANGE,
    PLAYER_COLORS: PLAYER_COLORS,
    BOARD_ROWS: BOARD_ROWS,
    ROW_COLS: ROW_COLS,
    TOTAL_POSITIONS: TOTAL_POSITIONS,
    positions: positions,
    posKey: posKey,
    ADJACENT: ADJACENT,
    START_POSITIONS: START_POSITIONS,
    TARGET_POSITIONS: TARGET_POSITIONS,
    AI_WEIGHTS: AI_WEIGHTS,
    POSITION_SCORES: POSITION_SCORES,
    isInTargetArea: isInTargetArea,
    createBoard: createBoard,
    placePieces: placePieces,
    getAdjacentMoves: getAdjacentMoves,
    getJumpMoves: getJumpMoves,
    getLegalMoves: getLegalMoves,
    makeMove: makeMove,
    checkWin: checkWin,
    checkGameOver: checkGameOver,
    evaluateMove: evaluateMove,
    getBestAIMove: getBestAIMove,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName,
    createGameState: createGameState,
    initGame: initGame,
    PLAYER_SETS: PLAYER_SETS,
  };
}

if (typeof document !== "undefined") {
  // Initialize sound manager
  SoundManager.init("../../audio");
  let gameState = null;
  let rpsChoices = { online: null, remote: null };

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // RED or BLUE
  let remoteTeam = null; // RED or BLUE
  const CELL_SIZE = 28;
  const PADDING = 60;

  // Board zone palette. Each star point uses its own player's full color so a piece
  // always sits on a same-colored corner; the center hexagon stays neutral. Pieces are
  // separated from the board by the white hole ring, a dark stroke and a soft glow.
  const ZONE_CENTER = "#f0ead6"; // neutral eggshell, distinct from all 6 player hues
  const HOLE_FILL = "#ffffff";
  const HOLE_STROKE = "#1f1f1f";
  const LINK_COLOR = "#1a1a1a";

  // Glossy marble base colors per player (the movable pieces)
  const MARBLE_COLORS = {
    1: "#f44336", // red
    2: "#2196f3", // blue
    3: "#4caf50", // green
    4: "#ffca28", // yellow
    5: "#ab47bc", // purple
    6: "#ff9800", // orange
  };

  // Lighten (positive percent) or darken (negative percent) a hex color
  function shadeColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const target = percent < 0 ? 0 : 255;
    const ratio = Math.abs(percent) / 100;
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.round((target - r) * ratio) + r;
    g = Math.round((target - g) * ratio) + g;
    b = Math.round((target - b) * ratio) + b;
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Build an SVG radial gradient element from [offset, color] stops
  function createRadialGradient(id, cx, cy, r, stops) {
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
    grad.setAttribute("id", id);
    grad.setAttribute("cx", cx);
    grad.setAttribute("cy", cy);
    grad.setAttribute("r", r);
    for (const [offset, color] of stops) {
      const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      grad.appendChild(stop);
    }
    return grad;
  }

  // Convex hull (Andrew's monotone chain), returns ordered hull vertices
  function convexHull(points) {
    const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    if (pts.length < 3) {
      return pts;
    }
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  // Group cells into the 6 star points + center hexagon and assign zone colors.
  // Each star point uses its own player's color (lightened) so pieces match their corner.
  function getRegionFills() {
    const inStart = {};
    const fills = [];
    for (let p = 1; p <= 6; p++) {
      const grp = START_POSITIONS[p];
      for (const c of grp) {
        inStart[c] = true;
      }
      fills.push({ color: MARBLE_COLORS[p], cells: grp });
    }

    const centerCells = [];
    for (let c = 0; c < TOTAL_POSITIONS; c++) {
      if (!inStart[c]) {
        centerCells.push(c);
      }
    }
    // Draw the center first so the colored points overlap cleanly on top
    fills.unshift({ color: ZONE_CENTER, cells: centerCells });
    return fills;
  }

  // Convert axial coordinates to pixel coordinates (reference: anchengjian implementation)
  function cellToPixel(cell) {
    const p = positions[cell];
    const x = p.x;
    const y = p.y;
    const spaceWidth = CELL_SIZE;
    const lineHeight = CELL_SIZE;
    const spaceX = spaceWidth / 2;

    let correct = 0;
    if (y < 5) correct = (5 - y) * spaceX;
    if (y > 5) correct = -(y - 5) * spaceX;

    const px = (x - 1) * spaceWidth + correct + PADDING;
    const py = y * lineHeight + PADDING;
    return { x: px, y: py };
  }

  function drawBoard() {
    const svg = document.getElementById("board-svg");
    svg.innerHTML = "";

    // Calculate canvas size
    let maxPx = 0;
    let maxPy = 0;
    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      const cp = cellToPixel(i);
      if (cp.x > maxPx) maxPx = cp.x;
      if (cp.y > maxPy) maxPy = cp.y;
    }
    const width = maxPx + PADDING;
    const height = maxPy + PADDING;

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);

    // Create rotation container
    const rotation = gameState.boardRotation || 0;
    const centerX = width / 2;
    const centerY = height / 2;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", "rotate(" + rotation + " " + centerX + " " + centerY + ")");
    svg.appendChild(g);

    // Defs: glossy gradients for the marble pieces
    const SVG_NS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(SVG_NS, "defs");
    for (let p = 1; p <= 6; p++) {
      const base = MARBLE_COLORS[p];
      defs.appendChild(
        createRadialGradient("marble-" + p, "35%", "30%", "70%", [
          ["0%", shadeColor(base, 70)],
          ["45%", base],
          ["100%", shadeColor(base, -40)],
        ])
      );
    }
    // Soft drop-shadow glow so a piece lifts off a same-colored corner
    const glow = document.createElementNS(SVG_NS, "filter");
    glow.setAttribute("id", "marble-glow");
    glow.setAttribute("x", "-60%");
    glow.setAttribute("y", "-60%");
    glow.setAttribute("width", "220%");
    glow.setAttribute("height", "220%");
    const shadow = document.createElementNS(SVG_NS, "feDropShadow");
    shadow.setAttribute("dx", "0");
    shadow.setAttribute("dy", "1");
    shadow.setAttribute("stdDeviation", "1.3");
    shadow.setAttribute("flood-color", "#000000");
    shadow.setAttribute("flood-opacity", "0.55");
    glow.appendChild(shadow);
    defs.appendChild(glow);
    svg.appendChild(defs);

    // Colored star zones: 6 points + center hexagon, filled as solid regions
    const EXPAND = CELL_SIZE * 0.55;
    for (const fill of getRegionFills()) {
      const pts = fill.cells.map((c) => cellToPixel(c));
      let hx = 0;
      let hy = 0;
      for (const pt of pts) {
        hx += pt.x;
        hy += pt.y;
      }
      hx /= pts.length;
      hy /= pts.length;
      const coords = convexHull(pts)
        .map((pt) => {
          const dx = pt.x - hx;
          const dy = pt.y - hy;
          const len = Math.hypot(dx, dy) || 1;
          return pt.x + (dx / len) * EXPAND + "," + (pt.y + (dy / len) * EXPAND);
        })
        .join(" ");
      const poly = document.createElementNS(SVG_NS, "polygon");
      poly.setAttribute("points", coords);
      poly.setAttribute("fill", fill.color);
      poly.style.pointerEvents = "none";
      g.appendChild(poly);
    }

    // Lattice lines connecting adjacent holes
    for (let cell = 0; cell < TOTAL_POSITIONS; cell++) {
      const p1 = cellToPixel(cell);
      for (const n of ADJACENT[cell]) {
        if (n > cell) {
          const p2 = cellToPixel(n);
          const line = document.createElementNS(SVG_NS, "line");
          line.setAttribute("x1", p1.x);
          line.setAttribute("y1", p1.y);
          line.setAttribute("x2", p2.x);
          line.setAttribute("y2", p2.y);
          line.setAttribute("stroke", LINK_COLOR);
          line.setAttribute("stroke-width", "1.5");
          line.style.pointerEvents = "none";
          g.appendChild(line);
        }
      }
    }

    // White holes (occupied holes are covered by a marble piece later)
    for (let cell = 0; cell < TOTAL_POSITIONS; cell++) {
      const pos = cellToPixel(cell);
      const hole = document.createElementNS(SVG_NS, "circle");
      hole.setAttribute("cx", pos.x);
      hole.setAttribute("cy", pos.y);
      hole.setAttribute("r", CELL_SIZE * 0.4);
      hole.setAttribute("fill", HOLE_FILL);
      hole.setAttribute("stroke", HOLE_STROKE);
      hole.setAttribute("stroke-width", "1.5");
      hole.dataset.cell = cell;
      hole.style.cursor = "pointer";
      g.appendChild(hole);
    }

    // Draw pieces
    for (let cell = 0; cell < TOTAL_POSITIONS; cell++) {
      if (gameState.board[cell] !== EMPTY) {
        drawPiece(g, cell, gameState.board[cell]);
      }
    }

    // Draw valid move positions
    if (gameState.validMoves.length > 0) {
      for (const moveCell of gameState.validMoves) {
        const pos = cellToPixel(moveCell);
        const indicator = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        indicator.setAttribute("cx", pos.x);
        indicator.setAttribute("cy", pos.y);
        indicator.setAttribute("r", "10");
        indicator.setAttribute("fill", "#4CAF50");
        indicator.setAttribute("opacity", "0.8");
        indicator.setAttribute("class", "valid-move");
        indicator.dataset.cell = moveCell;
        indicator.style.cursor = "pointer";
        g.appendChild(indicator);
      }
    }
  }

  function drawPiece(parent, cell, player) {
    const pos = cellToPixel(cell);
    const piece = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    piece.setAttribute("cx", pos.x);
    piece.setAttribute("cy", pos.y);
    piece.setAttribute("r", CELL_SIZE * 0.34);
    piece.setAttribute("fill", "url(#marble-" + player + ")");
    piece.setAttribute("stroke", shadeColor(MARBLE_COLORS[player], -55));
    piece.setAttribute("stroke-width", "1.6");
    piece.setAttribute("filter", "url(#marble-glow)");
    piece.setAttribute("class", "piece");
    piece.dataset.cell = cell;

    if (gameState.selectedPiece === cell) {
      piece.classList.add("selected");
    }

    parent.appendChild(piece);
  }

  function updateStatusBar() {
    const text = currentLabelText(gameState.currentPlayer);
    const currentConfig = PLAYER_COLORS[gameState.currentPlayer];
    document.getElementById("current-player").textContent = text;
    document.getElementById("current-player").className =
      "team-indicator " + currentConfig.textClass;
    document.getElementById("turn-count").textContent = gameState.turnCount;
  }

  function updateMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    if (type === "error") {
      el.className = "error";
    } else if (type === "info") {
      el.className = "info";
    } else {
      el.className = "";
    }
  }

  function showGameOver() {
    const winnerText = document.getElementById("winner-text");
    if (gameState.winner) {
      // Play victory/lose sound based on whether a human seat won
      const isPlayerWin =
        gameState.mode === "online"
          ? gameState.winner === localTeam
          : gameState.playerTypes[gameState.winner] === "human";
      SoundManager.play(isPlayerWin ? "victory" : "lose");
      winnerText.textContent = currentLabelText(gameState.winner) + " 获胜！";
    } else {
      SoundManager.play("draw");
      winnerText.textContent = "平局！";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  function handleSvgClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "online") {
      if (gameState.currentPlayer !== localTeam) return;
    } else if (gameState.playerTypes && gameState.playerTypes[gameState.currentPlayer] === "ai") {
      return;
    }

    const target = e.target;
    const cell = Number.parseInt(target.dataset.cell);
    if (Number.isNaN(cell)) return;

    if (target.classList.contains("piece")) {
      const player = gameState.board[cell];
      if (player === gameState.currentPlayer) {
        gameState.selectedPiece = cell;
        gameState.validMoves = getLegalMoves(gameState.board, cell);
        drawBoard();
        updateMessage("已选择棋子，点击绿色位置移动", "info");
      }
    } else if (target.classList.contains("valid-move")) {
      if (gameState.selectedPiece !== null) {
        const fromCell = gameState.selectedPiece;
        doMove(fromCell, cell);
        if (gameState.mode === "online" && networkProtocol) {
          networkProtocol.sendAction({ a: "move", from: fromCell, to: cell });
        }
      }
    } else if (target.tagName === "circle") {
      const boardCell = gameState.board[cell];
      if (boardCell === gameState.currentPlayer) {
        gameState.selectedPiece = cell;
        gameState.validMoves = getLegalMoves(gameState.board, cell);
        drawBoard();
        updateMessage("已选择棋子，点击绿色位置移动", "info");
      } else if (gameState.selectedPiece !== null && gameState.validMoves.includes(cell)) {
        const fromCell = gameState.selectedPiece;
        doMove(fromCell, cell);
        if (gameState.mode === "online" && networkProtocol) {
          networkProtocol.sendAction({ a: "move", from: fromCell, to: cell });
        }
      }
    } else if (gameState.selectedPiece !== null) {
      gameState.selectedPiece = null;
      gameState.validMoves = [];
      drawBoard();
      updateMessage("请选择要移动的棋子", "info");
    }
  }

  function doMove(from, to) {
    SoundManager.play("slide");
    gameState.board = makeMove(gameState.board, from, to);
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;

    const winner = checkGameOver(gameState.board, gameState.players);
    if (winner) {
      gameState.gameOver = true;
      gameState.winner = winner;
      drawBoard();
      updateStatusBar();
      setTimeout(showGameOver, 500);
      return;
    }

    nextPlayer();
  }

  function nextPlayer() {
    const currentIndex = gameState.players.indexOf(gameState.currentPlayer);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentPlayer = gameState.players[nextIndex];

    drawBoard();
    updateStatusBar();
    updateMessage("轮到 " + currentLabelText(gameState.currentPlayer) + " 行动", "info");

    if (gameState.mode !== "online" && gameState.playerTypes[gameState.currentPlayer] === "ai") {
      triggerAI();
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    updateMessage("电脑正在思考...", "info");
    const aiPlayer = gameState.currentPlayer;
    setTimeout(() => {
      const move = getBestAIMove(gameState.board, aiPlayer, gameState.players);
      gameState.aiThinking = false;
      if (move) {
        doMove(move.from, move.to);
      } else {
        nextPlayer();
      }
    }, 500);
  }

  // Get board rotation angle for player (to place player's start area at bottom)
  function getPlayerRotation(player) {
    // Each triangle sits 60° apart; rotate so the player's home triangle is at the bottom.
    const rotations = {
      1: 180, // Red (top)
      4: 120, // Yellow (top-right)
      2: 60, // Blue (bottom-right)
      5: 0, // Purple (bottom)
      6: 300, // Orange (bottom-left)
      3: 240, // Green (top-left)
    };
    return rotations[player] || 0;
  }

  // Seats listed in around-the-board turn order
  const SEAT_ORDER = [RED, YELLOW, BLUE, PURPLE, ORANGE, GREEN];
  const SEAT_SELECT_IDS = {
    [RED]: "seat-red",
    [YELLOW]: "seat-yellow",
    [BLUE]: "seat-blue",
    [PURPLE]: "seat-purple",
    [ORANGE]: "seat-orange",
    [GREEN]: "seat-green",
  };

  // Read the per-seat selectors into an active player list and a human/ai type map
  function readSeatConfig() {
    const players = [];
    const types = {};
    for (const p of SEAT_ORDER) {
      const sel = document.getElementById(SEAT_SELECT_IDS[p]);
      const val = sel ? sel.value : "close";
      if (val === "normal") {
        players.push(p);
        types[p] = "human";
      } else if (val === "computer") {
        players.push(p);
        types[p] = "ai";
      }
    }
    return { players: players, types: types };
  }

  // Label for a seat: 玩家 / 玩家N for humans, 电脑 / 电脑N for AIs (numbered only when >1)
  function seatLabelText(player) {
    let humanTotal = 0;
    let aiTotal = 0;
    for (const p of gameState.players) {
      if (gameState.playerTypes[p] === "human") {
        humanTotal++;
      } else {
        aiTotal++;
      }
    }
    let humanIdx = 0;
    let aiIdx = 0;
    for (const p of gameState.players) {
      if (gameState.playerTypes[p] === "human") {
        humanIdx++;
        if (p === player) {
          return humanTotal > 1 ? "玩家" + humanIdx : "玩家";
        }
      } else {
        aiIdx++;
        if (p === player) {
          return aiTotal > 1 ? "电脑" + aiIdx : "电脑";
        }
      }
    }
    return PLAYER_COLORS[player] ? PLAYER_COLORS[player].name : "";
  }

  function currentLabelText(side) {
    if (gameState.mode === "online") {
      return getCurrentPlayerLabel({ mode: "online", currentSide: side, playerSide: localTeam })
        .text;
    }
    return seatLabelText(side);
  }

  function startLocalGame(players, types) {
    gameState = {
      mode: "local",
      playerCount: players.length,
      players: players,
      playerTypes: types,
      board: createBoard(),
      currentPlayer: players[0],
      gameOver: false,
      winner: null,
      turnCount: 0,
      selectedPiece: null,
      validMoves: [],
      aiThinking: false,
    };
    for (const p of players) {
      placePieces(gameState.board, p);
    }
    gameState.firstPlayer = players[0];

    // Place the first human seat (or first seat) at the bottom of the board
    let bottomSeat = players[0];
    for (const p of players) {
      if (types[p] === "human") {
        bottomSeat = p;
        break;
      }
    }
    gameState.boardRotation = getPlayerRotation(bottomSeat);

    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    const hasAI = players.some((p) => types[p] === "ai");
    document.getElementById("rule-pve").style.display = hasAI ? "block" : "none";
    document.getElementById("game-over").style.display = "none";

    let colorRulesHtml = "";
    for (const p of players) {
      const config = PLAYER_COLORS[p];
      const prefix = (types[p] === "human" ? "玩家" : "电脑") + " - ";
      colorRulesHtml += '<li style="color:' + config.color + '">' + prefix + config.name + "</li>";
    }
    document.getElementById("color-rules").innerHTML = colorRulesHtml;

    drawBoard();
    updateStatusBar();
    updateMessage("游戏开始！" + currentLabelText(gameState.currentPlayer) + " 先手", "info");

    const svg = document.getElementById("board-svg");
    svg.onclick = handleSvgClick;

    // If the first seat is an AI, let it move
    if (types[gameState.currentPlayer] === "ai") {
      triggerAI();
    }
  }

  function restartGame() {
    if (gameState && gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    document.getElementById("game-over").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("mode-selection").style.display = "flex";
    gameState = null;
    rpsChoices = { online: null, remote: null };
  }

  // --- Online mode functions ---

  function cleanupNetwork() {
    if (networkProtocol) {
      networkProtocol.destroy();
      networkProtocol = null;
    }
    if (networkConnection) {
      networkConnection.close();
      networkConnection = null;
    }
    localPlayerRole = null;
    localTeam = null;
    remoteTeam = null;
  }

  function setupNetworkHandlers() {
    networkProtocol.setCallbacks({
      onAction: (actionData) => {
        applyRemoteAction(actionData);
      },
      onRPSChoice: (choice) => {
        handleOnlineRPSReceived(choice);
      },
      onRPSResult: (result) => {
        handleOnlineRPSResult(result);
      },
      onRestart: () => {
        cleanupNetwork();
        document.getElementById("game-over").style.display = "none";
        document.getElementById("game-area").style.display = "none";
        document.getElementById("rps-online").style.display = "none";
        document.getElementById("mode-selection").style.display = "flex";
        gameState = null;
      },
      onDisconnect: () => {
        handleDisconnect();
      },
      onError: (err) => {
        console.error("Network error:", err);
      },
    });
  }

  function startOnlineRPS() {
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-online").style.display = "flex";
    rpsChoices = { online: null, remote: null };
    document.getElementById("rps-online-status").textContent = "请选择";
    document.getElementById("rps-online-result").textContent = "";
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
  }

  function handleOnlineRPSChoice(choice, ev) {
    rpsChoices.online = choice;
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
    ev.target.classList.add("selected");
    document.getElementById("rps-online-status").textContent =
      "已选择：" + getRPSName(choice) + "，等待对方...";
    networkProtocol.sendRPSChoice(choice);
  }

  function handleOnlineRPSReceived(remoteChoice) {
    rpsChoices.remote = remoteChoice;
    checkOnlineRPSComplete();
  }

  function checkOnlineRPSComplete() {
    if (!rpsChoices.online || !rpsChoices.remote) return;

    if (localPlayerRole === "host") {
      const winner = judgeRPS(rpsChoices.online, rpsChoices.remote);
      let firstPlayer;
      if (winner === 1) {
        firstPlayer = "host";
      } else if (winner === -1) {
        firstPlayer = "guest";
      } else {
        networkProtocol.sendRPSResult(null, null);
        rpsChoices.online = null;
        rpsChoices.remote = null;
        document.getElementById("rps-online-status").textContent = "平局！请重新选择";
        document
          .querySelectorAll("#rps-online-buttons .btn-rps")
          .forEach((btn) => btn.classList.remove("selected"));
        return;
      }
      networkProtocol.sendRPSResult(
        {
          host: localPlayerRole === "host" ? rpsChoices.online : rpsChoices.remote,
          guest: localPlayerRole === "host" ? rpsChoices.remote : rpsChoices.online,
        },
        firstPlayer
      );
    }
  }

  function handleOnlineRPSResult(result) {
    const resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document
        .querySelectorAll("#rps-online-buttons .btn-rps")
        .forEach((btn) => btn.classList.remove("selected"));
      return;
    }

    const myChoice = rpsChoices.online;
    const theirChoice = rpsChoices.remote;
    const iWin = result.firstPlayer === localPlayerRole;
    // The first mover is the host (RED) or guest (PURPLE)
    const firstColor = result.firstPlayer === "host" ? RED : PURPLE;

    resultEl.textContent =
      "你选择了" +
      getRPSName(myChoice) +
      "，对方选择了" +
      getRPSName(theirChoice) +
      (iWin
        ? "，你赢了！你先手(" + PLAYER_COLORS[firstColor].name + ")。"
        : "，你输了！对方先手(" + PLAYER_COLORS[firstColor].name + ")。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online", 2);
    initGame(gameState);

    const hostPiece = RED;
    const guestPiece = PURPLE;

    if (localPlayerRole === "host") {
      localTeam = firstPlayerRole === "host" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "host" ? guestPiece : hostPiece;
    } else {
      localTeam = firstPlayerRole === "guest" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "guest" ? guestPiece : hostPiece;
    }

    gameState.currentPlayer = firstPlayerRole === "host" ? hostPiece : guestPiece;
    gameState.firstPlayer = gameState.currentPlayer;
    gameState.localTeam = localTeam;
    gameState.remoteTeam = remoteTeam;
    gameState.boardRotation = getPlayerRotation(localTeam);

    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = "none";
    document.getElementById("game-over").style.display = "none";

    // Update color rules for online mode
    let colorRulesHtml = "";
    colorRulesHtml +=
      '<li style="color:' +
      PLAYER_COLORS[localTeam].color +
      '">你 - ' +
      PLAYER_COLORS[localTeam].name +
      "</li>";
    colorRulesHtml +=
      '<li style="color:' +
      PLAYER_COLORS[remoteTeam].color +
      '">对方 - ' +
      PLAYER_COLORS[remoteTeam].name +
      "</li>";
    document.getElementById("color-rules").innerHTML = colorRulesHtml;

    drawBoard();
    updateStatusBar();

    const initLabel = getCurrentPlayerLabel({
      mode: gameState.mode,
      currentSide: gameState.currentPlayer,
      playerSide: localTeam,
      sidesOrder: [firstPlayerRole === "host" ? hostPiece : guestPiece],
    });
    updateMessage("游戏开始！" + initLabel.text + " 先手", "info");

    const svg = document.getElementById("board-svg");
    svg.onclick = handleSvgClick;
  }

  function applyRemoteAction(actionData) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.currentPlayer !== remoteTeam) return;
    doMove(actionData.from, actionData.to);
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      updateMessage("对方已断开连接", "error");
      SoundManager.play("victory");
      const winnerText = document.getElementById("winner-text");
      winnerText.textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Start a local game from the per-seat configuration
    document.getElementById("btn-begin").addEventListener("click", () => {
      const cfg = readSeatConfig();
      const errEl = document.getElementById("seat-error");
      if (cfg.players.length < 2) {
        if (errEl) {
          errEl.textContent = "请至少选择两方参与（玩家或电脑）";
        }
        return;
      }
      if (errEl) {
        errEl.textContent = "";
      }
      startLocalGame(cfg.players, cfg.types);
    });

    // Online mode button
    const btnOnline = document.getElementById("btn-online");
    if (btnOnline) {
      if (!RoomUI.isSupported()) {
        btnOnline.style.display = "none";
      } else {
        btnOnline.addEventListener("click", () => {
          roomUI = new RoomUI({
            onConnectionEstablished: (connection, protocol, role) => {
              networkConnection = connection;
              networkProtocol = protocol;
              localPlayerRole = role;
              setupNetworkHandlers();
              startOnlineRPS();
            },
            onError: (msg) => {
              updateMessage(msg, "error");
            },
            onCancel: () => {
              cleanupNetwork();
            },
          });
          roomUI.show();
        });
      }
    }

    // Online RPS buttons
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((button) => {
      button.addEventListener("click", (ev) => {
        const choice = ev.target.dataset.choice;
        handleOnlineRPSChoice(choice, ev);
      });
    });

    document.getElementById("btn-restart").addEventListener("click", restartGame);

    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
  });
}
