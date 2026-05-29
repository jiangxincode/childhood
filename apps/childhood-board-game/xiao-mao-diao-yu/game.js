/* eslint-disable no-var, no-undef */
// ============================================================
// 小猫钓鱼 / 鸡毛蒜皮 (Xiao Mao Diao Yu / Ji Mao Suan Pi)
// 2 players, cross-shaped board, 2 pieces each.
// Move: single step OR three steps along chant "鸡毛蒜皮"
//       (origin = 鸡, then 3 hops 毛 / 蒜 / 皮).
// Capture: any move whose final landing is on opponent piece.
// Win: capture all opponent pieces OR opponent has no legal move.
// ============================================================

let judgeRPS, getRPSName;
if (typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  judgeRPS = _gameUtils.judgeRPS;
  getRPSName = _gameUtils.getRPSName;
}

const PLAYER_A = "A";
const PLAYER_B = "B";
const EMPTY = null;

// 12 nodes laid out on a 4x4 grid (corners empty)
//        0   1            (1,0) (2,0)
//    2   3   4   5        (0,1) (1,1) (2,1) (3,1)
//    6   7   8   9        (0,2) (1,2) (2,2) (3,2)
//       10  11            (1,3) (2,3)
const BOARD_POSITIONS = [
  { x: 1, y: 0 }, // 0
  { x: 2, y: 0 }, // 1
  { x: 0, y: 1 }, // 2
  { x: 1, y: 1 }, // 3
  { x: 2, y: 1 }, // 4
  { x: 3, y: 1 }, // 5
  { x: 0, y: 2 }, // 6
  { x: 1, y: 2 }, // 7
  { x: 2, y: 2 }, // 8
  { x: 3, y: 2 }, // 9
  { x: 1, y: 3 }, // 10
  { x: 2, y: 3 }, // 11
];

// Edges = sides of the five squares forming the cross
const ADJACENCY = [
  [1, 3], // 0
  [0, 4], // 1
  [3, 6], // 2
  [0, 2, 4, 7], // 3
  [1, 3, 5, 8], // 4
  [4, 9], // 5
  [2, 7], // 6
  [3, 6, 8, 10], // 7
  [4, 7, 9, 11], // 8
  [5, 8], // 9
  [7, 11], // 10
  [8, 10], // 11
];

const PIECES_EACH = 4;
const INITIAL_POSITIONS_A = [0, 1, 3, 4];
const INITIAL_POSITIONS_B = [7, 8, 10, 11];

// Grid size for rendering (4x4 with the four corners blank)
const GRID_COLS = 4;
const GRID_ROWS = 4;

// Move types
const MOVE_SINGLE = "single";
const MOVE_TRIPLE = "triple"; // 鸡毛蒜皮 (origin + 3 hops)

function createBoard() {
  const board = [];
  for (let i = 0; i < BOARD_POSITIONS.length; i++) {
    board.push(EMPTY);
  }
  return board;
}

function createGameState(mode) {
  const board = createBoard();
  for (const pos of INITIAL_POSITIONS_A) {
    board[pos] = PLAYER_A;
  }
  for (const pos2 of INITIAL_POSITIONS_B) {
    board[pos2] = PLAYER_B;
  }
  return {
    mode: mode,
    board: board,
    currentPlayer: PLAYER_A,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    lastMove: null,
  };
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

function getNeighbors(posIndex) {
  return ADJACENCY[posIndex];
}

function getPlayerPieces(board, player) {
  const pieces = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === player) {
      pieces.push(i);
    }
  }
  return pieces;
}

function countPieces(board, player) {
  let n = 0;
  for (const item of board) {
    if (item === player) n++;
  }
  return n;
}

// Returns true if a node is a valid landing spot for `player`
// (empty, or occupied by the opponent so we can capture it).
function isLandable(board, node, player) {
  const v = board[node];
  return v === EMPTY || v === getOpponent(player);
}

// Get all single-step moves for one piece.
function getSingleMovesForPiece(board, from, player) {
  const moves = [];
  const neighbors = ADJACENCY[from];
  for (const to of neighbors) {
    if (isLandable(board, to, player)) {
      moves.push({
        type: MOVE_SINGLE,
        from: from,
        to: to,
        path: [from, to],
        capture: board[to] === getOpponent(player) ? to : null,
      });
    }
  }
  return moves;
}

// Get all "鸡毛蒜皮" triple moves for one piece. The origin counts as 鸡,
// then we take 3 connected hops (毛, 蒜, 皮). The final landing must be on
// an opponent piece (i.e. triple moves are *only* for capturing). Intermediate
// nodes can be anything (empty / own / opponent) as long as the path does not
// revisit a node.
function getTripleMovesForPiece(board, from, player) {
  const moves = [];
  const opponent = getOpponent(player);
  const visited = {};
  visited[from] = true;
  const step1Neighbors = ADJACENCY[from];
  for (const n1 of step1Neighbors) {
    if (visited[n1]) continue;
    visited[n1] = true;
    const step2Neighbors = ADJACENCY[n1];
    for (const n2 of step2Neighbors) {
      if (visited[n2]) continue;
      visited[n2] = true;
      const step3Neighbors = ADJACENCY[n2];
      for (const n3 of step3Neighbors) {
        if (visited[n3]) continue;
        // Only valid if the final landing captures an opponent piece
        if (board[n3] !== opponent) continue;
        moves.push({
          type: MOVE_TRIPLE,
          from: from,
          to: n3,
          path: [from, n1, n2, n3],
          capture: n3,
        });
      }
      visited[n2] = false;
    }
    visited[n1] = false;
  }
  return moves;
}

function getValidMoves(board, player) {
  const moves = [];
  const pieces = getPlayerPieces(board, player);
  for (const piece of pieces) {
    const single = getSingleMovesForPiece(board, piece, player);
    for (const move of single) {
      moves.push(move);
    }
    const triple = getTripleMovesForPiece(board, piece, player);
    for (const move2 of triple) {
      moves.push(move2);
    }
  }
  return moves;
}

function hasValidMoves(board, player) {
  const pieces = getPlayerPieces(board, player);
  for (const piece of pieces) {
    if (getSingleMovesForPiece(board, piece, player).length > 0) return true;
    if (getTripleMovesForPiece(board, piece, player).length > 0) return true;
  }
  return false;
}

function applyMove(board, move) {
  const newBoard = board.slice();
  newBoard[move.from] = EMPTY;
  // capture happens to be the same node as `to`, so a single assignment
  // overwrites both the captured piece and lands the moving piece.
  newBoard[move.to] = board[move.from];
  return newBoard;
}

// Returns the winner code ("A" or "B") if the game is over for `nextPlayer`,
// otherwise null. Should be called after a move is applied, with `nextPlayer`
// being the side that is about to move.
function checkWin(board, nextPlayer) {
  if (countPieces(board, PLAYER_A) === 0) return PLAYER_B;
  if (countPieces(board, PLAYER_B) === 0) return PLAYER_A;
  if (!hasValidMoves(board, nextPlayer)) return getOpponent(nextPlayer);
  return null;
}

// ============================================================
// AI: minimax with alpha-beta pruning
// ============================================================

function evaluateBoard(board, aiPlayer) {
  const opponent = getOpponent(aiPlayer);
  const aiPieces = countPieces(board, aiPlayer);
  const oppPieces = countPieces(board, opponent);

  if (oppPieces === 0) return 100000;
  if (aiPieces === 0) return -100000;

  const aiMoves = getValidMoves(board, aiPlayer).length;
  const oppMoves = getValidMoves(board, opponent).length;

  if (oppMoves === 0) return 100000;
  if (aiMoves === 0) return -100000;

  // Material counts dominate; mobility breaks ties.
  return (aiPieces - oppPieces) * 1000 + (aiMoves - oppMoves);
}

function minimax(board, depth, isMaximizing, aiPlayer, alpha, beta) {
  const opponent = getOpponent(aiPlayer);
  const winner = checkWin(board, isMaximizing ? aiPlayer : opponent);
  if (winner === aiPlayer) return { score: 100000 + depth, move: null };
  if (winner === opponent) return { score: -100000 - depth, move: null };
  if (depth === 0) return { score: evaluateBoard(board, aiPlayer), move: null };

  const currentPlayer = isMaximizing ? aiPlayer : opponent;
  const moves = getValidMoves(board, currentPlayer);
  if (moves.length === 0) {
    return { score: isMaximizing ? -100000 - depth : 100000 + depth, move: null };
  }

  let bestMove = moves[0];
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move4 of moves) {
      const nb = applyMove(board, move4);
      const r = minimax(nb, depth - 1, false, aiPlayer, alpha, beta);
      if (r.score > maxScore) {
        maxScore = r.score;
        bestMove = move4;
      }
      alpha = Math.max(alpha, r.score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  }
  let minScore = Infinity;
  for (const move3 of moves) {
    const nb2 = applyMove(board, move3);
    const r2 = minimax(nb2, depth - 1, true, aiPlayer, alpha, beta);
    if (r2.score < minScore) {
      minScore = r2.score;
      bestMove = move3;
    }
    beta = Math.min(beta, r2.score);
    if (beta <= alpha) break;
  }
  return { score: minScore, move: bestMove };
}

function getBestAIMove(state) {
  const aiPlayer = state.aiTeam;
  const moves = getValidMoves(state.board, aiPlayer);
  if (moves.length === 0) return null;

  // Take an immediate capture-and-win if available
  for (const move3 of moves) {
    const nb = applyMove(state.board, move3);
    if (countPieces(nb, getOpponent(aiPlayer)) === 0) return move3;
  }

  const depth = 4;
  const result = minimax(state.board, depth, true, aiPlayer, -Infinity, Infinity);
  return result.move || moves[0];
}

// ============================================================
// Module exports
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PLAYER_A: PLAYER_A,
    PLAYER_B: PLAYER_B,
    EMPTY: EMPTY,
    PIECES_EACH: PIECES_EACH,
    BOARD_POSITIONS: BOARD_POSITIONS,
    ADJACENCY: ADJACENCY,
    INITIAL_POSITIONS_A: INITIAL_POSITIONS_A,
    INITIAL_POSITIONS_B: INITIAL_POSITIONS_B,
    GRID_COLS: GRID_COLS,
    GRID_ROWS: GRID_ROWS,
    MOVE_SINGLE: MOVE_SINGLE,
    MOVE_TRIPLE: MOVE_TRIPLE,
    createBoard: createBoard,
    createGameState: createGameState,
    getOpponent: getOpponent,
    getNeighbors: getNeighbors,
    getPlayerPieces: getPlayerPieces,
    countPieces: countPieces,
    isLandable: isLandable,
    getSingleMovesForPiece: getSingleMovesForPiece,
    getTripleMovesForPiece: getTripleMovesForPiece,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    applyMove: applyMove,
    checkWin: checkWin,
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
  // Pending move type for the selected piece: MOVE_SINGLE or MOVE_TRIPLE
  var moveMode = MOVE_SINGLE;
  // Chant for the triple move. The game is named after this chant: 小→猫→钓→鱼.
  // Some regions instead chant 鸡→毛→蒜→皮; the rules are identical.
  var CHANT = ["小", "猫", "钓", "鱼"];

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    // Layout constants for the SVG board
    var pad = 30;
    var unit = 90; // distance between adjacent grid points
    var nodeR = 22;
    var width = pad * 2 + unit * 3;
    var height = pad * 2 + unit * 3;

    // Build SVG element
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("class", "board-svg");

    // Draw edges first (so nodes paint on top)
    for (var i = 0; i < ADJACENCY.length; i++) {
      var neighbors = ADJACENCY[i];
      for (const j of neighbors) {
        if (j <= i) continue;
        var p1 = BOARD_POSITIONS[i];
        var p2 = BOARD_POSITIONS[j];
        var line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", pad + p1.x * unit);
        line.setAttribute("y1", pad + p1.y * unit);
        line.setAttribute("x2", pad + p2.x * unit);
        line.setAttribute("y2", pad + p2.y * unit);
        line.setAttribute("class", "board-edge");
        svg.appendChild(line);
      }
    }

    // Draw nodes (interactive)
    for (var k = 0; k < BOARD_POSITIONS.length; k++) {
      var pos = BOARD_POSITIONS[k];
      var cx = pad + pos.x * unit;
      var cy = pad + pos.y * unit;

      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "node");
      g.setAttribute("data-pos", k);
      g.setAttribute("transform", "translate(" + cx + "," + cy + ")");

      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", nodeR);
      circle.setAttribute("class", "node-circle");
      g.appendChild(circle);

      var text = document.createElementNS(svgNS, "text");
      text.setAttribute("class", "node-text");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      g.appendChild(text);

      g.addEventListener(
        "click",
        (function (idx) {
          return function () {
            handleCellClick(idx);
          };
        })(k)
      );
      svg.appendChild(g);
    }

    boardEl.appendChild(svg);
  }

  function getReachableTargets(board, from, player, mode) {
    if (mode === MOVE_TRIPLE) return getTripleMovesForPiece(board, from, player);
    return getSingleMovesForPiece(board, from, player);
  }

  function renderGame() {
    if (!state) return;
    var nodes = document.querySelectorAll("#board .node");
    var reachableMap = {};
    if (selectedPiece !== null) {
      var reachable = getReachableTargets(
        state.board,
        selectedPiece,
        state.currentPlayer,
        moveMode
      );
      for (const item2 of reachable) {
        reachableMap[item2.to] = item2;
      }
    }

    nodes.forEach((g) => {
      var pos = Number.parseInt(g.getAttribute("data-pos"));
      var classes = ["node"];
      var label = "";
      if (state.board[pos] === PLAYER_A) {
        classes.push("node-a");
        label = "猫";
      } else if (state.board[pos] === PLAYER_B) {
        classes.push("node-b");
        label = "鱼";
      } else {
        classes.push("node-empty");
      }
      if (selectedPiece === pos) classes.push("node-selected");
      var hit = reachableMap[pos];
      if (hit) {
        if (hit.capture === null)
          classes.push(moveMode === MOVE_TRIPLE ? "node-triple" : "node-highlight");
        else classes.push("node-capture");
      }
      g.setAttribute("class", classes.join(" "));
      var text = g.querySelector(".node-text");
      if (text) text.textContent = label;
    });

    // Status bar - shown as 玩家/电脑 (PVE), 玩家1/玩家2 (PVP), or 你/对方 (online)
    var label;
    if (state.mode === "online") {
      var isMyTurn = state.currentPlayer === localTeam;
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
    document.getElementById("pieces-a").textContent = countPieces(state.board, PLAYER_A);
    document.getElementById("pieces-b").textContent = countPieces(state.board, PLAYER_B);

    // Move-mode toggle highlight
    var btnSingle = document.getElementById("btn-mode-single");
    var btnTriple = document.getElementById("btn-mode-triple");
    if (btnSingle && btnTriple) {
      btnSingle.classList.toggle("active", moveMode === MOVE_SINGLE);
      btnTriple.classList.toggle("active", moveMode === MOVE_TRIPLE);
    }

    // Last-move chant trail
    var trailEl = document.getElementById("chant-trail");
    if (trailEl) {
      if (state.lastMove?.type === MOVE_TRIPLE) {
        trailEl.textContent =
          "上一步：" + state.lastMove.path.map((node, idx) => CHANT[idx]).join(" → ") + "（吃子）";
      } else if (state.lastMove?.type === MOVE_SINGLE) {
        trailEl.textContent =
          "上一步：一步移动" + (state.lastMove.capture === null ? "" : "（吃子）");
      } else {
        trailEl.textContent = "";
      }
    }

    if (state.aiThinking) {
      document.getElementById("message").textContent = "AI 思考中…";
      document.getElementById("message").className = "info";
    } else {
      document.getElementById("message").textContent = "";
      document.getElementById("message").className = "";
    }

    if (state.gameOver) {
      var winnerText;
      if (state.mode === "online") {
        winnerText = state.winner === localTeam ? "你" : "对方";
      } else {
        var winnerLabel = getCurrentPlayerLabel({
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

  function setMoveMode(mode) {
    moveMode = mode;
    renderGame();
  }

  function commitMove(move) {
    state.board = applyMove(state.board, move);
    state.lastMove = move;
    selectedPiece = null;
    moveMode = MOVE_SINGLE;
    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;
    var winner = checkWin(state.board, state.currentPlayer);
    if (winner) {
      state.gameOver = true;
      state.winner = winner;
    }
    renderGame();
    if (!state.gameOver && state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      triggerAI();
    }
  }

  function handleCellClick(pos) {
    if (!state || state.gameOver) return;
    if (state.mode === "online" && state.currentPlayer !== localTeam) return;
    if (state.mode === "pve" && state.currentPlayer === state.aiTeam) return;

    // Click own piece -> select / re-select
    if (state.board[pos] === state.currentPlayer) {
      selectedPiece = pos;
      // Reset to single mode when (re-)selecting
      moveMode = MOVE_SINGLE;
      renderGame();
      return;
    }

    if (selectedPiece !== null) {
      var moves = getReachableTargets(state.board, selectedPiece, state.currentPlayer, moveMode);
      for (const move5 of moves) {
        if (move5.to === pos) {
          if (state.mode === "online" && networkProtocol) {
            networkProtocol.sendAction({
              a: "move",
              f: move5.from,
              t: move5.to,
              mt: move5.type,
              p: move5.path,
            });
          }
          commitMove(move5);
          return;
        }
      }
      // Click on a non-target empty / opponent cell: deselect
      selectedPiece = null;
      moveMode = MOVE_SINGLE;
      renderGame();
    }
  }

  function triggerAI() {
    state.aiThinking = true;
    renderGame();
    setTimeout(() => {
      var aiMove = getBestAIMove(state);
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
    state = createGameState(mode);
    state.currentPlayer = firstPlayer || PLAYER_A;
    state.firstPlayer = firstPlayer || PLAYER_A;
    if (mode === "pve") {
      state.playerTeam = PLAYER_A;
      state.aiTeam = PLAYER_B;
    }
    selectedPiece = null;
    moveMode = MOVE_SINGLE;
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
    var aiChoices = ["rock", "scissors", "paper"];
    var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
    var result = judgeRPS(choice, aiChoice);
    var resultDiv = document.getElementById("rps-result");
    if (result === 1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，你先手！</p>";
      setTimeout(() => startGame("pve", PLAYER_A), 1200);
    } else if (result === -1) {
      resultDiv.innerHTML =
        "<p>你出" + getRPSName(choice) + "，AI出" + getRPSName(aiChoice) + "，AI先手！</p>";
      setTimeout(() => startGame("pve", PLAYER_B), 1200);
    } else {
      resultDiv.innerHTML = "<p>平局！再来一次</p>";
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
      (iWin ? "，你赢了！你先手（猫）。" : "，你输了！对方先手（猫）。");

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
    moveMode = MOVE_SINGLE;
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
  }

  function applyRemoteAction(actionData) {
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== remoteTeam) return;
    // actionData = { a: "move", f: fromNode, t: toNode, mt: "single"|"triple", p?: path }
    var from = actionData.f;
    var to = actionData.t;
    var moves = getReachableTargets(state.board, from, state.currentPlayer, actionData.mt);
    for (const move3 of moves) {
      if (move3.to === to) {
        commitMove(move3);
        return;
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
        handleRPSChoice(this.dataset.choice);
      });
    });
    document.getElementById("btn-restart").addEventListener("click", restartGame);
    var btnSingle = document.getElementById("btn-mode-single");
    var btnTriple = document.getElementById("btn-mode-triple");
    if (btnSingle)
      btnSingle.addEventListener("click", () => {
        setMoveMode(MOVE_SINGLE);
      });
    if (btnTriple)
      btnTriple.addEventListener("click", () => {
        setMoveMode(MOVE_TRIPLE);
      });
  });
}
