/* eslint-disable no-var, no-undef */
// ============================================================
// Checkers (Draughts) - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const BOARD_SIZE = 8;
const EMPTY = 0;
const RED = 1; // Red (first player, top)
const WHITE = 2; // White (second player, bottom)
const RED_KING = 3;
const WHITE_KING = 4;

// AI search depth
const AI_DEPTH = 4;

// Evaluation weights
const WEIGHT_PIECE = 100;
const WEIGHT_KING = 250;
const WEIGHT_ADVANCE = 3; // Regular piece advance bonus
const WEIGHT_CENTER = 5; // Center position bonus
const WEIGHT_THREATENED = -20; // Threatened piece penalty

function createBoard() {
  const board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) row.push(RED);
        else if (r > 4) row.push(WHITE);
        else row.push(EMPTY);
      } else {
        row.push(EMPTY);
      }
    }
    board.push(row);
  }
  return board;
}

function copyBoard(board) {
  const newBoard = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    newBoard.push(board[r].slice());
  }
  return newBoard;
}

function isRed(piece) {
  return piece === RED || piece === RED_KING;
}
function isWhite(piece) {
  return piece === WHITE || piece === WHITE_KING;
}
function isKing(piece) {
  return piece === RED_KING || piece === WHITE_KING;
}
function getOwner(piece) {
  if (isRed(piece)) return RED;
  if (isWhite(piece)) return WHITE;
  return EMPTY;
}

function getOpponent(player) {
  return player === RED ? WHITE : RED;
}

function getPlayerName(player) {
  return player === RED ? "红方" : "白方";
}

function promote(piece, row) {
  if (piece === RED && row === BOARD_SIZE - 1) return RED_KING;
  if (piece === WHITE && row === 0) return WHITE_KING;
  return piece;
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

// ============================================================
// Move generation
// ============================================================

// Get normal move directions for a piece
function getMoveDirs(piece) {
  if (piece === RED)
    return [
      [1, -1],
      [1, 1],
    ]; // Red moves down
  if (piece === WHITE)
    return [
      [-1, -1],
      [-1, 1],
    ]; // White moves up
  return [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]; // King moves in all 4 directions
}

// Get capture directions for a piece
function getCaptureDirs(piece) {
  return getMoveDirs(piece); // Capture directions same as move directions
}

/**
 * Get all possible moves for a piece (excluding captures)
 * Returns [{fromR, fromC, toR, toC}]
 */
function getSimpleMoves(board, r, c) {
  const piece = board[r][c];
  const moves = [];
  const dirs = getMoveDirs(piece);
  for (let i = 0; i < dirs.length; i++) {
    const nr = r + dirs[i][0];
    const nc = c + dirs[i][1];
    if (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
      moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
    }
  }
  return moves;
}

/**
 * Get all capture moves for a piece
 * Returns [{fromR, fromC, toR, toC, capturedR, capturedC}]
 */
function getCaptureMoves(board, r, c) {
  const piece = board[r][c];
  const moves = [];
  const dirs = getCaptureDirs(piece);
  for (let i = 0; i < dirs.length; i++) {
    const mr = r + dirs[i][0]; // Captured piece position
    const mc = c + dirs[i][1];
    const nr = r + dirs[i][0] * 2; // Landing position
    const nc = c + dirs[i][1] * 2;
    if (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
      const mid = board[mr][mc];
      if (mid !== EMPTY && getOwner(mid) !== getOwner(piece)) {
        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, capturedR: mr, capturedC: mc });
      }
    }
  }
  return moves;
}

/**
 * Get all legal moves for a side (forced capture rule)
 * Returns [{fromR, fromC, toR, toC, capturedR?, capturedC?, chainCaptures?}]
 */
function getAllMoves(board, player) {
  const allCaptures = [];
  const allSimple = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getOwner(board[r][c]) === player) {
        const caps = getCaptureMoves(board, r, c);
        for (const cap of caps) {
          allCaptures.push(cap);
        }
        const sims = getSimpleMoves(board, r, c);
        for (const sim of sims) {
          allSimple.push(sim);
        }
      }
    }
  }

  // Forced capture: must capture when available
  if (allCaptures.length > 0) {
    // Expand multi-jump: check if each capture can continue
    const expanded = [];
    for (const capture of allCaptures) {
      expandChainCaptures(board, capture, player, expanded);
    }
    return expanded;
  }
  return allSimple;
}

/**
 * Recursively expand chain captures
 */
function expandChainCaptures(board, move, player, result) {
  const newBoard = applyMove(board, move);
  const piece = newBoard[move.toR][move.toC];
  // Check if promoted to king
  const promoted = promote(piece, move.toR);
  if (promoted !== piece) {
    newBoard[move.toR][move.toC] = promoted;
    // Cannot continue after promotion (checkers rule: turn ends on promotion)
    result.push(move);
    return;
  }
  // Check if can continue capturing
  const nextCaps = getCaptureMoves(newBoard, move.toR, move.toC);
  if (nextCaps.length === 0) {
    result.push(move);
  } else {
    for (const nextCap of nextCaps) {
      expandChainCaptures(newBoard, nextCap, player, result);
    }
  }
}

/**
 * Apply move to board (returns new board)
 */
function applyMove(board, move) {
  const newBoard = copyBoard(board);
  const piece = newBoard[move.fromR][move.fromC];
  newBoard[move.fromR][move.fromC] = EMPTY;
  const promoted = promote(piece, move.toR);
  newBoard[move.toR][move.toC] = promoted;
  // If capture, remove captured piece
  if (move.capturedR !== undefined) {
    newBoard[move.capturedR][move.capturedC] = EMPTY;
  }
  return newBoard;
}

// ============================================================
// Win/loss detection
// ============================================================

function checkGameOver(board, currentPlayer) {
  let redCount = 0,
    whiteCount = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isRed(board[r][c])) redCount++;
      if (isWhite(board[r][c])) whiteCount++;
    }
  }
  if (redCount === 0) return { winner: WHITE, reason: "capture" };
  if (whiteCount === 0) return { winner: RED, reason: "capture" };

  // Check if current side has legal moves
  const moves = getAllMoves(board, currentPlayer);
  if (moves.length === 0) {
    return { winner: getOpponent(currentPlayer), reason: "no_moves" };
  }
  return null;
}

// ============================================================
// AI: Alpha-Beta Pruning
// ============================================================

function evaluateBoard(board, aiPlayer) {
  let score = 0;
  const opponent = getOpponent(aiPlayer);

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece === EMPTY) continue;

      const isAI = getOwner(piece) === aiPlayer;
      const sign = isAI ? 1 : -1;

      // Base score
      if (isKing(piece)) {
        score += sign * WEIGHT_KING;
      } else {
        score += sign * WEIGHT_PIECE;
        // Advance bonus
        if (isAI) {
          if (aiPlayer === RED) score += sign * r * WEIGHT_ADVANCE;
          else score += sign * (BOARD_SIZE - 1 - r) * WEIGHT_ADVANCE;
        } else if (opponent === RED) {
          score += sign * r * WEIGHT_ADVANCE;
        } else {
          score += sign * (BOARD_SIZE - 1 - r) * WEIGHT_ADVANCE;
        }
      }

      // Center position bonus
      const centerDist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
      score += sign * (7 - centerDist) * WEIGHT_CENTER;
    }
  }

  // Threat evaluation
  score += evaluateThreats(board, aiPlayer);

  return score;
}

function evaluateThreats(board, player) {
  let score = 0;
  const opponent = getOpponent(player);
  // Check if opponent can capture our pieces
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getOwner(board[r][c]) === opponent) {
        const caps = getCaptureMoves(board, r, c);
        for (const cap of caps) {
          const target = board[cap.capturedR][cap.capturedC];
          if (getOwner(target) === player) {
            score += WEIGHT_THREATENED * (isKing(target) ? 2.5 : 1);
          }
        }
      }
    }
  }
  return score;
}

function alphaBeta(board, depth, alpha, beta, isMaximizing, aiPlayer) {
  const currentPlayer = isMaximizing ? aiPlayer : getOpponent(aiPlayer);
  const gameOver = checkGameOver(board, currentPlayer);

  if (gameOver) {
    if (gameOver.winner === aiPlayer) return 99999 + depth;
    return -99999 - depth;
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  const moves = getAllMoves(board, currentPlayer);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (eval_ > maxEval) maxEval = eval_;
      if (maxEval > alpha) alpha = maxEval;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      if (eval_ < minEval) minEval = eval_;
      if (minEval < beta) beta = minEval;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(board, aiPlayer) {
  const moves = getAllMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const newBoard = applyMove(board, move);
    const score = alphaBeta(newBoard, AI_DEPTH - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
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
    currentPlayer: RED,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    scoreRed: 0,
    scoreWhite: 0,
    selectedPiece: null, // {r, c} currently selected piece
    validMoves: [], // Valid moves for selected piece
    mustCapture: false, // Whether forced capture
    lastMove: null,
    multiJumpPiece: null, // Piece position during chain capture
  };
}

// ============================================================
// Export for testing
// ============================================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    RED: RED,
    WHITE: WHITE,
    RED_KING: RED_KING,
    WHITE_KING: WHITE_KING,
    AI_DEPTH: AI_DEPTH,
    createBoard: createBoard,
    copyBoard: copyBoard,
    isRed: isRed,
    isWhite: isWhite,
    isKing: isKing,
    getOwner: getOwner,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    promote: promote,
    inBounds: inBounds,
    getMoveDirs: getMoveDirs,
    getSimpleMoves: getSimpleMoves,
    getCaptureMoves: getCaptureMoves,
    getAllMoves: getAllMoves,
    applyMove: applyMove,
    checkGameOver: checkGameOver,
    evaluateBoard: evaluateBoard,
    alphaBeta: alphaBeta,
    getBestAIMove: getBestAIMove,
    createGameState: createGameState,
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
  let localTeam = null; // RED or WHITE
  let remoteTeam = null; // RED or WHITE
  const CELL_SIZE = 56;
  const BOARD_PX = CELL_SIZE * BOARD_SIZE;
  const PIECE_RADIUS = 22;

  function initBoard() {
    canvas = document.getElementById("board-canvas");
    canvas.width = BOARD_PX;
    canvas.height = BOARD_PX;
    context = canvas.getContext("2d");
    drawBoard();
  }

  function drawBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        context.fillStyle = (r + c) % 2 === 0 ? "#f0d9b5" : "#8b6914";
        context.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  function drawPiece(x, y, piece) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;

    const gradient = context.createRadialGradient(cx + 2, cy - 2, 2, cx, cy, PIECE_RADIUS);
    if (isRed(piece)) {
      gradient.addColorStop(0, "#ff6b6b");
      gradient.addColorStop(1, "#c0392b");
    } else {
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(1, "#bdc3c7");
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2);
    context.fill();

    // Border
    context.strokeStyle = isRed(piece) ? "#922b21" : "#7f8c8d";
    context.lineWidth = 1.5;
    context.stroke();

    // King marker
    if (isKing(piece)) {
      context.fillStyle = "#ffd700";
      context.font = "bold 18px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("♚", cx, cy);
    }
  }

  function drawSelection(r, c) {
    context.strokeStyle = "#ffd600";
    context.lineWidth = 3;
    context.strokeRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  function drawValidMoves(moves) {
    for (const m of moves) {
      const cx = m.toC * CELL_SIZE + CELL_SIZE / 2;
      const cy = m.toR * CELL_SIZE + CELL_SIZE / 2;
      context.fillStyle = "rgba(76, 175, 80, 0.5)";
      context.beginPath();
      context.arc(cx, cy, 10, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawLastMove(move) {
    if (!move) return;
    context.strokeStyle = "rgba(255, 152, 0, 0.7)";
    context.lineWidth = 3;
    context.strokeRect(
      move.fromC * CELL_SIZE + 2,
      move.fromR * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
    context.strokeRect(
      move.toC * CELL_SIZE + 2,
      move.toR * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
  }

  function renderGame(state) {
    drawBoard();

    // Last move
    if (state.lastMove) drawLastMove(state.lastMove);

    // Selection highlight
    if (state.selectedPiece) {
      drawSelection(state.selectedPiece.r, state.selectedPiece.c);
      drawValidMoves(state.validMoves);
    }

    // All pieces
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c] !== EMPTY) {
          drawPiece(c, r, state.board[r][c]);
        }
      }
    }

    // Status bar - shown as 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP)
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === RED ? WHITE : RED]
        : [RED, WHITE],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === RED ? "text-red" : "text-white-piece");
    document.getElementById("turn-count").textContent = state.turnCount;

    const redCount = countPieces(state.board, RED);
    const whiteCount = countPieces(state.board, WHITE);
    document.getElementById("score-red").textContent = redCount;
    document.getElementById("score-white").textContent = whiteCount;

    if (state.mode === "pve") {
      const redLabel = state.playerTeam === RED ? "玩家（红方）：" : "电脑（红方）：";
      const whiteLabel = state.playerTeam === WHITE ? "玩家（白方）：" : "电脑（白方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else if (state.mode === "online") {
      const redLabel = state.localTeam === RED ? "你（红方）：" : "对方（红方）：";
      const whiteLabel = state.localTeam === WHITE ? "你（白方）：" : "对方（白方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else {
      document.getElementById("label-red").textContent = "红方：";
      document.getElementById("label-white").textContent = "白方：";
    }

    if (state.gameOver) {
      updateMessage("游戏结束！", "info");
    } else if (state.aiThinking) {
      updateMessage("电脑正在思考...", "info");
    } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      updateMessage("轮到电脑行动", "info");
    } else if (state.multiJumpPiece) {
      updateMessage("可以继续吃子！", "info");
    } else if (state.mustCapture) {
      updateMessage("必须吃子！请选择吃子棋子", "info");
    } else {
      updateMessage("轮到 " + label.text + " 行动", "info");
    }
  }

  function countPieces(board, player) {
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (getOwner(board[r][c]) === player) count++;
      }
    }
    return count;
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
          ? [state.firstPlayer, state.firstPlayer === RED ? WHITE : RED]
          : [RED, WHITE],
      });
      winnerText.textContent = label.text + " 获胜！";
    } else {
      SoundManager.play("draw");
      winnerText.textContent = "平局！";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  // Get all legal moves for a side to determine forced capture
  function getMustCapture(board, player) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (getOwner(board[r][c]) === player) {
          if (getCaptureMoves(board, r, c).length > 0) return true;
        }
      }
    }
    return false;
  }

  // Get legal moves for a piece (considering forced capture rule)
  function getLegalMovesForPiece(board, r, c, player) {
    const mustCapture = getMustCapture(board, player);
    if (mustCapture) {
      return getCaptureMoves(board, r, c);
    }
    return getSimpleMoves(board, r, c);
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.mode === "online" && gameState.currentPlayer !== localTeam) return;
    // During chain capture, only allow clicking current piece
    if (gameState.multiJumpPiece) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const col = Math.floor(px / CELL_SIZE);
      const row = Math.floor(py / CELL_SIZE);
      handleMultiJumpClick(row, col);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(px / CELL_SIZE);
    const row = Math.floor(py / CELL_SIZE);

    if (!inBounds(row, col)) return;

    const piece = gameState.board[row][col];

    // If clicked own piece, select it
    if (getOwner(piece) === gameState.currentPlayer) {
      const moves = getLegalMovesForPiece(gameState.board, row, col, gameState.currentPlayer);
      if (moves.length > 0) {
        gameState.selectedPiece = { r: row, c: col };
        gameState.validMoves = moves;
        renderGame(gameState);
      } else {
        updateMessage("该棋子没有合法移动", "error");
      }
      return;
    }

    // If clicked empty cell with selected piece, try to move
    if (piece === EMPTY && gameState.selectedPiece) {
      const move = findMove(gameState.validMoves, row, col);
      if (move) {
        doMove(move);
        if (gameState.mode === "online" && networkProtocol) {
          const actionData = {
            a: "move",
            fr: move.fromR,
            fc: move.fromC,
            tr: move.toR,
            tc: move.toC,
          };
          if (move.capturedR !== undefined) {
            actionData.cr = move.capturedR;
            actionData.cc = move.capturedC;
          }
          networkProtocol.sendAction(actionData);
        }
      } else {
        updateMessage("无效的目标位置", "error");
      }
    }
  }

  function handleMultiJumpClick(row, col) {
    const mp = gameState.multiJumpPiece;
    // Clicking current piece itself ends chain capture
    if (row === mp.r && col === mp.c) {
      gameState.multiJumpPiece = null;
      gameState.selectedPiece = null;
      gameState.validMoves = [];
      endTurn();
      return;
    }
    // Try to continue capturing
    const move = findMove(gameState.validMoves, row, col);
    if (move) {
      doMultiJumpMove(move);
      if (gameState.mode === "online" && networkProtocol) {
        const actionData = {
          a: "move",
          fr: move.fromR,
          fc: move.fromC,
          tr: move.toR,
          tc: move.toC,
        };
        if (move.capturedR !== undefined) {
          actionData.cr = move.capturedR;
          actionData.cc = move.capturedC;
        }
        networkProtocol.sendAction(actionData);
      }
    }
  }

  function findMove(moves, toR, toC) {
    for (const move of moves) {
      if (move.toR === toR && move.toC === toC) return move;
    }
    return null;
  }

  function doMove(move) {
    // Play sound based on move type
    if (move.capturedR !== undefined) {
      SoundManager.play("take");
    } else {
      SoundManager.play("slide");
    }
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;

    // Check if promoted to king and need to end turn
    const piece = gameState.board[move.toR][move.toC];
    if (move.capturedR !== undefined) {
      // After capture, check if can continue capturing
      const promoted = promote(gameState.board[move.toR][move.toC], move.toR);
      if (promoted !== piece) {
        gameState.board[move.toR][move.toC] = promoted;
        // Turn ends after promotion
        endTurn();
        return;
      }
      const nextCaps = getCaptureMoves(gameState.board, move.toR, move.toC);
      if (nextCaps.length > 0) {
        // Chain capture
        gameState.multiJumpPiece = { r: move.toR, c: move.toC };
        gameState.selectedPiece = { r: move.toR, c: move.toC };
        gameState.validMoves = nextCaps;
        renderGame(gameState);
        return;
      }
    }
    endTurn();
  }

  function doMultiJumpMove(move) {
    SoundManager.play("take");
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.turnCount++;

    // Check if promoted to king
    const piece = gameState.board[move.toR][move.toC];
    const promoted = promote(piece, move.toR);
    if (promoted !== piece) {
      gameState.board[move.toR][move.toC] = promoted;
      gameState.multiJumpPiece = null;
      gameState.selectedPiece = null;
      gameState.validMoves = [];
      endTurn();
      return;
    }

    const nextCaps = getCaptureMoves(gameState.board, move.toR, move.toC);
    if (nextCaps.length > 0) {
      gameState.multiJumpPiece = { r: move.toR, c: move.toC };
      gameState.selectedPiece = { r: move.toR, c: move.toC };
      gameState.validMoves = nextCaps;
      renderGame(gameState);
    } else {
      gameState.multiJumpPiece = null;
      gameState.selectedPiece = null;
      gameState.validMoves = [];
      endTurn();
    }
  }

  function endTurn() {
    const gameOverResult = checkGameOver(gameState.board, getOpponent(gameState.currentPlayer));
    if (gameOverResult) {
      gameState.gameOver = true;
      gameState.winner = gameOverResult.winner;
      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    gameState.mustCapture = getMustCapture(gameState.board, gameState.currentPlayer);
    renderGame(gameState);

    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
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
        if (move.capturedR !== undefined) {
          SoundManager.play("take");
        } else {
          SoundManager.play("slide");
        }
        gameState.board = applyMove(gameState.board, move);
        gameState.lastMove = move;
        gameState.turnCount++;
        // AI chain capture
        simulateAIChainCaptures(move);
      } else {
        endTurn();
      }
    }, 300);
  }

  function simulateAIChainCaptures(move) {
    const piece = gameState.board[move.toR][move.toC];
    const promoted = promote(piece, move.toR);
    if (promoted !== piece) {
      gameState.board[move.toR][move.toC] = promoted;
      endTurn();
      return;
    }
    const nextCaps = getCaptureMoves(gameState.board, move.toR, move.toC);
    if (nextCaps.length > 0) {
      // AI continues capture (simple strategy: pick first)
      const nextMove = nextCaps[0];
      SoundManager.play("take");
      renderGame(gameState);
      setTimeout(() => {
        gameState.board = applyMove(gameState.board, nextMove);
        gameState.lastMove = nextMove;
        gameState.turnCount++;
        simulateAIChainCaptures(nextMove);
      }, 300);
    } else {
      endTurn();
    }
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || RED;
    gameState.firstPlayer = firstPlayer || RED;

    if (mode === "pve") {
      if (firstPlayer === RED) {
        gameState.playerTeam = RED;
        gameState.aiTeam = WHITE;
      } else {
        gameState.playerTeam = WHITE;
        gameState.aiTeam = RED;
      }
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
    const guestPiece = WHITE;

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
      fromR: actionData.fr,
      fromC: actionData.fc,
      toR: actionData.tr,
      toC: actionData.tc,
    };
    if (actionData.cr !== undefined) {
      move.capturedR = actionData.cr;
      move.capturedC = actionData.cc;
    }
    // Apply the move directly without network send
    if (move.capturedR !== undefined) {
      SoundManager.play("take");
    } else {
      SoundManager.play("slide");
    }
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;

    // Check chain capture for remote player
    const piece = gameState.board[move.toR][move.toC];
    if (move.capturedR !== undefined) {
      const promoted = promote(gameState.board[move.toR][move.toC], move.toR);
      if (promoted !== piece) {
        gameState.board[move.toR][move.toC] = promoted;
        endTurn();
        return;
      }
      const nextCaps = getCaptureMoves(gameState.board, move.toR, move.toC);
      if (nextCaps.length > 0) {
        // Remote player has chain capture - wait for more actions
        gameState.multiJumpPiece = { r: move.toR, c: move.toC };
        gameState.selectedPiece = { r: move.toR, c: move.toC };
        gameState.validMoves = nextCaps;
        renderGame(gameState);
        return;
      }
    }
    endTurn();
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
          startGame("pve", WHITE);
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
          SoundManager.play("lose");
          resultEl.textContent = "玩家2赢了！玩家2先手(红方)。";
          setTimeout(() => {
            startGame("pvp", WHITE);
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
