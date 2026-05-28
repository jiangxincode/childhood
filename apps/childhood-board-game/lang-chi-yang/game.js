/* eslint-disable no-var, no-undef */
// ============================================================
// 狼吃羊 (Lang Chi Yang) - Wolf Eats Sheep
// 2 players, 4x5 grid, asymmetric: 2 wolves vs 10 sheep
// ============================================================

let judgeRPS, getRPSName;
if (typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  judgeRPS = _gameUtils.judgeRPS;
  getRPSName = _gameUtils.getRPSName;
}

const PLAYER_A = "A"; // Sheep (羊) - 10 pieces
const PLAYER_B = "B"; // Wolf (狼) - 2 pieces
const EMPTY = null;
const ROW_COUNT = 5;
const COL_COUNT = 4;
const INITIAL_A = 10; // Sheep starts with 10 pieces
const INITIAL_B = 2; // Wolf starts with 2 pieces
const MIN_A_TO_LOSE = 3; // If sheep has fewer than 3 pieces, wolf wins

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function createBoard() {
  const board = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    const row = [];
    for (let c = 0; c < COL_COUNT; c++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function getInitialBoard() {
  const board = createBoard();
  // Wolf (B): top row middle positions
  board[0][1] = PLAYER_B;
  board[0][2] = PLAYER_B;
  // Sheep (A): rows 2-4, all columns = 10 pieces
  // Row 2: only (2,0) and (2,3)
  board[2][0] = PLAYER_A;
  board[2][3] = PLAYER_A;
  // Row 3: all 4 columns
  board[3][0] = PLAYER_A;
  board[3][1] = PLAYER_A;
  board[3][2] = PLAYER_A;
  board[3][3] = PLAYER_A;
  // Row 4: all 4 columns
  board[4][0] = PLAYER_A;
  board[4][1] = PLAYER_A;
  board[4][2] = PLAYER_A;
  board[4][3] = PLAYER_A;
  return board;
}

function createGameState(mode) {
  return {
    mode: mode,
    board: getInitialBoard(),
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    piecesA: INITIAL_A,
    piecesB: INITIAL_B,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    lastJump: null,
  };
}

function inBounds(r, c) {
  return r >= 0 && r < ROW_COUNT && c >= 0 && c < COL_COUNT;
}

function countPieces(board, player) {
  let count = 0;
  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 0; c < COL_COUNT; c++) {
      if (board[r][c] === player) count++;
    }
  }
  return count;
}

function getAdjacentCells(r, c) {
  const cells = [];
  for (const dir of DIRECTIONS) {
    const nr = r + dir.dr;
    const nc = c + dir.dc;
    if (inBounds(nr, nc)) {
      cells.push({ r: nr, c: nc });
    }
  }
  return cells;
}

// Get valid step moves for a piece (one step to adjacent empty cell)
function getStepMoves(board, r, c) {
  const moves = [];
  const adj = getAdjacentCells(r, c);
  for (const neighbor of adj) {
    if (board[neighbor.r][neighbor.c] === EMPTY) {
      moves.push({ fromR: r, fromC: c, toR: neighbor.r, toC: neighbor.c, type: "step" });
    }
  }
  return moves;
}

// Get valid jump capture moves for a wolf (B only)
// B at (r,c), empty at (r+dr, c+dc), sheep at (r+2*dr, c+2*dc)
function getJumpMoves(board, r, c) {
  const moves = [];
  for (const dir2 of DIRECTIONS) {
    const mr = r + dir2.dr;
    const mc = c + dir2.dc;
    const tr = r + 2 * dir2.dr;
    const tc = c + 2 * dir2.dc;
    if (inBounds(tr, tc) && board[mr][mc] === EMPTY && board[tr][tc] === PLAYER_A) {
      moves.push({
        fromR: r,
        fromC: c,
        toR: tr,
        toC: tc,
        captureR: tr,
        captureC: tc,
        type: "jump",
      });
    }
  }
  return moves;
}

// Get all valid moves for a player
function getValidMoves(board, player) {
  const moves = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 0; c < COL_COUNT; c++) {
      if (board[r][c] === player) {
        const stepMoves = getStepMoves(board, r, c);
        for (const move of stepMoves) {
          moves.push(move);
        }
        // Only wolves (B) can jump
        if (player === PLAYER_B) {
          const jumpMoves = getJumpMoves(board, r, c);
          for (const move2 of jumpMoves) {
            moves.push(move2);
          }
        }
      }
    }
  }
  return moves;
}

// Check win conditions: returns winner or null
function checkWin(board) {
  const countA = countPieces(board, PLAYER_A);
  const countB = countPieces(board, PLAYER_B);

  // Wolf (B) wins when sheep (A) pieces drop below threshold
  if (countA < MIN_A_TO_LOSE) {
    return PLAYER_B;
  }

  // Sheep (A) wins when wolf (B) has no valid moves
  if (countB === 0) {
    return PLAYER_A;
  }
  const bMoves = getValidMoves(board, PLAYER_B);
  if (bMoves.length === 0) {
    return PLAYER_A;
  }

  return null;
}

function cloneBoard(board) {
  const newBoard = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    newBoard.push(board[r].slice());
  }
  return newBoard;
}

function applyMove(board, move) {
  const newBoard = cloneBoard(board);
  newBoard[move.toR][move.toC] = newBoard[move.fromR][move.fromC];
  newBoard[move.fromR][move.fromC] = EMPTY;
  if (move.type === "jump") {
    // Only clear capture position if it differs from landing position
    if (move.captureR !== move.toR || move.captureC !== move.toC) {
      newBoard[move.captureR][move.captureC] = EMPTY;
    }
  }
  return newBoard;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

/**
 * Score a wolf step move: prefer positions with more empty neighbors,
 * more mobility, and proximity to sheep.
 * @param {Array} board - board after the move
 * @param {Object} move - the move object
 * @returns {number}
 */
function scoreWolfStepMove(board, move) {
  const adj = getAdjacentCells(move.toR, move.toC);
  let emptyAdj = 0;
  let adjToA = 0;
  for (const nb of adj) {
    if (board[nb.r][nb.c] === EMPTY) emptyAdj++;
    if (board[nb.r][nb.c] === PLAYER_A) adjToA++;
  }
  const mobility = getStepMoves(board, move.toR, move.toC).length;
  let score = emptyAdj * 10 + mobility;
  if (move.type === "step") score += adjToA * 5;
  return score;
}

// AI for wolf (B): prioritize captures, then avoid traps, then random
function getBestAIMove_B(state) {
  const board = state.board;
  const moves = getValidMoves(board, PLAYER_B);
  if (moves.length === 0) return null;

  // Prioritize jump captures: pick the one that minimizes opponent mobility
  const jumpMoves = moves.filter((m) => m.type === "jump");
  if (jumpMoves.length > 0) {
    let bestJump = jumpMoves[0];
    let bestScore = -1;
    for (const jm of jumpMoves) {
      const testBoard = applyMove(board, jm);
      const opponentMoves = getValidMoves(testBoard, PLAYER_A);
      if (opponentMoves.length > bestScore) {
        bestScore = opponentMoves.length;
        bestJump = jm;
      }
    }
    return bestJump;
  }

  // Try step moves: prefer moves that keep pieces alive
  let bestMove = moves[0];
  let bestMoveScore = -Infinity;
  for (const m of moves) {
    const testBoard = applyMove(board, m);
    const score = scoreWolfStepMove(testBoard, m);
    if (score > bestMoveScore) {
      bestMoveScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}

/**
 * Score based on Manhattan distance to all wolf pieces (closer is better).
 * @param {Array} board
 * @param {number} toR - destination row
 * @param {number} toC - destination column
 * @returns {number}
 */
function scoreProximityToWolves(board, toR, toC) {
  let score = 0;
  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 0; c < COL_COUNT; c++) {
      if (board[r][c] === PLAYER_B) {
        const dist = Math.abs(toR - r) + Math.abs(toC - c);
        score += (10 - dist) * 3;
      }
    }
  }
  return score;
}

/**
 * Penalize if the destination position can be jumped by an adjacent wolf.
 * @param {Array} board
 * @param {number} toR - destination row
 * @param {number} toC - destination column
 * @param {Array} adj - adjacent cells of the destination
 * @returns {number} penalty (negative or zero)
 */
function scoreJumpDanger(board, toR, toC, adj) {
  for (const nb of adj) {
    const dr = toR - nb.r;
    const dc = toC - nb.c;
    if (!inBounds(toR + 2 * dr, toC + 2 * dc)) continue;
    if (board[nb.r][nb.c] !== PLAYER_B) continue;
    if (board[toR + 2 * dr][toC + 2 * dc] === EMPTY) return -50;
  }
  return 0;
}

/**
 * Score based on how many wolf escape routes are blocked.
 * @param {Array} board
 * @returns {number}
 */
function scoreWolfBlocking(board) {
  let score = 0;
  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 0; c < COL_COUNT; c++) {
      if (board[r][c] !== PLAYER_B) continue;
      const bAdj = getAdjacentCells(r, c);
      let blockedCount = 0;
      for (const nb of bAdj) {
        if (board[nb.r][nb.c] !== EMPTY) blockedCount++;
      }
      score += blockedCount * 8;
    }
  }
  return score;
}

// AI for sheep (A): try to surround wolf, avoid being captured
function getBestAIMove_A(state) {
  const board = state.board;
  const moves = getValidMoves(board, PLAYER_A);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestMoveScore = -Infinity;

  for (const m of moves) {
    const testBoard = applyMove(board, m);
    const bMovesAfter = getValidMoves(testBoard, PLAYER_B);
    let score = -bMovesAfter.length * 10;
    score += scoreProximityToWolves(testBoard, m.toR, m.toC);
    score += scoreJumpDanger(testBoard, m.toR, m.toC, getAdjacentCells(m.toR, m.toC));
    score += scoreWolfBlocking(testBoard);

    if (score > bestMoveScore) {
      bestMoveScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}

function getBestAIMove(state) {
  if (state.aiTeam === PLAYER_B) return getBestAIMove_B(state);
  return getBestAIMove_A(state);
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    ROW_COUNT: ROW_COUNT,
    COL_COUNT: COL_COUNT,
    INITIAL_A: INITIAL_A,
    INITIAL_B: INITIAL_B,
    MIN_A_TO_LOSE: MIN_A_TO_LOSE,
    DIRECTIONS: DIRECTIONS,
    createBoard: createBoard,
    getInitialBoard: getInitialBoard,
    createGameState: createGameState,
    inBounds: inBounds,
    countPieces: countPieces,
    getAdjacentCells: getAdjacentCells,
    getStepMoves: getStepMoves,
    getJumpMoves: getJumpMoves,
    getValidMoves: getValidMoves,
    checkWin: checkWin,
    cloneBoard: cloneBoard,
    applyMove: applyMove,
    getOpponent: getOpponent,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI
// ============================================================
if (typeof document !== "undefined") {
  var state = null;
  var selectedPiece = null;

  // Online mode state
  var networkProtocol = null;
  var networkConnection = null;
  var roomUI = null;
  var localPlayerRole = null; // 'host' | 'guest'
  var localTeam = null;
  var remoteTeam = null;

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    for (var r = 0; r < ROW_COUNT; r++) {
      for (var c = 0; c < COL_COUNT; c++) {
        var cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener(
          "click",
          (function (cr, cc) {
            return function () {
              handleCellClick(cr, cc);
            };
          })(r, c)
        );
        boardEl.appendChild(cell);
      }
    }
  }

  function buildSidesOrder() {
    return state.firstPlayer
      ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
      : [PLAYER_A, PLAYER_B];
  }

  function isMoveHighlighted(r, c, moves) {
    for (const m of moves) {
      if (m.toR === r && m.toC === c) return true;
    }
    return false;
  }

  function renderCell(cell, r, c) {
    cell.textContent = "";
    cell.className = "cell";
    if (state.board[r][c] === PLAYER_A) {
      cell.classList.add("cell-a");
      cell.textContent = "羊";
    } else if (state.board[r][c] === PLAYER_B) {
      cell.classList.add("cell-b");
      cell.textContent = "狼";
    }
    if (selectedPiece?.r === r && selectedPiece.c === c) {
      cell.classList.add("cell-selected");
    }
    if (selectedPiece) {
      var stepMoves = getStepMoves(state.board, selectedPiece.r, selectedPiece.c);
      if (isMoveHighlighted(r, c, stepMoves)) {
        cell.classList.add("cell-highlight");
      }
      if (state.currentPlayer === PLAYER_B) {
        var jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
        if (isMoveHighlighted(r, c, jumpMoves)) {
          cell.classList.add("cell-jump");
        }
      }
    }
    if (state.lastJump?.captureR === r && state.lastJump.captureC === c) {
      cell.classList.add("cell-captured");
    }
  }

  function getDisplayLabel(side) {
    if (state.mode === "online") {
      return side === localTeam ? "你" : "对方";
    }
    return getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: side,
      playerSide: state.playerTeam,
      sidesOrder: buildSidesOrder(),
    }).text;
  }

  function renderGame() {
    if (!state) return;
    var cells = document.querySelectorAll("#board .cell");
    cells.forEach((cell) => {
      var r = Number.parseInt(cell.dataset.r);
      var c = Number.parseInt(cell.dataset.c);
      renderCell(cell, r, c);
    });

    var playerClass = state.currentPlayer === PLAYER_A ? "team-a" : "team-b";
    document.getElementById("current-player").textContent = getDisplayLabel(state.currentPlayer);
    document.getElementById("current-player").className = "team-indicator " + playerClass;
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("pieces-a").textContent = state.piecesA;
    document.getElementById("pieces-b").textContent = state.piecesB;

    if (state.gameOver) {
      document.getElementById("winner-text").textContent =
        getDisplayLabel(state.winner) + " 获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handleCellClick(r, c) {
    if (!state || state.gameOver) return;
    if (state.mode === "online" && state.currentPlayer !== localTeam) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    // Select own piece
    if (state.board[r][c] === state.currentPlayer) {
      selectedPiece = { r: r, c: c };
      renderGame();
      return;
    }

    // Try to move selected piece
    if (selectedPiece) {
      // Try step move
      var stepMoves = getStepMoves(state.board, selectedPiece.r, selectedPiece.c);
      for (const move6 of stepMoves) {
        if (move6.toR === r && move6.toC === c) {
          state.board = applyMove(state.board, move6);
          state.lastJump = null;
          if (state.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({
              a: "move",
              fx: selectedPiece.r,
              fy: selectedPiece.c,
              tx: r,
              ty: c,
              mt: "step",
            });
          }
          finishTurn();
          return;
        }
      }

      // Try jump move (wolf only)
      if (state.currentPlayer === PLAYER_B) {
        var jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
        for (const move7 of jumpMoves) {
          if (move7.toR === r && move7.toC === c) {
            state.board = applyMove(state.board, move7);
            state.piecesA = countPieces(state.board, PLAYER_A);
            state.lastJump = { captureR: r, captureC: c };
            if (state.mode === "online" && networkProtocol) {
              networkProtocol.sendAction({
                a: "move",
                fx: selectedPiece.r,
                fy: selectedPiece.c,
                tx: r,
                ty: c,
                mt: "jump",
                cx: r,
                cy: c,
              });
            }
            finishTurn();
            return;
          }
        }
      }

      // Clicked on invalid cell, deselect
      selectedPiece = null;
      renderGame();
    }
  }

  function finishTurn() {
    selectedPiece = null;

    var winner = checkWin(state.board);
    if (winner) {
      state.gameOver = true;
      state.winner = winner;
    }

    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;
    renderGame();

    if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      triggerAI();
    }
  }

  function triggerAI() {
    state.aiThinking = true;
    renderGame();
    setTimeout(() => {
      var aiMove = getBestAIMove(state);
      if (!aiMove) {
        state.aiThinking = false;
        state.gameOver = true;
        state.winner = getOpponent(state.aiTeam);
        renderGame();
        return;
      }

      state.board = applyMove(state.board, aiMove);
      if (aiMove.type === "jump") {
        state.piecesA = countPieces(state.board, PLAYER_A);
        state.lastJump = { captureR: aiMove.captureR, captureC: aiMove.captureC };
      } else {
        state.lastJump = null;
      }

      state.aiThinking = false;
      finishTurn();
    }, 600);
  }

  function startGame(mode, firstPlayer) {
    state = createGameState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    state.firstPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      state.playerTeam = PLAYER_A;
      state.aiTeam = PLAYER_B;
    }
    selectedPiece = null;
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
    if (mode === "pve" && state.currentPlayer === state.aiTeam) {
      triggerAI();
    }
  }

  function handleRPSChoice(player, choice) {
    if (player === "human") {
      var aiChoices = ["rock", "scissors", "paper"];
      var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
      var result = judgeRPS(choice, aiChoice);
      var resultDiv = document.getElementById("rps-result");
      if (result === 1) {
        resultDiv.innerHTML =
          "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，你先手！</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_A);
        }, 1500);
      } else if (result === -1) {
        resultDiv.innerHTML =
          "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，AI先手！</p>";
        setTimeout(() => {
          startGame("pve", PLAYER_B);
        }, 1500);
      } else {
        resultDiv.innerHTML = "<p>平局！再来一次</p>";
      }
    }
  }

  // --- Restart (with online cleanup) ---

  function restartGame() {
    if (state?.mode === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    document.getElementById("game-over").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("mode-selection").style.display = "flex";
    state = null;
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
      onAction: function (actionData) {
        applyRemoteAction(actionData);
      },
      onRPSChoice: function (choice) {
        handleOnlineRPSReceived(choice);
      },
      onRPSResult: function (result) {
        handleOnlineRPSResult(result);
      },
      onRestart: function () {
        cleanupNetwork();
        document.getElementById("game-over").style.display = "none";
        document.getElementById("game-area").style.display = "none";
        document.getElementById("rps-online").style.display = "none";
        document.getElementById("mode-selection").style.display = "flex";
        state = null;
      },
      onDisconnect: function () {
        handleDisconnect();
      },
    });
  }

  var rpsChoices = { online: null, remote: null };

  function startOnlineRPS() {
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-online").style.display = "flex";
    rpsChoices = { online: null, remote: null };
    document.getElementById("rps-online-status").textContent = "请选择";
    document.getElementById("rps-online-result").textContent = "";
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
      btn.classList.remove("selected");
    });
  }

  function handleOnlineRPSChoice(choice, ev) {
    rpsChoices.online = choice;
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
      btn.classList.remove("selected");
    });
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
      var winner = judgeRPS(rpsChoices.online, rpsChoices.remote);
      var firstPlayer;
      if (winner === 1) {
        firstPlayer = "host";
      } else if (winner === -1) {
        firstPlayer = "guest";
      } else {
        networkProtocol.sendRPSResult(null, null);
        rpsChoices.online = null;
        rpsChoices.remote = null;
        document.getElementById("rps-online-status").textContent = "平局！请重新选择";
        document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
          btn.classList.remove("selected");
        });
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
    var resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      return;
    }

    var myChoice = rpsChoices.online;
    var theirChoice = rpsChoices.remote;
    var iWin = result.firstPlayer === localPlayerRole;

    resultEl.textContent =
      "你选择了" +
      getRPSName(myChoice) +
      "，对方选择了" +
      getRPSName(theirChoice) +
      (iWin ? "，你赢了！你先手（羊）。" : "，你输了！对方先手（羊）。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    state = createGameState("online");

    var hostPiece = PLAYER_A;
    var guestPiece = PLAYER_B;

    if (localPlayerRole === "host") {
      localTeam = firstPlayerRole === "host" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "host" ? guestPiece : hostPiece;
    } else {
      localTeam = firstPlayerRole === "guest" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "guest" ? guestPiece : hostPiece;
    }

    state.currentPlayer = firstPlayerRole === "host" ? hostPiece : guestPiece;
    state.firstPlayer = state.currentPlayer;
    state.playerTeam = localTeam;

    selectedPiece = null;
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
  }

  function applyRemoteAction(actionData) {
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== remoteTeam) return;
    // actionData = { a: "move", fx, fy, tx, ty, mt: "step"|"jump", cx?, cy? }
    var fromR = actionData.fx;
    var fromC = actionData.fy;
    var toR = actionData.tx;
    var toC = actionData.ty;

    // Find and apply the matching move
    var stepMoves = getStepMoves(state.board, fromR, fromC);
    for (const move6 of stepMoves) {
      if (move6.toR === toR && move6.toC === toC) {
        state.board = applyMove(state.board, move6);
        state.lastJump = null;
        finishTurn();
        return;
      }
    }

    if (state.currentPlayer === PLAYER_B) {
      var jumpMoves = getJumpMoves(state.board, fromR, fromC);
      for (const move7 of jumpMoves) {
        if (move7.toR === toR && move7.toC === toC) {
          state.board = applyMove(state.board, move7);
          state.piecesA = countPieces(state.board, PLAYER_A);
          state.lastJump = { captureR: toR, captureC: toC };
          finishTurn();
          return;
        }
      }
    }
  }

  function handleDisconnect() {
    if (state && !state.gameOver) {
      state.gameOver = true;
      document.getElementById("winner-text").textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-pvp").addEventListener("click", () => {
      startGame("pvp", PLAYER_A);
    });
    document.getElementById("btn-pve").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
    });

    // Online mode button
    var btnOnline = document.getElementById("btn-online");
    if (btnOnline) {
      if (RoomUI.isSupported()) {
        btnOnline.addEventListener("click", () => {
          roomUI = new RoomUI({
            onConnectionEstablished: function (connection, protocol, role) {
              networkConnection = connection;
              networkProtocol = protocol;
              localPlayerRole = role;
              setupNetworkHandlers();
              startOnlineRPS();
            },
            onError: function (msg) {
              document.getElementById("message").textContent = msg;
            },
            onCancel: function () {
              cleanupNetwork();
            },
          });
          roomUI.show();
        });
      } else {
        btnOnline.style.display = "none";
      }
    }

    // Online RPS buttons
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((button) => {
      button.addEventListener("click", (ev) => {
        var choice = ev.target.dataset.choice;
        handleOnlineRPSChoice(choice, ev);
      });
    });

    document.getElementById("rps-pve").style.display = "block";
    document.querySelectorAll("#rps-pve .btn-rps").forEach((btn) => {
      btn.addEventListener("click", function () {
        handleRPSChoice("human", this.dataset.choice);
      });
    });
    document.getElementById("btn-restart").addEventListener("click", restartGame);
  });
}
