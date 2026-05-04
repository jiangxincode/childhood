// ============================================================
// 五子棋 (Gomoku) - 游戏核心逻辑
// ============================================================

var BOARD_SIZE = 15;
var EMPTY = 0;
var BLACK = 1;  // 先手
var WHITE = 2;  // 后手
var WIN_COUNT = 5;

// 预计算所有获胜线（共572条）
var WIN_LINES = [];
var WINS_MAP = [];  // WINS_MAP[x][y] = [线ID数组]

function initWinLines() {
  WIN_LINES = [];
  WINS_MAP = [];
  for (var i = 0; i < BOARD_SIZE; i++) {
    WINS_MAP[i] = [];
    for (var j = 0; j < BOARD_SIZE; j++) {
      WINS_MAP[i][j] = [];
    }
  }
  var lineId = 0;

  // 横向
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x <= BOARD_SIZE - WIN_COUNT; x++) {
      var line = [];
      for (var k = 0; k < WIN_COUNT; k++) {
        var pos = { x: x + k, y: y };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }

  // 纵向
  for (var x = 0; x < BOARD_SIZE; x++) {
    for (var y = 0; y <= BOARD_SIZE - WIN_COUNT; y++) {
      var line = [];
      for (var k = 0; k < WIN_COUNT; k++) {
        var pos = { x: x, y: y + k };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }

  // 右下对角线 (\)
  for (var x = 0; x <= BOARD_SIZE - WIN_COUNT; x++) {
    for (var y = 0; y <= BOARD_SIZE - WIN_COUNT; y++) {
      var line = [];
      for (var k = 0; k < WIN_COUNT; k++) {
        var pos = { x: x + k, y: y + k };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }

  // 左下对角线 (/)
  for (var x = WIN_COUNT - 1; x < BOARD_SIZE; x++) {
    for (var y = 0; y <= BOARD_SIZE - WIN_COUNT; y++) {
      var line = [];
      for (var k = 0; k < WIN_COUNT; k++) {
        var pos = { x: x - k, y: y + k };
        line.push(pos);
        WINS_MAP[pos.x][pos.y].push(lineId);
      }
      WIN_LINES.push(line);
      lineId++;
    }
  }
}

// 初始化获胜线
initWinLines();

function createBoard() {
  var board = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    var row = [];
    for (var x = 0; x < BOARD_SIZE; x++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function getOpponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

function getPlayerName(player) {
  return player === BLACK ? '黑棋' : '白棋';
}

/**
 * 在棋盘上落子后检测是否获胜
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @param {number} player
 * @returns {Array|null} 获胜线坐标数组，或null
 */
function checkWinAt(board, x, y, player) {
  var lines = WINS_MAP[x][y];
  for (var i = 0; i < lines.length; i++) {
    var lineId = lines[i];
    var line = WIN_LINES[lineId];
    var count = 0;
    for (var k = 0; k < line.length; k++) {
      if (board[line[k].y][line[k].x] === player) {
        count++;
      }
    }
    if (count === WIN_COUNT) {
      return line;
    }
  }
  return null;
}

function checkDraw(board) {
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === EMPTY) return false;
    }
  }
  return true;
}

function makeMove(board, x, y, player) {
  var newBoard = [];
  for (var r = 0; r < BOARD_SIZE; r++) {
    newBoard.push(board[r].slice());
  }
  newBoard[y][x] = player;
  return newBoard;
}

// ============================================================
// AI: 贪心评分策略 (参考 AiringGo)
// ============================================================

var SCORE_HUMAN = [0, 200, 400, 2000, 10000];
var SCORE_AI = [0, 220, 420, 2100, 20000];

function getBestAIMove(board, aiPlayer) {
  var humanPlayer = getOpponent(aiPlayer);
  var scoreAI = [];
  var scoreHuman = [];
  for (var i = 0; i < BOARD_SIZE; i++) {
    scoreAI[i] = [];
    scoreHuman[i] = [];
    for (var j = 0; j < BOARD_SIZE; j++) {
      scoreAI[i][j] = 0;
      scoreHuman[i][j] = 0;
    }
  }

  // 遍历所有获胜线，计算每个空位的得分
  for (var lid = 0; lid < WIN_LINES.length; lid++) {
    var line = WIN_LINES[lid];
    var aiCount = 0;
    var humanCount = 0;
    for (var k = 0; k < line.length; k++) {
      var val = board[line[k].y][line[k].x];
      if (val === aiPlayer) aiCount++;
      else if (val === humanPlayer) humanCount++;
    }

    // 如果这条线没有被双方都占，才考虑
    if (aiCount > 0 && humanCount > 0) continue;

    if (aiCount > 0 && humanCount === 0) {
      // AI的线，给空位加分
      for (var k = 0; k < line.length; k++) {
        if (board[line[k].y][line[k].x] === EMPTY) {
          scoreAI[line[k].x][line[k].y] += SCORE_AI[aiCount];
        }
      }
    } else if (humanCount > 0 && aiCount === 0) {
      // 人类的线，给空位加分（防守分）
      for (var k = 0; k < line.length; k++) {
        if (board[line[k].y][line[k].x] === EMPTY) {
          scoreHuman[line[k].x][line[k].y] += SCORE_HUMAN[humanCount];
        }
      }
    }
  }

  var maxScore = -1;
  var bestX = -1;
  var bestY = -1;

  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== EMPTY) continue;
      if (scoreAI[x][y] === 0 && scoreHuman[x][y] === 0) continue;

      var s = scoreAI[x][y] + scoreHuman[x][y];
      if (s > maxScore) {
        maxScore = s;
        bestX = x;
        bestY = y;
      } else if (s === maxScore) {
        // 同分时优先进攻（AI分高的）
        if (scoreAI[x][y] > scoreAI[bestX][bestY]) {
          bestX = x;
          bestY = y;
        }
      }
    }
  }

  // 棋盘全空时下天元
  if (bestX === -1) {
    var center = Math.floor(BOARD_SIZE / 2);
    return { x: center, y: center };
  }

  return { x: bestX, y: bestY };
}

// ============================================================
// 石头剪刀布
// ============================================================

function judgeRPS(choice1, choice2) {
  if (choice1 === choice2) return 0;
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'scissors' && choice2 === 'paper') ||
    (choice1 === 'paper' && choice2 === 'rock')
  ) {
    return 1;
  }
  return -1;
}

function getRPSName(choice) {
  var names = { 'rock': '石头', 'scissors': '剪刀', 'paper': '布' };
  return names[choice] || choice;
}

// ============================================================
// 游戏状态
// ============================================================

function createGameState(mode) {
  return {
    mode: mode,
    board: createBoard(),
    currentPlayer: BLACK,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    winLine: null,
    turnCount: 0,
    aiThinking: false,
    scoreBlack: 0,
    scoreWhite: 0,
    lastMove: null
  };
}

// ============================================================
// 导出供测试使用
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    BLACK: BLACK,
    WHITE: WHITE,
    WIN_COUNT: WIN_COUNT,
    WIN_LINES: WIN_LINES,
    WINS_MAP: WINS_MAP,
    initWinLines: initWinLines,
    createBoard: createBoard,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    checkWinAt: checkWinAt,
    checkDraw: checkDraw,
    makeMove: makeMove,
    getBestAIMove: getBestAIMove,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName,
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
  var CELL_SIZE = 30;
  var MARGIN = 15;
  var STONE_RADIUS = 13;
  var canvasSize = MARGIN * 2 + (BOARD_SIZE - 1) * CELL_SIZE;

  function initBoard() {
    canvas = document.getElementById('board-canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    context = canvas.getContext('2d');
    drawBoard();
  }

  function drawBoard() {
    // 背景
    context.fillStyle = '#f0d9b5';
    context.fillRect(0, 0, canvasSize, canvasSize);

    // 网格线
    context.strokeStyle = '#8b7355';
    context.lineWidth = 1;
    for (var i = 0; i < BOARD_SIZE; i++) {
      var pos = MARGIN + i * CELL_SIZE;
      // 竖线
      context.beginPath();
      context.moveTo(pos, MARGIN);
      context.lineTo(pos, MARGIN + (BOARD_SIZE - 1) * CELL_SIZE);
      context.stroke();
      // 横线
      context.beginPath();
      context.moveTo(MARGIN, pos);
      context.lineTo(MARGIN + (BOARD_SIZE - 1) * CELL_SIZE, pos);
      context.stroke();
    }

    // 天元和星位
    var starPoints = [
      { x: 3, y: 3 }, { x: 3, y: 11 },
      { x: 7, y: 7 },
      { x: 11, y: 3 }, { x: 11, y: 11 }
    ];
    context.fillStyle = '#8b7355';
    for (var i = 0; i < starPoints.length; i++) {
      var sx = MARGIN + starPoints[i].x * CELL_SIZE;
      var sy = MARGIN + starPoints[i].y * CELL_SIZE;
      context.beginPath();
      context.arc(sx, sy, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawStone(x, y, player) {
    var cx = MARGIN + x * CELL_SIZE;
    var cy = MARGIN + y * CELL_SIZE;
    var gradient = context.createRadialGradient(
      cx + 2, cy - 2, 2,
      cx, cy, STONE_RADIUS
    );
    if (player === BLACK) {
      gradient.addColorStop(0, '#636766');
      gradient.addColorStop(1, '#0A0A0A');
    } else {
      gradient.addColorStop(0, '#F9F9F9');
      gradient.addColorStop(1, '#D1D1D1');
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  function drawLastMoveMarker(x, y) {
    var cx = MARGIN + x * CELL_SIZE;
    var cy = MARGIN + y * CELL_SIZE;
    context.strokeStyle = '#e53935';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, 5, 0, Math.PI * 2);
    context.stroke();
  }

  function drawWinLine(line) {
    context.strokeStyle = '#e53935';
    context.lineWidth = 3;
    context.beginPath();
    var sx = MARGIN + line[0].x * CELL_SIZE;
    var sy = MARGIN + line[0].y * CELL_SIZE;
    context.moveTo(sx, sy);
    for (var i = 1; i < line.length; i++) {
      var ex = MARGIN + line[i].x * CELL_SIZE;
      var ey = MARGIN + line[i].y * CELL_SIZE;
      context.lineTo(ex, ey);
    }
    context.stroke();
  }

  function renderGame(state) {
    drawBoard();

    // 绘制所有棋子
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        if (state.board[y][x] !== EMPTY) {
          drawStone(x, y, state.board[y][x]);
        }
      }
    }

    // 标记最后一手
    if (state.lastMove) {
      drawLastMoveMarker(state.lastMove.x, state.lastMove.y);
    }

    // 绘制获胜线
    if (state.winLine) {
      drawWinLine(state.winLine);
    }

    // 更新状态栏
    document.getElementById('current-player').textContent = getPlayerName(state.currentPlayer);
    document.getElementById('current-player').className =
      'team-indicator ' + (state.currentPlayer === BLACK ? 'text-black' : 'text-white-stone');
    document.getElementById('turn-count').textContent = state.turnCount;
    document.getElementById('score-black').textContent = state.scoreBlack;
    document.getElementById('score-white').textContent = state.scoreWhite;

    if (state.gameOver) {
      updateMessage('游戏结束！', 'info');
    } else if (state.aiThinking) {
      updateMessage('AI正在思考...', 'info');
    } else if (state.mode === 'pve' && state.currentPlayer === state.aiTeam) {
      updateMessage('轮到AI行动', 'info');
    } else {
      updateMessage('轮到 ' + getPlayerName(state.currentPlayer) + ' 落子', 'info');
    }
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

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;

    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var px = (e.clientX - rect.left) * scaleX;
    var py = (e.clientY - rect.top) * scaleY;

    var x = Math.round((px - MARGIN) / CELL_SIZE);
    var y = Math.round((py - MARGIN) / CELL_SIZE);

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
    if (gameState.board[y][x] !== EMPTY) {
      updateMessage('此处已有棋子！', 'error');
      return;
    }

    doMove(x, y);
  }

  function doMove(x, y) {
    gameState.board = makeMove(gameState.board, x, y, gameState.currentPlayer);
    gameState.lastMove = { x: x, y: y };
    gameState.turnCount++;

    var winLine = checkWinAt(gameState.board, x, y, gameState.currentPlayer);
    if (winLine) {
      gameState.gameOver = true;
      gameState.winner = gameState.currentPlayer;
      gameState.winLine = winLine;
      if (gameState.currentPlayer === BLACK) gameState.scoreBlack++;
      else gameState.scoreWhite++;
      renderGame(gameState);
      setTimeout(function() { showGameOver(gameState); }, 500);
      return;
    }
    if (checkDraw(gameState.board)) {
      gameState.gameOver = true;
      gameState.winner = null;
      renderGame(gameState);
      setTimeout(function() { showGameOver(gameState); }, 500);
      return;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
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
      if (move) doMove(move.x, move.y);
    }, 500);
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || BLACK;

    if (mode === 'pve') {
      if (firstPlayer === BLACK) {
        gameState.playerTeam = BLACK;
        gameState.aiTeam = WHITE;
      } else {
        gameState.playerTeam = WHITE;
        gameState.aiTeam = BLACK;
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
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你赢了！你先手(黑棋)。';
        setTimeout(function() { startGame('pve', BLACK); }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你输了！AI先手(黑棋)。';
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
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家1赢了！玩家1先手(黑棋)。';
          setTimeout(function() { startGame('pvp', BLACK); }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家2赢了！玩家2先手(黑棋)。';
          setTimeout(function() { startGame('pvp', WHITE); }, 1500);
        } else {
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，平局！重新选择。';
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
