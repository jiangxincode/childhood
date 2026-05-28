/* eslint-disable no-let, no-undef */
// ============================================================
// 四步钉 (Si Bu Ding - "Four Step Nail" / 四子棋)
// Two players on a 4x4 intersection board (4 lines each direction).
// Each side starts with 4 pieces lined up on its back rank:
//   A (top)    on row 0 (y = 0), all 4 columns
//   B (bottom) on row 3 (y = 3), all 4 columns
// On each turn the side to move slides one piece one orthogonal step
// (no diagonals) onto an empty adjacent intersection.
// Capture rule: after a move, if the just-moved piece together with one
// of its allies forms a line of three "AAO" or "OAA" (two own pieces
// adjacent + one opponent piece) along a row or column, the opponent
// piece is captured. The first player to capture 3 opponent pieces
// (leaving the opponent with only 1 piece) wins.
// In PvE mode the human always plays the bottom side (B); AI plays A.
// ============================================================

if (judgeRPS === undefined && typeof require !== "undefined") {
  let _gameUtils = require("../../common/game-utils.js");
  let judgeRPS = _gameUtils.judgeRPS;
  let getRPSName = _gameUtils.getRPSName;
}

let PLAYER_A = "A";
let PLAYER_B = "B";
let EMPTY = null;
let BOARD_SIZE = 4; // 4 lines each direction -> 4x4 = 16 intersections
let PIECES_EACH = 4;
let CAPTURES_TO_WIN = 3; // first to capture 3 opponent pieces wins

// Fixed opening: each side fills its back rank.
// A on the top row (y = 0), B on the bottom row (y = 3).
let INITIAL_POSITIONS_A = (function () {
  let arr = [];
  for (let x = 0; x < BOARD_SIZE; x++) arr.push({ x: x, y: 0 });
  return arr;
})();
let INITIAL_POSITIONS_B = (function () {
  let arr = [];
  for (let x = 0; x < BOARD_SIZE; x++) arr.push({ x: x, y: BOARD_SIZE - 1 });
  return arr;
})();

// Orthogonal directions only (no diagonals).
let DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
];

// All possible "lines of three" - 3 consecutive intersections in a row
// or column. With BOARD_SIZE = 4 there are 4*2 = 8 starts per row * 2 = 16.
let THREE_LINES = (function () {
  let lines = [];
  // Horizontal triplets
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x <= BOARD_SIZE - 3; x++) {
      lines.push([
        { x: x, y: y },
        { x: x + 1, y: y },
        { x: x + 2, y: y },
      ]);
    }
  }
  // Vertical triplets
  for (let x2 = 0; x2 < BOARD_SIZE; x2++) {
    for (let y2 = 0; y2 <= BOARD_SIZE - 3; y2++) {
      lines.push([
        { x: x2, y: y2 },
        { x: x2, y: y2 + 1 },
        { x: x2, y: y2 + 2 },
      ]);
    }
  }
  return lines;
})();

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

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
    turnCount: 0,
    aiThinking: false,
    lastMove: null,
    lastCaptures: [],
    capturedByA: 0, // pieces of B captured by A
    capturedByB: 0, // pieces of A captured by B
  };
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

function copyBoard(board) {
  let newBoard = [];
  for (let y = 0; y < BOARD_SIZE; y++) newBoard.push(board[y].slice());
  return newBoard;
}

function getValidMoves(board, player) {
  let moves = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue;
      for (let d = 0; d < DIRECTIONS.length; d++) {
        let nx = x + DIRECTIONS[d].dx;
        let ny = y + DIRECTIONS[d].dy;
        if (inBounds(nx, ny) && board[ny][nx] === EMPTY) {
          moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
        }
      }
    }
  }
  return moves;
}

function hasValidMoves(board, player) {
  return getValidMoves(board, player).length > 0;
}

function movePiece(board, fromX, fromY, toX, toY) {
  let newBoard = copyBoard(board);
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

// Detect captures triggered by `player` moving to (toX, toY).
// Only triplets that contain the just-moved piece count as captures,
// matching the traditional "active capture" convention so that a player
// cannot accidentally lose a piece by walking next to two enemy pieces
// on their opponent's turn.
function detectCaptures(board, player, toX, toY) {
  let opponent = getOpponent(player);
  let captures = [];
  let seen = {};

  for (let i = 0; i < THREE_LINES.length; i++) {
    let line = THREE_LINES[i];
    // Skip lines that do not include the moved cell.
    let hit = false;
    for (let h = 0; h < 3; h++) {
      if (line[h].x === toX && line[h].y === toY) {
        hit = true;
        break;
      }
    }
    if (!hit) continue;

    let c0 = board[line[0].y][line[0].x];
    let c1 = board[line[1].y][line[1].x];
    let c2 = board[line[2].y][line[2].x];

    // AAO -> capture line[2]
    if (c0 === player && c1 === player && c2 === opponent) {
      let k1 = line[2].x + "," + line[2].y;
      if (!seen[k1]) {
        seen[k1] = true;
        captures.push({ x: line[2].x, y: line[2].y });
      }
    }
    // OAA -> capture line[0]
    if (c0 === opponent && c1 === player && c2 === player) {
      let k2 = line[0].x + "," + line[0].y;
      if (!seen[k2]) {
        seen[k2] = true;
        captures.push({ x: line[0].x, y: line[0].y });
      }
    }
  }
  return captures;
}

function applyCaptures(board, captures) {
  let newBoard = copyBoard(board);
  for (let i = 0; i < captures.length; i++) {
    newBoard[captures[i].y][captures[i].x] = EMPTY;
  }
  return newBoard;
}

// `player` wins when its captured count for the opponent reaches
// CAPTURES_TO_WIN, which is equivalent to the opponent having only
// PIECES_EACH - CAPTURES_TO_WIN = 1 piece left.
function checkWin(board, player) {
  let opponent = getOpponent(player);
  if (countPieces(board, opponent) <= PIECES_EACH - CAPTURES_TO_WIN) {
    return { winner: player };
  }
  return null;
}

// ============================================================
// AI: minimax with alpha-beta pruning
// ============================================================

function evaluateBoard(board, aiPlayer) {
  let opponent = getOpponent(aiPlayer);
  let ai = countPieces(board, aiPlayer);
  let opp = countPieces(board, opponent);
  if (opp <= PIECES_EACH - CAPTURES_TO_WIN) return 100000;
  if (ai <= PIECES_EACH - CAPTURES_TO_WIN) return -100000;

  let score = (ai - opp) * 50;

  // Bonus for threats (any of our pieces adjacent to another own piece
  // with a third cell that could complete a capture line).
  for (let i = 0; i < THREE_LINES.length; i++) {
    let line = THREE_LINES[i];
    let cells = [
      board[line[0].y][line[0].x],
      board[line[1].y][line[1].x],
      board[line[2].y][line[2].x],
    ];
    let aiCount = 0;
    let oppCount = 0;
    for (let k = 0; k < 3; k++) {
      if (cells[k] === aiPlayer) aiCount++;
      else if (cells[k] === opponent) oppCount++;
    }
    if (aiCount === 2 && oppCount === 1) score += 12;
    if (oppCount === 2 && aiCount === 1) score -= 12;
  }
  return score;
}

function applyMoveWithCaptures(board, move, player) {
  let nb = movePiece(board, move.fromX, move.fromY, move.toX, move.toY);
  let caps = detectCaptures(nb, player, move.toX, move.toY);
  if (caps.length > 0) nb = applyCaptures(nb, caps);
  return { board: nb, captures: caps };
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
  let opponent = getOpponent(aiPlayer);
  if (checkWin(board, aiPlayer)) return 100000 + depth;
  if (checkWin(board, opponent)) return -100000 - depth;

  let nextPlayer = isMaximizing ? aiPlayer : opponent;
  if (!hasValidMoves(board, nextPlayer)) {
    // Side to move stuck: count it as a loss for that side.
    return isMaximizing ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  let moves = getValidMoves(board, nextPlayer);
  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      let nb = applyMoveWithCaptures(board, moves[i], aiPlayer).board;
      let s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  let worst = Infinity;
  for (let k = 0; k < moves.length; k++) {
    let nb2 = applyMoveWithCaptures(board, moves[k], opponent).board;
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

  // Quick win check
  for (let w = 0; w < moves.length; w++) {
    let afterAi = applyMoveWithCaptures(state.board, moves[w], aiPlayer).board;
    if (checkWin(afterAi, aiPlayer)) return moves[w];
  }

  let depth = 4;
  let bestScore = -Infinity;
  let bestMoves = [];
  for (let i = 0; i < moves.length; i++) {
    let next = applyMoveWithCaptures(state.board, moves[i], aiPlayer).board;
    let s = minimax(next, depth, -Infinity, Infinity, false, aiPlayer);
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
    CAPTURES_TO_WIN: CAPTURES_TO_WIN,
    INITIAL_POSITIONS_A: INITIAL_POSITIONS_A,
    INITIAL_POSITIONS_B: INITIAL_POSITIONS_B,
    DIRECTIONS: DIRECTIONS,
    THREE_LINES: THREE_LINES,
    inBounds: inBounds,
    getOpponent: getOpponent,
    createBoard: createBoard,
    applyInitialLayout: applyInitialLayout,
    createInitialState: createInitialState,
    countPieces: countPieces,
    copyBoard: copyBoard,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    movePiece: movePiece,
    detectCaptures: detectCaptures,
    applyCaptures: applyCaptures,
    applyMoveWithCaptures: applyMoveWithCaptures,
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
  let rpsChoices = { player1: null, player2: null, human: null };
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // PLAYER_A or PLAYER_B
  let remoteTeam = null; // PLAYER_A or PLAYER_B

  // Board geometry: 4x4 intersection grid in an SVG viewBox.
  let BOARD_VIEW = 480;
  let BOARD_PADDING = 60;
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

    // 4 horizontal + 4 vertical lines forming the grid of intersections
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

        let hit = document.createElementNS(svgNS, "circle");
        hit.setAttribute("r", CELL_SIZE / 2 - 2);
        hit.setAttribute("class", "node-hit");
        g.appendChild(hit);

        let dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("r", 4);
        dot.setAttribute("class", "node-dot");
        g.appendChild(dot);

        let circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", 22);
        circle.setAttribute("class", "node-circle");
        g.appendChild(circle);

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

  function reachableTargets() {
    let map = {};
    if (!selectedPiece) return map;
    let moves = getValidMoves(state.board, state.currentPlayer);
    for (let i = 0; i < moves.length; i++) {
      let m = moves[i];
      if (m.fromX === selectedPiece.x && m.fromY === selectedPiece.y) {
        map[m.toX + "," + m.toY] = m;
      }
    }
    return map;
  }

  function renderGame() {
    if (!state) return;
    let reachable = reachableTargets();

    let nodes = document.querySelectorAll("#board .node");
    nodes.forEach((g) => {
      let nx = Number.parseInt(g.getAttribute("data-x"));
      let ny = Number.parseInt(g.getAttribute("data-y"));
      let classes = ["node"];
      if (state.board[ny][nx] === PLAYER_A) classes.push("node-a");
      else if (state.board[ny][nx] === PLAYER_B) classes.push("node-b");
      else classes.push("node-empty");
      if (selectedPiece?.x === nx && selectedPiece.y === ny) {
        classes.push("node-selected");
      }
      if (reachable[nx + "," + ny]) classes.push("node-highlight");
      g.setAttribute("class", classes.join(" "));
    });

    // Current acting side - shown as 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP)
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
        : [PLAYER_A, PLAYER_B],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === PLAYER_A ? "team-a" : "team-b");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("captured-by-a").textContent = state.capturedByA;
    document.getElementById("captured-by-b").textContent = state.capturedByB;

    let msg = document.getElementById("message");
    if (state.aiThinking) {
      msg.textContent = "AI 思考中…";
      msg.className = "info";
    } else if (state.lastCaptures?.length > 0) {
      msg.textContent = "吃掉对方 " + state.lastCaptures.length + " 子！";
      msg.className = "info";
    } else {
      msg.textContent = "";
      msg.className = "";
    }

    if (state.gameOver) {
      let winnerText;
      if (state.winner === PLAYER_A || state.winner === PLAYER_B) {
        // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of position name
        let winnerLabel = getCurrentPlayerLabel({
          mode: state.mode,
          currentSide: state.winner,
          playerSide: state.playerTeam,
          sidesOrder: state.firstPlayer
            ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
            : [PLAYER_A, PLAYER_B],
        });
        winnerText = winnerLabel.text + " 吃掉对方 3 子，获胜！";
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

    if (state.board[y][x] === state.currentPlayer) {
      selectedPiece = { x: x, y: y };
      // Picking a new piece clears any stale capture banner.
      state.lastCaptures = [];
      renderGame();
      return;
    }

    if (selectedPiece) {
      let moves = getValidMoves(state.board, state.currentPlayer);
      for (let i = 0; i < moves.length; i++) {
        let m = moves[i];
        if (
          m.fromX === selectedPiece.x &&
          m.fromY === selectedPiece.y &&
          m.toX === x &&
          m.toY === y
        ) {
          commitMove(m);
          return;
        }
      }
    }

    selectedPiece = null;
    renderGame();
  }

  function commitMove(move) {
    let result = applyMoveWithCaptures(state.board, move, state.currentPlayer);
    state.board = result.board;
    state.lastMove = move;
    state.lastCaptures = result.captures;
    if (result.captures.length > 0) {
      if (state.currentPlayer === PLAYER_A) state.capturedByA += result.captures.length;
      else state.capturedByB += result.captures.length;
    }
    selectedPiece = null;

    if (state.mode === "online" && networkProtocol) {
      networkProtocol.sendAction({
        a: "move",
        fromX: move.fromX,
        fromY: move.fromY,
        toX: move.toX,
        toY: move.toY,
      });
    }

    let winResult = checkWin(state.board, state.currentPlayer);
    if (winResult) {
      state.gameOver = true;
      state.winner = winResult.winner;
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
    let resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document
        .querySelectorAll("#rps-online-buttons .btn-rps")
        .forEach((btn) => btn.classList.remove("selected"));
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
    state.playerTeam = localTeam;

    selectedPiece = null;
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = "none";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
  }

  function applyRemoteAction(actionData) {
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== remoteTeam) return;
    commitMove({
      fromX: actionData.fromX,
      fromY: actionData.fromY,
      toX: actionData.toX,
      toY: actionData.toY,
    });
  }

  function handleDisconnect() {
    if (state && !state.gameOver) {
      state.gameOver = true;
      document.getElementById("winner-text").textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

  function startGame(mode, firstPlayer) {
    state = createInitialState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    state.firstPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      // Human always plays the bottom side (B); AI plays the top (A).
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

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-pvp").addEventListener("click", () => {
      startGame("pvp", PLAYER_A);
    });
    document.getElementById("btn-pve").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
    });
    document.getElementById("rps-pve").style.display = "block";
    document.querySelectorAll("#rps-pve .btn-rps").forEach((btn) => {
      btn.addEventListener("click", function () {
        handleRPSChoice(this.dataset.choice);
      });
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
              document.getElementById("message").textContent = msg;
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

    document.getElementById("btn-restart").addEventListener("click", restartGame);
  });
}
