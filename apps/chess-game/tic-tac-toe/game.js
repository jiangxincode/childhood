// ============================================================
// 井字棋 (Tic-Tac-Toe) - 游戏核心逻辑
// ============================================================

const PLAYER_X = 'X';
const PLAYER_O = 'O';

const WIN_LINES = [
  [{x:0,y:0},{x:1,y:0},{x:2,y:0}], // 横1
  [{x:0,y:1},{x:1,y:1},{x:2,y:1}], // 横2
  [{x:0,y:2},{x:1,y:2},{x:2,y:2}], // 横3
  [{x:0,y:0},{x:0,y:1},{x:0,y:2}], // 竖1
  [{x:1,y:0},{x:1,y:1},{x:1,y:2}], // 竖2
  [{x:2,y:0},{x:2,y:1},{x:2,y:2}], // 竖3
  [{x:0,y:0},{x:1,y:1},{x:2,y:2}], // 对角线
  [{x:2,y:0},{x:1,y:1},{x:0,y:2}]  // 反对角线
];

function createGameState(mode) {
  var board = [];
  for (var y = 0; y < 3; y++) {
    var row = [];
    for (var x = 0; x < 3; x++) {
      row.push(null);
    }
    board.push(row);
  }
  return {
    mode: mode,
    board: board,
    currentPlayer: PLAYER_X,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    winLine: null,
    turnCount: 0,
    aiThinking: false,
    scoreX: 0,
    scoreO: 0
  };
}

function checkWin(board) {
  for (var i = 0; i < WIN_LINES.length; i++) {
    var line = WIN_LINES[i];
    var a = board[line[0].y][line[0].x];
    var b = board[line[1].y][line[1].x];
    var c = board[line[2].y][line[2].x];
    if (a && a === b && b === c) {
      return { winner: a, line: line };
    }
  }
  return null;
}

function checkDraw(board) {
  for (var y = 0; y < 3; y++) {
    for (var x = 0; x < 3; x++) {
      if (board[y][x] === null) return false;
    }
  }
  return checkWin(board) === null;
}

function getValidMoves(board) {
  var moves = [];
  for (var y = 0; y < 3; y++) {
    for (var x = 0; x < 3; x++) {
      if (board[y][x] === null) {
        moves.push({ x: x, y: y });
      }
    }
  }
  return moves;
}

function makeMove(board, x, y, player) {
  var newBoard = [];
  for (var r = 0; r < 3; r++) {
    newBoard.push(board[r].slice());
  }
  newBoard[y][x] = player;
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_X ? PLAYER_O : PLAYER_X;
}

// ============================================================
// AI: Minimax算法
// ============================================================

function minimax(board, depth, isMaximizing, aiPlayer) {
  var result = checkWin(board);
  if (result) {
    return result.winner === aiPlayer ? 10 - depth : depth - 10;
  }
  if (checkDraw(board)) return 0;

  var moves = getValidMoves(board);
  if (isMaximizing) {
    var best = -100;
    for (var i = 0; i < moves.length; i++) {
      var newBoard = makeMove(board, moves[i].x, moves[i].y, aiPlayer);
      var score = minimax(newBoard, depth + 1, false, aiPlayer);
      if (score > best) best = score;
    }
    return best;
  } else {
    var best = 100;
    var opponent = getOpponent(aiPlayer);
    for (var i = 0; i < moves.length; i++) {
      var newBoard = makeMove(board, moves[i].x, moves[i].y, opponent);
      var score = minimax(newBoard, depth + 1, true, aiPlayer);
      if (score < best) best = score;
    }
    return best;
  }
}

function getBestAIMove(board, aiPlayer) {
  var moves = getValidMoves(board);
  if (moves.length === 0) return null;

  // 先检查能否立即获胜
  for (var i = 0; i < moves.length; i++) {
    var newBoard = makeMove(board, moves[i].x, moves[i].y, aiPlayer);
    if (checkWin(newBoard)) return moves[i];
  }

  // 再检查对手能否立即获胜（需要堵住）
  var opponent = getOpponent(aiPlayer);
  for (var i = 0; i < moves.length; i++) {
    var newBoard = makeMove(board, moves[i].x, moves[i].y, opponent);
    if (checkWin(newBoard)) return moves[i];
  }

  // Minimax选择最优
  var bestScore = -100;
  var bestMove = moves[0];
  for (var i = 0; i < moves.length; i++) {
    var newBoard = makeMove(board, moves[i].x, moves[i].y, aiPlayer);
    var score = minimax(newBoard, 0, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[i];
    }
  }
  return bestMove;
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
// 导出供测试使用
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PLAYER_X: PLAYER_X,
    PLAYER_O: PLAYER_O,
    WIN_LINES: WIN_LINES,
    createGameState: createGameState,
    checkWin: checkWin,
    checkDraw: checkDraw,
    getValidMoves: getValidMoves,
    makeMove: makeMove,
    getOpponent: getOpponent,
    getBestAIMove: getBestAIMove,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName
  };
}

// ============================================================
// 浏览器UI
// ============================================================

if (typeof document !== 'undefined') {
  var gameState = null;
  var rpsChoices = { player1: null, player2: null, human: null };

  function initBoard() {
    var boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (var y = 0; y < 3; y++) {
      for (var x = 0; x < 3; x++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.addEventListener('click', (function(cx, cy) {
          return function() { handleCellClick(cx, cy); };
        })(x, y));
        boardEl.appendChild(cell);
      }
    }
  }

  function renderGame(state) {
    document.getElementById('current-player').textContent =
      state.currentPlayer === PLAYER_X ? 'X (先手)' : 'O (后手)';
    document.getElementById('current-player').className =
      'team-indicator ' + (state.currentPlayer === PLAYER_X ? 'text-x' : 'text-o');
    document.getElementById('turn-count').textContent = state.turnCount;
    document.getElementById('score-x').textContent = state.scoreX;
    document.getElementById('score-o').textContent = state.scoreO;

    var cells = document.querySelectorAll('#board .cell');
    cells.forEach(function(cell) {
      var cx = parseInt(cell.dataset.x);
      var cy = parseInt(cell.dataset.y);
      var val = state.board[cy][cx];
      cell.className = 'cell';
      cell.textContent = '';
      if (val === PLAYER_X) {
        cell.textContent = 'X';
        cell.classList.add('cell-x');
      } else if (val === PLAYER_O) {
        cell.textContent = 'O';
        cell.classList.add('cell-o');
      }
    });

    // 高亮获胜连线
    if (state.winLine) {
      for (var i = 0; i < state.winLine.length; i++) {
        var pos = state.winLine[i];
        var sel = '.cell[data-x="' + pos.x + '"][data-y="' + pos.y + '"]';
        var winCell = document.querySelector(sel);
        if (winCell) winCell.classList.add('cell-win');
      }
    }

    if (state.gameOver) {
      updateMessage('游戏结束！', 'info');
    } else if (state.aiThinking) {
      updateMessage('AI正在思考...', 'info');
    } else if (state.mode === 'pve' && state.currentPlayer === state.aiTeam) {
      updateMessage('轮到AI行动', 'info');
    } else {
      updateMessage('轮到 ' + state.currentPlayer + ' 落子', 'info');
    }
  }

  function updateMessage(text, type) {
    var el = document.getElementById('message');
    el.textContent = text;
    el.className = type === 'error' ? 'error' : (type === 'info' ? 'info' : '');
  }

  function showGameOver(state) {
    var winnerText = document.getElementById('winner-text');
    if (state.winner === 'draw') {
      winnerText.textContent = '平局！';
    } else {
      winnerText.textContent = state.winner + ' 获胜！';
    }
    document.getElementById('game-over').style.display = 'flex';
  }

  function handleCellClick(x, y) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === 'pve' && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.board[y][x] !== null) {
      updateMessage('此处已有棋子！', 'error');
      return;
    }
    doMove(x, y);
  }

  function doMove(x, y) {
    gameState.board = makeMove(gameState.board, x, y, gameState.currentPlayer);
    gameState.turnCount++;

    var result = checkWin(gameState.board);
    if (result) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      gameState.winLine = result.line;
      if (result.winner === PLAYER_X) gameState.scoreX++;
      else gameState.scoreO++;
      renderGame(gameState);
      setTimeout(function() { showGameOver(gameState); }, 500);
      return;
    }
    if (checkDraw(gameState.board)) {
      gameState.gameOver = true;
      gameState.winner = 'draw';
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
    }, 600);
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || PLAYER_X;

    if (mode === 'pve') {
      if (firstPlayer === PLAYER_X) {
        gameState.playerTeam = PLAYER_X;
        gameState.aiTeam = PLAYER_O;
      } else {
        gameState.playerTeam = PLAYER_O;
        gameState.aiTeam = PLAYER_X;
      }
    }

    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('rps-section').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';
    document.getElementById('game-over').style.display = 'none';

    initBoard();
    renderGame(gameState);

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
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你赢了！你先手(X)。';
        setTimeout(function() { startGame('pve', PLAYER_X); }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent = '你选择了' + getRPSName(choice) + '，AI选择了' + getRPSName(aiChoice) + '，你输了！AI先手(X)。';
        setTimeout(function() { startGame('pve', PLAYER_O); }, 1500);
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
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家1赢了！玩家1先手(X)。';
          setTimeout(function() { startGame('pvp', PLAYER_X); }, 1500);
        } else if (winner === -1) {
          resultEl.textContent = '玩家1选择了' + getRPSName(rpsChoices.player1) + '，玩家2选择了' + getRPSName(rpsChoices.player2) + '，玩家2赢了！玩家2先手(X)。';
          setTimeout(function() { startGame('pvp', PLAYER_O); }, 1500);
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
