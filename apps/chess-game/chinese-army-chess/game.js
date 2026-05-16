/* eslint-disable no-var */
// ============================================================
// Army Chess (Open) - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

// ============================================================
// Constants
// ============================================================

const NORMAL_PIECE_NAMES = ["工兵", "排长", "连长", "营长", "团长", "旅长", "师长", "军长", "司令"];
const BOMB_NAME = "炸弹";
const MINE_NAME = "地雷";
const FLAG_NAME = "军旗";

// Rank mapping: higher value = higher rank (consistent with LifeLikeChess flag)
const RANK_MAP = {
  工兵: 0,
  排长: 1,
  连长: 2,
  营长: 3,
  团长: 4,
  旅长: 5,
  师长: 6,
  军长: 7,
  司令: 8,
};

// Count of each piece type
const PIECE_COUNTS = {
  工兵: 3,
  排长: 3,
  连长: 3,
  营长: 2,
  团长: 2,
  旅长: 2,
  师长: 2,
  军长: 1,
  司令: 1,
  炸弹: 2,
  地雷: 3,
  军旗: 1,
};

// Board dimensions
const COLS = 5;
const ROWS = 12; // Array row count (visual gap row, 13 rows total)

// Teams
const RED = "red";
const BLUE = "blue";

// Piece states
const STATE_FACE_UP = "face_up";
const STATE_FACE_DOWN = "face_down";

// ============================================================
// Board Layout Constants
// ============================================================

// Camp positions (array coordinates)
const CAMPS = [
  { x: 1, y: 2 },
  { x: 3, y: 2 },
  { x: 2, y: 3 },
  { x: 1, y: 4 },
  { x: 3, y: 4 },
  { x: 1, y: 7 },
  { x: 3, y: 7 },
  { x: 2, y: 8 },
  { x: 1, y: 9 },
  { x: 3, y: 9 },
];

// Base camp positions (array coordinates)
const BASE_CAMPS = [
  { x: 1, y: 0 },
  { x: 3, y: 0 },
  { x: 1, y: 11 },
  { x: 3, y: 11 },
];

// Horizontal railway rows (array y coordinates)
const H_RAILWAYS = [1, 5, 6, 10];

// Vertical railway columns and ranges
const V_RAILWAY_LEFT_RIGHT = { x: [0, 4], yMin: 1, yMax: 10 };
const V_RAILWAY_MIDDLE = { x: 2, yMin: 5, yMax: 6 };

// ============================================================
// Utility Functions
// ============================================================

function isNormalPiece(name) {
  return NORMAL_PIECE_NAMES.indexOf(name) !== -1;
}

function isBomb(name) {
  return name === BOMB_NAME;
}
function isMine(name) {
  return name === MINE_NAME;
}
function isFlag(name) {
  return name === FLAG_NAME;
}

function isMovable(piece) {
  return !isMine(piece.name) && !isFlag(piece.name);
}

function getRank(name) {
  return RANK_MAP[name] !== undefined ? RANK_MAP[name] : null;
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function isCamp(x, y) {
  for (let i = 0; i < CAMPS.length; i++) {
    if (CAMPS[i].x === x && CAMPS[i].y === y) return true;
  }
  return false;
}

function isBaseCamp(x, y) {
  for (let i = 0; i < BASE_CAMPS.length; i++) {
    if (BASE_CAMPS[i].x === x && BASE_CAMPS[i].y === y) return true;
  }
  return false;
}

// Get visual row number (skip gap row)
function getBoardRow(y) {
  return y > 5 ? y + 1 : y;
}

// Check if position has diagonal eligibility (for camp entry/exit)
function hasDiagonalEligibility(x, y) {
  if (!inBounds(x, y)) return false;
  const boardRow = getBoardRow(y);
  return (x + boardRow) % 2 === 1;
}

// Check if on railway
function isOnHRailway(y) {
  return H_RAILWAYS.indexOf(y) !== -1;
}

function isOnVRailway(x, y) {
  if ((x === 0 || x === 4) && y >= 1 && y <= 10) return true;
  if (x === 2 && y >= 5 && y <= 6) return true;
  return false;
}

function isOnRailway(x, y) {
  return isOnHRailway(y) || isOnVRailway(x, y);
}

// Check if two positions are connected by railway (adjacent and both on railway)
function areOnSameRailway(x1, y1, x2, y2) {
  // Horizontally adjacent
  if (y1 === y2 && Math.abs(x1 - x2) === 1) {
    return isOnHRailway(y1);
  }
  // Vertically adjacent
  if (x1 === x2 && Math.abs(y1 - y2) === 1) {
    // Cross gap row (y=5 <-> y=6): only middle column (x=2) can cross
    if ((y1 === 5 && y2 === 6) || (y1 === 6 && y2 === 5)) {
      if (x1 === 2) return true;
      // Side railways (x=0,4) cross gap directly, no special check needed
      return isOnVRailway(x1, y1) && isOnVRailway(x1, y2);
    }
    return isOnVRailway(x1, y1) && isOnVRailway(x1, y2);
  }
  return false;
}

// Get image path
function getImagePath(piece) {
  if (isFlag(piece.name)) return "images/军旗.png";
  if (piece.team === RED) return "images/红-" + piece.name + ".png";
  return "images/蓝-" + piece.name + ".png";
}

// ============================================================
// Combat Resolution
// ============================================================

function canCapture(attacker, defender) {
  if (isFlag(defender.name)) return false;
  if (isMine(attacker.name)) return false;
  if (isFlag(attacker.name)) return false;
  if (attacker.team === defender.team) return false;
  if (isBomb(attacker.name)) return true;
  if (isBomb(defender.name)) return true;
  if (attacker.name === "工兵" && isMine(defender.name)) return true;
  if (isMine(defender.name) && isNormalPiece(attacker.name)) return true;
  if (isNormalPiece(attacker.name) && isNormalPiece(defender.name)) {
    return attacker.rank >= defender.rank;
  }
  return false;
}

function resolveCombat(attacker, defender) {
  if (!canCapture(attacker, defender)) return "invalid";
  if (isBomb(attacker.name)) return "mutual_destruction";
  if (isBomb(defender.name)) return "mutual_destruction";
  if (attacker.name === "工兵" && isMine(defender.name)) return "attacker_wins";
  if (isMine(defender.name)) return "mutual_destruction";
  if (attacker.rank === defender.rank) return "mutual_destruction";
  if (attacker.rank > defender.rank) return "attacker_wins";
  return "invalid";
}

// ============================================================
// Create Game State
// ============================================================

function createGameState(mode) {
  const gameType = mode.gameType || "open";
  const oppType = mode.oppType || "pvp";

  const pieces = [];

  // Red team 25 pieces
  const redNames = [];
  for (const name in PIECE_COUNTS) {
    for (var i = 0; i < PIECE_COUNTS[name]; i++) {
      redNames.push(name);
    }
  }
  for (var i = 0; i < redNames.length; i++) {
    pieces.push({
      name: redNames[i],
      team: RED,
      rank: getRank(redNames[i]),
      state: STATE_FACE_UP,
    });
  }

  // Blue team 25 pieces
  for (var i = 0; i < redNames.length; i++) {
    pieces.push({
      name: redNames[i],
      team: BLUE,
      rank: getRank(redNames[i]),
      state: STATE_FACE_UP,
    });
  }

  // Place pieces
  const board = [];
  for (var y = 0; y < ROWS; y++) {
    board[y] = [];
    for (var x = 0; x < COLS; x++) {
      board[y][x] = null;
    }
  }

  if (gameType === "flip") {
    // Flip mode: 50 pieces randomly placed on full board, all face down
    placePiecesRandom(board, pieces);
  } else {
    // Open/hidden mode: constrained placement in halves
    placePiecesForTeam(board, pieces.slice(0, 25), 0); // Red -> y 6-11
    placePiecesForTeam(board, pieces.slice(25, 50), 1); // Blue -> y 0-5

    // Hidden mode: opponent pieces face down
    if (gameType === "hidden") {
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          const p = board[y][x];
          if (p) p.state = STATE_FACE_DOWN;
        }
      }
    }
  }

  return {
    gameType: gameType,
    oppType: oppType,
    board: board,
    currentTeam: null,
    playerTeam: null,
    aiTeam: null,
    firstPlayer: null,
    turnCount: 0,
    capturedRed: [],
    capturedBlue: [],
    selectedCell: null,
    gameOver: false,
    winner: null,
    aiThinking: false,
  };
}

function placePiecesForTeam(board, pieces, halfIndex) {
  const yStart = halfIndex === 0 ? 6 : 0;

  // Classify pieces
  const flags = [];
  const mines = [];
  const bombs = [];
  const others = [];

  for (var i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (isFlag(p.name)) flags.push(p);
    else if (isMine(p.name)) mines.push(p);
    else if (isBomb(p.name)) bombs.push(p);
    else others.push(p);
  }

  // Collect all positions in this half (excluding camps)
  const allPositions = [];
  for (var y = yStart; y < yStart + 6; y++) {
    for (var x = 0; x < COLS; x++) {
      if (!isCamp(x, y)) {
        allPositions.push({ x: x, y: y });
      }
    }
  }

  // Mark occupied positions
  const occupied = {};
  function occupy(x, y) {
    occupied[x + "," + y] = true;
  }
  function isOccupied(x, y) {
    return !!occupied[x + "," + y];
  }

  // 1. Place flag: must be in base camp
  const baseCampPositions = [];
  for (var i = 0; i < BASE_CAMPS.length; i++) {
    const bc = BASE_CAMPS[i];
    if (bc.y >= yStart && bc.y < yStart + 6) {
      baseCampPositions.push(bc);
    }
  }
  shuffle(baseCampPositions);
  for (var i = 0; i < flags.length; i++) {
    var pos = baseCampPositions[i];
    board[pos.y][pos.x] = flags[i];
    occupy(pos.x, pos.y);
  }

  // 2. Place mines: only in last two rows (excluding camps)
  const mineRows = [];
  for (var y = yStart + 4; y < yStart + 6; y++) {
    for (var x = 0; x < COLS; x++) {
      if (!isCamp(x, y) && !isOccupied(x, y)) mineRows.push({ x: x, y: y });
    }
  }
  shuffle(mineRows);
  for (var i = 0; i < mines.length; i++) {
    var pos = mineRows[i];
    board[pos.y][pos.x] = mines[i];
    occupy(pos.x, pos.y);
  }

  // 3. Place bombs: not in first row (excluding camps)
  const bombPositions = [];
  for (var i = 0; i < allPositions.length; i++) {
    var pos = allPositions[i];
    if (pos.y === yStart) continue; // Exclude first row
    if (!isOccupied(pos.x, pos.y)) bombPositions.push(pos);
  }
  shuffle(bombPositions);
  for (var i = 0; i < bombs.length; i++) {
    var pos = bombPositions[i];
    board[pos.y][pos.x] = bombs[i];
    occupy(pos.x, pos.y);
  }

  // 4. Place remaining pieces (excluding camps)
  const remaining = [];
  for (var i = 0; i < allPositions.length; i++) {
    var pos = allPositions[i];
    if (!isOccupied(pos.x, pos.y)) remaining.push(pos);
  }
  shuffle(remaining);
  for (var i = 0; i < others.length; i++) {
    var pos = remaining[i];
    board[pos.y][pos.x] = others[i];
    occupy(pos.x, pos.y);
  }
}

function placePiecesRandom(board, pieces) {
  // Collect all positions (excluding camps)
  const allPositions = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isCamp(x, y)) {
        allPositions.push({ x: x, y: y });
      }
    }
  }
  shuffle(allPositions);

  // All pieces face down
  for (var i = 0; i < pieces.length; i++) {
    pieces[i].state = STATE_FACE_DOWN;
  }

  // Place randomly
  for (var i = 0; i < pieces.length; i++) {
    const pos = allPositions[i];
    board[pos.y][pos.x] = pieces[i];
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ============================================================
// Move Validation
// ============================================================

function getValidMoves(board, x, y, team, gameType) {
  const piece = board[y][x];
  if (!piece || piece.team !== team) return [];
  if (!isMovable(piece)) return [];
  // Face-down pieces cannot move
  if (piece.state === STATE_FACE_DOWN) return [];

  const isEngineer = piece.name === "工兵";
  let moves;

  if (isEngineer) {
    // Engineer: BFS along railway unlimited + normal + diagonal moves
    moves = getEngineerMoves(board, x, y, team);
  } else {
    // Normal piece: one step move
    moves = getNormalMoves(board, x, y, team);
  }

  // Add diagonal moves (camp entry/exit)
  const diagMoves = getDiagonalMoves(board, x, y, team);
  for (let i = 0; i < diagMoves.length; i++) {
    const dm = diagMoves[i];
    let dup = false;
    for (let j = 0; j < moves.length; j++) {
      if (moves[j].x === dm.x && moves[j].y === dm.y) {
        dup = true;
        break;
      }
    }
    if (!dup) moves.push(dm);
  }

  return moves;
}

function getNormalMoves(board, x, y, team) {
  const moves = [];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  for (var d = 0; d < dirs.length; d++) {
    var nx = x + dirs[d].dx;
    var ny = y + dirs[d].dy;
    if (!inBounds(nx, ny)) continue;

    // Gap row crossing: only middle column(x=2) or side vertical railways(x=0,4) can cross
    if ((y === 5 && ny === 6) || (y === 6 && ny === 5)) {
      if (x !== 2 && !isOnVRailway(x, y)) continue;
    }

    // Normal piece can move one step to adjacent position
    var target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: "move" });
    } else if (target.team !== team) {
      // Check camp protection
      if (isCamp(nx, ny)) continue;
      if (isBaseCamp(nx, ny)) continue;
      // Face-down pieces cannot be attacked
      if (target.state === STATE_FACE_DOWN) continue;
      if (canCapture(board[y][x], target)) {
        moves.push({ x: nx, y: ny, type: "capture" });
      }
    }
  }

  // Non-engineer pieces on railway: extra step along railway
  if (isOnRailway(x, y)) {
    for (var d = 0; d < dirs.length; d++) {
      var nx = x + dirs[d].dx;
      var ny = y + dirs[d].dy;
      if (!inBounds(nx, ny)) continue;
      if (!areOnSameRailway(x, y, nx, ny)) continue;

      // Check if already included
      let dup = false;
      for (let j = 0; j < moves.length; j++) {
        if (moves[j].x === nx && moves[j].y === ny) {
          dup = true;
          break;
        }
      }
      if (dup) continue;

      var target = board[ny][nx];
      if (target === null) {
        moves.push({ x: nx, y: ny, type: "move" });
      } else if (target.team !== team) {
        if (isCamp(nx, ny)) continue;
        if (isBaseCamp(nx, ny)) continue;
        if (target.state === STATE_FACE_DOWN) continue;
        if (canCapture(board[y][x], target)) {
          moves.push({ x: nx, y: ny, type: "capture" });
        }
      }
    }
  }

  return moves;
}

function getEngineerMoves(board, x, y, team) {
  const moves = [];
  const visited = {};
  visited[x + "," + y] = true;
  const queue = [{ x: x, y: y }];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  // One orthogonal step (to adjacent non-railway cell, like camp)
  for (var d = 0; d < dirs.length; d++) {
    var nx = x + dirs[d].dx;
    var ny = y + dirs[d].dy;
    if (!inBounds(nx, ny)) continue;

    // Gap row crossing check
    if ((y === 5 && ny === 6) || (y === 6 && ny === 5)) {
      if (x !== 2 && !isOnVRailway(x, y)) continue;
    }

    // Skip railway cells, leave for BFS
    if (isOnRailway(nx, ny)) continue;

    var key = nx + "," + ny;
    if (visited[key]) continue;
    var target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: "move" });
    } else if (target.team !== team) {
      if (isCamp(nx, ny)) continue;
      if (isBaseCamp(nx, ny)) continue;
      if (target.state === STATE_FACE_DOWN) continue;
      if (canCapture(board[y][x], target)) {
        moves.push({ x: nx, y: ny, type: "capture" });
      }
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift();
    for (var d = 0; d < dirs.length; d++) {
      var nx = cur.x + dirs[d].dx;
      var ny = cur.y + dirs[d].dy;
      var key = nx + "," + ny;
      if (visited[key]) continue;
      if (!inBounds(nx, ny)) continue;

      // Check railway connection
      if (!areOnSameRailway(cur.x, cur.y, nx, ny)) continue;

      visited[key] = true;
      var target = board[ny][nx];
      if (target === null) {
        moves.push({ x: nx, y: ny, type: "move" });
        queue.push({ x: nx, y: ny });
      } else if (target.team !== team) {
        // Face-down pieces cannot be attacked
        if (target.state === STATE_FACE_DOWN) continue;
        // Camp/base camp protection: but flag can be captured by engineer
        if (isFlag(target.name)) {
          moves.push({ x: nx, y: ny, type: "capture_flag" });
        } else if (!isCamp(nx, ny) && !isBaseCamp(nx, ny)) {
          if (canCapture(board[y][x], target)) {
            moves.push({ x: nx, y: ny, type: "capture" });
          }
        }
        // Blocked, do not continue (except flag, already handled)
        if (!isFlag(target.name)) {
          // Non-flag piece blocks, stop exploration
        }
      }
    }
  }

  return moves;
}

function getDiagonalMoves(board, x, y, team) {
  const moves = [];
  const piece = board[y][x];
  if (!piece) return moves;

  const inCamp = isCamp(x, y);

  const diagDirs = [
    { dx: -1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 1 },
  ];

  for (let d = 0; d < diagDirs.length; d++) {
    const nx = x + diagDirs[d].dx;
    const ny = y + diagDirs[d].dy;
    if (!inBounds(nx, ny)) continue;

    if (inCamp) {
      // In camp: move diagonally, can pass through empty non-camp cells to reach another camp
      let cx = x + diagDirs[d].dx;
      let cy = y + diagDirs[d].dy;
      while (inBounds(cx, cy)) {
        var target = board[cy][cx];
        if (isCamp(cx, cy)) {
          // Reached another camp
          if (target === null) {
            moves.push({ x: cx, y: cy, type: "move" });
          }
          break;
        }
        if (isBaseCamp(cx, cy)) break;
        if (target === null) {
          // Empty non-camp cell, can pass through and continue
          moves.push({ x: cx, y: cy, type: "move" });
        } else if (target.team !== team) {
          // Encountered enemy piece, can capture but cannot continue
          if (target.state === STATE_FACE_DOWN) break;
          if (isFlag(target.name) && piece.name === "工兵") {
            moves.push({ x: cx, y: cy, type: "capture_flag" });
          } else {
            if (canCapture(piece, target)) {
              moves.push({ x: cx, y: cy, type: "capture" });
            }
          }
          break;
        } else {
          // Encountered own piece, cannot pass through
          break;
        }
        cx += diagDirs[d].dx;
        cy += diagDirs[d].dy;
      }
    } else {
      // Not in camp: can only enter camp or base camp
      if (isCamp(nx, ny) || isBaseCamp(nx, ny)) {
        var target = board[ny][nx];
        if (target === null) {
          moves.push({ x: nx, y: ny, type: "move" });
        } else if (
          target.team !== team &&
          target.state !== STATE_FACE_DOWN &&
          isFlag(target.name) &&
          piece.name === "工兵"
        ) {
          moves.push({ x: nx, y: ny, type: "capture_flag" });
        }
      }
    }
  }

  return moves;
}

// ============================================================
// Piece Operations
// ============================================================

function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const piece = state.board[from.y][from.x];
  if (!piece || piece.team !== state.currentTeam) return null;

  const validMoves = getValidMoves(state.board, from.x, from.y, state.currentTeam);
  let valid = null;
  for (let i = 0; i < validMoves.length; i++) {
    if (validMoves[i].x === to.x && validMoves[i].y === to.y) {
      valid = validMoves[i];
      break;
    }
  }
  if (!valid) return null;

  const target = state.board[to.y][to.x];

  if (valid.type === "capture_flag") {
    // Engineer captures flag for victory
    state.board[to.y][to.x] = piece;
    state.board[from.y][from.x] = null;
    state.gameOver = true;
    state.winner = state.currentTeam;
    state.turnCount++;
    return state;
  }

  if (valid.type === "capture") {
    const result = resolveCombat(piece, target);
    if (result === "attacker_wins") {
      addCaptured(state, target);
      // Hidden mode: commander captured, reveal opponent flag
      if (state.gameType === "hidden" && target.name === "司令") {
        revealFlag(state, target.team);
      }
      state.board[to.y][to.x] = piece;
      state.board[from.y][from.x] = null;
    } else if (result === "mutual_destruction") {
      addCaptured(state, piece);
      addCaptured(state, target);
      // Hidden mode: commanders mutual destruction, reveal both flags
      if (state.gameType === "hidden") {
        if (piece.name === "司令") revealFlag(state, piece.team);
        if (target.name === "司令") revealFlag(state, target.team);
      }
      state.board[from.y][from.x] = null;
      state.board[to.y][to.x] = null;
    } else {
      return null;
    }
  } else {
    // Normal move
    state.board[to.y][to.x] = piece;
    state.board[from.y][from.x] = null;
  }

  state.currentTeam = state.currentTeam === RED ? BLUE : RED;
  state.turnCount++;
  return state;
}

function flipPiece(state, x, y) {
  if (state.gameType !== "flip") return null;
  if (!inBounds(x, y)) return null;
  const piece = state.board[y][x];
  if (!piece || piece.state !== STATE_FACE_DOWN) return null;

  piece.state = STATE_FACE_UP;
  state.currentTeam = state.currentTeam === RED ? BLUE : RED;
  state.turnCount++;
  return state;
}

function revealFlag(state, team) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = state.board[y][x];
      if (p && p.team === team && isFlag(p.name)) {
        p.state = STATE_FACE_UP;
      }
    }
  }
}

function addCaptured(state, piece) {
  if (piece.team === RED) {
    state.capturedRed.push(piece.name);
  } else {
    state.capturedBlue.push(piece.name);
  }
}

// ============================================================
// Game Over Detection
// ============================================================

function hasAnyLegalAction(board, team, gameType) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const piece = board[y][x];
      if (!piece || piece.team !== team) continue;

      // Flip mode: face-down pieces can be flipped
      if (gameType === "flip" && piece.state === STATE_FACE_DOWN) return true;

      // Face-up movable pieces
      if (piece.state === STATE_FACE_UP && isMovable(piece)) {
        if (getValidMoves(board, x, y, team, gameType).length > 0) return true;
      }
    }
  }
  return false;
}

function checkGameOver(state) {
  if (state.gameOver) return { ended: true, winner: state.winner };

  // Check if there are movable pieces
  let hasRed = false,
    hasBlue = false;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = state.board[y][x];
      if (p && p.team === RED && isMovable(p)) hasRed = true;
      if (p && p.team === BLUE && isMovable(p)) hasBlue = true;
    }
  }

  if (!hasRed && !hasBlue) return { ended: true, winner: null }; // Draw
  if (!hasRed) return { ended: true, winner: BLUE };
  if (!hasBlue) return { ended: true, winner: RED };

  // Check if current side has legal actions
  if (state.currentTeam && !hasAnyLegalAction(state.board, state.currentTeam, state.gameType)) {
    const opponent = state.currentTeam === RED ? BLUE : RED;
    return { ended: true, winner: opponent };
  }

  return { ended: false, winner: null };
}

// ============================================================
// AI Decision
// ============================================================

function aiDecide(state, aiTeam) {
  const board = state.board;
  const gameType = state.gameType;

  // Flip mode: prioritize flipping pieces
  if (gameType === "flip") {
    const faceDown = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        const p = board[y][x];
        if (p && p.state === STATE_FACE_DOWN) {
          faceDown.push({ x: x, y: y });
        }
      }
    }
    if (faceDown.length > 0) {
      // Prioritize flipping near own pieces, or flip randomly
      var pick = faceDown[Math.floor(Math.random() * faceDown.length)];
      return { type: "flip", from: { x: pick.x, y: pick.y }, to: { x: pick.x, y: pick.y } };
    }
  }

  // Priority 1: engineer captures flag
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var piece = board[y][x];
      if (!piece || piece.team !== aiTeam || piece.name !== "工兵") continue;
      if (piece.state === STATE_FACE_DOWN) continue;
      var moves = getValidMoves(board, x, y, aiTeam, gameType);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].type === "capture_flag") {
          return { type: "move", from: { x: x, y: y }, to: { x: moves[i].x, y: moves[i].y } };
        }
      }
    }
  }

  // Priority 2: favorable captures
  let bestCapture = null;
  let bestScore = -999;
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var piece = board[y][x];
      if (!piece || piece.team !== aiTeam || !isMovable(piece)) continue;
      if (piece.state === STATE_FACE_DOWN) continue;
      var moves = getValidMoves(board, x, y, aiTeam, gameType);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].type !== "capture") continue;
        const target = board[moves[i].y][moves[i].x];
        if (target.state === STATE_FACE_DOWN) continue;
        const result = resolveCombat(piece, target);
        let score = 0;
        if (result === "attacker_wins") {
          score = (target.rank !== null ? target.rank : 10) + 5;
        } else if (result === "mutual_destruction") {
          score =
            (target.rank !== null ? target.rank : 10) - (piece.rank !== null ? piece.rank : 10);
        }
        if (score > bestScore) {
          bestScore = score;
          bestCapture = { from: { x: x, y: y }, to: { x: moves[i].x, y: moves[i].y } };
        }
      }
    }
  }
  if (bestCapture && bestScore > 0) {
    return { type: "move", from: bestCapture.from, to: bestCapture.to };
  }

  // Priority 3: normal moves
  const allMoves = [];
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var piece = board[y][x];
      if (!piece || piece.team !== aiTeam || !isMovable(piece)) continue;
      if (piece.state === STATE_FACE_DOWN) continue;
      var moves = getValidMoves(board, x, y, aiTeam, gameType);
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].type === "move") {
          allMoves.push({ from: { x: x, y: y }, to: { x: moves[i].x, y: moves[i].y } });
        }
      }
    }
  }
  // Railway moves preferred
  const railwayMoves = [];
  const normalMoves = [];
  for (var i = 0; i < allMoves.length; i++) {
    if (isOnRailway(allMoves[i].from.x, allMoves[i].from.y)) {
      railwayMoves.push(allMoves[i]);
    } else {
      normalMoves.push(allMoves[i]);
    }
  }
  let pool = railwayMoves.length > 0 ? railwayMoves : normalMoves;
  if (pool.length === 0) pool = allMoves;
  if (pool.length > 0) {
    var pick = pool[Math.floor(Math.random() * pool.length)];
    return { type: "move", from: pick.from, to: pick.to };
  }

  // Priority 4: mutual destruction captures
  if (bestCapture) {
    return { type: "move", from: bestCapture.from, to: bestCapture.to };
  }

  return null;
}

// ============================================================
// Module Exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    NORMAL_PIECE_NAMES,
    BOMB_NAME,
    MINE_NAME,
    FLAG_NAME,
    RANK_MAP,
    PIECE_COUNTS,
    COLS,
    ROWS,
    RED,
    BLUE,
    STATE_FACE_UP,
    STATE_FACE_DOWN,
    CAMPS,
    BASE_CAMPS,
    H_RAILWAYS,
    isNormalPiece,
    isBomb,
    isMine,
    isFlag,
    isMovable,
    getRank,
    inBounds,
    isCamp,
    isBaseCamp,
    getBoardRow,
    hasDiagonalEligibility,
    isOnHRailway,
    isOnVRailway,
    isOnRailway,
    areOnSameRailway,
    judgeRPS,
    canCapture,
    resolveCombat,
    createGameState,
    placePiecesForTeam,
    placePiecesRandom,
    shuffle,
    getValidMoves,
    getNormalMoves,
    getEngineerMoves,
    getDiagonalMoves,
    flipPiece,
    revealFlag,
    moveCard,
    addCaptured,
    hasAnyLegalAction,
    checkGameOver,
    aiDecide,
  };
}

// ============================================================
// Browser UI (SVG + DOM rendering, junqi-master style)
// ============================================================
if (typeof document !== "undefined") {
  let gameState = null;

  // Board SVG view coordinate system
  const SVG_W = 480;
  const SVG_H = 780;
  const PAD = 36;
  const COL_SPACE = (SVG_W - 2 * PAD) / (COLS - 1); // = 102
  const GAP = 20;
  // 13 visual rows (0-12), gap between row 5 and row 7
  const ROW_SPACE = (SVG_H - 2 * PAD - GAP) / 12; // ≈ 59.7

  // Array coordinates -> SVG coordinates
  function svgX(x) {
    return PAD + x * COL_SPACE;
  }
  function svgY(y) {
    const vr = getBoardRow(y);
    if (vr <= 5) return PAD + vr * ROW_SPACE;
    return PAD + GAP + vr * ROW_SPACE;
  }

  // DOM elements
  const $modeSelection = document.getElementById("mode-selection");
  const $gameArea = document.getElementById("game-area");
  const $boardContainer = document.getElementById("board-container");
  const $currentTeam = document.getElementById("current-team");
  const $turnCount = document.getElementById("turn-count");
  const $redRemaining = document.getElementById("red-remaining");
  const $blueRemaining = document.getElementById("blue-remaining");
  const $capturedRed = document.getElementById("captured-red");
  const $capturedBlue = document.getElementById("captured-blue");
  const $message = document.getElementById("message");
  const $gameOver = document.getElementById("game-over");
  const $winnerText = document.getElementById("winner-text");
  const $btnRestart = document.getElementById("btn-restart");

  let boardScale = 1;

  // RPS state
  let rpsChoices = { player1: null, player2: null, human: null };
  let pendingMode = null; // Game mode pending RPS completion

  // ============================================================
  // SVG Board Construction (execute once)
  // ============================================================
  function buildBoardSVG() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + SVG_W + " " + SVG_H);
    svg.setAttribute("width", "100%");
    svg.style.display = "block";

    // Railway stripe pattern
    const defs = document.createElementNS(ns, "defs");
    const pat = document.createElementNS(ns, "pattern");
    pat.setAttribute("id", "rail-stripe");
    pat.setAttribute("patternUnits", "userSpaceOnUse");
    pat.setAttribute("width", "8");
    pat.setAttribute("height", "8");
    pat.setAttribute("patternTransform", "rotate(45)");
    const r1 = document.createElementNS(ns, "rect");
    r1.setAttribute("width", "4");
    r1.setAttribute("height", "8");
    r1.setAttribute("fill", "#EAC611");
    const r2 = document.createElementNS(ns, "rect");
    r2.setAttribute("x", "4");
    r2.setAttribute("width", "4");
    r2.setAttribute("height", "8");
    r2.setAttribute("fill", "#111");
    pat.appendChild(r1);
    pat.appendChild(r2);
    defs.appendChild(pat);
    svg.appendChild(defs);

    const gHighway = document.createElementNS(ns, "g");
    const gRailway = document.createElementNS(ns, "g");
    const gDiag = document.createElementNS(ns, "g");
    const gStation = document.createElementNS(ns, "g");

    // ---- Highways (gray thin lines) ----
    // Horizontal highways
    const hHighwayRows = [0, 2, 3, 4, 7, 8, 9, 11];
    for (var i = 0; i < hHighwayRows.length; i++) {
      var y = hHighwayRows[i];
      addSVGLine(gHighway, ns, svgX(0), svgY(y), svgX(4), svgY(y), "gray", 1);
    }
    // Vertical highways
    for (var x = 0; x < COLS; x++) {
      addSVGLine(gHighway, ns, svgX(x), svgY(0), svgX(x), svgY(5), "gray", 1);
      addSVGLine(gHighway, ns, svgX(x), svgY(6), svgX(x), svgY(11), "gray", 1);
    }

    // ---- Railways (gold/black striped thick lines) ----
    // Horizontal railways
    const hRailRows = [1, 5, 6, 10];
    for (var i = 0; i < hRailRows.length; i++) {
      var y = hRailRows[i];
      addSVGLine(gRailway, ns, svgX(0), svgY(y), svgX(4), svgY(y), "url(#rail-stripe)", 4);
    }
    // Vertical railways
    addSVGLine(gRailway, ns, svgX(0), svgY(1), svgX(0), svgY(10), "url(#rail-stripe)", 4);
    addSVGLine(gRailway, ns, svgX(4), svgY(1), svgX(4), svgY(10), "url(#rail-stripe)", 4);
    addSVGLine(gRailway, ns, svgX(2), svgY(5), svgX(2), svgY(6), "url(#rail-stripe)", 4);

    // ---- Diagonals (gray dashed lines) ----
    const drawn = {};
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (!hasDiagonalEligibility(x, y) && !isCamp(x, y)) continue;
        const diagDirs = [
          { dx: -1, dy: -1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: -1 },
          { dx: 1, dy: 1 },
        ];
        for (let d = 0; d < diagDirs.length; d++) {
          const nx = x + diagDirs[d].dx;
          const ny = y + diagDirs[d].dy;
          if (!inBounds(nx, ny)) continue;
          if (!hasDiagonalEligibility(nx, ny) && !isCamp(nx, ny) && !isBaseCamp(nx, ny)) continue;
          const key =
            Math.min(x, nx) + "," + Math.min(y, ny) + "-" + Math.max(x, nx) + "," + Math.max(y, ny);
          if (drawn[key]) continue;
          drawn[key] = true;
          const line = document.createElementNS(ns, "line");
          line.setAttribute("x1", svgX(x));
          line.setAttribute("y1", svgY(y));
          line.setAttribute("x2", svgX(nx));
          line.setAttribute("y2", svgY(ny));
          line.setAttribute("stroke", "gray");
          line.setAttribute("stroke-width", "1");
          line.setAttribute("stroke-dasharray", "4,3");
          gDiag.appendChild(line);
        }
      }
    }

    // ---- Station markers ----
    const STATION_W = 60;
    const STATION_H = 40;
    const CAMP_RX = 38;
    const CAMP_RY = 28;

    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        const cx = svgX(x),
          cy = svgY(y);
        let label = "兵 站";
        if (isCamp(x, y)) {
          // Camp: ellipse
          label = "行 营";
          const ellipse = document.createElementNS(ns, "ellipse");
          ellipse.setAttribute("cx", cx);
          ellipse.setAttribute("cy", cy);
          ellipse.setAttribute("rx", CAMP_RX);
          ellipse.setAttribute("ry", CAMP_RY);
          ellipse.setAttribute("fill", "#fff");
          ellipse.setAttribute("stroke", "gray");
          ellipse.setAttribute("stroke-width", "1");
          ellipse.classList.add("station-xingying");
          gStation.appendChild(ellipse);
        } else {
          // Station / Base camp: rectangle
          if (isBaseCamp(x, y)) label = "大本营";
          const rect = document.createElementNS(ns, "rect");
          rect.setAttribute("x", cx - STATION_W / 2);
          rect.setAttribute("y", cy - STATION_H / 2);
          rect.setAttribute("width", STATION_W);
          rect.setAttribute("height", STATION_H);
          rect.setAttribute("fill", "#fff");
          rect.setAttribute("stroke", "gray");
          rect.setAttribute("stroke-width", "1");
          rect.setAttribute("rx", "3");
          rect.classList.add(isBaseCamp(x, y) ? "station-dabenying" : "station");
          gStation.appendChild(rect);
        }
        // Station text
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#aaa");
        text.setAttribute("font-weight", "400");
        text.textContent = label;
        gStation.appendChild(text);
      }
    }

    svg.appendChild(gHighway);
    svg.appendChild(gRailway);
    svg.appendChild(gDiag);
    svg.appendChild(gStation);

    // Clear container and add SVG + pieces layer
    $boardContainer.innerHTML = "";
    $boardContainer.appendChild(svg);

    const piecesLayer = document.createElement("div");
    piecesLayer.id = "pieces-layer";
    piecesLayer.style.position = "absolute";
    piecesLayer.style.top = "0";
    piecesLayer.style.left = "0";
    piecesLayer.style.width = "100%";
    piecesLayer.style.height = "100%";
    $boardContainer.appendChild(piecesLayer);

    // Calculate scale ratio
    updateScale();
  }

  function addSVGLine(parent, ns, x1, y1, x2, y2, stroke, strokeWidth) {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", strokeWidth);
    parent.appendChild(line);
  }

  function updateScale() {
    const svg = $boardContainer.querySelector("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    boardScale = rect.width / SVG_W;
  }

  // ============================================================
  // Piece Rendering (DOM div elements)
  // ============================================================
  function renderPieces() {
    const layer = document.getElementById("pieces-layer");
    if (!layer || !gameState) return;
    layer.innerHTML = "";
    updateScale();

    const PIECE_W = 56;
    const PIECE_H = 36;
    const board = gameState.board;
    const gameType = gameState.gameType;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const piece = board[y][x];
        if (!piece) continue;

        const div = document.createElement("div");
        div.className = "chess-piece";

        // Determine whether to show piece content
        let showContent = piece.state === STATE_FACE_UP;
        if (gameType === "hidden" && piece.team !== gameState.playerTeam) {
          showContent = false;
        }

        if (showContent) {
          if (piece.team === RED) div.classList.add("chess-red");
          else div.classList.add("chess-blue");
          div.textContent = piece.name;
        } else {
          div.classList.add("chess-face-down");
        }

        div.style.width = PIECE_W + "px";
        div.style.height = PIECE_H + "px";
        div.style.fontSize = Math.round(PIECE_W / 3) + "px";

        // Positioning: SVG coordinates -> pixel coordinates
        const px = svgX(x) * boardScale - PIECE_W / 2;
        const py = svgY(y) * boardScale - PIECE_H / 2;
        div.style.left = px + "px";
        div.style.top = py + "px";

        div.dataset.x = x;
        div.dataset.y = y;

        layer.appendChild(div);
      }
    }

    // Highlight selected piece
    if (gameState.selectedCell) {
      const sel = gameState.selectedCell;
      const selDiv = layer.querySelector('[data-x="' + sel.x + '"][data-y="' + sel.y + '"]');
      if (selDiv) selDiv.classList.add("chess-selected");
    }
  }

  function highlightMoves(moves) {
    const layer = document.getElementById("pieces-layer");
    if (!layer) return;

    // Remove old highlights
    const old = layer.querySelectorAll(".move-highlight");
    for (var i = 0; i < old.length; i++) old[i].remove();

    for (var i = 0; i < moves.length; i++) {
      const m = moves[i];
      const div = document.createElement("div");
      div.className = "move-highlight";
      if (m.type === "capture" || m.type === "capture_flag") {
        div.classList.add("highlight-capture");
      } else {
        div.classList.add("highlight-move");
      }
      const px = svgX(m.x) * boardScale - 8;
      const py = svgY(m.y) * boardScale - 8;
      div.style.left = px + "px";
      div.style.top = py + "px";
      div.dataset.x = m.x;
      div.dataset.y = m.y;
      layer.appendChild(div);
    }
  }

  function clearHighlights() {
    const layer = document.getElementById("pieces-layer");
    if (!layer) return;
    const old = layer.querySelectorAll(".move-highlight");
    for (let i = 0; i < old.length; i++) old[i].remove();
    // Remove selection state
    const selDiv = layer.querySelector(".chess-selected");
    if (selDiv) selDiv.classList.remove("chess-selected");
  }

  function drawBoard() {
    renderPieces();
  }

  // ============================================================
  // Event Handling (click on pieces layer)
  // ============================================================
  function onBoardClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.oppType === "pve" && gameState.currentTeam === gameState.aiTeam) return;

    const target = e.target;
    const x = parseInt(target.dataset.x);
    const y = parseInt(target.dataset.y);
    if (isNaN(x) || isNaN(y)) return;

    const piece = gameState.board[y][x];
    const team = gameState.currentTeam;
    const gameType = gameState.gameType;

    // Flip mode: click face-down piece to flip
    if (gameType === "flip" && piece && piece.state === STATE_FACE_DOWN) {
      var result = flipPiece(gameState, x, y);
      if (result) {
        clearHighlights();
        drawBoard();
        afterAction();
        return;
      }
    }

    // Click highlight target (move/capture)
    if (target.classList.contains("move-highlight")) {
      if (gameState.selectedCell) {
        var sel = gameState.selectedCell;
        var result = moveCard(gameState, sel, { x: x, y: y });
        if (result) {
          gameState.selectedCell = null;
          clearHighlights();
          drawBoard();
          afterAction();
          return;
        }
      }
    }

    // Already has selected piece
    if (gameState.selectedCell) {
      var sel = gameState.selectedCell;

      // Click same cell: deselect
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        drawBoard();
        return;
      }

      // Try move/capture
      var result = moveCard(gameState, sel, { x: x, y: y });
      if (result) {
        gameState.selectedCell = null;
        clearHighlights();
        drawBoard();
        afterAction();
        return;
      }

      // Select another own piece
      if (piece && piece.team === team && piece.state === STATE_FACE_UP) {
        gameState.selectedCell = { x: x, y: y };
        clearHighlights();
        drawBoard();
        var moves = getValidMoves(gameState.board, x, y, team, gameType);
        highlightMoves(moves);
        return;
      }

      showMessage("无法移动到该位置", "error");
      return;
    }

    // No selection: select own piece (must be face up)
    if (piece && piece.team === team && piece.state === STATE_FACE_UP) {
      gameState.selectedCell = { x: x, y: y };
      clearHighlights();
      drawBoard();
      var moves = getValidMoves(gameState.board, x, y, team, gameType);
      highlightMoves(moves);
      return;
    }

    if (piece && piece.team !== team) {
      showMessage("这不是你的棋子", "error");
    }
  }

  // ============================================================
  // Status Update
  // ============================================================
  function updateStatus() {
    if (!gameState) return;
    const s = gameState;

    if (s.currentTeam) {
      $currentTeam.textContent = s.currentTeam === RED ? "红方" : "蓝方";
      $currentTeam.className =
        "team-indicator " + (s.currentTeam === RED ? "red-text" : "blue-text");
    } else {
      $currentTeam.textContent = "—";
      $currentTeam.className = "team-indicator";
    }

    $turnCount.textContent = s.turnCount;

    let redCount = 0,
      blueCount = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const p = s.board[y][x];
        if (p) {
          if (p.team === RED) redCount++;
          else if (p.team === BLUE) blueCount++;
        }
      }
    }
    $redRemaining.textContent = redCount;
    $blueRemaining.textContent = blueCount;

    const $redLabel = document.getElementById("red-label");
    const $blueLabel = document.getElementById("blue-label");
    if (s.mode === "pve" && s.playerTeam) {
      $redLabel.textContent = s.playerTeam === RED ? "玩家（红方）：" : "电脑（红方）：";
      $blueLabel.textContent = s.playerTeam === BLUE ? "玩家（蓝方）：" : "电脑（蓝方）：";
    } else {
      $redLabel.textContent = "红方：";
      $blueLabel.textContent = "蓝方：";
    }

    renderCaptured($capturedRed, s.capturedRed, RED);
    renderCaptured($capturedBlue, s.capturedBlue, BLUE);
  }

  function renderCaptured(container, list, team) {
    container.innerHTML = "";
    for (let i = 0; i < list.length; i++) {
      const span = document.createElement("span");
      span.className = "captured-piece " + (team === RED ? "red-text" : "blue-text");
      span.textContent = list[i];
      container.appendChild(span);
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || "";
  }

  // ============================================================
  // Game Flow
  // ============================================================
  function showModeSelection() {
    $modeSelection.style.display = "flex";
    $gameArea.style.display = "none";
    $gameOver.style.display = "none";
  }

  function showGameArea() {
    $modeSelection.style.display = "none";
    $gameArea.style.display = "flex";
    $gameOver.style.display = "none";
  }

  function showGameOverScreen(winner) {
    if (winner) {
      let winnerName = winner === RED ? "红方" : "蓝方";
      if (gameState.oppType === "pve") {
        winnerName = winner === gameState.playerTeam ? "你赢了！" : "电脑获胜！";
      }
      $winnerText.textContent = winnerName;
    } else {
      $winnerText.textContent = "平局！";
    }
    $gameOver.style.display = "flex";
  }

  function startGame(mode, firstPlayer) {
    document.getElementById("rps-section").style.display = "none";
    gameState = createGameState(mode);
    buildBoardSVG();

    // Switch rules panel
    document.querySelectorAll(".rules-content").forEach((el) => {
      el.style.display = "none";
    });
    const rulesId = "rules-" + mode.gameType;
    const rulesEl = document.getElementById(rulesId);
    if (rulesEl) rulesEl.style.display = "block";

    // Bind click event
    const layer = document.getElementById("pieces-layer");
    if (layer) layer.addEventListener("click", onBoardClick);

    const winner = firstPlayer || RED;

    if (mode.oppType === "pvp") {
      gameState.currentTeam = winner;
      gameState.firstPlayer = winner;
      showGameArea();
      drawBoard();
      updateStatus();
      const teamName = winner === RED ? "红方" : "蓝方";
      const firstMsg =
        mode.gameType === "flip"
          ? teamName + "先行，请翻开棋子"
          : teamName + "先行，请选择棋子移动";
      showMessage(firstMsg, "");
    } else {
      gameState.playerTeam = winner === RED ? RED : BLUE;
      gameState.aiTeam = winner === RED ? BLUE : RED;
      gameState.currentTeam = winner;
      showGameArea();
      drawBoard();
      updateStatus();
      if (gameState.currentTeam === gameState.aiTeam) {
        triggerAI();
      } else {
        showMessage("你的回合，请选择棋子移动", "");
      }
    }
  }

  function afterAction() {
    updateStatus();
    const result = checkGameOver(gameState);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      drawBoard();
      setTimeout(() => {
        showGameOverScreen(result.winner);
      }, 500);
      return;
    }

    if (gameState.oppType === "pve" && gameState.currentTeam === gameState.aiTeam) {
      triggerAI();
    } else {
      const teamName = gameState.currentTeam === RED ? "红方" : "蓝方";
      showMessage(teamName + "的回合", "");
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    showMessage("电脑思考中...", "info");
    const delay = 300 + Math.random() * 700;
    setTimeout(() => {
      const decision = aiDecide(gameState, gameState.aiTeam);
      if (!decision) {
        gameState.aiThinking = false;
        afterAction();
        return;
      }
      if (decision.type === "flip") {
        executeAIFlip(decision);
      } else {
        executeAIAction(decision);
      }
    }, delay);
  }

  function executeAIAction(decision) {
    // Highlight AI action start position
    const layer = document.getElementById("pieces-layer");
    if (layer) {
      const fromDiv = layer.querySelector(
        '[data-x="' + decision.from.x + '"][data-y="' + decision.from.y + '"]'
      );
      if (fromDiv && fromDiv.classList.contains("chess-piece")) {
        fromDiv.classList.add("chess-ai-highlight");
      }
    }

    setTimeout(() => {
      moveCard(gameState, decision.from, decision.to);
      clearHighlights();
      drawBoard();

      // Highlight target position
      if (layer) {
        const toDiv = layer.querySelector(
          '[data-x="' + decision.to.x + '"][data-y="' + decision.to.y + '"]'
        );
        if (toDiv && toDiv.classList.contains("chess-piece")) {
          toDiv.classList.add("chess-ai-highlight");
        }
      }

      setTimeout(() => {
        clearHighlights();
        drawBoard();
        gameState.aiThinking = false;
        afterAction();
      }, 400);
    }, 300);
  }

  function executeAIFlip(decision) {
    const layer = document.getElementById("pieces-layer");
    if (layer) {
      const fromDiv = layer.querySelector(
        '[data-x="' + decision.from.x + '"][data-y="' + decision.from.y + '"]'
      );
      if (fromDiv && fromDiv.classList.contains("chess-piece")) {
        fromDiv.classList.add("chess-ai-highlight");
      }
    }

    setTimeout(() => {
      flipPiece(gameState, decision.from.x, decision.from.y);
      clearHighlights();
      drawBoard();

      setTimeout(() => {
        clearHighlights();
        drawBoard();
        gameState.aiThinking = false;
        afterAction();
      }, 400);
    }, 300);
  }

  // ============================================================
  // Rock-Paper-Scissors
  // ============================================================
  function handleRPSChoice(player, choice, ev) {
    if (player === "human") {
      rpsChoices.human = choice;
      document.querySelectorAll("#rps-player-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      ev.target.classList.add("selected");

      const choices = ["rock", "scissors", "paper"];
      const aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      var resultEl = document.getElementById("rps-result");
      const humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，AI选择了" +
          getRPSName(aiChoice) +
          "，你赢了！你先手。";
        setTimeout(() => {
          startGame(pendingMode, RED);
        }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，AI选择了" +
          getRPSName(aiChoice) +
          "，你输了！AI先手。";
        setTimeout(() => {
          startGame(pendingMode, BLUE);
        }, 1500);
      } else {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，AI选择了" +
          getRPSName(aiChoice) +
          "，平局！重新选择。";
        rpsChoices.human = null;
        rpsChoices.player2 = null;
      }
    } else {
      rpsChoices["player" + player] = choice;
      document.querySelectorAll("#rps-p" + player + "-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      ev.target.classList.add("selected");

      const statusEl = document.getElementById("rps-p" + player + "-status");
      statusEl.textContent = "已选择：" + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        var resultEl = document.getElementById("rps-result");
        const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          resultEl.textContent = "红方赢了！红方先手。";
          setTimeout(() => {
            startGame(pendingMode, RED);
          }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = "蓝方赢了！蓝方先手。";
          setTimeout(() => {
            startGame(pendingMode, BLUE);
          }, 1500);
        } else {
          resultEl.textContent = "平局！重新选择。";
          rpsChoices.player1 = null;
          rpsChoices.player2 = null;
          document.getElementById("rps-p1-status").textContent = "请选择";
          document.getElementById("rps-p2-status").textContent = "请选择";
          document.querySelectorAll(".btn-rps").forEach((btn) => {
            btn.classList.remove("selected");
          });
        }
      }
    }
  }

  function showRPS(oppType) {
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "flex";
    document.getElementById("rps-pvp").style.display = oppType === "pvp" ? "block" : "none";
    document.getElementById("rps-pve").style.display = oppType === "pve" ? "block" : "none";
    document.getElementById("rps-result").textContent = "";
    rpsChoices = { player1: null, player2: null, human: null };
  }

  // ============================================================
  // Event Binding
  // ============================================================
  const modeButtons = document.querySelectorAll(".mode-section .btn");
  for (let i = 0; i < modeButtons.length; i++) {
    modeButtons[i].addEventListener("click", function () {
      const gameType = this.dataset.gameType;
      const oppType = this.dataset.oppType;
      pendingMode = { gameType: gameType, oppType: oppType };
      showRPS(oppType);
    });
  }

  document.querySelectorAll(".btn-rps").forEach((button) => {
    button.addEventListener("click", (ev) => {
      const player = ev.target.dataset.player;
      const choice = ev.target.dataset.choice;
      handleRPSChoice(player, choice, ev);
    });
  });

  $btnRestart.addEventListener("click", () => {
    gameState = null;
    showModeSelection();
  });

  // Recalculate on window resize
  window.addEventListener("resize", () => {
    if (gameState) {
      updateScale();
      renderPieces();
    }
  });

  // Initialize
  showModeSelection();
}
