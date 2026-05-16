// ============================================================
// Reversi (Othello) - Game Core Logic
// ============================================================

// ============================================================
// Task 1.1: Constants and Basic Utility Functions
// ============================================================

// Board size
const BOARD_SIZE = 8;

// Player colors
const PLAYER_BLACK = 'black';
const PLAYER_WHITE = 'white';

// Eight directions: up, down, left, right, upper-left, upper-right, lower-left, lower-right
const DIRECTIONS = [
  { dx: -1, dy: 0 },   // Up
  { dx: 1, dy: 0 },    // Down
  { dx: 0, dy: -1 },   // Left
  { dx: 0, dy: 1 },    // Right
  { dx: -1, dy: -1 },  // Upper-left
  { dx: -1, dy: 1 },   // Upper-right
  { dx: 1, dy: -1 },   // Lower-left
  { dx: 1, dy: 1 }     // Lower-right
];

/**
 * Check if coordinates are within board bounds
 * @param {number} x - 0~7
 * @param {number} y - 0~7
 * @returns {boolean}
 */
function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/**
 * Get opponent color
 * @param {string} player - 'black' | 'white'
 * @returns {string}
 */
function getOpponent(player) {
  return player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
}

/**
 * Check if a direction can flank opponent pieces
 * @param {Board} board - Board state
 * @param {number} x - Move position x coordinate
 * @param {number} y - Move position y coordinate
 * @param {string} player - Current player color
 * @param {Object} dir - Direction object {dx, dy}
 * @returns {Array<{x, y}>|null} - Array of flippable piece positions, or null if cannot flank
 */
function checkDirection(board, x, y, player, dir) {
  const opponent = getOpponent(player);
  const flipped = [];
  let nx = x + dir.dx;
  let ny = y + dir.dy;
  
  // Check if adjacent position has opponent piece
  if (!inBounds(nx, ny) || board[ny][nx] !== opponent) {
    return null;
  }
  
  // Continue checking along direction
  flipped.push({x: nx, y: ny});
  nx += dir.dx;
  ny += dir.dy;
  
  while (inBounds(nx, ny)) {
    if (board[ny][nx] === player) {
      // Found own piece, can flank
      return flipped;
    } else if (board[ny][nx] === opponent) {
      // Still opponent piece, continue checking
      flipped.push({x: nx, y: ny});
      nx += dir.dx;
      ny += dir.dy;
    } else {
      // Encountered empty spot, cannot flank
      return null;
    }
  }
  
  // Reached board boundary, cannot flank
  return null;
}

/**
 * Check if a move is valid
 * @param {Board} board - Board state
 * @param {number} x - Move position x coordinate
 * @param {number} y - Move position y coordinate
 * @param {string} player - Current player color
 * @returns {Array<{x, y}>|null} - Array of flippable piece positions, or null if invalid
 */
function isValidMove(board, x, y, player) {
  // Position must be within board
  if (!inBounds(x, y)) return null;
  
  // Position must be empty
  if (board[y][x] !== null) return null;
  
  const opponent = getOpponent(player);
  const allFlipped = [];
  
  // Check all directions
  for (const dir of DIRECTIONS) {
    const flipped = checkDirection(board, x, y, player, dir);
    if (flipped) {
      allFlipped.push(...flipped);
    }
  }
  
  // Must flank at least one opponent piece
  if (allFlipped.length === 0) return null;
  
  return allFlipped;
}

/**
 * Get all valid move positions for current player
 * @param {Board} board - Board state
 * @param {string} player - Current player color
 * @returns {Array<{x, y, flipped: Array}>} - Valid move positions and their flippable pieces
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
 * Execute a move
 * @param {Board} board - Board state
 * @param {number} x - Move position x coordinate
 * @param {number} y - Move position y coordinate
 * @param {string} player - Current player color
 * @returns {Array<{x, y}>} - Array of flipped piece positions
 */
function makeMove(board, x, y, player) {
  const flipped = isValidMove(board, x, y, player);
  if (!flipped) return [];
  
  // Place new piece
  board[y][x] = player;
  
  // Flip flanked pieces
  for (const pos of flipped) {
    board[pos.y][pos.x] = player;
  }
  
  return flipped;
}

/**
 * Count pieces of each color on board
 * @param {Board} board - Board state
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
 * Check if game is over
 * @param {Board} board - Board state
 * @returns {boolean}
 */
function isGameOver(board) {
  const blackMoves = getValidMoves(board, PLAYER_BLACK);
  const whiteMoves = getValidMoves(board, PLAYER_WHITE);
  
  return blackMoves.length === 0 && whiteMoves.length === 0;
}

/**
 * Determine winner
 * @param {Board} board - Board state
 * @returns {string|null} - 'black' | 'white' | 'draw'
 */
function getWinner(board) {
  const {black, white} = countPieces(board);
  
  if (black > white) return PLAYER_BLACK;
  else if (white > black) return PLAYER_WHITE;
  else return 'draw';
}

// ============================================================
// Task 1.2: Game State Creation Function
// ============================================================

/**
 * Create initial game state
 * @param {string} mode - 'pvp' | 'pve'
 * @returns {GameState}
 */
function createGameState(mode) {
  // Create 8x8 empty board
  const board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push(null);
    }
    board.push(row);
  }
  
  // Set initial pieces
  const center = BOARD_SIZE / 2;
  board[center - 1][center - 1] = PLAYER_WHITE;  // d4
  board[center - 1][center] = PLAYER_BLACK;      // e4
  board[center][center - 1] = PLAYER_BLACK;       // d5
  board[center][center] = PLAYER_WHITE;          // e5
  
  return {
    mode,
    board,
    currentPlayer: PLAYER_BLACK,  // Black goes first
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
// Task 1.3: AI Logic Functions
// ============================================================

/**
 * Simple AI: select position that flips the most pieces
 * @param {Board} board - Board state
 * @param {string} aiPlayer - AI player color
 * @returns {{x, y}|null} - Best move position
 */
function getBestAIMove(board, aiPlayer) {
  const validMoves = getValidMoves(board, aiPlayer);
  if (validMoves.length === 0) return null;
  
  // Select position that flips the most pieces
  let bestMove = validMoves[0];
  for (const move of validMoves) {
    if (move.flipped.length > bestMove.flipped.length) {
      bestMove = move;
    }
  }
  
  return {x: bestMove.x, y: bestMove.y};
}

/**
 * AI executes turn
 * @param {GameState} state - game state
 */
function aiTurn(state) {
  if (state.gameOver || state.currentPlayer !== state.aiTeam) return;
  
  state.aiThinking = true;
  updateMessage('AI正在思考...', 'info');
  
  // Simulate AI thinking time
  setTimeout(() => {
    const bestMove = getBestAIMove(state.board, state.aiTeam);
    
    if (bestMove) {
      // AI has valid move position
      const flipped = makeMove(state.board, bestMove.x, bestMove.y, state.aiTeam);
      state.lastMove = {x: bestMove.x, y: bestMove.y};
      state.turnCount++;

      // Update valid move positions
      state.validMoves = getValidMoves(state.board, getOpponent(state.aiTeam));
      state.currentPlayer = getOpponent(state.aiTeam);

      // Check if game is over
      if (state.validMoves.length === 0) {
        // Opponent has no valid moves, AI continues
        const nextMoves = getValidMoves(state.board, state.aiTeam);
        if (nextMoves.length === 0) {
          // Neither side can move, game over
          state.gameOver = true;
          state.winner = getWinner(state.board);
        } else {
          // Opponent skipped, AI continues
          state.skippedTurn = true;
          state.currentPlayer = state.aiTeam;
          state.validMoves = nextMoves;
        }
      } else {
        state.skippedTurn = false;
      }
    } else {
      // AI has no valid moves
      const opponentMoves = getValidMoves(state.board, getOpponent(state.aiTeam));
      if (opponentMoves.length === 0) {
        // Neither side can move, game over
        state.gameOver = true;
        state.winner = getWinner(state.board);
      } else {
        // AI skipped, opponent continues
        state.skippedTurn = true;
        state.currentPlayer = getOpponent(state.aiTeam);
        state.validMoves = opponentMoves;
      }
    }

    state.aiThinking = false;
    renderGame(state);

    // If game over, show result
    if (state.gameOver) {
      setTimeout(() => showGameOver(state), 500);
    } else if (state.currentPlayer === state.aiTeam) {
      // Opponent skipped, AI continues
      setTimeout(() => aiTurn(state), 1000);
    }
  }, 800);
}

// ============================================================
// Task 1.4: DOM Operations and Rendering Functions
// ============================================================

let gameState = null;

/**
 * Initialize board DOM
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
 * Render game state
 * @param {GameState} state - game state
 */
function renderGame(state) {
  // Update status bar
  document.getElementById('current-team').textContent = 
    state.currentPlayer === PLAYER_BLACK ? '黑棋' : '白棋';
  document.getElementById('current-team').className = 
    state.currentPlayer === PLAYER_BLACK ? 'team-indicator black-text' : 'team-indicator white-text';
  
  document.getElementById('turn-count').textContent = state.turnCount;
  
  const counts = countPieces(state.board);
  document.getElementById('black-count').textContent = counts.black;
  document.getElementById('white-count').textContent = counts.white;
  document.getElementById('valid-moves-count').textContent = state.validMoves.length;
  
  // Render board
  const boardElement = document.getElementById('board');
  const cells = boardElement.querySelectorAll('.cell');
  
  // Clear all styles
  cells.forEach(cell => {
    cell.className = 'cell';
    cell.innerHTML = '';
  });
  
  // Render pieces and valid move indicators
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = boardElement.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
      const piece = state.board[y][x];
      
      if (piece) {
        const pieceDiv = document.createElement('div');
        pieceDiv.className = `piece piece-${piece}`;
        cell.appendChild(pieceDiv);
      }
      
      // Mark last move position
      if (state.lastMove && state.lastMove.x === x && state.lastMove.y === y) {
        cell.classList.add('cell-last-move');
      }
    }
  }
  
  // Mark valid move positions
  for (const move of state.validMoves) {
    const cell = boardElement.querySelector(`.cell[data-x="${move.x}"][data-y="${move.y}"]`);
    const indicator = document.createElement('div');
    indicator.className = 'valid-move-indicator';
    cell.appendChild(indicator);
  }
  
  // Update message
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
 * Update message display
 * @param {string} text - Message text
 * @param {string} type - Message type 'info' | 'error'
 */
function updateMessage(text, type = 'info') {
  const messageElement = document.getElementById('message');
  messageElement.textContent = text;
  messageElement.className = type === 'error' ? 'error' : '';
}

/**
 * Show game over screen
 * @param {GameState} state - game state
 */
function showGameOver(state) {
  const winnerText = document.getElementById('winner-text');
  const counts = countPieces(state.board);
  
  if (state.winner === 'draw') {
    winnerText.textContent = `游戏结束！Draw！黑棋: ${counts.black} 白棋: ${counts.white}`;
  } else {
    const winnerName = state.winner === PLAYER_BLACK ? '黑棋' : '白棋';
    winnerText.textContent = `游戏结束！${winnerName}获胜！黑棋: ${counts.black} 白棋: ${counts.white}`;
  }
  
  document.getElementById('game-over').style.display = 'flex';
}

// ============================================================
// Task 1.5: Event Handler Functions
// ============================================================

/**
 * Handle board cell click
 * @param {number} x - x coordinate
 * @param {number} y - y coordinate
 */
function handleCellClick(x, y) {
  if (!gameState || gameState.gameOver || gameState.aiThinking) return;
  
  // In PvE mode, player cannot act during AI turn
  if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;
  
  // Check if valid move position
  const isValid = gameState.validMoves.some(move => move.x === x && move.y === y);
  if (!isValid) {
    updateMessage('非法落子位置！', 'error');
    return;
  }
  
  // Execute move
  const flipped = makeMove(gameState.board, x, y, gameState.currentPlayer);
  gameState.lastMove = {x, y};
  gameState.turnCount++;
  
  // Switch player
  const nextPlayer = getOpponent(gameState.currentPlayer);
  const nextMoves = getValidMoves(gameState.board, nextPlayer);
  
  if (nextMoves.length === 0) {
    // Opponent has no valid moves, check if current player has any
    const currentMoves = getValidMoves(gameState.board, gameState.currentPlayer);
    if (currentMoves.length === 0) {
      // Neither side can move, game over
      gameState.gameOver = true;
      gameState.winner = getWinner(gameState.board);
    } else {
      // Opponent skipped, current player continues
      gameState.skippedTurn = true;
      gameState.validMoves = currentMoves;
      // Current player unchanged
    }
  } else {
    // Opponent has valid moves
    gameState.currentPlayer = nextPlayer;
    gameState.validMoves = nextMoves;
    gameState.skippedTurn = false;
  }
  
  renderGame(gameState);
  
  // If game over, show result
  if (gameState.gameOver) {
    setTimeout(() => showGameOver(gameState), 500);
  } else if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) {
    // If AI turn, trigger AI action
    setTimeout(() => aiTurn(gameState), 500);
  }
}

/**
 * Start game
 * @param {string} mode - 'pvp' | 'pve'
 * @param {string} firstPlayer - First player 'black' | 'white'
 */
function startGame(mode, firstPlayer = PLAYER_BLACK) {
  gameState = createGameState(mode);
  gameState.currentPlayer = firstPlayer;
  gameState.validMoves = getValidMoves(gameState.board, firstPlayer);
  
  // Set player and AI for PvE mode
  if (mode === 'pve') {
    // Rock-Paper-Scissors decides who goes first
    if (firstPlayer === PLAYER_BLACK) {
      // Player goes first (black)
      gameState.playerTeam = PLAYER_BLACK;
      gameState.aiTeam = PLAYER_WHITE;
      gameState.aiFirst = false;
    } else {
      // AI goes first (white)
      gameState.playerTeam = PLAYER_WHITE;
      gameState.aiTeam = PLAYER_BLACK;
      gameState.aiFirst = true;
    }
    gameState.teamAssigned = true;
  }
  
  // Hide mode selection screen
  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('rps-section').style.display = 'none';
  
  // Show game area
  document.getElementById('game-area').style.display = 'flex';
  
  // Initialize board
  initBoard();
  renderGame(gameState);
  
  // If PvE and AI goes first, trigger AI action
  if (mode === 'pve' && gameState.aiFirst) {
    setTimeout(() => aiTurn(gameState), 500);
  }
}

/**
 * Restart game
 */
function restartGame() {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('mode-selection').style.display = 'flex';
  document.getElementById('game-area').style.display = 'none';
  gameState = null;
}

// ============================================================
// Task 1.6: Rock-Paper-Scissors Logic
// ============================================================

let rpsChoices = { player1: null, player2: null, human: null };

/**
 * Handle RPS choice
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
    
    // AI random choice
    const choices = ['rock', 'scissors', 'paper'];
    const aiChoice = choices[Math.floor(Math.random() * 3)];
    rpsChoices.player2 = aiChoice;
    
    // Show result
    const resultElement = document.getElementById('rps-result');
    const humanWins = judgeRPS(choice, aiChoice);
    
    if (humanWins === 1) {
      resultElement.textContent = `你选择了${getRPSName(choice)}，AI选择了${getRPSName(aiChoice)}，你赢了！你先手。`;
      setTimeout(() => startGame('pve', PLAYER_BLACK), 1500);
    } else if (humanWins === -1) {
      resultElement.textContent = `你选择了${getRPSName(choice)}，AI选择了${getRPSName(aiChoice)}，你输了！AI先手。`;
      setTimeout(() => startGame('pve', PLAYER_WHITE), 1500);
    } else {
      resultElement.textContent = `你选择了${getRPSName(choice)}，AI选择了${getRPSName(aiChoice)}，Draw！重新选择。`;
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
    
    // Check if both sides have chosen
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
        resultElement.textContent = `玩家1选择了${getRPSName(rpsChoices.player1)}，玩家2选择了${getRPSName(rpsChoices.player2)}，Draw！重新选择。`;
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
 * RPS judgment
 * @param {string} choice1 - 'rock' | 'scissors' | 'paper'
 * @param {string} choice2 - 'rock' | 'scissors' | 'paper'
 * @returns {number} 1=First player wins, -1=Second player wins, 0=Draw
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
 * Get Chinese name for RPS choice
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

// Export for testing
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
// Task 1.7: Initialize Event Listeners (Browser Environment Only)
// ============================================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Mode selection buttons
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

    // RPS buttons
    document.querySelectorAll('.btn-rps').forEach(button => {
      button.addEventListener('click', (event) => {
        const player = event.target.dataset.player;
        const choice = event.target.dataset.choice;
        handleRPSChoice(player, choice);
      });
    });

    // Restart button
    document.getElementById('btn-restart').addEventListener('click', restartGame);

    // Initially show mode selection screen
    document.getElementById('mode-selection').style.display = 'flex';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
  });
}