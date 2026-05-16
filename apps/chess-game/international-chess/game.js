// ============================================================
// International Chess - Game Core Logic
// ============================================================

if (typeof judgeRPS === 'undefined' && typeof require !== 'undefined') {
  var _gameUtils = require('../../common/game-utils.js');
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var BOARD_SIZE = 8;
var EMPTY = 0;
var W_PAWN = 1, W_KNIGHT = 2, W_BISHOP = 3, W_ROOK = 4, W_QUEEN = 5, W_KING = 6;
var B_PAWN = 7, B_KNIGHT = 8, B_BISHOP = 9, B_ROOK = 10, B_QUEEN = 11, B_KING = 12;

var WHITE = 'white';
var BLACK = 'black';

var AI_DEPTH = 3;

// Unicode piece symbols
var PIECE_SYMBOLS = {};
PIECE_SYMBOLS[W_PAWN] = '♙'; PIECE_SYMBOLS[W_KNIGHT] = '♘'; PIECE_SYMBOLS[W_BISHOP] = '♗';
PIECE_SYMBOLS[W_ROOK] = '♖'; PIECE_SYMBOLS[W_QUEEN] = '♕'; PIECE_SYMBOLS[W_KING] = '♔';
PIECE_SYMBOLS[B_PAWN] = '♟'; PIECE_SYMBOLS[B_KNIGHT] = '♞'; PIECE_SYMBOLS[B_BISHOP] = '♝';
PIECE_SYMBOLS[B_ROOK] = '♜'; PIECE_SYMBOLS[B_QUEEN] = '♛'; PIECE_SYMBOLS[B_KING] = '♚';

var PIECE_NAMES = {};
PIECE_NAMES[W_PAWN] = '兵'; PIECE_NAMES[W_KNIGHT] = '马'; PIECE_NAMES[W_BISHOP] = '象';
PIECE_NAMES[W_ROOK] = '车'; PIECE_NAMES[W_QUEEN] = '后'; PIECE_NAMES[W_KING] = '王';
PIECE_NAMES[B_PAWN] = '兵'; PIECE_NAMES[B_KNIGHT] = '马'; PIECE_NAMES[B_BISHOP] = '象';
PIECE_NAMES[B_ROOK] = '车'; PIECE_NAMES[B_QUEEN] = '后'; PIECE_NAMES[B_KING] = '王';

var PIECE_VALUES = {};
PIECE_VALUES[W_PAWN] = 100; PIECE_VALUES[W_KNIGHT] = 320; PIECE_VALUES[W_BISHOP] = 330;
PIECE_VALUES[W_ROOK] = 500; PIECE_VALUES[W_QUEEN] = 900; PIECE_VALUES[W_KING] = 20000;
PIECE_VALUES[B_PAWN] = 100; PIECE_VALUES[B_KNIGHT] = 320; PIECE_VALUES[B_BISHOP] = 330;
PIECE_VALUES[B_ROOK] = 500; PIECE_VALUES[B_QUEEN] = 900; PIECE_VALUES[B_KING] = 20000;

// Pawn position bonus values
var PAWN_POS_WHITE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0]
];

var PAWN_POS_BLACK = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [0, 0, 0, 0, 0, 0, 0, 0]
];

var KNIGHT_POS = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50]
];

var BISHOP_POS = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20]
];

// ============================================================
// Piece identification
// ============================================================

function isWhite(piece) { return piece >= W_PAWN && piece <= W_KING; }
function isBlack(piece) { return piece >= B_PAWN && piece <= B_KING; }
function getOwner(piece) {
  if (isWhite(piece)) return WHITE;
  if (isBlack(piece)) return BLACK;
  return null;
}
function getOpponent(color) { return color === WHITE ? BLACK : WHITE; }
function getPlayerName(color) { return color === WHITE ? '白方' : '黑方'; }
function inBounds(c, r) { return c >= 0 && c < BOARD_SIZE && r >= 0 && r < BOARD_SIZE; }
function isPawn(piece) { return piece === W_PAWN || piece === B_PAWN; }
function isKnight(piece) { return piece === W_KNIGHT || piece === B_KNIGHT; }
function isBishop(piece) { return piece === W_BISHOP || piece === B_BISHOP; }
function isRook(piece) { return piece === W_ROOK || piece === B_ROOK; }
function isQueen(piece) { return piece === W_QUEEN || piece === B_QUEEN; }
function isKing(piece) { return piece === W_KING || piece === B_KING; }

// ============================================================
// Initial board
// ============================================================

function createBoard() {
  var board = [];
  for (var c = 0; c < BOARD_SIZE; c++) {
    var col = [];
    for (var r = 0; r < BOARD_SIZE; r++) col.push(EMPTY);
    board.push(col);
  }
  // Black (top, row 0-1)
  board[0][0] = B_ROOK; board[1][0] = B_KNIGHT; board[2][0] = B_BISHOP; board[3][0] = B_QUEEN;
  board[4][0] = B_KING; board[5][0] = B_BISHOP; board[6][0] = B_KNIGHT; board[7][0] = B_ROOK;
  for (var c = 0; c < 8; c++) board[c][1] = B_PAWN;
  // White (bottom, row 6-7)
  board[0][7] = W_ROOK; board[1][7] = W_KNIGHT; board[2][7] = W_BISHOP; board[3][7] = W_QUEEN;
  board[4][7] = W_KING; board[5][7] = W_BISHOP; board[6][7] = W_KNIGHT; board[7][7] = W_ROOK;
  for (var c = 0; c < 8; c++) board[c][6] = W_PAWN;
  return board;
}

// ============================================================
// Board operations
// ============================================================

function copyBoard(board) {
  var newBoard = [];
  for (var c = 0; c < BOARD_SIZE; c++) newBoard.push(board[c].slice());
  return newBoard;
}

function applyMove(board, move) {
  var newBoard = copyBoard(board);
  var piece = newBoard[move.fromC][move.fromR];
  newBoard[move.fromC][move.fromR] = EMPTY;
  // Promotion
  if (move.promotion) {
    newBoard[move.toC][move.toR] = move.promotion;
  } else {
    newBoard[move.toC][move.toR] = piece;
  }
  // Castling: move rook
  if (move.castling) {
    if (move.toC === 6) { // King-side castling
      newBoard[5][move.toR] = newBoard[7][move.toR];
      newBoard[7][move.toR] = EMPTY;
    } else { // Queen-side castling
      newBoard[3][move.toR] = newBoard[0][move.toR];
      newBoard[0][move.toR] = EMPTY;
    }
  }
  return newBoard;
}

// ============================================================
// Move generation
// ============================================================

function getValidMoves(board, c, r, hasMoved) {
  var piece = board[c][r];
  if (piece === EMPTY) return [];
  var color = getOwner(piece);
  var moves = [];

  if (isPawn(piece)) moves = getPawnMoves(board, c, r, color, hasMoved);
  else if (isKnight(piece)) moves = getKnightMoves(board, c, r, color);
  else if (isBishop(piece)) moves = getBishopMoves(board, c, r, color);
  else if (isRook(piece)) moves = getRookMoves(board, c, r, color);
  else if (isQueen(piece)) moves = getQueenMoves(board, c, r, color);
  else if (isKing(piece)) moves = getKingMoves(board, c, r, color, hasMoved);

  // Filter moves that leave own king in check
  var validMoves = [];
  for (var i = 0; i < moves.length; i++) {
    var newBoard = applyMove(board, moves[i]);
    if (!isInCheck(newBoard, color)) {
      validMoves.push(moves[i]);
    }
  }
  return validMoves;
}

function isInCheck(board, color) {
  // Find own king
  var kingC = -1, kingR = -1;
  var kingPiece = color === WHITE ? W_KING : B_KING;
  for (var c = 0; c < BOARD_SIZE; c++) {
    for (var r = 0; r < BOARD_SIZE; r++) {
      if (board[c][r] === kingPiece) { kingC = c; kingR = r; break; }
    }
    if (kingC !== -1) break;
  }
  if (kingC === -1) return true; // King was captured
  return isSquareAttacked(board, kingC, kingR, getOpponent(color));
}

function isSquareAttacked(board, tc, tr, byColor) {
  for (var c = 0; c < BOARD_SIZE; c++) {
    for (var r = 0; r < BOARD_SIZE; r++) {
      var piece = board[c][r];
      if (piece === EMPTY || getOwner(piece) !== byColor) continue;
      var attacks = getRawAttacks(board, c, r, piece);
      for (var i = 0; i < attacks.length; i++) {
        if (attacks[i].toC === tc && attacks[i].toR === tr) return true;
      }
    }
  }
  return false;
}

function getRawAttacks(board, c, r, piece) {
  if (isPawn(piece)) {
    var dir = isWhite(piece) ? -1 : 1;
    var attacks = [];
    if (inBounds(c - 1, r + dir)) attacks.push({ toC: c - 1, toR: r + dir });
    if (inBounds(c + 1, r + dir)) attacks.push({ toC: c + 1, toR: r + dir });
    return attacks;
  }
  if (isKnight(piece)) return getKnightAttacks(board, c, r, getOwner(piece));
  if (isBishop(piece)) return getDiagonalAttacks(board, c, r, getOwner(piece));
  if (isRook(piece)) return getOrthogonalAttacks(board, c, r, getOwner(piece));
  if (isQueen(piece)) return getDiagonalAttacks(board, c, r, getOwner(piece)).concat(getOrthogonalAttacks(board, c, r, getOwner(piece)));
  if (isKing(piece)) return getKingAttacks(board, c, r, getOwner(piece));
  return [];
}

function getDiagonalAttacks(board, c, r, color) {
  var moves = [];
  var dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (var d = 0; d < dirs.length; d++) {
    for (var i = 1; i < 8; i++) {
      var nc = c + dirs[d][0] * i, nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (board[nc][nr] === EMPTY) { moves.push({ toC: nc, toR: nr }); }
      else { moves.push({ toC: nc, toR: nr }); break; }
    }
  }
  return moves;
}

function getOrthogonalAttacks(board, c, r, color) {
  var moves = [];
  var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (var d = 0; d < dirs.length; d++) {
    for (var i = 1; i < 8; i++) {
      var nc = c + dirs[d][0] * i, nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (board[nc][nr] === EMPTY) { moves.push({ toC: nc, toR: nr }); }
      else { moves.push({ toC: nc, toR: nr }); break; }
    }
  }
  return moves;
}

function getKnightAttacks(board, c, r, color) {
  var moves = [];
  var jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (var i = 0; i < jumps.length; i++) {
    var nc = c + jumps[i][0], nr = r + jumps[i][1];
    if (inBounds(nc, nr)) moves.push({ toC: nc, toR: nr });
  }
  return moves;
}

function getKingAttacks(board, c, r, color) {
  var moves = [];
  var dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (var i = 0; i < dirs.length; i++) {
    var nc = c + dirs[i][0], nr = r + dirs[i][1];
    if (inBounds(nc, nr)) moves.push({ toC: nc, toR: nr });
  }
  return moves;
}

function getLineMoves(board, c, r, color) {
  var moves = [];
  var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (var d = 0; d < dirs.length; d++) {
    for (var i = 1; i < 8; i++) {
      var nc = c + dirs[d][0] * i, nr = r + dirs[d][1] * i;
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

function getDiagonalMoves(board, c, r, color) {
  var moves = [];
  var dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (var d = 0; d < dirs.length; d++) {
    for (var i = 1; i < 8; i++) {
      var nc = c + dirs[d][0] * i, nr = r + dirs[d][1] * i;
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

function getRookMoves(board, c, r, color) { return getLineMoves(board, c, r, color); }
function getBishopMoves(board, c, r, color) { return getDiagonalMoves(board, c, r, color); }
function getQueenMoves(board, c, r, color) {
  return getLineMoves(board, c, r, color).concat(getDiagonalMoves(board, c, r, color));
}

function getKnightMoves(board, c, r, color) {
  var moves = [];
  var jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (var i = 0; i < jumps.length; i++) {
    var nc = c + jumps[i][0], nr = r + jumps[i][1];
    if (inBounds(nc, nr) && (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color)) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  return moves;
}

function getKingMoves(board, c, r, color, hasMoved) {
  var moves = [];
  var dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (var i = 0; i < dirs.length; i++) {
    var nc = c + dirs[i][0], nr = r + dirs[i][1];
    if (inBounds(nc, nr) && (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color)) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  // Castling
  if (hasMoved && !hasMoved.has(c + ',' + r)) {
    var row = r;
    // King-side castling (king-side)
    var kRookMoved = hasMoved && hasMoved.has('7,' + row);
    var kPathClear = board[5][row] === EMPTY && board[6][row] === EMPTY;
    if (!kRookMoved && kPathClear && board[7][row] !== EMPTY && isRook(board[7][row]) && getOwner(board[7][row]) === color) {
      if (!isSquareAttacked(board, 4, row, getOpponent(color)) &&
          !isSquareAttacked(board, 5, row, getOpponent(color)) &&
          !isSquareAttacked(board, 6, row, getOpponent(color))) {
        moves.push({ fromC: c, fromR: r, toC: 6, toR: row, castling: true });
      }
    }
    // Queen-side castling (queen-side)
    var qRookMoved = hasMoved && hasMoved.has('0,' + row);
    var qPathClear = board[1][row] === EMPTY && board[2][row] === EMPTY && board[3][row] === EMPTY;
    if (!qRookMoved && qPathClear && board[0][row] !== EMPTY && isRook(board[0][row]) && getOwner(board[0][row]) === color) {
      if (!isSquareAttacked(board, 4, row, getOpponent(color)) &&
          !isSquareAttacked(board, 3, row, getOpponent(color)) &&
          !isSquareAttacked(board, 2, row, getOpponent(color))) {
        moves.push({ fromC: c, fromR: r, toC: 2, toR: row, castling: true });
      }
    }
  }
  return moves;
}

function getPawnMoves(board, c, r, color, hasMoved) {
  var moves = [];
  var dir = color === WHITE ? -1 : 1;
  var startRow = color === WHITE ? 6 : 1;
  var promoRow = color === WHITE ? 0 : 7;

  // Move forward one step
  if (inBounds(c, r + dir) && board[c][r + dir] === EMPTY) {
    if (r + dir === promoRow) {
      var promos = color === WHITE ? [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT] : [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT];
      for (var p = 0; p < promos.length; p++) {
        moves.push({ fromC: c, fromR: r, toC: c, toR: r + dir, promotion: promos[p] });
      }
    } else {
      moves.push({ fromC: c, fromR: r, toC: c, toR: r + dir });
    }
    // Move forward two steps (starting position)
    if (r === startRow && board[c][r + dir * 2] === EMPTY) {
      moves.push({ fromC: c, fromR: r, toC: c, toR: r + dir * 2 });
    }
  }
  // Capture (diagonal forward)
  var diagDirs = [-1, 1];
  for (var d = 0; d < diagDirs.length; d++) {
    var nc = c + diagDirs[d], nr = r + dir;
    if (inBounds(nc, nr) && board[nc][nr] !== EMPTY && getOwner(board[nc][nr]) !== color) {
      if (nr === promoRow) {
        var promos = color === WHITE ? [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT] : [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT];
        for (var p = 0; p < promos.length; p++) {
          moves.push({ fromC: c, fromR: r, toC: nc, toR: nr, promotion: promos[p] });
        }
      } else {
        moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
      }
    }
  }
  return moves;
}

function getAllMoves(board, color, hasMoved) {
  var moves = [];
  for (var c = 0; c < BOARD_SIZE; c++) {
    for (var r = 0; r < BOARD_SIZE; r++) {
      if (board[c][r] !== EMPTY && getOwner(board[c][r]) === color) {
        var pieceMoves = getValidMoves(board, c, r, hasMoved);
        for (var i = 0; i < pieceMoves.length; i++) moves.push(pieceMoves[i]);
      }
    }
  }
  return moves;
}

// ============================================================
// Win/loss detection
// ============================================================

function checkGameOver(board, nextPlayer, hasMoved) {
  var moves = getAllMoves(board, nextPlayer, hasMoved);
  if (moves.length === 0) {
    if (isInCheck(board, nextPlayer)) return { winner: getOpponent(nextPlayer), reason: 'checkmate' };
    return { winner: null, reason: 'stalemate' };
  }
  // Check if king is captured (simplified check)
  var whiteKing = false, blackKing = false;
  for (var c = 0; c < BOARD_SIZE; c++) {
    for (var r = 0; r < BOARD_SIZE; r++) {
      if (board[c][r] === W_KING) whiteKing = true;
      if (board[c][r] === B_KING) blackKing = true;
    }
  }
  if (!whiteKing) return { winner: BLACK, reason: 'capture' };
  if (!blackKing) return { winner: WHITE, reason: 'capture' };
  return null;
}

// ============================================================
// AI: Alpha-Beta Pruning
// ============================================================

function getPositionValue(piece, c, r) {
  if (piece === W_PAWN) return PAWN_POS_WHITE[c][r];
  if (piece === B_PAWN) return PAWN_POS_BLACK[c][r];
  if (piece === W_KNIGHT || piece === B_KNIGHT) return KNIGHT_POS[c][r];
  if (piece === W_BISHOP || piece === B_BISHOP) return BISHOP_POS[c][r];
  return 0;
}

function evaluateBoard(board, aiColor) {
  var aiScore = 0, oppScore = 0;
  var oppColor = getOpponent(aiColor);
  for (var c = 0; c < BOARD_SIZE; c++) {
    for (var r = 0; r < BOARD_SIZE; r++) {
      var piece = board[c][r];
      if (piece === EMPTY) continue;
      var val = PIECE_VALUES[piece] + getPositionValue(piece, c, r);
      if (getOwner(piece) === aiColor) aiScore += val;
      else oppScore += val;
    }
  }
  return aiScore - oppScore;
}

function alphaBeta(board, depth, alpha, beta, aiColor, isAITurn, hasMoved) {
  var currentPlayer = isAITurn ? aiColor : getOpponent(aiColor);
  var gameOver = checkGameOver(board, currentPlayer, hasMoved);
  if (gameOver) {
    if (gameOver.winner === aiColor) return 99999 + depth;
    if (gameOver.winner === null) return 0; // Draw
    return -99999 - depth;
  }
  if (depth === 0) return evaluateBoard(board, aiColor);

  var moves = getAllMoves(board, currentPlayer, hasMoved);
  var bestScore = -Infinity;

  for (var i = 0; i < moves.length; i++) {
    var newBoard = applyMove(board, moves[i]);
    var score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, aiColor, !isAITurn, hasMoved);
    if (score > bestScore) bestScore = score;
    if (bestScore > alpha) alpha = bestScore;
    if (alpha >= beta) break;
  }
  return bestScore;
}

function getBestAIMove(board, aiColor, hasMoved) {
  var moves = getAllMoves(board, aiColor, hasMoved);
  if (moves.length === 0) return null;

  var bestMove = null;
  var bestScore = -Infinity;

  // Prioritize captures and promotions
  moves.sort(function(a, b) {
    var scoreA = a.promotion ? 800 : (board[a.toC][a.toR] !== EMPTY ? PIECE_VALUES[board[a.toC][a.toR]] : 0);
    var scoreB = b.promotion ? 800 : (board[b.toC][b.toR] !== EMPTY ? PIECE_VALUES[board[b.toC][b.toR]] : 0);
    return scoreB - scoreA;
  });

  for (var i = 0; i < moves.length; i++) {
    var newBoard = applyMove(board, moves[i]);
    var score = -alphaBeta(newBoard, AI_DEPTH - 1, -Infinity, Infinity, aiColor, false, hasMoved);
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[i];
    }
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
    currentPlayer: WHITE,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    selectedPiece: null,
    validMoves: [],
    lastMove: null,
    hasMoved: new Set(),
    promotionPending: null
  };
}

// ============================================================
// Export for testing
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE, EMPTY: EMPTY,
    W_PAWN: W_PAWN, W_KNIGHT: W_KNIGHT, W_BISHOP: W_BISHOP, W_ROOK: W_ROOK, W_QUEEN: W_QUEEN, W_KING: W_KING,
    B_PAWN: B_PAWN, B_KNIGHT: B_KNIGHT, B_BISHOP: B_BISHOP, B_ROOK: B_ROOK, B_QUEEN: B_QUEEN, B_KING: B_KING,
    WHITE: WHITE, BLACK: BLACK, AI_DEPTH: AI_DEPTH,
    isWhite: isWhite, isBlack: isBlack, getOwner: getOwner, getOpponent: getOpponent,
    getPlayerName: getPlayerName, inBounds: inBounds,
    createBoard: createBoard, copyBoard: copyBoard, applyMove: applyMove,
    getValidMoves: getValidMoves, getAllMoves: getAllMoves,
    isInCheck: isInCheck, isSquareAttacked: isSquareAttacked,
    getPawnMoves: getPawnMoves, getKnightMoves: getKnightMoves,
    getBishopMoves: getBishopMoves, getRookMoves: getRookMoves,
    getQueenMoves: getQueenMoves, getKingMoves: getKingMoves,
    checkGameOver: checkGameOver, evaluateBoard: evaluateBoard,
    alphaBeta: alphaBeta, getBestAIMove: getBestAIMove,
    createGameState: createGameState
  };
}

// ============================================================
// Browser UI
// ============================================================

if (typeof document !== 'undefined') {
  var gameState = null;
  var rpsChoices = { player1: null, player2: null, human: null };
  var canvas, context;
  var CELL_SIZE = 64;
  var PADDING = 24;
  var BOARD_PX = CELL_SIZE * BOARD_SIZE;
  var CANVAS_SIZE = BOARD_PX + PADDING * 2;

  function initBoard() {
    canvas = document.getElementById('board-canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    if (window.devicePixelRatio > 1) {
      canvas.width = CANVAS_SIZE * window.devicePixelRatio;
      canvas.height = CANVAS_SIZE * window.devicePixelRatio;
      canvas.style.width = CANVAS_SIZE + 'px';
      canvas.style.height = CANVAS_SIZE + 'px';
    }
    context = canvas.getContext('2d');
    var ratio = window.devicePixelRatio || 1;
    context.scale(ratio, ratio);
    drawBoard();
  }

  function toCanvasX(c) {
    var col = (gameState && gameState.boardFlipped) ? (7 - c) : c;
    return PADDING + col * CELL_SIZE;
  }
  function toCanvasY(r) {
    var row = (gameState && gameState.boardFlipped) ? (7 - r) : r;
    return PADDING + row * CELL_SIZE;
  }

  function drawBoard() {
    var lightColor = '#f0d9b5';
    var darkColor = '#b58863';
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        context.fillStyle = (c + r) % 2 === 0 ? lightColor : darkColor;
        context.fillRect(toCanvasX(c), toCanvasY(r), CELL_SIZE, CELL_SIZE);
      }
    }
    // Coordinate labels
    context.fillStyle = '#666';
    context.font = '11px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    var files = 'abcdefgh';
    var flipped = gameState && gameState.boardFlipped;
    for (var c = 0; c < BOARD_SIZE; c++) {
      var fileIdx = flipped ? (7 - c) : c;
      context.fillText(files[fileIdx], PADDING + c * CELL_SIZE + CELL_SIZE / 2, CANVAS_SIZE - 8);
    }
    for (var r = 0; r < BOARD_SIZE; r++) {
      var rankNum = flipped ? (r + 1) : (8 - r);
      context.fillText(String(rankNum), 10, PADDING + r * CELL_SIZE + CELL_SIZE / 2);
    }
  }

  function drawPiece(c, r, piece) {
    var cx = toCanvasX(c) + CELL_SIZE / 2;
    var cy = toCanvasY(r) + CELL_SIZE / 2;
    var color = getOwner(piece);
    var radius = CELL_SIZE * 0.4;

    // Shadow
    context.fillStyle = 'rgba(0,0,0,0.2)';
    context.beginPath();
    context.arc(cx + 1, cy + 1, radius, 0, Math.PI * 2);
    context.fill();

    // Piece base color
    var gradient = context.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, radius);
    if (color === WHITE) {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#d4d4d4');
    } else {
      gradient.addColorStop(0, '#5a5a5a');
      gradient.addColorStop(1, '#1a1a1a');
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    // Border
    context.strokeStyle = color === WHITE ? '#888' : '#000';
    context.lineWidth = 1.5;
    context.stroke();

    // Unicode symbol
    context.fillStyle = color === WHITE ? '#000' : '#fff';
    context.font = 'bold ' + Math.floor(CELL_SIZE * 0.55) + 'px serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(PIECE_SYMBOLS[piece], cx, cy + 2);
  }

  function drawSelection(c, r) {
    context.strokeStyle = '#ffd600';
    context.lineWidth = 3;
    context.strokeRect(toCanvasX(c) + 1.5, toCanvasY(r) + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
  }

  function drawValidMoves(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var cx = toCanvasX(m.toC) + CELL_SIZE / 2;
      var cy = toCanvasY(m.toR) + CELL_SIZE / 2;
      if (gameState.board[m.toC][m.toR] !== EMPTY) {
        context.strokeStyle = 'rgba(229, 57, 53, 0.7)';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(cx, cy, CELL_SIZE * 0.42, 0, Math.PI * 2);
        context.stroke();
      } else if (m.castling) {
        context.fillStyle = 'rgba(33, 150, 243, 0.6)';
        context.beginPath();
        context.arc(cx, cy, 8, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = 'rgba(76, 175, 80, 0.5)';
        context.beginPath();
        context.arc(cx, cy, 8, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawLastMove(move) {
    if (!move) return;
    context.strokeStyle = 'rgba(255, 152, 0, 0.7)';
    context.lineWidth = 3;
    context.strokeRect(toCanvasX(move.fromC) + 1.5, toCanvasY(move.fromR) + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
    context.strokeRect(toCanvasX(move.toC) + 1.5, toCanvasY(move.toR) + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
  }

  function renderGame(state) {
    var ratio = window.devicePixelRatio || 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);
    drawBoard();
    if (state.lastMove) drawLastMove(state.lastMove);
    if (state.selectedPiece) {
      drawSelection(state.selectedPiece.c, state.selectedPiece.r);
      drawValidMoves(state.validMoves);
    }
    for (var c = 0; c < BOARD_SIZE; c++) {
      for (var r = 0; r < BOARD_SIZE; r++) {
        if (state.board[c][r] !== EMPTY) drawPiece(c, r, state.board[c][r]);
      }
    }
    document.getElementById('current-player').textContent = getPlayerName(state.currentPlayer);
    document.getElementById('current-player').className =
      'team-indicator ' + (state.currentPlayer === WHITE ? 'text-white-side' : 'text-black-side');
    document.getElementById('turn-count').textContent = state.turnCount;
    document.getElementById('score-white').textContent = countPieces(state.board, WHITE);
    document.getElementById('score-black').textContent = countPieces(state.board, BLACK);
    if (state.mode === 'pve') {
      var whiteLabel = state.playerTeam === WHITE ? '玩家（白方）：' : '电脑（白方）：';
      var blackLabel = state.playerTeam === BLACK ? '玩家（黑方）：' : '电脑（黑方）：';
      document.getElementById('label-white').textContent = whiteLabel;
      document.getElementById('label-black').textContent = blackLabel;
    } else {
      document.getElementById('label-white').textContent = '白方：';
      document.getElementById('label-black').textContent = '黑方：';
    }
    if (state.gameOver) updateMessage('游戏结束！', 'info');
    else if (state.aiThinking) updateMessage('AI正在思考...', 'info');
    else if (state.mode === 'pve' && state.currentPlayer === state.aiTeam) updateMessage('轮到AI行动', 'info');
    else if (state.promotionPending) updateMessage('选择升变棋子', 'info');
    else updateMessage('轮到 ' + getPlayerName(state.currentPlayer) + ' 行动', 'info');
  }

  function countPieces(board, color) {
    var count = 0;
    for (var c = 0; c < BOARD_SIZE; c++) {
      for (var r = 0; r < BOARD_SIZE; r++) {
        if (board[c][r] !== EMPTY && getOwner(board[c][r]) === color) count++;
      }
    }
    return count;
  }

  function updateMessage(text, type) {
    var el = document.getElementById('message');
    el.textContent = text;
    el.className = type === 'error' ? 'error' : (type === 'info' ? 'info' : '');
  }

  function showGameOver(state) {
    var winnerText = document.getElementById('winner-text');
    if (state.winner) {
      winnerText.textContent = getPlayerName(state.winner) + ' 获胜！';
      winnerText.className = state.winner === WHITE ? 'text-white-side' : 'text-black-side';
    } else {
      winnerText.textContent = '和棋！';
      winnerText.className = '';
    }
    document.getElementById('game-over').style.display = 'flex';
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.promotionPending) return;

    var rect = canvas.getBoundingClientRect();
    var scaleX = (window.devicePixelRatio || 1) * (CANVAS_SIZE / rect.width);
    var scaleY = (window.devicePixelRatio || 1) * (CANVAS_SIZE / rect.height);
    var px = (e.clientX - rect.left) * scaleX;
    var py = (e.clientY - rect.top) * scaleY;
    var col = Math.floor((px - PADDING) / CELL_SIZE);
    var row = Math.floor((py - PADDING) / CELL_SIZE);
    if (!inBounds(col, row)) return;
    if (gameState.boardFlipped) { col = 7 - col; row = 7 - row; }

    var piece = gameState.board[col][row];

    if (gameState.selectedPiece) {
      var move = findMove(gameState.validMoves, col, row);
      if (move) {
        if (move.promotion) {
          showPromotionDialog(move);
          return;
        }
        doMove(move);
        return;
      }
    }

    if (piece !== EMPTY && getOwner(piece) === gameState.currentPlayer) {
      var moves = getValidMoves(gameState.board, col, row, gameState.hasMoved);
      if (moves.length > 0) {
        gameState.selectedPiece = { c: col, r: row };
        gameState.validMoves = moves;
        renderGame(gameState);
      } else {
        updateMessage('该棋子没有合法移动', 'error');
      }
      return;
    }
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    renderGame(gameState);
  }

  function showPromotionDialog(move) {
    gameState.promotionPending = move;
    var color = getOwner(gameState.board[move.fromC][move.fromR]);
    var overlay = document.getElementById('promotion-overlay');
    var btns = overlay.querySelectorAll('.promo-btn');
    var pieces = color === WHITE ? [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT] : [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT];
    for (var i = 0; i < btns.length; i++) {
      btns[i].dataset.promo = pieces[i];
      btns[i].textContent = PIECE_SYMBOLS[pieces[i]];
    }
    overlay.style.display = 'flex';
  }

  function handlePromotion(promoPiece) {
    document.getElementById('promotion-overlay').style.display = 'none';
    var move = gameState.promotionPending;
    if (!move) return;
    move.promotion = parseInt(promoPiece);
    gameState.promotionPending = null;
    doMove(move);
  }

  function findMove(moves, toC, toR) {
    // Prefer non-promotion moves, promotion moves need dialog
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].toC === toC && moves[i].toR === toR && !moves[i].promotion) return moves[i];
    }
    // If only promotion moves, return first (triggers promotion dialog)
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].toC === toC && moves[i].toR === toR) return moves[i];
    }
    return null;
  }

  function doMove(move) {
    var piece = gameState.board[move.fromC][move.fromR];
    gameState.hasMoved.add(move.fromC + ',' + move.fromR);
    gameState.hasMoved.add(move.toC + ',' + move.toR);
    if (move.castling) {
      var rookFromC = move.toC === 6 ? 7 : 0;
      gameState.hasMoved.add(rookFromC + ',' + move.toR);
    }
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;
    endTurn();
  }

  function endTurn() {
    var nextPlayer = getOpponent(gameState.currentPlayer);
    var gameOverResult = checkGameOver(gameState.board, nextPlayer, gameState.hasMoved);
    if (gameOverResult) {
      gameState.gameOver = true;
      gameState.winner = gameOverResult.winner;
      renderGame(gameState);
      setTimeout(function() { showGameOver(gameState); }, 500);
      return;
    }
    gameState.currentPlayer = nextPlayer;
    renderGame(gameState);
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) triggerAI();
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(function() {
      var move = getBestAIMove(gameState.board, gameState.aiTeam, gameState.hasMoved);
      gameState.aiThinking = false;
      if (move) {
        gameState.hasMoved.add(move.fromC + ',' + move.fromR);
        gameState.hasMoved.add(move.toC + ',' + move.toR);
        if (move.castling) {
          var rookFromC = move.toC === 6 ? 7 : 0;
          gameState.hasMoved.add(rookFromC + ',' + move.toR);
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
    gameState.currentPlayer = WHITE; // White always moves first
    gameState.boardFlipped = false;
    if (mode === 'pve') {
      gameState.playerTeam = playerTeam || WHITE;
      gameState.aiTeam = getOpponent(gameState.playerTeam);
      gameState.boardFlipped = (gameState.playerTeam === BLACK);
    }
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('promotion-overlay').style.display = 'none';
    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;
    if (mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) triggerAI();
  }

  function restartGame() {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'flex';
    gameState = null;
  }

  function handleRPSChoice(player, choice) {
    if (player === 'human') {
      rpsChoices.human = choice;
      document.querySelectorAll('#rps-player-buttons .btn-rps').forEach(function(btn) { btn.classList.remove('selected'); });
      event.target.classList.add('selected');
      var choices = ['rock', 'scissors', 'paper'];
      var aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;
      var resultEl = document.getElementById('rps-result');
      var humanWins = judgeRPS(choice, aiChoice);
      if (humanWins === 1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你赢了！你先手(白方)。';
        setTimeout(function() { startGame('pve', WHITE); }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你输了！AI先手(白方)。';
        setTimeout(function() { startGame('pve', BLACK); }, 1500);
      } else {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，平局！重新选择。';
        rpsChoices.human = null; rpsChoices.player2 = null;
      }
    } else {
      rpsChoices['player' + player] = choice;
      document.querySelectorAll('#rps-p' + player + '-buttons .btn-rps').forEach(function(btn) { btn.classList.remove('selected'); });
      event.target.classList.add('selected');
      document.getElementById('rps-p' + player + '-status').textContent = '已选择：' + getRPSName(choice);
      if (rpsChoices.player1 && rpsChoices.player2) {
        var resultEl = document.getElementById('rps-result');
        var winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);
        if (winner === 1) {
          resultEl.textContent = '玩家1赢了！玩家1先手(白方)。';
          setTimeout(function() { startGame('pvp', WHITE); }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = '玩家2赢了！玩家2先手(白方)。';
          setTimeout(function() { startGame('pvp', BLACK); }, 1500);
        } else {
          resultEl.textContent = '平局！重新选择。';
          rpsChoices.player1 = null; rpsChoices.player2 = null;
          document.getElementById('rps-p1-status').textContent = '请选择';
          document.getElementById('rps-p2-status').textContent = '请选择';
          document.querySelectorAll('.btn-rps').forEach(function(btn) { btn.classList.remove('selected'); });
        }
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-pvp').addEventListener('click', function() {
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'block';
      document.getElementById('rps-pve').style.display = 'none';
      rpsChoices = { player1: null, player2: null, human: null };
    });
    document.getElementById('btn-pve').addEventListener('click', function() {
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'none';
      document.getElementById('rps-pve').style.display = 'block';
      rpsChoices = { player1: null, player2: null, human: null };
    });
    document.querySelectorAll('.btn-rps').forEach(function(button) {
      button.addEventListener('click', function(ev) {
        handleRPSChoice(ev.target.dataset.player, ev.target.dataset.choice);
      });
    });
    document.getElementById('btn-restart').addEventListener('click', restartGame);
    document.querySelectorAll('.promo-btn').forEach(function(button) {
      button.addEventListener('click', function(ev) {
        handlePromotion(ev.target.dataset.promo);
      });
    });
    document.getElementById('mode-selection').style.display = 'flex';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('promotion-overlay').style.display = 'none';
  });
}
