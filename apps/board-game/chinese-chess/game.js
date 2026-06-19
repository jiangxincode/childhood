/* eslint-disable no-var, no-undef */
// ============================================================
// Chinese Chess (Xiangqi) - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const COLS = 9;
const ROWS = 10;
const EMPTY = 0;
const R_GENERAL = 1,
  R_ADVISOR = 2,
  R_ELEPHANT = 3,
  R_HORSE = 4,
  R_CHARIOT = 5,
  R_CANNON = 6,
  R_PAWN = 7;
const B_GENERAL = 8,
  B_ADVISOR = 9,
  B_ELEPHANT = 10,
  B_HORSE = 11,
  B_CHARIOT = 12,
  B_CANNON = 13,
  B_PAWN = 14;

const RED = "red";
const BLACK = "black";

// Base (minimum) search depth. Kept for backward compatibility / API.
const AI_DEPTH = 4;
// Iterative deepening upper bound. The engine searches deeper than AI_DEPTH
// whenever the time budget allows, giving stronger play on capable devices.
const AI_MAX_DEPTH = 6;
// Soft time budget per move (ms). Iterative deepening stops once exceeded and
// returns the best move from the last fully completed depth.
const AI_TIME_BUDGET_MS = 1500;
// Maximum extra plies explored by the quiescence search (capture-only) to
// avoid the horizon effect during piece exchanges.
const QUIESCENCE_MAX_PLY = 6;

const PIECE_NAMES = {};
PIECE_NAMES[R_GENERAL] = "帥";
PIECE_NAMES[R_ADVISOR] = "仕";
PIECE_NAMES[R_ELEPHANT] = "相";
PIECE_NAMES[R_HORSE] = "馬";
PIECE_NAMES[R_CHARIOT] = "車";
PIECE_NAMES[R_CANNON] = "炮";
PIECE_NAMES[R_PAWN] = "兵";
PIECE_NAMES[B_GENERAL] = "将";
PIECE_NAMES[B_ADVISOR] = "士";
PIECE_NAMES[B_ELEPHANT] = "象";
PIECE_NAMES[B_HORSE] = "馬";
PIECE_NAMES[B_CHARIOT] = "車";
PIECE_NAMES[B_CANNON] = "炮";
PIECE_NAMES[B_PAWN] = "卒";

const PIECE_VALUES = {};
PIECE_VALUES[R_GENERAL] = 10000;
PIECE_VALUES[R_ADVISOR] = 250;
PIECE_VALUES[R_ELEPHANT] = 250;
PIECE_VALUES[R_HORSE] = 350;
PIECE_VALUES[R_CHARIOT] = 500;
PIECE_VALUES[R_CANNON] = 350;
PIECE_VALUES[R_PAWN] = 100;
PIECE_VALUES[B_GENERAL] = 10000;
PIECE_VALUES[B_ADVISOR] = 250;
PIECE_VALUES[B_ELEPHANT] = 250;
PIECE_VALUES[B_HORSE] = 350;
PIECE_VALUES[B_CHARIOT] = 500;
PIECE_VALUES[B_CANNON] = 350;
PIECE_VALUES[B_PAWN] = 100;

const FLEX_VALUES = {};
FLEX_VALUES[R_GENERAL] = 0;
FLEX_VALUES[R_ADVISOR] = 1;
FLEX_VALUES[R_ELEPHANT] = 1;
FLEX_VALUES[R_HORSE] = 12;
FLEX_VALUES[R_CHARIOT] = 6;
FLEX_VALUES[R_CANNON] = 6;
FLEX_VALUES[R_PAWN] = 15;
FLEX_VALUES[B_GENERAL] = 0;
FLEX_VALUES[B_ADVISOR] = 1;
FLEX_VALUES[B_ELEPHANT] = 1;
FLEX_VALUES[B_HORSE] = 12;
FLEX_VALUES[B_CHARIOT] = 6;
FLEX_VALUES[B_CANNON] = 6;
FLEX_VALUES[B_PAWN] = 15;

// Pawn position bonus values
const SOLDIER_POS_RED = [
  [0, 90, 90, 70, 70, 0, 0, 0, 0, 0],
  [0, 90, 90, 90, 70, 0, 0, 0, 0, 0],
  [0, 110, 110, 110, 70, 0, 0, 0, 0, 0],
  [0, 120, 120, 110, 70, 0, 0, 0, 0, 0],
  [0, 120, 120, 110, 70, 0, 0, 0, 0, 0],
  [0, 120, 120, 110, 70, 0, 0, 0, 0, 0],
  [0, 110, 110, 110, 70, 0, 0, 0, 0, 0],
  [0, 90, 90, 90, 70, 0, 0, 0, 0, 0],
  [0, 90, 90, 70, 70, 0, 0, 0, 0, 0],
];

const SOLDIER_POS_BLACK = [
  [0, 0, 0, 0, 0, 70, 70, 90, 90, 0],
  [0, 0, 0, 0, 0, 70, 90, 90, 90, 0],
  [0, 0, 0, 0, 0, 70, 110, 110, 110, 0],
  [0, 0, 0, 0, 0, 70, 110, 120, 120, 0],
  [0, 0, 0, 0, 0, 70, 110, 120, 120, 0],
  [0, 0, 0, 0, 0, 70, 110, 120, 120, 0],
  [0, 0, 0, 0, 0, 70, 110, 110, 110, 0],
  [0, 0, 0, 0, 0, 70, 90, 90, 90, 0],
  [0, 0, 0, 0, 0, 70, 70, 90, 90, 0],
];

// Chariot position bonus: strong on center files and open files
// Indexed as [col][row], so 9 columns x 10 rows
const CHARIOT_POS = [
  [14, 16, 14, 14, 12, 12, 14, 14, 16, 14], // col 0
  [18, 22, 22, 24, 22, 22, 24, 22, 22, 18], // col 1
  [20, 26, 28, 30, 28, 28, 30, 28, 26, 20], // col 2
  [22, 28, 30, 34, 32, 32, 34, 30, 28, 22], // col 3
  [24, 30, 32, 36, 36, 36, 36, 32, 30, 24], // col 4 (center)
  [22, 28, 30, 34, 32, 32, 34, 30, 28, 22], // col 5
  [20, 26, 28, 30, 28, 28, 30, 28, 26, 20], // col 6
  [18, 22, 22, 24, 22, 22, 24, 22, 22, 18], // col 7
  [14, 16, 14, 14, 12, 12, 14, 14, 16, 14], // col 8
];

// Horse position bonus: strong in center, weak on edges
const HORSE_POS = [
  [0, 4, 8, 10, 10, 10, 10, 8, 4, 0], // col 0 (edge)
  [4, 10, 14, 16, 16, 16, 16, 14, 10, 4], // col 1
  [8, 16, 20, 22, 22, 22, 22, 20, 16, 8], // col 2
  [12, 20, 24, 26, 26, 26, 26, 24, 20, 12], // col 3
  [14, 22, 26, 28, 28, 28, 28, 26, 22, 14], // col 4 (center)
  [12, 20, 24, 26, 26, 26, 26, 24, 20, 12], // col 5
  [8, 16, 20, 22, 22, 22, 22, 20, 16, 8], // col 6
  [4, 10, 14, 16, 16, 16, 16, 14, 10, 4], // col 7
  [0, 4, 8, 10, 10, 10, 10, 8, 4, 0], // col 8 (edge)
];

// Cannon position bonus: strong in center, needs platforms
const CANNON_POS = [
  [8, 10, 10, 10, 8, 8, 10, 10, 10, 8], // col 0
  [10, 14, 14, 14, 12, 12, 14, 14, 14, 10], // col 1
  [12, 16, 18, 18, 16, 16, 18, 18, 16, 12], // col 2
  [14, 18, 20, 20, 18, 18, 20, 20, 18, 14], // col 3
  [16, 20, 22, 22, 20, 20, 22, 22, 20, 16], // col 4 (center)
  [14, 18, 20, 20, 18, 18, 20, 20, 18, 14], // col 5
  [12, 16, 18, 18, 16, 16, 18, 18, 16, 12], // col 6
  [10, 14, 14, 14, 12, 12, 14, 14, 14, 10], // col 7
  [8, 10, 10, 10, 8, 8, 10, 10, 10, 8], // col 8
];

// Advisor position bonus: stay in palace (cols 3-5, rows 7-9 for red, 0-2 for black)
// Indexed as [col][row], so 9 columns x 10 rows
const ADVISOR_POS_RED = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 0
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 1
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 2
  [0, 0, 0, 0, 0, 0, 0, 10, 14, 10], // col 3
  [0, 0, 0, 0, 0, 0, 0, 14, 18, 14], // col 4 (center)
  [0, 0, 0, 0, 0, 0, 0, 10, 14, 10], // col 5
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 6
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 7
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 8
];

const ADVISOR_POS_BLACK = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 0
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 1
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 2
  [10, 14, 10, 0, 0, 0, 0, 0, 0, 0], // col 3
  [14, 18, 14, 0, 0, 0, 0, 0, 0, 0], // col 4 (center)
  [10, 14, 10, 0, 0, 0, 0, 0, 0, 0], // col 5
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 6
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 7
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 8
];

// Elephant position bonus: stay in own half (cannot cross river)
// Indexed as [col][row], so 9 columns x 10 rows
const ELEPHANT_POS_RED = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 0
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 1
  [0, 0, 0, 0, 0, 10, 0, 10, 0, 10], // col 2
  [0, 0, 0, 0, 0, 0, 14, 0, 14, 0], // col 3
  [0, 0, 0, 0, 0, 0, 0, 18, 0, 0], // col 4 (center)
  [0, 0, 0, 0, 0, 0, 14, 0, 14, 0], // col 5
  [0, 0, 0, 0, 0, 10, 0, 10, 0, 10], // col 6
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 7
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 8
];

const ELEPHANT_POS_BLACK = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 0
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 1
  [10, 0, 10, 0, 0, 0, 0, 0, 0, 0], // col 2
  [0, 14, 0, 0, 0, 0, 0, 0, 0, 0], // col 3
  [0, 0, 18, 0, 0, 0, 0, 0, 0, 0], // col 4 (center)
  [0, 14, 0, 0, 0, 0, 0, 0, 0, 0], // col 5
  [10, 0, 10, 0, 0, 0, 0, 0, 0, 0], // col 6
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 7
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // col 8
];

// ============================================================
// Initial board
// ============================================================

function createBoard() {
  const board = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) col.push(EMPTY);
    board.push(col);
  }
  // Black (top, row 0-4)
  board[0][0] = B_CHARIOT;
  board[1][0] = B_HORSE;
  board[2][0] = B_ELEPHANT;
  board[3][0] = B_ADVISOR;
  board[4][0] = B_GENERAL;
  board[5][0] = B_ADVISOR;
  board[6][0] = B_ELEPHANT;
  board[7][0] = B_HORSE;
  board[8][0] = B_CHARIOT;
  board[1][2] = B_CANNON;
  board[7][2] = B_CANNON;
  board[0][3] = B_PAWN;
  board[2][3] = B_PAWN;
  board[4][3] = B_PAWN;
  board[6][3] = B_PAWN;
  board[8][3] = B_PAWN;
  // Red (bottom, row 5-9)
  board[0][9] = R_CHARIOT;
  board[1][9] = R_HORSE;
  board[2][9] = R_ELEPHANT;
  board[3][9] = R_ADVISOR;
  board[4][9] = R_GENERAL;
  board[5][9] = R_ADVISOR;
  board[6][9] = R_ELEPHANT;
  board[7][9] = R_HORSE;
  board[8][9] = R_CHARIOT;
  board[1][7] = R_CANNON;
  board[7][7] = R_CANNON;
  board[0][6] = R_PAWN;
  board[2][6] = R_PAWN;
  board[4][6] = R_PAWN;
  board[6][6] = R_PAWN;
  board[8][6] = R_PAWN;
  return board;
}

// ============================================================
// Piece identification
// ============================================================

function isRed(piece) {
  return piece >= R_GENERAL && piece <= R_PAWN;
}
function isBlack(piece) {
  return piece >= B_GENERAL && piece <= B_PAWN;
}
function getOwner(piece) {
  if (isRed(piece)) return RED;
  if (isBlack(piece)) return BLACK;
  return null;
}
function getOpponent(color) {
  return color === RED ? BLACK : RED;
}
function getPlayerName(color) {
  return color === RED ? "红方" : "黑方";
}
function inBounds(c, r) {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS;
}

function isGeneral(piece) {
  return piece === R_GENERAL || piece === B_GENERAL;
}
function isChariot(piece) {
  return piece === R_CHARIOT || piece === B_CHARIOT;
}
function isHorse(piece) {
  return piece === R_HORSE || piece === B_HORSE;
}
function isCannon(piece) {
  return piece === R_CANNON || piece === B_CANNON;
}
function isAdvisor(piece) {
  return piece === R_ADVISOR || piece === B_ADVISOR;
}
function isElephant(piece) {
  return piece === R_ELEPHANT || piece === B_ELEPHANT;
}
function isPawn(piece) {
  return piece === R_PAWN || piece === B_PAWN;
}

// ============================================================
// Board operations
// ============================================================

function copyBoard(board) {
  const newBoard = [];
  for (let c = 0; c < COLS; c++) {
    newBoard.push(board[c].slice());
  }
  return newBoard;
}

function applyMove(board, move) {
  const newBoard = copyBoard(board);
  newBoard[move.toC][move.toR] = newBoard[move.fromC][move.fromR];
  newBoard[move.fromC][move.fromR] = EMPTY;
  return newBoard;
}

// ============================================================
// Move generation
// ============================================================

function getValidMoves(board, c, r) {
  const piece = board[c][r];
  if (piece === EMPTY) return [];
  const color = getOwner(piece);
  let moves = [];

  if (isGeneral(piece)) moves = getGeneralMoves(board, c, r, color);
  else if (isAdvisor(piece)) moves = getAdvisorMoves(board, c, r, color);
  else if (isElephant(piece)) moves = getElephantMoves(board, c, r, color);
  else if (isHorse(piece)) moves = getHorseMoves(board, c, r, color);
  else if (isChariot(piece)) moves = getChariotMoves(board, c, r, color);
  else if (isCannon(piece)) moves = getCannonMoves(board, c, r, color);
  else if (isPawn(piece)) moves = getPawnMoves(board, c, r, color);

  // General facing rule: illegal if own general faces opponent general after move
  const validMoves = [];
  for (const move of moves) {
    const newBoard = applyMove(board, move);
    if (!isGeneralFacing(newBoard, color)) {
      validMoves.push(move);
    }
  }
  return validMoves;
}

function isGeneralFacing(board, myColor) {
  let myGC = -1,
    myGR = -1,
    opGC = -1,
    opGR = -1;
  for (let c = 3; c <= 5; c++) {
    for (let r = 0; r <= 2; r++) {
      if (board[c][r] !== EMPTY && isGeneral(board[c][r])) {
        if (getOwner(board[c][r]) === myColor) {
          myGC = c;
          myGR = r;
        } else {
          opGC = c;
          opGR = r;
        }
      }
    }
    for (let r = 7; r <= 9; r++) {
      if (board[c][r] !== EMPTY && isGeneral(board[c][r])) {
        if (getOwner(board[c][r]) === myColor) {
          myGC = c;
          myGR = r;
        } else {
          opGC = c;
          opGR = r;
        }
      }
    }
  }
  if (myGC === -1 || opGC === -1 || myGC !== opGC) return false;
  const minR = Math.min(myGR, opGR);
  const maxR = Math.max(myGR, opGR);
  for (let r = minR + 1; r < maxR; r++) {
    if (board[myGC][r] !== EMPTY) return false;
  }
  return true;
}

function getLineMoves(board, c, r, color) {
  const moves = [];
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (let d = 0; d < dirs.length; d++) {
    for (let i = 1; i < 10; i++) {
      const nc = c + dirs[d][0] * i;
      const nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (board[nc][nr] === EMPTY) {
        moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
      } else {
        if (getOwner(board[nc][nr]) !== color) {
          moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
        }
        break;
      }
    }
  }
  return moves;
}

function getChariotMoves(board, c, r, color) {
  return getLineMoves(board, c, r, color);
}

function getCannonMoves(board, c, r, color) {
  const moves = [];
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (let d = 0; d < dirs.length; d++) {
    let jumped = false;
    for (let i = 1; i < 10; i++) {
      const nc = c + dirs[d][0] * i;
      const nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (!jumped) {
        if (board[nc][nr] === EMPTY) {
          moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
        } else {
          jumped = true;
        }
      } else if (board[nc][nr] !== EMPTY) {
        if (getOwner(board[nc][nr]) !== color) {
          moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
        }
        break;
      }
    }
  }
  return moves;
}

function getHorseMoves(board, c, r, color) {
  const moves = [];
  const jumps = [
    { bx: 0, by: -1, dx: -1, dy: -2 },
    { bx: 0, by: -1, dx: 1, dy: -2 },
    { bx: 0, by: 1, dx: -1, dy: 2 },
    { bx: 0, by: 1, dx: 1, dy: 2 },
    { bx: -1, by: 0, dx: -2, dy: -1 },
    { bx: -1, by: 0, dx: -2, dy: 1 },
    { bx: 1, by: 0, dx: 2, dy: -1 },
    { bx: 1, by: 0, dx: 2, dy: 1 },
  ];
  for (const j of jumps) {
    const bc = c + j.bx,
      br = r + j.by;
    const nc = c + j.dx,
      nr = r + j.dy;
    if (!inBounds(nc, nr)) continue;
    if (!inBounds(bc, br) || board[bc][br] !== EMPTY) continue;
    if (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  return moves;
}

function getElephantMoves(board, c, r, color) {
  const moves = [];
  const jumps = [
    { bx: -1, by: -1, dx: -2, dy: -2 },
    { bx: 1, by: -1, dx: 2, dy: -2 },
    { bx: -1, by: 1, dx: -2, dy: 2 },
    { bx: 1, by: 1, dx: 2, dy: 2 },
  ];
  const minR = color === RED ? 5 : 0;
  const maxR = color === RED ? 9 : 4;
  for (const j of jumps) {
    const nc = c + j.dx,
      nr = r + j.dy;
    if (!inBounds(nc, nr) || nr < minR || nr > maxR) continue;
    const bc = c + j.bx,
      br = r + j.by;
    if (board[bc][br] !== EMPTY) continue;
    if (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  return moves;
}

function getAdvisorMoves(board, c, r, color) {
  const moves = [];
  const dirs = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  const minR = color === RED ? 7 : 0;
  const maxR = color === RED ? 9 : 2;
  for (const d of dirs) {
    const nc = c + d[0],
      nr = r + d[1];
    if (nc < 3 || nc > 5 || nr < minR || nr > maxR) continue;
    if (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  return moves;
}

function getGeneralMoves(board, c, r, color) {
  const moves = [];
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const minR = color === RED ? 7 : 0;
  const maxR = color === RED ? 9 : 2;
  for (const d of dirs) {
    const nc = c + d[0],
      nr = r + d[1];
    if (nc < 3 || nc > 5 || nr < minR || nr > maxR) continue;
    if (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  return moves;
}

function getPawnMoves(board, c, r, color) {
  const moves = [];
  if (color === RED) {
    if (r - 1 >= 0 && (board[c][r - 1] === EMPTY || getOwner(board[c][r - 1]) !== color))
      moves.push({ fromC: c, fromR: r, toC: c, toR: r - 1 });
    if (r <= 4) {
      if (c - 1 >= 0 && (board[c - 1][r] === EMPTY || getOwner(board[c - 1][r]) !== color))
        moves.push({ fromC: c, fromR: r, toC: c - 1, toR: r });
      if (c + 1 < COLS && (board[c + 1][r] === EMPTY || getOwner(board[c + 1][r]) !== color))
        moves.push({ fromC: c, fromR: r, toC: c + 1, toR: r });
    }
  } else {
    if (r + 1 < ROWS && (board[c][r + 1] === EMPTY || getOwner(board[c][r + 1]) !== color))
      moves.push({ fromC: c, fromR: r, toC: c, toR: r + 1 });
    if (r >= 5) {
      if (c - 1 >= 0 && (board[c - 1][r] === EMPTY || getOwner(board[c - 1][r]) !== color))
        moves.push({ fromC: c, fromR: r, toC: c - 1, toR: r });
      if (c + 1 < COLS && (board[c + 1][r] === EMPTY || getOwner(board[c + 1][r]) !== color))
        moves.push({ fromC: c, fromR: r, toC: c + 1, toR: r });
    }
  }
  return moves;
}

function getAllMoves(board, color) {
  const moves = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[c][r] !== EMPTY && getOwner(board[c][r]) === color) {
        const pieceMoves = getValidMoves(board, c, r);
        for (const pm of pieceMoves) {
          moves.push(pm);
        }
      }
    }
  }
  return moves;
}

// ============================================================
// Win/loss detection
// ============================================================

// Check if the given color's general is under attack by any opponent piece.
function isInCheck(board, color) {
  // Find the general's position
  let gc = -1,
    gr = -1;
  const genPiece = color === RED ? R_GENERAL : B_GENERAL;
  for (let c = 3; c <= 5; c++) {
    const minR = color === RED ? 7 : 0;
    const maxR = color === RED ? 9 : 2;
    for (let r = minR; r <= maxR; r++) {
      if (board[c][r] === genPiece) {
        gc = c;
        gr = r;
        break;
      }
    }
    if (gc !== -1) break;
  }
  if (gc === -1) return false; // General not found (captured)

  const opponent = getOpponent(color);
  // Check if any opponent piece can attack the general's position
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[c][r] !== EMPTY && getOwner(board[c][r]) === opponent) {
        const piece = board[c][r];
        let moves = [];
        if (isGeneral(piece)) moves = getGeneralMoves(board, c, r, opponent);
        else if (isAdvisor(piece)) moves = getAdvisorMoves(board, c, r, opponent);
        else if (isElephant(piece)) moves = getElephantMoves(board, c, r, opponent);
        else if (isHorse(piece)) moves = getHorseMoves(board, c, r, opponent);
        else if (isChariot(piece)) moves = getChariotMoves(board, c, r, opponent);
        else if (isCannon(piece)) moves = getCannonMoves(board, c, r, opponent);
        else if (isPawn(piece)) moves = getPawnMoves(board, c, r, opponent);

        for (const move of moves) {
          if (move.toC === gc && move.toR === gr) return true;
        }
      }
    }
  }
  return false;
}

function checkGameOver(board, nextPlayer) {
  let redGeneral = false,
    blackGeneral = false;
  for (let c = 3; c <= 5; c++) {
    for (let r = 0; r <= 2; r++) {
      if (board[c][r] === B_GENERAL) blackGeneral = true;
    }
    for (let r = 7; r <= 9; r++) {
      if (board[c][r] === R_GENERAL) redGeneral = true;
    }
  }
  if (!redGeneral) return { winner: BLACK, reason: "capture" };
  if (!blackGeneral) return { winner: RED, reason: "capture" };

  const moves = getAllMoves(board, nextPlayer);
  if (moves.length === 0) return { winner: getOpponent(nextPlayer), reason: "no_moves" };
  return null;
}

// ============================================================
// AI: Alpha-Beta Pruning (Negamax)
// ============================================================

function evaluateBoard(board, aiColor) {
  let aiScore = 0,
    oppScore = 0;

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const piece = board[c][r];
      if (piece === EMPTY) continue;
      let val = PIECE_VALUES[piece];

      // Add positional bonus based on piece type
      if (piece === R_PAWN) val += SOLDIER_POS_RED[c][r];
      else if (piece === B_PAWN) val += SOLDIER_POS_BLACK[c][r];
      else if (piece === R_CHARIOT || piece === B_CHARIOT) val += CHARIOT_POS[c][r];
      else if (piece === R_HORSE || piece === B_HORSE) val += HORSE_POS[c][r];
      else if (piece === R_CANNON || piece === B_CANNON) val += CANNON_POS[c][r];
      else if (piece === R_ADVISOR) val += ADVISOR_POS_RED[c][r];
      else if (piece === B_ADVISOR) val += ADVISOR_POS_BLACK[c][r];
      else if (piece === R_ELEPHANT) val += ELEPHANT_POS_RED[c][r];
      else if (piece === B_ELEPHANT) val += ELEPHANT_POS_BLACK[c][r];

      const owner = getOwner(piece);
      if (owner === aiColor) aiScore += val;
      else oppScore += val;
    }
  }
  return aiScore - oppScore;
}

function create2DArray(cols, rows, defaultVal) {
  const arr = [];
  for (let c = 0; c < cols; c++) {
    const row = [];
    for (let r = 0; r < rows; r++) row.push(defaultVal);
    arr.push(row);
  }
  return arr;
}

// ============================================================
// Move ordering: captures first, then by MVV-LVA
// ============================================================

function orderMoves(board, moves, preferred) {
  // Score each move: captures get high score based on victim value.
  // The "preferred" move (from a previous search iteration / transposition
  // table) is searched first to maximize alpha-beta cutoffs.
  const scored = [];
  for (const move of moves) {
    let score = 0;
    if (
      preferred &&
      move.fromC === preferred.fromC &&
      move.fromR === preferred.fromR &&
      move.toC === preferred.toC &&
      move.toR === preferred.toR
    ) {
      score = 1000000;
    } else {
      const victim = board[move.toC][move.toR];
      if (victim !== EMPTY) {
        // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
        score = PIECE_VALUES[victim] * 10 - PIECE_VALUES[board[move.fromC][move.fromR]];
      }
    }
    scored.push({ move: move, score: score });
  }
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.move);
}

// ============================================================
// Transposition Table (Zobrist hashing)
// ============================================================

// Zobrist keys for hashing positions
const zobristKeys = {};
let zobristSideKey = 0;
let zobristInitDone = false;

function initZobrist() {
  if (zobristInitDone) return;
  // Use a simple pseudo-random generator (seeded for reproducibility)
  let seed = 12345;
  function pseudoRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      zobristKeys[c + "," + r] = {};
      for (let p = 1; p <= 14; p++) {
        zobristKeys[c + "," + r][p] = pseudoRandom();
      }
    }
  }
  // Distinct key mixed in when it is Black's turn, so positions that share the
  // same piece layout but differ in side-to-move never collide.
  zobristSideKey = pseudoRandom();
  zobristInitDone = true;
}

function computeHash(board, sideToMove) {
  let hash = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const piece = board[c][r];
      if (piece !== EMPTY) {
        hash ^= zobristKeys[c + "," + r][piece];
      }
    }
  }
  if (sideToMove === BLACK) hash ^= zobristSideKey;
  return hash;
}

// Transposition table: hash -> { score, depth, flag }
// flag: EXACT, LOWER_BOUND, UPPER_BOUND
const TT_EXACT = 0;
const TT_LOWER = 1;
const TT_UPPER = 2;
const transpositionTable = new Map();
const TT_MAX_SIZE = 100000;

function ttLookup(hash, depth, alpha, beta) {
  const entry = transpositionTable.get(hash);
  if (!entry || entry.depth < depth) return null;
  if (entry.flag === TT_EXACT) return entry.score;
  if (entry.flag === TT_LOWER && entry.score >= beta) return entry.score;
  if (entry.flag === TT_UPPER && entry.score <= alpha) return entry.score;
  return null;
}

function ttStore(hash, depth, score, flag, bestMove) {
  // Replace if deeper or table not full
  const existing = transpositionTable.get(hash);
  if (!existing || existing.depth <= depth) {
    if (transpositionTable.size >= TT_MAX_SIZE) {
      // Clear half the table when full (simple eviction)
      const keys = Array.from(transpositionTable.keys());
      for (let i = 0; i < keys.length / 2; i++) {
        transpositionTable.delete(keys[i]);
      }
    }
    transpositionTable.set(hash, {
      score: score,
      depth: depth,
      flag: flag,
      bestMove: bestMove || null,
    });
  }
}

// Time-management state for iterative deepening. When searchDeadline is set
// (non-zero) and exceeded, the search aborts by throwing TIME_ABORT, which is
// caught at the root so the move from the last completed depth is used.
let searchDeadline = 0;
const TIME_ABORT = { abort: true };

// Cheap terminal check: only verifies whether each general is still on the
// board (scanning the two palaces). Much faster than checkGameOver, which also
// generates all moves. Used on the hot search path.
function generalsPresent(board) {
  let red = false,
    black = false;
  for (let c = 3; c <= 5; c++) {
    for (let r = 0; r <= 2; r++) {
      if (board[c][r] === B_GENERAL) black = true;
    }
    for (let r = 7; r <= 9; r++) {
      if (board[c][r] === R_GENERAL) red = true;
    }
  }
  return { red: red, black: black };
}

// Quiescence search: at the depth horizon, keep exploring only capture moves so
// the evaluation is taken from a "quiet" position rather than in the middle of
// an exchange. Scores are relative to sideToMove (negamax convention).
function quiescence(board, alpha, beta, sideToMove, ply) {
  if (searchDeadline && Date.now() > searchDeadline) throw TIME_ABORT;

  const standPat = evaluateBoard(board, sideToMove);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (ply >= QUIESCENCE_MAX_PLY) return alpha;

  const moves = getAllMoves(board, sideToMove);
  const captures = [];
  for (const m of moves) {
    if (board[m.toC][m.toR] !== EMPTY) captures.push(m);
  }
  if (captures.length === 0) return alpha;

  const ordered = orderMoves(board, captures, null);
  for (const move of ordered) {
    const newBoard = applyMove(board, move);
    const score = -quiescence(newBoard, -beta, -alpha, getOpponent(sideToMove), ply + 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// Negamax with alpha-beta pruning. All returned scores are relative to the
// side to move, which is what the -alphaBeta(...) recursion and the
// transposition table require to stay consistent.
function alphaBeta(board, depth, alpha, beta, aiColor, isAITurn) {
  if (searchDeadline && Date.now() > searchDeadline) throw TIME_ABORT;

  const sideToMove = isAITurn ? aiColor : getOpponent(aiColor);

  // Terminal by capture of a general.
  const g = generalsPresent(board);
  if (!g.red) return sideToMove === RED ? -99999 - depth : 99999 + depth;
  if (!g.black) return sideToMove === BLACK ? -99999 - depth : 99999 + depth;

  if (depth === 0) return quiescence(board, alpha, beta, sideToMove, 0);

  const hash = computeHash(board, sideToMove);
  const ttScore = ttLookup(hash, depth, alpha, beta);
  if (ttScore !== null) return ttScore;
  const ttEntry = transpositionTable.get(hash);

  const moves = getAllMoves(board, sideToMove);
  // No legal moves => side to move is checkmated/stalemated (a loss in Xiangqi).
  if (moves.length === 0) return -99999 - depth;

  const orderedMoves = orderMoves(board, moves, ttEntry ? ttEntry.bestMove : null);
  let bestScore = -Infinity;
  let bestMove = null;
  const origAlpha = alpha;

  for (const move of orderedMoves) {
    const newBoard = applyMove(board, move);
    const score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, aiColor, !isAITurn);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (bestScore > alpha) alpha = bestScore;
    if (alpha >= beta) break;
  }

  let flag;
  if (bestScore <= origAlpha) flag = TT_UPPER;
  else if (bestScore >= beta) flag = TT_LOWER;
  else flag = TT_EXACT;
  ttStore(hash, depth, bestScore, flag, bestMove);
  return bestScore;
}

function getBestAIMove(board, aiColor) {
  // Initialize Zobrist keys on first call
  initZobrist();
  // Clear transposition table for each new move computation
  transpositionTable.clear();

  const rootMoves = getAllMoves(board, aiColor);
  if (rootMoves.length === 0) return null;
  if (rootMoves.length === 1) return rootMoves[0];

  searchDeadline = Date.now() + AI_TIME_BUDGET_MS;
  let bestMove = rootMoves[0];
  let prevBest = null;

  try {
    // Iterative deepening: search depth 1..AI_MAX_DEPTH, reusing the previous
    // iteration's best move for ordering. Stops when the time budget is hit and
    // falls back to the best move from the last fully completed depth.
    for (let depth = Math.max(1, AI_DEPTH - 2); depth <= AI_MAX_DEPTH; depth++) {
      let iterBest = null;
      let iterBestScore = -Infinity;
      let alpha = -Infinity;
      let completed = true;

      const ordered = orderMoves(board, rootMoves, prevBest);
      for (const move of ordered) {
        let score;
        try {
          const newBoard = applyMove(board, move);
          score = -alphaBeta(newBoard, depth - 1, -Infinity, -alpha, aiColor, false);
        } catch (e) {
          if (e === TIME_ABORT) {
            completed = false;
            break;
          }
          throw e;
        }
        if (score > iterBestScore) {
          iterBestScore = score;
          iterBest = move;
        }
        if (score > alpha) alpha = score;
      }

      if (completed && iterBest) {
        bestMove = iterBest;
        prevBest = iterBest;
        // A forced mate has been found; deeper search cannot improve on it.
        if (iterBestScore > 90000) break;
      } else {
        // Ran out of time mid-iteration: keep the last completed depth's result.
        break;
      }

      if (Date.now() > searchDeadline) break;
    }
  } finally {
    searchDeadline = 0;
  }

  return bestMove;
}

// ============================================================
// Game state
// ============================================================

function createGameState(mode) {
  return {
    mode: mode,
    board: createBoard(),
    currentPlayer: RED,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    selectedPiece: null,
    validMoves: [],
    lastMove: null,
    checkStatus: null, // null | "check" | "checkmate"
  };
}

// ============================================================
// Export for testing
// ============================================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COLS: COLS,
    ROWS: ROWS,
    EMPTY: EMPTY,
    R_GENERAL: R_GENERAL,
    R_ADVISOR: R_ADVISOR,
    R_ELEPHANT: R_ELEPHANT,
    R_HORSE: R_HORSE,
    R_CHARIOT: R_CHARIOT,
    R_CANNON: R_CANNON,
    R_PAWN: R_PAWN,
    B_GENERAL: B_GENERAL,
    B_ADVISOR: B_ADVISOR,
    B_ELEPHANT: B_ELEPHANT,
    B_HORSE: B_HORSE,
    B_CHARIOT: B_CHARIOT,
    B_CANNON: B_CANNON,
    B_PAWN: B_PAWN,
    RED: RED,
    BLACK: BLACK,
    AI_DEPTH: AI_DEPTH,
    AI_MAX_DEPTH: AI_MAX_DEPTH,
    AI_TIME_BUDGET_MS: AI_TIME_BUDGET_MS,
    isRed: isRed,
    isBlack: isBlack,
    getOwner: getOwner,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    inBounds: inBounds,
    createBoard: createBoard,
    copyBoard: copyBoard,
    applyMove: applyMove,
    getValidMoves: getValidMoves,
    getAllMoves: getAllMoves,
    isGeneralFacing: isGeneralFacing,
    getGeneralMoves: getGeneralMoves,
    getAdvisorMoves: getAdvisorMoves,
    getElephantMoves: getElephantMoves,
    getHorseMoves: getHorseMoves,
    getChariotMoves: getChariotMoves,
    getCannonMoves: getCannonMoves,
    getPawnMoves: getPawnMoves,
    checkGameOver: checkGameOver,
    isInCheck: isInCheck,
    evaluateBoard: evaluateBoard,
    alphaBeta: alphaBeta,
    getBestAIMove: getBestAIMove,
    createGameState: createGameState,
    orderMoves: orderMoves,
    computeHash: computeHash,
  };
}

// ============================================================
// Browser UI
// ============================================================

if (typeof document !== "undefined") {
  // Initialize sound manager
  SoundManager.init("../../audio");

  let gameState = null;
  let rpsChoices = { player1: null, player2: null, human: null };
  let canvas, context;

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // RED or BLACK
  let remoteTeam = null; // RED or BLACK
  const CELL_SIZE = 57;
  const PADDING = 30;
  const BOARD_W = CELL_SIZE * (COLS - 1) + PADDING * 2;
  const BOARD_H = CELL_SIZE * (ROWS - 1) + PADDING * 2;
  const PIECE_RADIUS = 24;

  function initBoard() {
    canvas = document.getElementById("board-canvas");
    const ratio = window.devicePixelRatio || 1;
    canvas.width = BOARD_W * ratio;
    canvas.height = BOARD_H * ratio;
    canvas.style.width = BOARD_W + "px";
    canvas.style.height = BOARD_H + "px";
    context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    drawBoard();
  }

  function toCanvasX(c) {
    const col = gameState && gameState.boardFlipped ? COLS - 1 - c : c;
    return PADDING + col * CELL_SIZE;
  }
  function toCanvasY(r) {
    const row = gameState && gameState.boardFlipped ? ROWS - 1 - r : r;
    return PADDING + row * CELL_SIZE;
  }

  function drawBoard() {
    // Wood texture background
    const bgGradient = context.createLinearGradient(0, 0, BOARD_W, BOARD_H);
    bgGradient.addColorStop(0, "#d4a76a");
    bgGradient.addColorStop(0.5, "#c89b58");
    bgGradient.addColorStop(1, "#d4a76a");
    context.fillStyle = bgGradient;
    context.fillRect(0, 0, BOARD_W, BOARD_H);

    // Wood grain effect
    context.strokeStyle = "rgba(139, 90, 43, 0.1)";
    context.lineWidth = 1;
    for (let i = 0; i < BOARD_H; i += 4) {
      context.beginPath();
      context.moveTo(0, i);
      context.lineTo(BOARD_W, i + Math.sin(i * 0.05) * 3);
      context.stroke();
    }

    // Grid lines
    context.strokeStyle = "#5a3d1a";
    context.lineWidth = 1.5;

    // Horizontal lines
    for (let r = 0; r < ROWS; r++) {
      context.beginPath();
      context.moveTo(toCanvasX(0), toCanvasY(r));
      context.lineTo(toCanvasX(COLS - 1), toCanvasY(r));
      context.stroke();
    }

    // Vertical lines (with river gap for middle columns)
    for (let c = 0; c < COLS; c++) {
      if (c === 0 || c === COLS - 1) {
        context.beginPath();
        context.moveTo(toCanvasX(c), toCanvasY(0));
        context.lineTo(toCanvasX(c), toCanvasY(ROWS - 1));
        context.stroke();
      } else {
        context.beginPath();
        context.moveTo(toCanvasX(c), toCanvasY(0));
        context.lineTo(toCanvasX(c), toCanvasY(4));
        context.stroke();
        context.beginPath();
        context.moveTo(toCanvasX(c), toCanvasY(5));
        context.lineTo(toCanvasX(c), toCanvasY(ROWS - 1));
        context.stroke();
      }
    }

    // Palace diagonals
    context.beginPath();
    context.moveTo(toCanvasX(3), toCanvasY(0));
    context.lineTo(toCanvasX(5), toCanvasY(2));
    context.stroke();
    context.beginPath();
    context.moveTo(toCanvasX(5), toCanvasY(0));
    context.lineTo(toCanvasX(3), toCanvasY(2));
    context.stroke();
    context.beginPath();
    context.moveTo(toCanvasX(3), toCanvasY(7));
    context.lineTo(toCanvasX(5), toCanvasY(9));
    context.stroke();
    context.beginPath();
    context.moveTo(toCanvasX(5), toCanvasY(7));
    context.lineTo(toCanvasX(3), toCanvasY(9));
    context.stroke();

    // Chu River Han Border
    context.fillStyle = "#5a3d1a";
    context.font = 'bold 32px "KaiTi", "楷体", "STKaiti", serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    const riverY = (toCanvasY(4) + toCanvasY(5)) / 2;
    context.fillText("楚 河", toCanvasX(2), riverY);
    context.fillText("漢 界", toCanvasX(6), riverY);
  }

  function drawPiece(c, r, piece) {
    const cx = toCanvasX(c);
    const cy = toCanvasY(r);
    const color = getOwner(piece);

    // Shadow for 3D effect
    context.fillStyle = "rgba(0, 0, 0, 0.35)";
    context.beginPath();
    context.arc(cx + 2, cy + 3, PIECE_RADIUS, 0, Math.PI * 2);
    context.fill();

    // Piece base - unified light wood color
    const gradient = context.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, PIECE_RADIUS);
    gradient.addColorStop(0, "#f5e6c8");
    gradient.addColorStop(0.7, "#e8d5a8");
    gradient.addColorStop(1, "#d4c090");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2);
    context.fill();

    // Outer ring - dark brown border
    context.strokeStyle = "#5a3d1a";
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2);
    context.stroke();

    // Inner ring - decorative circle
    context.strokeStyle = "#8b6914";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(cx, cy, PIECE_RADIUS - 4, 0, Math.PI * 2);
    context.stroke();

    // Text - red for red side, black for black side
    context.fillStyle = color === RED ? "#c0392b" : "#1a1a1a";
    context.font = 'bold 22px "KaiTi", "楷体", "STKaiti", serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(PIECE_NAMES[piece], cx, cy + 1);
  }

  function drawSelection(c, r) {
    context.strokeStyle = "#ffd600";
    context.lineWidth = 3;
    const x = toCanvasX(c) - PIECE_RADIUS - 2;
    const y = toCanvasY(r) - PIECE_RADIUS - 2;
    const size = (PIECE_RADIUS + 2) * 2;
    context.strokeRect(x, y, size, size);
  }

  function drawValidMoves(moves) {
    for (const m of moves) {
      const cx = toCanvasX(m.toC);
      const cy = toCanvasY(m.toR);
      if (gameState.board[m.toC][m.toR] !== EMPTY) {
        context.strokeStyle = "rgba(229, 57, 53, 0.7)";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(cx, cy, PIECE_RADIUS + 2, 0, Math.PI * 2);
        context.stroke();
      } else {
        context.fillStyle = "rgba(76, 175, 80, 0.6)";
        context.beginPath();
        context.arc(cx, cy, 8, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawLastMove(move) {
    if (!move) return;
    context.strokeStyle = "rgba(255, 152, 0, 0.7)";
    context.lineWidth = 3;
    const size = PIECE_RADIUS + 4;
    context.strokeRect(
      toCanvasX(move.fromC) - size,
      toCanvasY(move.fromR) - size,
      size * 2,
      size * 2
    );
    context.strokeRect(toCanvasX(move.toC) - size, toCanvasY(move.toR) - size, size * 2, size * 2);
  }

  function renderGame(state) {
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);
    drawBoard();

    if (state.lastMove) drawLastMove(state.lastMove);
    if (state.selectedPiece) {
      drawSelection(state.selectedPiece.c, state.selectedPiece.r);
      drawValidMoves(state.validMoves);
    }

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (state.board[c][r] !== EMPTY) {
          drawPiece(c, r, state.board[c][r]);
        }
      }
    }

    // Current acting side - shown as 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP)
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === RED ? BLACK : RED]
        : [RED, BLACK],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === RED ? "text-red" : "text-black-side");
    document.getElementById("turn-count").textContent = state.turnCount;

    const redCount = countPieces(state.board, RED);
    const blackCount = countPieces(state.board, BLACK);
    document.getElementById("score-red").textContent = redCount;
    document.getElementById("score-black").textContent = blackCount;

    if (state.mode === "pve") {
      const redLabel = state.playerTeam === RED ? "玩家（红方）：" : "电脑（红方）：";
      const blackLabel = state.playerTeam === BLACK ? "玩家（黑方）：" : "电脑（黑方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-black").textContent = blackLabel;
    } else if (state.mode === "online") {
      const redLabel = state.localTeam === RED ? "你（红方）：" : "对方（红方）：";
      const blackLabel = state.localTeam === BLACK ? "你（黑方）：" : "对方（黑方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-black").textContent = blackLabel;
    } else {
      document.getElementById("label-red").textContent = "红方：";
      document.getElementById("label-black").textContent = "黑方：";
    }

    if (state.gameOver) {
      if (state.checkStatus === "checkmate") {
        updateMessage("绝杀！", "checkmate");
      } else {
        updateMessage("游戏结束！", "info");
      }
    } else if (state.aiThinking) {
      updateMessage("电脑正在思考...", "info");
    } else if (state.checkStatus === "check") {
      updateMessage(getPlayerName(state.currentPlayer) + "被将军！", "check");
    } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      updateMessage("轮到电脑行动", "info");
    } else {
      updateMessage("轮到 " + label.text + " 行动", "info");
    }
  }

  function countPieces(board, color) {
    let count = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (board[c][r] !== EMPTY && getOwner(board[c][r]) === color) count++;
      }
    }
    return count;
  }

  function updateMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    if (type === "check") {
      el.className = "check";
    } else if (type === "checkmate") {
      el.className = "checkmate";
    } else if (type === "error") {
      el.className = "error";
    } else if (type === "info") {
      el.className = "info";
    } else {
      el.className = "";
    }
  }

  function showGameOver(state) {
    const winnerText = document.getElementById("winner-text");
    if (state.winner) {
      // Play victory/lose sound
      const isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
      SoundManager.play(isPlayerWin ? "victory" : "lose");

      // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of color
      const label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.winner,
        playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === RED ? BLACK : RED]
          : [RED, BLACK],
      });
      winnerText.textContent = label.text + " 获胜！";
      winnerText.className = state.winner === RED ? "text-red" : "text-black-side";
    } else {
      SoundManager.play("draw");
      winnerText.textContent = "平局！";
      winnerText.className = "";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.mode === "online" && gameState.currentPlayer !== localTeam) return;

    const rect = canvas.getBoundingClientRect();
    // rect is in CSS pixels and so are PADDING/CELL_SIZE; do NOT multiply by devicePixelRatio.
    const scaleX = BOARD_W / rect.width;
    const scaleY = BOARD_H / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    let col = Math.round((px - PADDING) / CELL_SIZE);
    let row = Math.round((py - PADDING) / CELL_SIZE);
    if (gameState.boardFlipped) {
      col = COLS - 1 - col;
      row = ROWS - 1 - row;
    }

    if (!inBounds(col, row)) return;

    const piece = gameState.board[col][row];

    if (gameState.selectedPiece) {
      const move = findMove(gameState.validMoves, col, row);
      if (move) {
        doMove(move);
        if (gameState.mode === "online" && networkProtocol) {
          networkProtocol.sendAction({
            a: "move",
            fc: move.fromC,
            fr: move.fromR,
            tc: move.toC,
            tr: move.toR,
          });
        }
        return;
      }
    }

    if (piece !== EMPTY && getOwner(piece) === gameState.currentPlayer) {
      const moves = getValidMoves(gameState.board, col, row);
      if (moves.length > 0) {
        gameState.selectedPiece = { c: col, r: row };
        gameState.validMoves = moves;
        renderGame(gameState);
      } else {
        updateMessage("该棋子没有合法移动", "error");
      }
      return;
    }

    gameState.selectedPiece = null;
    gameState.validMoves = [];
    renderGame(gameState);
  }

  function findMove(moves, toC, toR) {
    for (const move of moves) {
      if (move.toC === toC && move.toR === toR) return move;
    }
    return null;
  }

  function doMove(move) {
    // Play sound based on move type
    const targetPiece = gameState.board[move.toC][move.toR];
    if (targetPiece !== EMPTY) {
      SoundManager.play("take");
    } else {
      SoundManager.play("slide");
    }

    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;
    endTurn();
  }

  function endTurn() {
    const nextPlayer = getOpponent(gameState.currentPlayer);
    const inCheck = isInCheck(gameState.board, nextPlayer);
    const gameOverResult = checkGameOver(gameState.board, nextPlayer);
    if (gameOverResult) {
      gameState.gameOver = true;
      gameState.winner = gameOverResult.winner;
      // Distinguish checkmate from other game over reasons
      gameState.checkStatus = gameOverResult.reason === "no_moves" && inCheck ? "checkmate" : null;
      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }

    gameState.currentPlayer = nextPlayer;
    gameState.checkStatus = inCheck ? "check" : null;
    renderGame(gameState);

    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      // Delay AI to let check message display briefly
      const aiDelay = inCheck ? 1000 : 300;
      setTimeout(() => {
        triggerAI();
      }, aiDelay);
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(() => {
      const move = getBestAIMove(gameState.board, gameState.aiTeam);
      gameState.aiThinking = false;
      if (move) {
        // Play sound based on move type
        const targetPiece = gameState.board[move.toC][move.toR];
        if (targetPiece !== EMPTY) {
          SoundManager.play("take");
        } else {
          SoundManager.play("slide");
        }
        gameState.board = applyMove(gameState.board, move);
        gameState.lastMove = move;
        gameState.turnCount++;
      }
      endTurn();
    }, 300);
  }

  function startGame(mode, playerTeam) {
    gameState = createGameState(mode);
    // In Chinese Chess, RED always moves first
    gameState.currentPlayer = RED;
    gameState.firstPlayer = RED;
    gameState.boardFlipped = false;

    if (mode === "pve") {
      gameState.playerTeam = playerTeam || RED;
      gameState.aiTeam = playerTeam === RED ? BLACK : RED;
      gameState.boardFlipped = gameState.playerTeam === BLACK;
    }

    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = mode === "pve" ? "block" : "none";
    document.getElementById("game-over").style.display = "none";

    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;

    if (mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
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
    rpsChoices = {
      player1: null,
      player2: null,
      human: null,
      online: null,
      remote: null,
    };
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

    resultEl.textContent =
      "你选择了" +
      getRPSName(myChoice) +
      "，对方选择了" +
      getRPSName(theirChoice) +
      (iWin ? "，你赢了！你先手(红方)。" : "，你输了！对方先手(红方)。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");

    const hostPiece = RED;
    const guestPiece = BLACK;

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

    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = "none";
    document.getElementById("game-over").style.display = "none";

    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;
  }

  function applyRemoteAction(actionData) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.currentPlayer !== remoteTeam) return;
    const move = {
      fromC: actionData.fc,
      fromR: actionData.fr,
      toC: actionData.tc,
      toR: actionData.tr,
    };
    doMove(move);
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      updateMessage("对方已断开连接", "error");
      const winnerText = document.getElementById("winner-text");
      winnerText.textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

  function handleRPSChoice(player, choice, ev) {
    SoundManager.play("click");
    if (player === "human") {
      rpsChoices.human = choice;
      document.querySelectorAll("#rps-player-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      ev.target.classList.add("selected");

      const choices = ["rock", "scissors", "paper"];
      const aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      const resultEl = document.getElementById("rps-result");
      const humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        SoundManager.play("victory");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你赢了！你先手(红方)。";
        setTimeout(() => {
          startGame("pve", RED);
        }, 1500);
      } else if (humanWins === -1) {
        SoundManager.play("lose");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你输了！电脑先手(红方)。";
        setTimeout(() => {
          startGame("pve", BLACK);
        }, 1500);
      } else {
        SoundManager.play("draw");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
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
      event.target.classList.add("selected");

      const statusEl = document.getElementById("rps-p" + player + "-status");
      statusEl.textContent = "已选择：" + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        const resultEl = document.getElementById("rps-result");
        const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          SoundManager.play("victory");
          resultEl.textContent = "玩家1赢了！玩家1先手(红方)。";
          setTimeout(() => {
            startGame("pvp", RED);
          }, 1500);
        } else if (winner === -1) {
          SoundManager.play("victory");
          resultEl.textContent = "玩家2赢了！玩家2先手(红方)。";
          setTimeout(() => {
            startGame("pvp", BLACK);
          }, 1500);
        } else {
          SoundManager.play("draw");
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

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-pvp").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
      document.getElementById("rps-pvp").style.display = "block";
      document.getElementById("rps-pve").style.display = "none";
      rpsChoices = { player1: null, player2: null, human: null };
    });

    document.getElementById("btn-pve").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
      document.getElementById("rps-pvp").style.display = "none";
      document.getElementById("rps-pve").style.display = "block";
      rpsChoices = { player1: null, player2: null, human: null };
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

    document.querySelectorAll(".btn-rps").forEach((button) => {
      button.addEventListener("click", (ev) => {
        const player = ev.target.dataset.player;
        const choice = ev.target.dataset.choice;
        handleRPSChoice(player, choice, ev);
      });
    });

    document.getElementById("btn-restart").addEventListener("click", restartGame);

    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
  });
}
