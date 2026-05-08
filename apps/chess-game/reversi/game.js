// ============================================================
// 黑白棋（翻转棋）- 游戏核心逻辑
// ============================================================

// ============================================================
// 任务 1.1：常量和基础工具函数
// ============================================================

// 棋盘大小
const BOARD_SIZE = 8;

// 玩家颜色
const PLAYER_BLACK = 'black';
const PLAYER_WHITE = 'white';

// 八个方向：上、下、左、右、左上、右上、左下、右下
const DIRECTIONS = [
  { dx: -1, dy: 0 },   // 上
  { dx: 1, dy: 0 },    // 下
  { dx: 0, dy: -1 },   // 左
  { dx: 0, dy: 1 },    // 右
  { dx: -1, dy: -1 },  // 左上
  { dx: -1, dy: 1 },   // 右上
  { dx: 1, dy: -1 },   // 左下
  { dx: 1, dy: 1 }     // 右下
];

/**
 * 判断坐标是否在棋盘范围内
 * @param {number} x - 0~7
 * @param {number} y - 0~7
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/**
 * 获取对手颜色
 * @param {string} player - 'black' | 'white'
 * @returns {string}
 */
function getOpponent(player) {
  return player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
}

/**
 * 检查某个方向是否可以夹住对手棋子
 * @param {Board} board - 棋盘状态
 * @param {number} x - 落子位置x坐标
 * @param {number} y - 落子位置y坐标
 * @param {string} player - 当前玩家颜色
 * @param {Object} dir - 方向对象 {dx, dy}
 * @returns {Array<{x, y}>|null} - 可以翻转的棋子位置数组，如果不能夹住则返回null
 */
function checkDirection(board, x, y, player, dir) {
  const opponent = getOpponent(player);
  const flipped = [];
  let nx = x + dir.dx;
  let ny = y + dir.dy;
  
  // 检查相邻位置是否有对手棋子
  if (!inBounds(nx, ny) || board[ny][nx] !== opponent) {
    return null;
  }
  
  // 继续沿着方向检查
  flipped.push({x: nx, y: ny});
  nx += dir.dx;
  ny += dir.dy;
  
  while (inBounds(nx, ny)) {
    if (board[ny][nx] === player) {
      // 找到己方棋子，可以夹住
      return flipped;
    } else if (board[ny][nx] === opponent) {
      // 还是对手棋子，继续检查
      flipped.push({x: nx, y: ny});
      nx += dir.dx;
      ny += dir.dy;
    } else {
      // 遇到空位，不能夹住
      return null;
    }
  }
  
  // 到达棋盘边界，不能夹住
  return null;
}

/**
 * 检查落子是否合法
 * @param {Board} board - 棋盘状态
 * @param {number} x - 落子位置x坐标
 * @param {number} y - 落子位置y坐标
 * @param {string} player - 当前玩家颜色
 * @returns {Array<{x, y}>|null} - 可以翻转的棋子位置数组，如果不合法则返回null
 */
function isValidMove(board, x, y, player) {
  // 位置必须在棋盘内
  if (!inBounds(x, y)) return null;
  
  // 位置必须为空
  if (board[y][x] !== null) return null;
  
  const opponent = getOpponent(player);
  const allFlipped = [];
  
  // 检查所有方向
  for (const dir of DIRECTIONS) {
    const flipped = checkDirection(board, x, y, player, dir);
    if (flipped) {
      allFlipped.push(...flipped);
    }
  }
  
  // 必须至少夹住一个对手棋子
  if (allFlipped.length === 0) return null;
  
  return allFlipped;
}

/**
 * 获取当前玩家的所有合法落子位置
 * @param {Board} board - 棋盘状态
 * @param {string} player - 当前玩家颜色
 * @returns {Array<{x, y, flipped: Array}>} - 合法落子位置及其可翻转的棋子
 */
function getValidMoves(board, player) {
  const validMoves = [];
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === null) {
        const flipped = isValidMove(board, x, y, player);
        if (flipped) {
          validMoves.push({x, y, flipped});
        }
      }
    }
  }
  
  return validMoves;
}

/**
 * 执行落子操作
 * @param {Board} board - 棋盘状态
 * @param {number} x - 落子位置x坐标
 * @param {number} y - 落子位置y坐标
 * @param {string} player - 当前玩家颜色
 * @returns {Array<{x, y}>} - 被翻转的棋子位置数组
 */
function makeMove(board, x, y, player) {
  const flipped = isValidMove(board, x, y, player);
  if (!flipped) return [];
  
  // 放置新棋子
  board[y][x] = player;
  
  // 翻转被夹住的棋子
  for (const pos of flipped) {
    board[pos.y][pos.x] = player;
  }
  
  return flipped;
}

/**
 * 统计棋盘上各颜色棋子数量
 * @param {Board} board - 棋盘状态
 * @returns {Object} - {black: number, white: number}
 */
function countPieces(board) {
  let black = 0;
  let white = 0;
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === PLAYER_BLACK) black++;
      else if (board[y][x] === PLAYER_WHITE) white++;
    }
  }
  
  return {black, white};
}

/**
 * 检查游戏是否结束
 * @param {Board} board - 棋盘状态
 * @returns {boolean}
 */
function isGameOver(board) {
  const blackMoves = getValidMoves(board, PLAYER_BLACK);
  const whiteMoves = getValidMoves(board, PLAYER_WHITE);
  
  return blackMoves.length === 0 && whiteMoves.length === 0;
}

/**
 * 判断胜负
 * @param {Board} board - 棋盘状态
 * @returns {string|null} - 'black' | 'white' | 'draw'
 */
function getWinner(board) {
  const {black, white} = countPieces(board);
  
  if (black > white) return PLAYER_BLACK;
  else if (white > black) return PLAYER_WHITE;
  else return 'draw';
}

// ============================================================
// 任务 1.2：游戏状态创建函数
// ============================================================

/**
 * 创建初始游戏状态
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState}
 */
function createGameState(mode) {
  // 创建8x8空棋盘
  const board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push(null);
    }
    board.push(row);
  }
  
  // 设置初始棋子
  const center = BOARD_SIZE / 2;
  board[center - 1][center - 1] = PLAYER_WHITE;  // d4
  board[center - 1][center] = PLAYER_BLACK;      // e4
  board[center][center - 1] = PLAYER_BLACK;       // d5
  board[center][center] = PLAYER_WHITE;          // e5
  
  return {
    mode,
    board,
    currentPlayer: PLAYER_BLACK,  // 黑棋先行
    playerTeam: null,
    aiTeam: null,
    teamAssigned: false,
    firstPlayer: null,
    turnCount: 0,
    validMoves: getValidMoves(board, PLAYER_BLACK),
    gameOver: false,
    winner: null,
    aiThinking: false,
    aiFirst: false,
    lastMove: null,
    skippedTurn: false
  };
}

// ============================================================
// 任务 1.3：AI逻辑函数
// ============================================================

/**
 * 简单AI：选择可以翻转最多棋子的位置
 * @param {Board} board - 棋盘状态
 * @param {string} aiPlayer - AI玩家颜色
 * @returns {{x, y}|null} - 最佳落子位置
 */
function getBestAIMove(board, aiPlayer) {
  const validMoves = getValidMoves(board, aiPlayer);
  if (validMoves.length === 0) return null;
  
  // 选择可以翻转最多棋子的位置
  let bestMove = validMoves[0];
  for (const move of validMoves) {
    if (move.flipped.length > bestMove.flipped.length) {
      bestMove = move;
    }
  }
  
  return {x: bestMove.x, y: bestMove.y};
}

/**
 * AI执行回合
 * @param {GameState} state - 游戏状态
 */
function aiTurn(state) {
  if (state.gameOver || state.currentPlayer !== state.aiTeam) return;
  
  state.aiThinking = true;
  updateMessage('AI正在思考...', 'info');
  
  // 模拟AI思考时间
  setTimeout(() => {
    const bestMove = getBestAIMove(state.board, state.aiTeam);
    
    if (bestMove) {
      // AI有合法落子位置
      const flipped = makeMove(state.board, bestMove.x, bestMove.y, state.aiTeam);
      state.lastMove = {x: bestMove.x, y: bestMove.y};
      state.turnCount++;

      // 更新合法落子位置
      state.validMoves = getValidMoves(state.board, getOpponent(state.aiTeam));
      state.currentPlayer = getOpponent(state.aiTeam);

      // 检查游戏是否结束
      if (state.validMoves.length === 0) {
        // 对手无合法位置，AI继续
        const nextMoves = getValidMoves(state.board, state.aiTeam);
        if (nextMoves.length === 0) {
          // 双方都无法落子，游戏结束
          state.gameOver = true;
          state.winner = getWinner(state.board);
        } else {
          // 对手跳过，AI继续
          state.skippedTurn = true;
          state.currentPlayer = state.aiTeam;
          state.validMoves = nextMoves;
        }
      } else {
        state.skippedTurn = false;
      }
    } else {
      // AI无合法位置
      const opponentMoves = getValidMoves(state.board, getOpponent(state.aiTeam));
      if (opponentMoves.length === 0) {
        // 双方都无法落子，游戏结束
        state.gameOver = true;
        state.winner = getWinner(state.board);
      } else {
        // AI跳过，对手继续
        state.skippedTurn = true;
        state.currentPlayer = getOpponent(state.aiTeam);
        state.validMoves = opponentMoves;
      }
    }

    state.aiThinking = false;
    renderGame(state);

    // 如果游戏结束，显示结果
    if (state.gameOver) {
      setTimeout(() => showGameOver(state), 500);
    } else if (state.currentPlayer === state.aiTeam) {
      // 对手被跳过，AI继续行动
      setTimeout(() => aiTurn(state), 1000);
    }
  }, 800);
}

// ============================================================
// 任务 1.4：DOM操作和渲染函数
// ============================================================

let gameState = null;

/**
 * 初始化棋盘DOM
 */
function initBoard() {
  const boardElement = document.getElementById('board');
  boardElement.innerHTML = '';
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener('click', () => handleCellClick(x, y));
      boardElement.appendChild(cell);
    }
  }
}

/**
 * 渲染游戏状态
 * @param {GameState} state - 游戏状态
 */
function renderGame(state) {
  // 更新状态栏
  document.getElementById('current-team').textContent = 
    state.currentPlayer === PLAYER_BLACK ? '黑棋' : '白棋';
  document.getElementById('current-team').className = 
    state.currentPlayer === PLAYER_BLACK ? 'team-indicator black-text' : 'team-indicator white-text';
  
  document.getElementById('turn-count').textContent = state.turnCount;
  
  const counts = countPieces(state.board);
  document.getElementById('black-count').textContent = counts.black;
  document.getElementById('white-count').textContent = counts.white;
  document.getElementById('valid-moves-count').textContent = state.validMoves.length;
  
  // 渲染棋盘
  const boardElement = document.getElementById('board');
  const cells = boardElement.querySelectorAll('.cell');
  
  // 清除所有样式
  cells.forEach(cell => {
    cell.className = 'cell';
    cell.innerHTML = '';
  });
  
  // 渲染棋子和合法落子点
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = boardElement.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
      const piece = state.board[y][x];
      
      if (piece) {
        const pieceDiv = document.createElement('div');
        pieceDiv.className = `piece piece-${piece}`;
        cell.appendChild(pieceDiv);
      }
      
      // 标记最近落子位置
      if (state.lastMove && state.lastMove.x === x && state.lastMove.y === y) {
        cell.classList.add('cell-last-move');
      }
    }
  }
  
  // 标记合法落子点
  for (const move of state.validMoves) {
    const cell = boardElement.querySelector(`.cell[data-x="${move.x}"][data-y="${move.y}"]`);
    const indicator = document.createElement('div');
    indicator.className = 'valid-move-indicator';
    cell.appendChild(indicator);
  }
  
  // 更新消息
  if (state.gameOver) {
    updateMessage('游戏结束！', 'info');
  } else if (state.skippedTurn) {
    updateMessage(`${state.currentPlayer === PLAYER_BLACK ? '黑棋' : '白棋'}无合法位置，跳过回合！`, 'info');
  } else if (state.aiThinking) {
    updateMessage('AI正在思考...', 'info');
  } else if (state.mode === 'pve' && state.currentPlayer === state.aiTeam) {
    updateMessage('轮到AI行动', 'info');
  } else {
    updateMessage(`轮到${state.currentPlayer === PLAYER_BLACK ? '黑棋' : '白棋'}行动`, 'info');
  }
}

/**
 * 更新消息显示
 * @param {string} text - 消息文本
 * @param {string} type - 消息类型 'info' | 'error'
 */
function updateMessage(text, type = 'info') {
  const messageElement = document.getElementById('message');
  messageElement.textContent = text;
  messageElement.className = type === 'error' ? 'error' : '';
}

/**
 * 显示游戏结束界面
 * @param {GameState} state - 游戏状态
 */
function showGameOver(state) {
  const winnerText = document.getElementById('winner-text');
  const counts = countPieces(state.board);
  
  if (state.winner === 'draw') {
    winnerText.textContent = `游戏结束！平局！黑棋: ${counts.black} 白棋: ${counts.white}`;
  } else {
    const winnerName = state.winner === PLAYER_BLACK ? '黑棋' : '白棋';
    winnerText.textContent = `游戏结束！${winnerName}获胜！黑棋: ${counts.black} 白棋: ${counts.white}`;
  }
  
  document.getElementById('game-over').style.display = 'flex';
}

// ============================================================
// 任务 1.5：事件处理函数
// ============================================================

/**
 * 处理棋盘格子点击
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 */
function handleCellClick(x, y) {
  if (!gameState || gameState.gameOver || gameState.aiThinking) return;
  
  // 在人机对战模式下，如果是AI的回合，不允许玩家操作
  if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;
  
  // 检查是否为合法落子位置
  const isValid = gameState.validMoves.some(move => move.x === x && move.y === y);
  if (!isValid) {
    updateMessage('非法落子位置！', 'error');
    return;
  }
  
  // 执行落子
  const flipped = makeMove(gameState.board, x, y, gameState.currentPlayer);
  gameState.lastMove = {x, y};
  gameState.turnCount++;
  
  // 切换玩家
  const nextPlayer = getOpponent(gameState.currentPlayer);
  const nextMoves = getValidMoves(gameState.board, nextPlayer);
  
  if (nextMoves.length === 0) {
    // 对手无合法位置，检查当前玩家是否还有合法位置
    const currentMoves = getValidMoves(gameState.board, gameState.currentPlayer);
    if (currentMoves.length === 0) {
      // 双方都无法落子，游戏结束
      gameState.gameOver = true;
      gameState.winner = getWinner(gameState.board);
    } else {
      // 对手跳过，当前玩家继续
      gameState.skippedTurn = true;
      gameState.validMoves = currentMoves;
      // 当前玩家不变
    }
  } else {
    // 对手有合法位置
    gameState.currentPlayer = nextPlayer;
    gameState.validMoves = nextMoves;
    gameState.skippedTurn = false;
  }
  
  renderGame(gameState);
  
  // 如果游戏结束，显示结果
  if (gameState.gameOver) {
    setTimeout(() => showGameOver(gameState), 500);
  } else if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
    // 如果是AI的回合，触发AI行动
    setTimeout(() => aiTurn(gameState), 500);
  }
}

/**
 * 开始游戏
 * @param {string} mode - 'pvp' | 'pve'
 * @param {string} firstPlayer - 先手玩家 'black' | 'white'
 */
function startGame(mode, firstPlayer = PLAYER_BLACK) {
  gameState = createGameState(mode);
  gameState.currentPlayer = firstPlayer;
  gameState.validMoves = getValidMoves(gameState.board, firstPlayer);
  
  // 设置人机对战模式下的玩家和AI
  if (mode === 'pve') {
    // 石头剪刀布决定谁先手
    if (firstPlayer === PLAYER_BLACK) {
      // 玩家先手（黑棋）
      gameState.playerTeam = PLAYER_BLACK;
      gameState.aiTeam = PLAYER_WHITE;
      gameState.aiFirst = false;
    } else {
      // AI先手（白棋）
      gameState.playerTeam = PLAYER_WHITE;
      gameState.aiTeam = PLAYER_BLACK;
      gameState.aiFirst = true;
    }
    gameState.teamAssigned = true;
  }
  
  // 隐藏模式选择界面
  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('rps-section').style.display = 'none';
  
  // 显示游戏区域
  document.getElementById('game-area').style.display = 'flex';
  
  // 初始化棋盘
  initBoard();
  renderGame(gameState);
  
  // 如果是人机对战且AI先手，触发AI行动
  if (mode === 'pve' && gameState.aiFirst) {
    setTimeout(() => aiTurn(gameState), 500);
  }
}

/**
 * 重新开始游戏
 */
function restartGame() {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('mode-selection').style.display = 'flex';
  document.getElementById('game-area').style.display = 'none';
  gameState = null;
}

// ============================================================
// 任务 1.6：石头剪刀布逻辑
// ============================================================

let rpsChoices = { player1: null, player2: null, human: null };

/**
 * 处理石头剪刀布选择
 * @param {string} player - '1' | '2' | 'human'
 * @param {string} choice - 'rock' | 'scissors' | 'paper'
 */
function handleRPSChoice(player, choice) {
  if (player === 'human') {
    rpsChoices.human = choice;
    document.querySelectorAll('#rps-player-buttons .btn-rps').forEach(btn => {
      btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // AI随机选择
    const choices = ['rock', 'scissors', 'paper'];
    const aiChoice = choices[Math.floor(Math.random() * 3)];
    rpsChoices.player2 = aiChoice;
    
    // 显示结果
    const resultElement = document.getElementById('rps-result');
    const humanWins = judgeRPS(choice, aiChoice);
    
    if (humanWins === 1) {
      resultElement.textContent = `你选择了${getRPSName(choice)}，AI选择了${getRPSName(aiChoice)}，你赢了！你先手。`;
      setTimeout(() => startGame('pve', PLAYER_BLACK), 1500);
    } else if (humanWins === -1) {
      resultElement.textContent = `你选择了${getRPSName(choice)}，AI选择了${getRPSName(aiChoice)}，你输了！AI先手。`;
      setTimeout(() => startGame('pve', PLAYER_WHITE), 1500);
    } else {
      resultElement.textContent = `你选择了${getRPSName(choice)}，AI选择了${getRPSName(aiChoice)}，平局！重新选择。`;
      rpsChoices.human = null;
      rpsChoices.player2 = null;
    }
  } else {
    rpsChoices[`player${player}`] = choice;
    document.querySelectorAll(`#rps-p${player}-buttons .btn-rps`).forEach(btn => {
      btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    const statusElement = document.getElementById(`rps-p${player}-status`);
    statusElement.textContent = `已选择：${getRPSName(choice)}`;
    
    // 检查双方是否都已选择
    if (rpsChoices.player1 && rpsChoices.player2) {
      const resultElement = document.getElementById('rps-result');
      const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);
      
      if (winner === 1) {
        resultElement.textContent = `玩家1选择了${getRPSName(rpsChoices.player1)}，玩家2选择了${getRPSName(rpsChoices.player2)}，玩家1赢了！玩家1先手。`;
        setTimeout(() => startGame('pvp', PLAYER_BLACK), 1500);
      } else if (winner === -1) {
        resultElement.textContent = `玩家1选择了${getRPSName(rpsChoices.player1)}，玩家2选择了${getRPSName(rpsChoices.player2)}，玩家2赢了！玩家2先手。`;
        setTimeout(() => startGame('pvp', PLAYER_WHITE), 1500);
      } else {
        resultElement.textContent = `玩家1选择了${getRPSName(rpsChoices.player1)}，玩家2选择了${getRPSName(rpsChoices.player2)}，平局！重新选择。`;
        rpsChoices.player1 = null;
        rpsChoices.player2 = null;
        document.getElementById('rps-p1-status').textContent = '请选择';
        document.getElementById('rps-p2-status').textContent = '请选择';
        document.querySelectorAll('.btn-rps').forEach(btn => {
          btn.classList.remove('selected');
        });
      }
    }
  }
}

/**
 * 石头剪刀布判定
 * @param {string} choice1 - 'rock' | 'scissors' | 'paper'
 * @param {string} choice2 - 'rock' | 'scissors' | 'paper'
 * @returns {number} 1=第一方胜, -1=第二方胜, 0=平局
 */
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

/**
 * 获取石头剪刀布选择的中文名称
 * @param {string} choice - 'rock' | 'scissors' | 'paper'
 * @returns {string}
 */
function getRPSName(choice) {
  const names = {
    'rock': '石头',
    'scissors': '剪刀',
    'paper': '布'
  };
  return names[choice] || choice;
}

// 导出供测试使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BOARD_SIZE,
    PLAYER_BLACK,
    PLAYER_WHITE,
    DIRECTIONS,
    inBounds,
    getOpponent,
    isValidMove,
    getValidMoves,
    makeMove,
    countPieces,
    isGameOver,
    getWinner,
    createGameState,
    judgeRPS,
    getBestAIMove
  };
}

// ============================================================
// 任务 1.7：初始化事件监听器（仅浏览器环境）
// ============================================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // 模式选择按钮
    document.getElementById('btn-pvp').addEventListener('click', () => {
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'block';
      document.getElementById('rps-pve').style.display = 'none';
      rpsChoices = { player1: null, player2: null, human: null };
    });

    document.getElementById('btn-pve').addEventListener('click', () => {
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('rps-section').style.display = 'flex';
      document.getElementById('rps-pvp').style.display = 'none';
      document.getElementById('rps-pve').style.display = 'block';
      rpsChoices = { player1: null, player2: null, human: null };
    });

    // 石头剪刀布按钮
    document.querySelectorAll('.btn-rps').forEach(button => {
      button.addEventListener('click', (event) => {
        const player = event.target.dataset.player;
        const choice = event.target.dataset.choice;
        handleRPSChoice(player, choice);
      });
    });

    // 重新开始按钮
    document.getElementById('btn-restart').addEventListener('click', restartGame);

    // 初始显示模式选择界面
    document.getElementById('mode-selection').style.display = 'flex';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
  });
}