/* eslint-disable no-let, no-undef */
// ============================================================
// 摆四龙 (Bai Si Long) - Form a Dragon of Four
// Two players, 5x5 intersection board (横竖各5条线 = 25 points),
// each side has 4 pieces fixed at the bottom rank (excluding the
// centre column). Players take turns moving one piece to any of the
// 8 adjacent empty intersections (orthogonal or diagonal, one step).
// Winner: the first to align their 4 pieces in a row of 4 consecutive
// intersections - horizontal, vertical, or diagonal.
// In PvE mode the human plays the bottom side (B), AI plays the top (A).
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  let _gameUtils = require("../../common/game-utils.js");
  let judgeRPS = _gameUtils.judgeRPS;
  let getRPSName = _gameUtils.getRPSName;
}

let PLAYER_A = "A";
let PLAYER_B = "B";
let EMPTY = null;
let BOARD_SIZE = 4; // 4 lines each direction -> 4x4 intersections
let PIECES_EACH = 4;

// Fixed opening: pieces of both sides interleave on the back ranks.
// Top row    (y=0): B A B A  (我方 敌方 我方 敌方)
// Bottom row (y=3): A B A B  (敌方 我方 敌方 我方)
// Each side ends up with 2 pieces on top and 2 on bottom.
let INITIAL_POSITIONS_A = [
  { x: 1, y: 0 },
  { x: 3, y: 0 },
  { x: 0, y: 3 },
  { x: 2, y: 3 },
];
let INITIAL_POSITIONS_B = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 1, y: 3 },
  { x: 3, y: 3 },
];

// Eight movement directions: orthogonal + diagonal, one step each.
let DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: 1 },
];

// Pre-compute every winning line: 4 consecutive intersections in a row,
// column, or diagonal direction. With BOARD_SIZE = 5 and PIECES_EACH = 4
// this yields 28 lines total.
let WIN_LINES = (function () {
  let lines = [];
  // Horizontal
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x <= BOARD_SIZE - PIECES_EACH; x++) {
      let hLine = [];
      for (let i = 0; i < PIECES_EACH; i++) hLine.push({ x: x + i, y: y });
      lines.push(hLine);
    }
  }
  // Vertical
  for (let x2 = 0; x2 < BOARD_SIZE; x2++) {
    for (let y2 = 0; y2 <= BOARD_SIZE - PIECES_EACH; y2++) {
      let vLine = [];
      for (let j = 0; j < PIECES_EACH; j++) vLine.push({ x: x2, y: y2 + j });
      lines.push(vLine);
    }
  }
  // Diagonal "\"
  for (let y3 = 0; y3 <= BOARD_SIZE - PIECES_EACH; y3++) {
    for (let x3 = 0; x3 <= BOARD_SIZE - PIECES_EACH; x3++) {
      let dLine = [];
      for (let k = 0; k < PIECES_EACH; k++) dLine.push({ x: x3 + k, y: y3 + k });
      lines.push(dLine);
    }
  }
  // Diagonal "/"
  for (let y4 = 0; y4 <= BOARD_SIZE - PIECES_EACH; y4++) {
    for (let x4 = PIECES_EACH - 1; x4 < BOARD_SIZE; x4++) {
      let aLine = [];
      for (let l = 0; l < PIECES_EACH; l++) aLine.push({ x: x4 - l, y: y4 + l });
      lines.push(aLine);
    }
  }
  return lines;
})();

function createBoard() {
  let board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    let row = [];
    for (let x = 0; x < BOARD_SIZE; x++) row.push(EMPTY);
    board.push(row);
  }
  return board;
}

function applyInitialLayout(board) {
  for (let i = 0; i < INITIAL_POSITIONS_A.length; i++) {
    let pa = INITIAL_POSITIONS_A[i];
    board[pa.y][pa.x] = PLAYER_A;
  }
  for (let j = 0; j < INITIAL_POSITIONS_B.length; j++) {
    let pb = INITIAL_POSITIONS_B[j];
    board[pb.y][pb.x] = PLAYER_B;
  }
  return board;
}

function createInitialState(mode) {
  return {
    mode: mode,
    board: applyInitialLayout(createBoard()),
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    winLine: null,
    turnCount: 0,
    aiThinking: false,
    lastMove: null,
  };
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

function countPieces(board, player) {
  let count = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) count++;
    }
  }
  return count;
}

// Eight one-step adjacencies, clipped to the board.
function getAdjacentCells(x, y) {
  let cells = [];
  for (let i = 0; i < DIRECTIONS.length; i++) {
    let nx = x + DIRECTIONS[i].dx;
    let ny = y + DIRECTIONS[i].dy;
    if (inBounds(nx, ny)) cells.push({ x: nx, y: ny });
  }
  return cells;
}

function getValidMoves(board, player) {
  let moves = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue;
      let adj = getAdjacentCells(x, y);
      for (let i = 0; i < adj.length; i++) {
        if (board[adj[i].y][adj[i].x] === EMPTY) {
          moves.push({ fromX: x, fromY: y, toX: adj[i].x, toY: adj[i].y });
        }
      }
    }
  }
  return moves;
}

function hasValidMoves(board, player) {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue;
      let adj = getAdjacentCells(x, y);
      for (let i = 0; i < adj.length; i++) {
        if (board[adj[i].y][adj[i].x] === EMPTY) return true;
      }
    }
  }
  return false;
}

function movePiece(board, fromX, fromY, toX, toY) {
  let newBoard = [];
  for (let y = 0; y < BOARD_SIZE; y++) newBoard.push(board[y].slice());
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

// Returns { winner, line } if `player` has formed a dragon, otherwise null.
function checkWin(board, player) {
  for (let i = 0; i < WIN_LINES.length; i++) {
    let line = WIN_LINES[i];
    let win = true;
    for (let j = 0; j < line.length; j++) {
      if (board[line[j].y][line[j].x] !== player) {
        win = false;
        break;
      }
    }
    if (win) return { winner: player, line: line };
  }
  return null;
}

// ============================================================
// AI: minimax with alpha-beta pruning over the move-only game.
// ============================================================

// For each line, count pieces of each player. A line where both players
// share intersections is dead (cannot be completed by either side).
function evaluateBoard(board, aiPlayer) {
  let opponent = getOpponent(aiPlayer);
  let score = 0;
  for (let i = 0; i < WIN_LINES.length; i++) {
    let line = WIN_LINES[i];
    let ai = 0;
    let opp = 0;
    for (let j = 0; j < line.length; j++) {
      let cell = board[line[j].y][line[j].x];
      if (cell === aiPlayer) ai++;
      else if (cell === opponent) opp++;
    }
    if (ai > 0 && opp > 0) continue; // blocked line, no value
    if (ai > 0) score += [0, 1, 8, 64, 100000][ai];
    else if (opp > 0) score -= [0, 1, 8, 64, 100000][opp];
  }
  return score;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
  let opponent = getOpponent(aiPlayer);

  // Terminal: someone already has a dragon.
  let aiWin = checkWin(board, aiPlayer);
  if (aiWin) return 100000 + depth;
  let oppWin = checkWin(board, opponent);
  if (oppWin) return -100000 - depth;

  let nextPlayer = isMaximizing ? aiPlayer : opponent;
  if (!hasValidMoves(board, nextPlayer)) {
    // The side to move is stalemated: count it as a loss for that side.
    return isMaximizing ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  let moves = getValidMoves(board, nextPlayer);
  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      let nb = movePiece(board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
      let s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  let worst = Infinity;
  for (let k = 0; k < moves.length; k++) {
    let nb2 = movePiece(board, moves[k].fromX, moves[k].fromY, moves[k].toX, moves[k].toY);
    let s2 = minimax(nb2, depth - 1, alpha, beta, true, aiPlayer);
    if (s2 < worst) worst = s2;
    if (worst < beta) beta = worst;
    if (beta <= alpha) break;
  }
  return worst;
}

function getBestAIMove(state) {
  let aiPlayer = state.aiTeam;
  let moves = getValidMoves(state.board, aiPlayer);
  if (moves.length === 0) return null;

  let depth = 4;
  let bestScore = -Infinity;
  let bestMoves = [];
  for (let i = 0; i < moves.length; i++) {
    let nb = movePiece(state.board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
    // Quick win shortcut
    if (checkWin(nb, aiPlayer)) return moves[i];
    let s = minimax(nb, depth, -Infinity, Infinity, false, aiPlayer);
    if (s > bestScore) {
      bestScore = s;
      bestMoves = [moves[i]];
    } else if (s === bestScore) {
      bestMoves.push(moves[i]);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    BOARD_SIZE: BOARD_SIZE,
    PIECES_EACH: PIECES_EACH,
    INITIAL_POSITIONS_A: INITIAL_POSITIONS_A,
    INITIAL_POSITIONS_B: INITIAL_POSITIONS_B,
    DIRECTIONS: DIRECTIONS,
    WIN_LINES: WIN_LINES,
    createBoard: createBoard,
    applyInitialLayout: applyInitialLayout,
    createInitialState: createInitialState,
    inBounds: inBounds,
    getOpponent: getOpponent,
    countPieces: countPieces,
    getAdjacentCells: getAdjacentCells,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    movePiece: movePiece,
    checkWin: checkWin,
    evaluateBoard: evaluateBoard,
    minimax: minimax,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI (SVG board with intersections)
// ============================================================
if (typeof document !== "undefined") {
  let state = null;
  let selectedPiece = null;

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // PLAYER_A or PLAYER_B
  let remoteTeam = null;

  // Board geometry: a square grid of intersections inside an SVG viewBox.
  let BOARD_VIEW = 500; // viewBox size (square)
  let BOARD_PADDING = 50; // padding from edge to outermost line
  let CELL_SIZE = (BOARD_VIEW - BOARD_PADDING * 2) / (BOARD_SIZE - 1);

  function nodeToPx(x, y) {
    return {
      cx: BOARD_PADDING + x * CELL_SIZE,
      cy: BOARD_PADDING + y * CELL_SIZE,
    };
  }

  function initBoard() {
    let boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    let svgNS = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + BOARD_VIEW + " " + BOARD_VIEW);
    svg.setAttribute("class", "board-svg");

    // 5 horizontal + 5 vertical lines forming the grid of intersections
    for (let i = 0; i < BOARD_SIZE; i++) {
      let p0 = nodeToPx(0, i);
      let p1 = nodeToPx(BOARD_SIZE - 1, i);
      let hLine = document.createElementNS(svgNS, "line");
      hLine.setAttribute("x1", p0.cx);
      hLine.setAttribute("y1", p0.cy);
      hLine.setAttribute("x2", p1.cx);
      hLine.setAttribute("y2", p1.cy);
      hLine.setAttribute("class", "board-line");
      svg.appendChild(hLine);

      let q0 = nodeToPx(i, 0);
      let q1 = nodeToPx(i, BOARD_SIZE - 1);
      let vLine = document.createElementNS(svgNS, "line");
      vLine.setAttribute("x1", q0.cx);
      vLine.setAttribute("y1", q0.cy);
      vLine.setAttribute("x2", q1.cx);
      vLine.setAttribute("y2", q1.cy);
      vLine.setAttribute("class", "board-line");
      svg.appendChild(vLine);
    }

    // Interactive intersection nodes
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        let pt = nodeToPx(x, y);
        let g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "node");
        g.setAttribute("data-x", x);
        g.setAttribute("data-y", y);
        g.setAttribute("transform", "translate(" + pt.cx + "," + pt.cy + ")");

        // Wide invisible hit area for easier tapping
        let hit = document.createElementNS(svgNS, "circle");
        hit.setAttribute("r", CELL_SIZE / 2 - 2);
        hit.setAttribute("class", "node-hit");
        g.appendChild(hit);

        // Small dot showing the intersection when no piece is placed.
        let dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("r", 4);
        dot.setAttribute("class", "node-dot");
        g.appendChild(dot);

        let circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", 22);
        circle.setAttribute("class", "node-circle");
        g.appendChild(circle);

        let text = document.createElementNS(svgNS, "text");
        text.setAttribute("class", "node-text");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central");
        g.appendChild(text);

        g.addEventListener(
          "click",
          (function (cx, cy) {
            return function () {
              handlePositionClick(cx, cy);
            };
          })(x, y)
        );
        svg.appendChild(g);
      }
    }

    boardEl.appendChild(svg);
  }

  function renderGame() {
    if (!state) return;

    // Build a lookup of cells that are part of the winning dragon, if any.
    let winSet = {};
    if (state.winLine) {
      for (let w = 0; w < state.winLine.length; w++) {
        winSet[state.winLine[w].x + "," + state.winLine[w].y] = true;
      }
    }

    // Highlight reachable destinations from the selected piece.
    let reachable = {};
    if (selectedPiece) {
      let adj = getAdjacentCells(selectedPiece.x, selectedPiece.y);
      for (let i = 0; i < adj.length; i++) {
        if (state.board[adj[i].y][adj[i].x] === EMPTY) {
          reachable[adj[i].x + "," + adj[i].y] = true;
        }
      }
    }

    let nodes = document.querySelectorAll("#board .node");
    nodes.forEach((g) => {
      let nx = Number.parseInt(g.getAttribute("data-x"));
      let ny = Number.parseInt(g.getAttribute("data-y"));
      let classes = ["node"];
      let label = "";
      if (state.board[ny][nx] === PLAYER_A) {
        classes.push("node-a");
        label = "";
      } else if (state.board[ny][nx] === PLAYER_B) {
        classes.push("node-b");
        label = "";
      } else {
        classes.push("node-empty");
      }
      if (selectedPiece?.x === nx && selectedPiece.y === ny) {
        classes.push("node-selected");
      }
      if (reachable[nx + "," + ny]) classes.push("node-highlight");
      if (winSet[nx + "," + ny]) classes.push("node-win");
      g.setAttribute("class", classes.join(" "));
      let text = g.querySelector(".node-text");
      if (text) text.textContent = label;
    });

    // Current acting side - shown as 玩家/电脑 (PVE), 玩家1/玩家2 (PVP), or 你/对方 (online)
    let label;
    if (state.mode === "online") {
      const isMyTurn = state.currentPlayer === state.localTeam;
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
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("moves-a").textContent = getValidMoves(state.board, PLAYER_A).length;
    document.getElementById("moves-b").textContent = getValidMoves(state.board, PLAYER_B).length;

    let msg = document.getElementById("message");
    if (state.aiThinking) {
      msg.textContent = "AI 思考中…";
      msg.className = "info";
    } else {
      msg.textContent = "";
      msg.className = "";
    }

    if (state.gameOver) {
      let winnerText;
      if (state.winner === PLAYER_A || state.winner === PLAYER_B) {
        let winnerLabel;
        if (state.mode === "online") {
          winnerLabel = { text: state.winner === state.localTeam ? "你" : "对方" };
        } else {
          // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of position name
          winnerLabel = getCurrentPlayerLabel({
            mode: state.mode,
            currentSide: state.winner,
            playerSide: state.playerTeam,
            sidesOrder: state.firstPlayer
              ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
              : [PLAYER_A, PLAYER_B],
          });
        }
        winnerText = winnerLabel.text + " 摆出四龙获胜！";
      } else {
        winnerText = "平局";
      }
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  function handlePositionClick(x, y) {
    if (!state || state.gameOver) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;
    if (state.mode === "online" && state.currentPlayer !== localTeam) return;

    // Click on own piece: select / re-select
    if (state.board[y][x] === state.currentPlayer) {
      selectedPiece = { x: x, y: y };
      renderGame();
      return;
    }

    // Click on a reachable empty intersection: commit move
    if (selectedPiece && state.board[y][x] === EMPTY) {
      let adj = getAdjacentCells(selectedPiece.x, selectedPiece.y);
      for (let i = 0; i < adj.length; i++) {
        if (adj[i].x === x && adj[i].y === y) {
          let moveData = {
            fromX: selectedPiece.x,
            fromY: selectedPiece.y,
            toX: x,
            toY: y,
          };
          commitMove(moveData);

          if (state.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({
              a: "move",
              fromX: moveData.fromX,
              fromY: moveData.fromY,
              toX: moveData.toX,
              toY: moveData.toY,
            });
          }
          return;
        }
      }
    }

    // Otherwise clear selection
    selectedPiece = null;
    renderGame();
  }

  function commitMove(move) {
    state.board = movePiece(state.board, move.fromX, move.fromY, move.toX, move.toY);
    state.lastMove = move;
    selectedPiece = null;

    let winResult = checkWin(state.board, state.currentPlayer);
    if (winResult) {
      state.gameOver = true;
      state.winner = winResult.winner;
      state.winLine = winResult.line;
      renderGame();
      return;
    }

    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;

    // Stalemate: side to move has no legal moves -> the other side wins.
    if (!hasValidMoves(state.board, state.currentPlayer)) {
      state.gameOver = true;
      state.winner = getOpponent(state.currentPlayer);
      renderGame();
      return;
    }

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
      state.aiThinking = false;
      if (!aiMove) {
        state.gameOver = true;
        state.winner = getOpponent(state.aiTeam);
        renderGame();
        return;
      }
      commitMove(aiMove);
    }, 400);
  }

  function startGame(mode, firstPlayer) {
    state = createInitialState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    state.firstPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      // Human always plays the bottom side (B), AI plays the top (A).
      state.playerTeam = PLAYER_B;
      state.aiTeam = PLAYER_A;
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

  function handleRPSChoice(choice) {
    let aiChoices = ["rock", "scissors", "paper"];
    let aiChoice = aiChoices[Math.floor(Math.random() * 3)];
    let result = judgeRPS(choice, aiChoice);
    let resultDiv = document.getElementById("rps-result");
    if (result === 1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，你先手！</p>";
      // Player wins RPS -> human (B) goes first.
      setTimeout(() => startGame("pve", PLAYER_B), 1200);
    } else if (result === -1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，AI先手！</p>";
      // AI wins RPS -> AI (A) goes first.
      setTimeout(() => startGame("pve", PLAYER_A), 1200);
    } else {
      resultDiv.innerHTML = "<p>平局！再来一次</p>";
    }
  }

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
    selectedPiece = null;
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
        state = null;
        selectedPiece = null;
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
    let rpsOnlineStatus = document.getElementById("rps-online-status");
    if (rpsOnlineStatus) rpsOnlineStatus.textContent = "请选择";
    let rpsOnlineResult = document.getElementById("rps-online-result");
    if (rpsOnlineResult) rpsOnlineResult.textContent = "";
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
  }

  function handleOnlineRPSChoice(choice, ev) {
    state = state || {};
    state.rpsOnline = choice;
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
    ev.target.classList.add("selected");
    document.getElementById("rps-online-status").textContent =
      "已选择：" + getRPSName(choice) + "，等待对方...";
    networkProtocol.sendRPSChoice(choice);
  }

  function handleOnlineRPSReceived(remoteChoice) {
    state = state || {};
    state.rpsRemote = remoteChoice;
    checkOnlineRPSComplete();
  }

  function checkOnlineRPSComplete() {
    if (!state || !state.rpsOnline || !state.rpsRemote) return;

    if (localPlayerRole === "host") {
      let winner = judgeRPS(state.rpsOnline, state.rpsRemote);
      let firstPlayer;
      if (winner === 1) {
        firstPlayer = "host";
      } else if (winner === -1) {
        firstPlayer = "guest";
      } else {
        networkProtocol.sendRPSResult(null, null);
        state.rpsOnline = null;
        state.rpsRemote = null;
        document.getElementById("rps-online-status").textContent = "平局！请重新选择";
        document
          .querySelectorAll("#rps-online-buttons .btn-rps")
          .forEach((btn) => btn.classList.remove("selected"));
        return;
      }
      networkProtocol.sendRPSResult(
        {
          host: localPlayerRole === "host" ? state.rpsOnline : state.rpsRemote,
          guest: localPlayerRole === "host" ? state.rpsRemote : state.rpsOnline,
        },
        firstPlayer
      );
    }
  }

  function handleOnlineRPSResult(result) {
    let resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      state.rpsOnline = null;
      state.rpsRemote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document
        .querySelectorAll("#rps-online-buttons .btn-rps")
        .forEach((btn) => btn.classList.remove("selected"));
      return;
    }

    let myChoice = state.rpsOnline;
    let theirChoice = state.rpsRemote;
    let iWin = result.firstPlayer === localPlayerRole;

    resultEl.textContent =
      "你选择了" +
      getRPSName(myChoice) +
      "，对方选择了" +
      getRPSName(theirChoice) +
      (iWin ? "，你赢了！你先手。" : "，你输了！对方先手。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    state = createInitialState("online");

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
    state.localTeam = localTeam;
    state.remoteTeam = remoteTeam;
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
    // Remote action is a move: { a: "move", fromX, fromY, toX, toY }
    state.board = movePiece(
      state.board,
      actionData.fromX,
      actionData.fromY,
      actionData.toX,
      actionData.toY
    );
    state.lastMove = {
      fromX: actionData.fromX,
      fromY: actionData.fromY,
      toX: actionData.toX,
      toY: actionData.toY,
    };
    selectedPiece = null;

    let winResult = checkWin(state.board, state.currentPlayer);
    if (winResult) {
      state.gameOver = true;
      state.winner = winResult.winner;
      state.winLine = winResult.line;
      renderGame();
      return;
    }

    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;

    if (!hasValidMoves(state.board, state.currentPlayer)) {
      state.gameOver = true;
      state.winner = getOpponent(state.currentPlayer);
      renderGame();
      return;
    }

    renderGame();
  }

  function handleDisconnect() {
    if (state && !state.gameOver) {
      state.gameOver = true;
      let msg = document.getElementById("message");
      msg.textContent = "对方已断开连接";
      msg.className = "error";
      let winnerText = document.getElementById("winner-text");
      winnerText.textContent = "对方已断开连接，你获胜！";
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
            onConnectionEstablished: (connection, protocol, role) => {
              networkConnection = connection;
              networkProtocol = protocol;
              localPlayerRole = role;
              setupNetworkHandlers();
              startOnlineRPS();
            },
            onError: (msg) => {
              let msgEl = document.getElementById("message");
              msgEl.textContent = msg;
              msgEl.className = "error";
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
        let choice = ev.target.dataset.choice;
        handleOnlineRPSChoice(choice, ev);
      });
    });

    document.getElementById("rps-pve").style.display = "block";
    document.querySelectorAll("#rps-pve .btn-rps").forEach((btn) => {
      btn.addEventListener("click", function () {
        handleRPSChoice(this.dataset.choice);
      });
    });
    document.getElementById("btn-restart").addEventListener("click", restartGame);
  });
}
