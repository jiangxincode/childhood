/* eslint-disable no-let, no-undef */
// ============================================================
// 狼吃羊 (Lang Chi Yang) - Wolf Eats Sheep
// 2 players, 4x5 grid, asymmetric: 2 wolves vs 10 sheep
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  let _gameUtils = require("../../common/game-utils.js");
  let judgeRPS = _gameUtils.judgeRPS;
  let getRPSName = _gameUtils.getRPSName;
}

let PLAYER_A = "A"; // Sheep (羊) - 10 pieces
let PLAYER_B = "B"; // Wolf (狼) - 2 pieces
let EMPTY = null;
let ROW_COUNT = 5;
let COL_COUNT = 4;
let INITIAL_A = 10; // Sheep starts with 10 pieces
let INITIAL_B = 2; // Wolf starts with 2 pieces
let MIN_A_TO_LOSE = 3; // If sheep has fewer than 3 pieces, wolf wins

let DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function createBoard() {
  let board = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    let row = [];
    for (let c = 0; c < COL_COUNT; c++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function getInitialBoard() {
  let board = createBoard();
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
  let cells = [];
  for (let i = 0; i < DIRECTIONS.length; i++) {
    let nr = r + DIRECTIONS[i].dr;
    let nc = c + DIRECTIONS[i].dc;
    if (inBounds(nr, nc)) {
      cells.push({ r: nr, c: nc });
    }
  }
  return cells;
}

// Get valid step moves for a piece (one step to adjacent empty cell)
function getStepMoves(board, r, c) {
  let moves = [];
  let adj = getAdjacentCells(r, c);
  for (let i = 0; i < adj.length; i++) {
    if (board[adj[i].r][adj[i].c] === EMPTY) {
      moves.push({ fromR: r, fromC: c, toR: adj[i].r, toC: adj[i].c, type: "step" });
    }
  }
  return moves;
}

// Get valid jump capture moves for a wolf (B only)
// B at (r,c), empty at (r+dr, c+dc), sheep at (r+2*dr, c+2*dc)
function getJumpMoves(board, r, c) {
  let moves = [];
  for (let i = 0; i < DIRECTIONS.length; i++) {
    let mr = r + DIRECTIONS[i].dr;
    let mc = c + DIRECTIONS[i].dc;
    let tr = r + 2 * DIRECTIONS[i].dr;
    let tc = c + 2 * DIRECTIONS[i].dc;
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
  let moves = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 0; c < COL_COUNT; c++) {
      if (board[r][c] === player) {
        let stepMoves = getStepMoves(board, r, c);
        for (let i = 0; i < stepMoves.length; i++) {
          moves.push(stepMoves[i]);
        }
        // Only wolves (B) can jump
        if (player === PLAYER_B) {
          let jumpMoves = getJumpMoves(board, r, c);
          for (let j = 0; j < jumpMoves.length; j++) {
            moves.push(jumpMoves[j]);
          }
        }
      }
    }
  }
  return moves;
}

// Check win conditions: returns winner or null
function checkWin(board) {
  let countA = countPieces(board, PLAYER_A);
  let countB = countPieces(board, PLAYER_B);

  // Wolf (B) wins when sheep (A) pieces drop below threshold
  if (countA < MIN_A_TO_LOSE) {
    return PLAYER_B;
  }

  // Sheep (A) wins when wolf (B) has no valid moves
  if (countB === 0) {
    return PLAYER_A;
  }
  let bMoves = getValidMoves(board, PLAYER_B);
  if (bMoves.length === 0) {
    return PLAYER_A;
  }

  return null;
}

function cloneBoard(board) {
  let newBoard = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    newBoard.push(board[r].slice());
  }
  return newBoard;
}

function applyMove(board, move) {
  let newBoard = cloneBoard(board);
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

// AI for wolf (B): prioritize captures, then avoid traps, then random
function getBestAIMove_B(state) {
  let board = state.board;
  let moves = getValidMoves(board, PLAYER_B);
  if (moves.length === 0) return null;

  // Prioritize jump captures
  let jumpMoves = [];
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].type === "jump") jumpMoves.push(moves[i]);
  }
  if (jumpMoves.length > 0) {
    // Pick the jump that leaves the fewest escape routes for opponent
    let bestJump = jumpMoves[0];
    let bestScore = -1;
    for (let j = 0; j < jumpMoves.length; j++) {
      let testBoard = applyMove(board, jumpMoves[j]);
      let opponentMoves = getValidMoves(testBoard, PLAYER_A);
      if (opponentMoves.length > bestScore) {
        bestScore = opponentMoves.length;
        bestJump = jumpMoves[j];
      }
    }
    return bestJump;
  }

  // Try step moves: prefer moves that keep pieces alive
  let bestMove = moves[0];
  let bestMoveScore = -Infinity;
  for (let k = 0; k < moves.length; k++) {
    let testBoard2 = applyMove(board, moves[k]);
    // Score: more adjacent empty cells = safer
    let adj = getAdjacentCells(moves[k].toR, moves[k].toC);
    let emptyAdj = 0;
    for (let a = 0; a < adj.length; a++) {
      if (testBoard2[adj[a].r][adj[a].c] === EMPTY) emptyAdj++;
    }
    // Penalize if wolf piece has no step moves from new position
    let bMovesFromNew = getStepMoves(testBoard2, moves[k].toR, moves[k].toC);
    let score = emptyAdj * 10 + bMovesFromNew.length;
    // Bonus for moving toward sheep pieces (to potentially capture later)
    if (moves[k].type === "step") {
      let adjToA = 0;
      for (let aa = 0; aa < adj.length; aa++) {
        if (testBoard2[adj[aa].r][adj[aa].c] === PLAYER_A) adjToA++;
      }
      score += adjToA * 5;
    }
    if (score > bestMoveScore) {
      bestMoveScore = score;
      bestMove = moves[k];
    }
  }
  return bestMove;
}

// AI for sheep (A): try to surround wolf, avoid being captured
function getBestAIMove_A(state) {
  let board = state.board;
  let moves = getValidMoves(board, PLAYER_A);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestMoveScore = -Infinity;

  for (let i = 0; i < moves.length; i++) {
    let testBoard = applyMove(board, moves[i]);
    let score = 0;

    // Prefer moves that reduce wolf's mobility
    let bMovesAfter = getValidMoves(testBoard, PLAYER_B);
    score -= bMovesAfter.length * 10;

    // Prefer moves that get closer to wolf pieces
    for (let br = 0; br < ROW_COUNT; br++) {
      for (let bc = 0; bc < COL_COUNT; bc++) {
        if (testBoard[br][bc] === PLAYER_B) {
          let dist = Math.abs(moves[i].toR - br) + Math.abs(moves[i].toC - bc);
          score += (10 - dist) * 3;
        }
      }
    }

    // Penalize moves that put piece in jumpable position
    let adj = getAdjacentCells(moves[i].toR, moves[i].toC);
    for (let a = 0; a < adj.length; a++) {
      let dr = moves[i].toR - adj[a].r;
      let dc = moves[i].toC - adj[a].c;
      if (
        inBounds(moves[i].toR + 2 * dr, moves[i].toC + 2 * dc) &&
        testBoard[adj[a].r][adj[a].c] === PLAYER_B
      ) {
        let jumpTargetR = moves[i].toR + 2 * dr;
        let jumpTargetC = moves[i].toC + 2 * dc;
        if (testBoard[jumpTargetR][jumpTargetC] === EMPTY) {
          score -= 50; // Very dangerous, can be captured
        }
      }
    }

    // Prefer moves that block wolf's escape routes
    for (let br2 = 0; br2 < ROW_COUNT; br2++) {
      for (let bc2 = 0; bc2 < COL_COUNT; bc2++) {
        if (testBoard[br2][bc2] === PLAYER_B) {
          let bAdj = getAdjacentCells(br2, bc2);
          let blockedCount = 0;
          for (let ba = 0; ba < bAdj.length; ba++) {
            if (testBoard[bAdj[ba].r][bAdj[ba].c] !== EMPTY) blockedCount++;
          }
          score += blockedCount * 8;
        }
      }
    }

    if (score > bestMoveScore) {
      bestMoveScore = score;
      bestMove = moves[i];
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
  let state = null;
  let selectedPiece = null;

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null;
  let remoteTeam = null;

  function initBoard() {
    let boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    for (let r = 0; r < ROW_COUNT; r++) {
      for (let c = 0; c < COL_COUNT; c++) {
        let cell = document.createElement("div");
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

  function renderGame() {
    if (!state) return;
    let cells = document.querySelectorAll("#board .cell");
    cells.forEach((cell) => {
      let r = Number.parseInt(cell.dataset.r);
      let c = Number.parseInt(cell.dataset.c);
      cell.textContent = "";
      cell.className = "cell";
      if (state.board[r][c] === PLAYER_A) {
        cell.classList.add("cell-a");
        cell.textContent = "羊";
      } else if (state.board[r][c] === PLAYER_B) {
        cell.classList.add("cell-b");
        cell.textContent = "狼";
      }
      if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
        cell.classList.add("cell-selected");
      }
      if (selectedPiece) {
        // Highlight step moves
        let stepMoves = getStepMoves(state.board, selectedPiece.r, selectedPiece.c);
        for (let i = 0; i < stepMoves.length; i++) {
          if (stepMoves[i].toR === r && stepMoves[i].toC === c) {
            cell.classList.add("cell-highlight");
          }
        }
        // Highlight jump moves for wolf
        if (state.currentPlayer === PLAYER_B) {
          let jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
          for (let j = 0; j < jumpMoves.length; j++) {
            if (jumpMoves[j].toR === r && jumpMoves[j].toC === c) {
              cell.classList.add("cell-jump");
            }
          }
        }
      }
      // Highlight last jump capture
      if (state.lastJump && state.lastJump.captureR === r && state.lastJump.captureC === c) {
        cell.classList.add("cell-captured");
      }
    });

    // Current acting side - shown as 玩家/电脑 (PVE), 玩家1/玩家2 (PVP), or 你/对方 (online)
    let label;
    if (state.mode === "online") {
      let isMyTurn = state.currentPlayer === localTeam;
      label = { text: isMyTurn ? "你" : "对方" };
    } else {
      label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.currentPlayer,
        playerSide: state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
          : [PLAYER_A, PLAYER_B],
      });
    }
    let playerClass = state.currentPlayer === PLAYER_A ? "team-a" : "team-b";
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className = "team-indicator " + playerClass;
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("pieces-a").textContent = state.piecesA;
    document.getElementById("pieces-b").textContent = state.piecesB;

    if (state.gameOver) {
      let winnerText;
      if (state.mode === "online") {
        winnerText = state.winner === localTeam ? "你" : "对方";
      } else {
        let winnerLabel = getCurrentPlayerLabel({
          mode: state.mode,
          currentSide: state.winner,
          playerSide: state.playerTeam,
          sidesOrder: state.firstPlayer
            ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
            : [PLAYER_A, PLAYER_B],
        });
        winnerText = winnerLabel.text;
      }
      document.getElementById("winner-text").textContent = winnerText + " 获胜！";
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
      let stepMoves = getStepMoves(state.board, selectedPiece.r, selectedPiece.c);
      for (let i = 0; i < stepMoves.length; i++) {
        if (stepMoves[i].toR === r && stepMoves[i].toC === c) {
          state.board = applyMove(state.board, stepMoves[i]);
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
        let jumpMoves = getJumpMoves(state.board, selectedPiece.r, selectedPiece.c);
        for (let j = 0; j < jumpMoves.length; j++) {
          if (jumpMoves[j].toR === r && jumpMoves[j].toC === c) {
            state.board = applyMove(state.board, jumpMoves[j]);
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

    let winner = checkWin(state.board);
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
      let aiMove = getBestAIMove(state);
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
      let aiChoices = ["rock", "scissors", "paper"];
      let aiChoice = aiChoices[Math.floor(Math.random() * 3)];
      let result = judgeRPS(choice, aiChoice);
      let resultDiv = document.getElementById("rps-result");
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
    if (state && state.mode === "online" && networkProtocol) {
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

  let rpsChoices = { online: null, remote: null };

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
      let winner = judgeRPS(rpsChoices.online, rpsChoices.remote);
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
    let resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      return;
    }

    let myChoice = rpsChoices.online;
    let theirChoice = rpsChoices.remote;
    let iWin = result.firstPlayer === localPlayerRole;

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

    let hostPiece = PLAYER_A;
    let guestPiece = PLAYER_B;

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
    let fromR = actionData.fx;
    let fromC = actionData.fy;
    let toR = actionData.tx;
    let toC = actionData.ty;

    // Find and apply the matching move
    let stepMoves = getStepMoves(state.board, fromR, fromC);
    for (let i = 0; i < stepMoves.length; i++) {
      if (stepMoves[i].toR === toR && stepMoves[i].toC === toC) {
        state.board = applyMove(state.board, stepMoves[i]);
        state.lastJump = null;
        finishTurn();
        return;
      }
    }

    if (state.currentPlayer === PLAYER_B) {
      let jumpMoves = getJumpMoves(state.board, fromR, fromC);
      for (let j = 0; j < jumpMoves.length; j++) {
        if (jumpMoves[j].toR === toR && jumpMoves[j].toC === toC) {
          state.board = applyMove(state.board, jumpMoves[j]);
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
    let btnOnline = document.getElementById("btn-online");
    if (btnOnline) {
      if (!RoomUI.isSupported()) {
        btnOnline.style.display = "none";
      } else {
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
      }
    }

    // Online RPS buttons
    document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((button) => {
      button.addEventListener("click", (ev) => {
        let choice = ev.target.dataset.choice;
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
