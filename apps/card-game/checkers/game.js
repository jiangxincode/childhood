// ============================================================
// 国际跳棋 (Checkers) - 游戏核心逻辑
// ============================================================

var BOARD_SIZE = 8;
var EMPTY = 0;
var RED = 1;       // 红方（先手，上方）
var WHITE = 2;     // 白方（后手，下方）
var RED_KING = 3;
var WHITE_KING = 4;

// AI搜索深度
var AI_DEPTH = 4;

// 评估权重
var WEIGHT_PIECE = 100;
var WEIGHT_KING = 250;
var WEIGHT_ADVANCE = 3;      // 普通棋子前进奖励
var WEIGHT_CENTER = 5;       // 中心位置奖励
var WEIGHT_THREATENED = -20; // 被威胁的棋子惩罚

function createBoard() {
  var board = [];
  for (var r = 0; r < BOARD_SIZE; r++) {
    var row = [];
    for (var c = 0; c < BOARD_SIZE; c++) {
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
  var newBoard = [];
  for (var r = 0; r < BOARD_SIZE; r++) {
    newBoard.push(board[r].slice());
  }
  return newBoard;
}

function isRed(piece) { return piece === RED || piece === RED_KING; }
function isWhite(piece) { return piece === WHITE || piece === WHITE_KING; }
function isKing(piece) { return piece === RED_KING || piece === WHITE_KING; }
function getOwner(piece) {
  if (isRed(piece)) return RED;
  if (isWhite(piece)) return WHITE;
  return EMPTY;
}

function getOpponent(player) {
  return player === RED ? WHITE : RED;
}

function getPlayerName(player) {
  return player === RED ? '红方' : '白方';
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
// 移动生成
// ============================================================

// 获取某棋子的普通移动方向
function getMoveDirs(piece) {
  if (piece === RED) return [[1, -1], [1, 1]];           // 红方向下
  if (piece === WHITE) return [[-1, -1], [-1, 1]];       // 白方向上
  return [[-1, -1], [-1, 1], [1, -1], [1, 1]];           // 王四方向
}

// 获取某棋子的吃子方向
function getCaptureDirs(piece) {
  return getMoveDirs(piece); // 吃子方向与移动方向相同
}

/**
 * 获取某个棋子的所有可能移动（不含吃子）
 * 返回 [{fromR, fromC, toR, toC}]
 */
function getSimpleMoves(board, r, c) {
  var piece = board[r][c];
  var moves = [];
  var dirs = getMoveDirs(piece);
  for (var i = 0; i < dirs.length; i++) {
    var nr = r + dirs[i][0];
    var nc = c + dirs[i][1];
    if (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
      moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
    }
  }
  return moves;
}

/**
 * 获取某个棋子的所有吃子移动
 * 返回 [{fromR, fromC, toR, toC, capturedR, capturedC}]
 */
function getCaptureMoves(board, r, c) {
  var piece = board[r][c];
  var moves = [];
  var dirs = getCaptureDirs(piece);
  for (var i = 0; i < dirs.length; i++) {
    var mr = r + dirs[i][0]; // 被吃棋子位置
    var mc = c + dirs[i][1];
    var nr = r + dirs[i][0] * 2; // 落点
    var nc = c + dirs[i][1] * 2;
    if (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
      var mid = board[mr][mc];
      if (mid !== EMPTY && getOwner(mid) !== getOwner(piece)) {
        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, capturedR: mr, capturedC: mc });
      }
    }
  }
  return moves;
}

/**
 * 获取某方所有合法移动（强制吃子规则）
 * 返回 [{fromR, fromC, toR, toC, capturedR?, capturedC?, chainCaptures?}]
 */
function getAllMoves(board, player) {
  var allCaptures = [];
  var allSimple = [];

  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      if (getOwner(board[r][c]) === player) {
        var caps = getCaptureMoves(board, r, c);
        for (var i = 0; i < caps.length; i++) {
          allCaptures.push(caps[i]);
        }
        var sims = getSimpleMoves(board, r, c);
        for (var j = 0; j < sims.length; j++) {
          allSimple.push(sims[j]);
        }
      }
    }
  }

  // 强制吃子：有吃子时必须吃
  if (allCaptures.length > 0) {
    // 展开多跳：对每个吃子检查是否能继续跳
    var expanded = [];
    for (var i = 0; i < allCaptures.length; i++) {
      expandChainCaptures(board, allCaptures[i], player, expanded);
    }
    return expanded;
  }
  return allSimple;
}

/**
 * 递归展开连续吃子
 */
function expandChainCaptures(board, move, player, result) {
  var newBoard = applyMove(board, move);
  var piece = newBoard[move.toR][move.toC];
  // 检查是否升王
  var promoted = promote(piece, move.toR);
  if (promoted !== piece) {
    newBoard[move.toR][move.toC] = promoted;
    // 升王后不能继续吃（国际跳棋规则：升王后回合结束）
    result.push(move);
    return;
  }
  // 检查是否能继续吃
  var nextCaps = getCaptureMoves(newBoard, move.toR, move.toC);
  if (nextCaps.length === 0) {
    result.push(move);
  } else {
    for (var i = 0; i < nextCaps.length; i++) {
      expandChainCaptures(newBoard, nextCaps[i], player, result);
    }
  }
}

/**
 * 应用移动到棋盘（返回新棋盘）
 */
function applyMove(board, move) {
  var newBoard = copyBoard(board);
  var piece = newBoard[move.fromR][move.fromC];
  newBoard[move.fromR][move.fromC] = EMPTY;
  var promoted = promote(piece, move.toR);
  newBoard[move.toR][move.toC] = promoted;
  // 如果是吃子，移除被吃的棋子
  if (move.capturedR !== undefined) {
    newBoard[move.capturedR][move.capturedC] = EMPTY;
  }
  return newBoard;
}

// ============================================================
// 胜负检测
// ============================================================

function checkGameOver(board, currentPlayer) {
  var redCount = 0, whiteCount = 0;
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      if (isRed(board[r][c])) redCount++;
      if (isWhite(board[r][c])) whiteCount++;
    }
  }
  if (redCount === 0) return { winner: WHITE, reason: 'capture' };
  if (whiteCount === 0) return { winner: RED, reason: 'capture' };

  // 检查当前方是否有合法移动
  var moves = getAllMoves(board, currentPlayer);
  if (moves.length === 0) {
    return { winner: getOpponent(currentPlayer), reason: 'no_moves' };
  }
  return null;
}

// ============================================================
// AI: Alpha-Beta 剪枝
// ============================================================

function evaluateBoard(board, aiPlayer) {
  var score = 0;
  var opponent = getOpponent(aiPlayer);

  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      var piece = board[r][c];
      if (piece === EMPTY) continue;

      var isAI = getOwner(piece) === aiPlayer;
      var sign = isAI ? 1 : -1;

      // 基础分
      if (isKing(piece)) {
        score += sign * WEIGHT_KING;
      } else {
        score += sign * WEIGHT_PIECE;
        // 前进奖励
        if (isAI) {
          if (aiPlayer === RED) score += sign * r * WEIGHT_ADVANCE;
          else score += sign * (BOARD_SIZE - 1 - r) * WEIGHT_ADVANCE;
        } else {
          if (opponent === RED) score += sign * r * WEIGHT_ADVANCE;
          else score += sign * (BOARD_SIZE - 1 - r) * WEIGHT_ADVANCE;
        }
      }

      // 中心位置奖励
      var centerDist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
      score += sign * (7 - centerDist) * WEIGHT_CENTER;
    }
  }

  // 威胁评估
  score += evaluateThreats(board, aiPlayer);

  return score;
}

function evaluateThreats(board, player) {
  var score = 0;
  var opponent = getOpponent(player);
  // 检查对方是否能吃我方棋子
  for (var r = 0; r < BOARD_SIZE; r++) {
    for (var c = 0; c < BOARD_SIZE; c++) {
      if (getOwner(board[r][c]) === opponent) {
        var caps = getCaptureMoves(board, r, c);
        for (var i = 0; i < caps.length; i++) {
          var target = board[caps[i].capturedR][caps[i].capturedC];
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
  var currentPlayer = isMaximizing ? aiPlayer : getOpponent(aiPlayer);
  var gameOver = checkGameOver(board, currentPlayer);

  if (gameOver) {
    if (gameOver.winner === aiPlayer) return 99999 + depth;
    return -99999 - depth;
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  var moves = getAllMoves(board, currentPlayer);

  if (isMaximizing) {
    var maxEval = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var newBoard = applyMove(board, moves[i]);
      var eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (eval_ > maxEval) maxEval = eval_;
      if (maxEval > alpha) alpha = maxEval;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    var minEval = Infinity;
    for (var i = 0; i < moves.length; i++) {
      var newBoard = applyMove(board, moves[i]);
      var eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      if (eval_ < minEval) minEval = eval_;
      if (minEval < beta) beta = minEval;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(board, aiPlayer) {
  var moves = getAllMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  var bestMove = null;
  var bestScore = -Infinity;

  for (var i = 0; i < moves.length; i++) {
    var newBoard = applyMove(board, moves[i]);
    var score = alphaBeta(newBoard, AI_DEPTH - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[i];
    }
  }
  return bestMove;
}

// ============================================================
// 游戏状态
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
    selectedPiece: null,    // {r, c} 当前选中的棋子
    validMoves: [],          // 当前选中棋子的合法移动
    mustCapture: false,      // 是否强制吃子
    lastMove: null,
    multiJumpPiece: null     // 连续吃子中的棋子位置
  };
}

// ============================================================
// 导出供测试使用
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
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
    createGameState: createGameState
  };
}

// ============================================================
// 浏览器UI
// ============================================================

if (typeof document !== 'undefined') {
  var gameState = null;
  var rpsChoices = { player1: null, player2: null, human: null };
  var canvas, context;
  var CELL_SIZE = 56;
  var BOARD_PX = CELL_SIZE * BOARD_SIZE;
  var PIECE_RADIUS = 22;
  var KING_RADIUS = 16;

  function initBoard() {
    canvas = document.getElementById('board-canvas');
    canvas.width = BOARD_PX;
    canvas.height = BOARD_PX;
    context = canvas.getContext('2d');
    drawBoard();
  }

  function drawBoard() {
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        context.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#8b6914';
        context.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  function drawPiece(x, y, piece) {
    var cx = x * CELL_SIZE + CELL_SIZE / 2;
    var cy = y * CELL_SIZE + CELL_SIZE / 2;

    var gradient = context.createRadialGradient(cx + 2, cy - 2, 2, cx, cy, PIECE_RADIUS);
    if (isRed(piece)) {
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(1, '#c0392b');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#bdc3c7');
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2);
    context.fill();

    // 边框
    context.strokeStyle = isRed(piece) ? '#922b21' : '#7f8c8d';
    context.lineWidth = 1.5;
    context.stroke();

    // 王标记
    if (isKing(piece)) {
      context.fillStyle = '#ffd700';
      context.font = 'bold 18px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('♚', cx, cy);
    }
  }

  function drawSelection(r, c) {
    context.strokeStyle = '#ffd600';
    context.lineWidth = 3;
    context.strokeRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  function drawValidMoves(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var cx = m.toC * CELL_SIZE + CELL_SIZE / 2;
      var cy = m.toR * CELL_SIZE + CELL_SIZE / 2;
      context.fillStyle = 'rgba(76, 175, 80, 0.5)';
      context.beginPath();
      context.arc(cx, cy, 10, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawLastMove(move) {
    if (!move) return;
    context.strokeStyle = 'rgba(255, 152, 0, 0.7)';
    context.lineWidth = 3;
    context.strokeRect(move.fromC * CELL_SIZE + 2, move.fromR * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    context.strokeRect(move.toC * CELL_SIZE + 2, move.toR * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  function renderGame(state) {
    drawBoard();

    // 最后一步
    if (state.lastMove) drawLastMove(state.lastMove);

    // 选中高亮
    if (state.selectedPiece) {
      drawSelection(state.selectedPiece.r, state.selectedPiece.c);
      drawValidMoves(state.validMoves);
    }

    // 所有棋子
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c] !== EMPTY) {
          drawPiece(c, r, state.board[r][c]);
        }
      }
    }

    // 状态栏
    document.getElementById('current-player').textContent = getPlayerName(state.currentPlayer);
    document.getElementById('current-player').className =
      'team-indicator ' + (state.currentPlayer === RED ? 'text-red' : 'text-white-piece');
    document.getElementById('turn-count').textContent = state.turnCount;

    var redCount = countPieces(state.board, RED);
    var whiteCount = countPieces(state.board, WHITE);
    document.getElementById('score-red').textContent = redCount;
    document.getElementById('score-white').textContent = whiteCount;

    if (state.gameOver) {
      updateMessage('游戏结束！', 'info');
    } else if (state.aiThinking) {
      updateMessage('AI正在思考...', 'info');
    } else if (state.mode === 'pve' && state.currentPlayer === state.aiTeam) {
      updateMessage('轮到AI行动', 'info');
    } else if (state.multiJumpPiece) {
      updateMessage('可以继续吃子！', 'info');
    } else if (state.mustCapture) {
      updateMessage('必须吃子！请选择吃子棋子', 'info');
    } else {
      updateMessage('轮到 ' + getPlayerName(state.currentPlayer) + ' 行动', 'info');
    }
  }

  function countPieces(board, player) {
    var count = 0;
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (getOwner(board[r][c]) === player) count++;
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
    } else {
      winnerText.textContent = '平局！';
    }
    document.getElementById('game-over').style.display = 'flex';
  }

  // 获取某方所有合法移动，用于判断是否强制吃子
  function getMustCapture(board, player) {
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (getOwner(board[r][c]) === player) {
          if (getCaptureMoves(board, r, c).length > 0) return true;
        }
      }
    }
    return false;
  }

  // 获取某棋子的合法移动（考虑强制吃子规则）
  function getLegalMovesForPiece(board, r, c, player) {
    var mustCapture = getMustCapture(board, player);
    if (mustCapture) {
      return getCaptureMoves(board, r, c);
    }
    return getSimpleMoves(board, r, c);
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;
    // 如果在连续吃子中，只允许点击当前棋子
    if (gameState.multiJumpPiece) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (e.clientX - rect.left) * scaleX;
      var py = (e.clientY - rect.top) * scaleY;
      var col = Math.floor(px / CELL_SIZE);
      var row = Math.floor(py / CELL_SIZE);
      handleMultiJumpClick(row, col);
      return;
    }

    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var px = (e.clientX - rect.left) * scaleX;
    var py = (e.clientY - rect.top) * scaleY;
    var col = Math.floor(px / CELL_SIZE);
    var row = Math.floor(py / CELL_SIZE);

    if (!inBounds(row, col)) return;

    var piece = gameState.board[row][col];

    // 如果点击了己方棋子，选中它
    if (getOwner(piece) === gameState.currentPlayer) {
      var moves = getLegalMovesForPiece(gameState.board, row, col, gameState.currentPlayer);
      if (moves.length > 0) {
        gameState.selectedPiece = { r: row, c: col };
        gameState.validMoves = moves;
        renderGame(gameState);
      } else {
        updateMessage('该棋子没有合法移动', 'error');
      }
      return;
    }

    // 如果点击了空位且已选中棋子，尝试移动
    if (piece === EMPTY && gameState.selectedPiece) {
      var move = findMove(gameState.validMoves, row, col);
      if (move) {
        doMove(move);
      } else {
        updateMessage('无效的目标位置', 'error');
      }
      return;
    }
  }

  function handleMultiJumpClick(row, col) {
    var mp = gameState.multiJumpPiece;
    // 点击当前棋子本身，结束连续吃子
    if (row === mp.r && col === mp.c) {
      gameState.multiJumpPiece = null;
      gameState.selectedPiece = null;
      gameState.validMoves = [];
      endTurn();
      return;
    }
    // 尝试继续吃子
    var move = findMove(gameState.validMoves, row, col);
    if (move) {
      doMultiJumpMove(move);
    }
  }

  function findMove(moves, toR, toC) {
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].toR === toR && moves[i].toC === toC) return moves[i];
    }
    return null;
  }

  function doMove(move) {
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;

    // 检查是否升王后需要结束回合
    var piece = gameState.board[move.toR][move.toC];
    if (move.capturedR !== undefined) {
      // 吃子后检查是否能继续吃
      var promoted = promote(gameState.board[move.toR][move.toC], move.toR);
      if (promoted !== piece) {
        gameState.board[move.toR][move.toC] = promoted;
        // 升王后回合结束
        endTurn();
        return;
      }
      var nextCaps = getCaptureMoves(gameState.board, move.toR, move.toC);
      if (nextCaps.length > 0) {
        // 连续吃子
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
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.turnCount++;

    // 检查是否升王
    var piece = gameState.board[move.toR][move.toC];
    var promoted = promote(piece, move.toR);
    if (promoted !== piece) {
      gameState.board[move.toR][move.toC] = promoted;
      gameState.multiJumpPiece = null;
      gameState.selectedPiece = null;
      gameState.validMoves = [];
      endTurn();
      return;
    }

    var nextCaps = getCaptureMoves(gameState.board, move.toR, move.toC);
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
    var gameOverResult = checkGameOver(gameState.board, getOpponent(gameState.currentPlayer));
    if (gameOverResult) {
      gameState.gameOver = true;
      gameState.winner = gameOverResult.winner;
      renderGame(gameState);
      setTimeout(function() { showGameOver(gameState); }, 500);
      return;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    gameState.mustCapture = getMustCapture(gameState.board, gameState.currentPlayer);
    renderGame(gameState);

    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(function() {
      var move = getBestAIMove(gameState.board, gameState.aiTeam);
      gameState.aiThinking = false;
      if (move) {
        gameState.board = applyMove(gameState.board, move);
        gameState.lastMove = move;
        gameState.turnCount++;
        // AI连续吃子
        simulateAIChainCaptures(move);
      } else {
        endTurn();
      }
    }, 300);
  }

  function simulateAIChainCaptures(move) {
    var piece = gameState.board[move.toR][move.toC];
    var promoted = promote(piece, move.toR);
    if (promoted !== piece) {
      gameState.board[move.toR][move.toC] = promoted;
      endTurn();
      return;
    }
    var nextCaps = getCaptureMoves(gameState.board, move.toR, move.toC);
    if (nextCaps.length > 0) {
      // AI继续吃子（简单策略：选择第一个）
      var nextMove = nextCaps[0];
      renderGame(gameState);
      setTimeout(function() {
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

    if (mode === 'pve') {
      if (firstPlayer === RED) {
        gameState.playerTeam = RED;
        gameState.aiTeam = WHITE;
      } else {
        gameState.playerTeam = WHITE;
        gameState.aiTeam = RED;
      }
    }

    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('game-over').style.display = 'none';

    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;

    if (mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
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
      document.querySelectorAll('#rps-player-buttons .btn-rps').forEach(function(btn) {
        btn.classList.remove('selected');
      });
      event.target.classList.add('selected');

      var choices = ['rock', 'scissors', 'paper'];
      var aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      var resultEl = document.getElementById('rps-result');
      var humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你赢了！你先手(红方)。';
        setTimeout(function() { startGame('pve', RED); }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你输了！AI先手(红方)。';
        setTimeout(function() { startGame('pve', WHITE); }, 1500);
      } else {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，平局！重新选择。';
        rpsChoices.human = null;
        rpsChoices.player2 = null;
      }
    } else {
      rpsChoices['player' + player] = choice;
      document.querySelectorAll('#rps-p' + player + '-buttons .btn-rps').forEach(function(btn) {
        btn.classList.remove('selected');
      });
      event.target.classList.add('selected');

      var statusEl = document.getElementById('rps-p' + player + '-status');
      statusEl.textContent = '已选择：' + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        var resultEl = document.getElementById('rps-result');
        var winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          resultEl.textContent = '玩家1赢了！玩家1先手(红方)。';
          setTimeout(function() { startGame('pvp', RED); }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = '玩家2赢了！玩家2先手(红方)。';
          setTimeout(function() { startGame('pvp', WHITE); }, 1500);
        } else {
          resultEl.textContent = '平局！重新选择。';
          rpsChoices.player1 = null;
          rpsChoices.player2 = null;
          document.getElementById('rps-p1-status').textContent = '请选择';
          document.getElementById('rps-p2-status').textContent = '请选择';
          document.querySelectorAll('.btn-rps').forEach(function(btn) {
            btn.classList.remove('selected');
          });
        }
      }
    }
  }

  function judgeRPS(c1, c2) {
    if (c1 === c2) return 0;
    if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'scissors' && c2 === 'paper') || (c1 === 'paper' && c2 === 'rock'))
      return 1;
    return -1;
  }

  function getRPSName(c) {
    return { 'rock': '石头', 'scissors': '剪刀', 'paper': '布' }[c] || c;
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
        var player = ev.target.dataset.player;
        var choice = ev.target.dataset.choice;
        handleRPSChoice(player, choice);
      });
    });

    document.getElementById('btn-restart').addEventListener('click', restartGame);

    document.getElementById('mode-selection').style.display = 'flex';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
  });
}
