/* eslint-disable no-var, no-undef */
// ============================================================
// 蚂蚁搬家 (Ma Yi Ban Jia - Ants Moving House)
// Two players on a 9x9 intersection board. Each side has 4 pieces
// that start on the central column (x = 4): A on the top half, B on
// the bottom half. The very centre point (4, 4) is the 天元 (tian-yuan)
// and is impassable - it can never hold a piece and cannot be jumped.
// On each turn the side to move slides one piece one step orthogonally
// to an empty adjacent intersection, OR jumps a single piece (of either
// side) along a row or column to land on the empty intersection right
// behind it. The first player to occupy all four of the opponent's
// starting points (their "home") wins.
// In PvE mode the human always plays the bottom side (B); AI plays A.
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  var _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

var PLAYER_A = "A";
var PLAYER_B = "B";
var EMPTY = null;
var BOARD_SIZE = 9; // 9 lines each direction -> 9x9 = 81 intersections
var PIECES_EACH = 4;

var CENTER_X = 4;
var CENTER_Y = 4;
var TIAN_YUAN = { x: CENTER_X, y: CENTER_Y };

// Starting positions: both sides line up on the central column,
// straddling the tian-yuan. A occupies the upper half, B the lower.
var START_A = [
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 4, y: 2 },
  { x: 4, y: 3 },
];
var START_B = [
  { x: 4, y: 5 },
  { x: 4, y: 6 },
  { x: 4, y: 7 },
  { x: 4, y: 8 },
];

// A wins by occupying B's home (B's starting points), and vice versa.
var HOME_OF_A = START_A;
var HOME_OF_B = START_B;

// Orthogonal directions (no diagonals).
var DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
];

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function isTianYuan(x, y) {
  return x === TIAN_YUAN.x && y === TIAN_YUAN.y;
}

function getOpponent(player) {
  return player === PLAYER_A ? PLAYER_B : PLAYER_A;
}

function createBoard() {
  var board = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    var row = [];
    for (var x = 0; x < BOARD_SIZE; x++) row.push(EMPTY);
    board.push(row);
  }
  return board;
}

function applyInitialLayout(board) {
  for (var i = 0; i < START_A.length; i++) {
    board[START_A[i].y][START_A[i].x] = PLAYER_A;
  }
  for (var j = 0; j < START_B.length; j++) {
    board[START_B[j].y][START_B[j].x] = PLAYER_B;
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
  };
}

function countPieces(board, player) {
  var count = 0;
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) count++;
    }
  }
  return count;
}

// All legal moves for `player` from the given board, including jumps.
// A move is { fromX, fromY, toX, toY, jump: bool, jumpedX?, jumpedY? }.
function getValidMoves(board, player) {
  var moves = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue;
      for (var d = 0; d < DIRECTIONS.length; d++) {
        var dx = DIRECTIONS[d].dx;
        var dy = DIRECTIONS[d].dy;

        // 1) Single step
        var sx = x + dx;
        var sy = y + dy;
        if (inBounds(sx, sy) && !isTianYuan(sx, sy) && board[sy][sx] === EMPTY) {
          moves.push({ fromX: x, fromY: y, toX: sx, toY: sy, jump: false });
        }

        // 2) Jump over an adjacent piece. The jumped intersection must
        //    contain a piece (of either side) and must not be the
        //    tian-yuan (which never holds a piece anyway). The landing
        //    intersection must be empty and not the tian-yuan.
        var jx = x + dx;
        var jy = y + dy;
        var lx = x + dx * 2;
        var ly = y + dy * 2;
        if (
          inBounds(jx, jy) &&
          inBounds(lx, ly) &&
          board[jy][jx] !== EMPTY &&
          !isTianYuan(jx, jy) &&
          !isTianYuan(lx, ly) &&
          board[ly][lx] === EMPTY
        ) {
          moves.push({
            fromX: x,
            fromY: y,
            toX: lx,
            toY: ly,
            jump: true,
            jumpedX: jx,
            jumpedY: jy,
          });
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
  var newBoard = [];
  for (var y = 0; y < BOARD_SIZE; y++) newBoard.push(board[y].slice());
  newBoard[toY][toX] = newBoard[fromY][fromX];
  newBoard[fromY][fromX] = EMPTY;
  return newBoard;
}

// `player` wins when every cell of the opposing home is occupied by
// `player`'s own pieces.
function checkWin(board, player) {
  var home = player === PLAYER_A ? HOME_OF_B : HOME_OF_A;
  for (var i = 0; i < home.length; i++) {
    if (board[home[i].y][home[i].x] !== player) return null;
  }
  return { winner: player, line: home.slice() };
}

// ============================================================
// AI: minimax with alpha-beta pruning
// ============================================================

// Distance a player wants to minimise: total Manhattan distance from
// each of their pieces to the closest unoccupied target slot in the
// opponent's home. Targets already filled by their own pieces count 0.
function distanceToHome(board, player) {
  var home = player === PLAYER_A ? HOME_OF_B : HOME_OF_A;
  var pieces = [];
  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) pieces.push({ x: x, y: y });
    }
  }
  // Greedy assignment: for each home slot, take the closest unassigned
  // own piece. This is a cheap proxy for "how far from victory".
  var taken = {};
  var total = 0;
  for (var h = 0; h < home.length; h++) {
    var target = home[h];
    if (board[target.y][target.x] === player) continue;
    var bestIdx = -1;
    var bestDist = Infinity;
    for (var p = 0; p < pieces.length; p++) {
      if (taken[p]) continue;
      var dist = Math.abs(pieces[p].x - target.x) + Math.abs(pieces[p].y - target.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = p;
      }
    }
    if (bestIdx >= 0) {
      taken[bestIdx] = true;
      total += bestDist;
    } else {
      total += BOARD_SIZE * 2;
    }
  }
  return total;
}

function evaluateBoard(board, aiPlayer) {
  var opponent = getOpponent(aiPlayer);
  if (checkWin(board, aiPlayer)) return 100000;
  if (checkWin(board, opponent)) return -100000;
  // Lower distance is better; flip sign so larger = better for AI.
  var aiDist = distanceToHome(board, aiPlayer);
  var oppDist = distanceToHome(board, opponent);
  return (oppDist - aiDist) * 10;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer) {
  var opponent = getOpponent(aiPlayer);

  if (checkWin(board, aiPlayer)) return 100000 + depth;
  if (checkWin(board, opponent)) return -100000 - depth;

  var nextPlayer = isMaximizing ? aiPlayer : opponent;
  if (!hasValidMoves(board, nextPlayer)) {
    // Side to move is stuck: count it as a loss for that side.
    return isMaximizing ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  var moves = getValidMoves(board, nextPlayer);
  if (isMaximizing) {
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var nb = movePiece(board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
      var s = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  var worst = Infinity;
  for (var k = 0; k < moves.length; k++) {
    var nb2 = movePiece(board, moves[k].fromX, moves[k].fromY, moves[k].toX, moves[k].toY);
    var s2 = minimax(nb2, depth - 1, alpha, beta, true, aiPlayer);
    if (s2 < worst) worst = s2;
    if (worst < beta) beta = worst;
    if (beta <= alpha) break;
  }
  return worst;
}

function getBestAIMove(state) {
  var aiPlayer = state.aiTeam;
  var moves = getValidMoves(state.board, aiPlayer);
  if (moves.length === 0) return null;

  // Quick win check
  for (var w = 0; w < moves.length; w++) {
    var nb = movePiece(state.board, moves[w].fromX, moves[w].fromY, moves[w].toX, moves[w].toY);
    if (checkWin(nb, aiPlayer)) return moves[w];
  }

  var depth = 3; // 9x9 with jumps has a high branching factor; keep modest
  var bestScore = -Infinity;
  var bestMoves = [];
  for (var i = 0; i < moves.length; i++) {
    var next = movePiece(state.board, moves[i].fromX, moves[i].fromY, moves[i].toX, moves[i].toY);
    var s = minimax(next, depth, -Infinity, Infinity, false, aiPlayer);
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
    CENTER_X: CENTER_X,
    CENTER_Y: CENTER_Y,
    TIAN_YUAN: TIAN_YUAN,
    START_A: START_A,
    START_B: START_B,
    HOME_OF_A: HOME_OF_A,
    HOME_OF_B: HOME_OF_B,
    DIRECTIONS: DIRECTIONS,
    inBounds: inBounds,
    isTianYuan: isTianYuan,
    getOpponent: getOpponent,
    createBoard: createBoard,
    applyInitialLayout: applyInitialLayout,
    createInitialState: createInitialState,
    countPieces: countPieces,
    getValidMoves: getValidMoves,
    hasValidMoves: hasValidMoves,
    movePiece: movePiece,
    checkWin: checkWin,
    distanceToHome: distanceToHome,
    evaluateBoard: evaluateBoard,
    minimax: minimax,
    getBestAIMove: getBestAIMove,
  };
}

// ============================================================
// Browser UI (SVG board with intersections)
// ============================================================
if (typeof document !== "undefined") {
  var state = null;
  var selectedPiece = null;
  var rpsChoices = { player1: null, player2: null, human: null };
  var networkProtocol = null;
  var networkConnection = null;
  var roomUI = null;
  var localPlayerRole = null; // 'host' | 'guest'
  var localTeam = null; // PLAYER_A or PLAYER_B
  var remoteTeam = null; // PLAYER_A or PLAYER_B

  // Board geometry: 9x9 grid of intersections inside an SVG viewBox.
  var BOARD_VIEW = 540;
  var BOARD_PADDING = 30;
  var CELL_SIZE = (BOARD_VIEW - BOARD_PADDING * 2) / (BOARD_SIZE - 1);

  function nodeToPx(x, y) {
    return {
      cx: BOARD_PADDING + x * CELL_SIZE,
      cy: BOARD_PADDING + y * CELL_SIZE,
    };
  }

  function initBoard() {
    var boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + BOARD_VIEW + " " + BOARD_VIEW);
    svg.setAttribute("class", "board-svg");

    // Grid lines (9 horizontal + 9 vertical)
    for (var i = 0; i < BOARD_SIZE; i++) {
      var p0 = nodeToPx(0, i);
      var p1 = nodeToPx(BOARD_SIZE - 1, i);
      var hLine = document.createElementNS(svgNS, "line");
      hLine.setAttribute("x1", p0.cx);
      hLine.setAttribute("y1", p0.cy);
      hLine.setAttribute("x2", p1.cx);
      hLine.setAttribute("y2", p1.cy);
      hLine.setAttribute("class", "board-line");
      svg.appendChild(hLine);

      var q0 = nodeToPx(i, 0);
      var q1 = nodeToPx(i, BOARD_SIZE - 1);
      var vLine = document.createElementNS(svgNS, "line");
      vLine.setAttribute("x1", q0.cx);
      vLine.setAttribute("y1", q0.cy);
      vLine.setAttribute("x2", q1.cx);
      vLine.setAttribute("y2", q1.cy);
      vLine.setAttribute("class", "board-line");
      svg.appendChild(vLine);
    }

    // Tian-yuan marker (impassable centre)
    var center = nodeToPx(CENTER_X, CENTER_Y);
    var tyMark = document.createElementNS(svgNS, "circle");
    tyMark.setAttribute("cx", center.cx);
    tyMark.setAttribute("cy", center.cy);
    tyMark.setAttribute("r", 14);
    tyMark.setAttribute("class", "tian-yuan");
    svg.appendChild(tyMark);

    var tyText = document.createElementNS(svgNS, "text");
    tyText.setAttribute("x", center.cx);
    tyText.setAttribute("y", center.cy);
    tyText.setAttribute("class", "tian-yuan-text");
    tyText.setAttribute("text-anchor", "middle");
    tyText.setAttribute("dominant-baseline", "central");
    tyText.textContent = "天元";
    svg.appendChild(tyText);

    // Home highlights for both sides
    function appendHomeRing(home, cls) {
      for (var n = 0; n < home.length; n++) {
        var pt = nodeToPx(home[n].x, home[n].y);
        var ring = document.createElementNS(svgNS, "circle");
        ring.setAttribute("cx", pt.cx);
        ring.setAttribute("cy", pt.cy);
        ring.setAttribute("r", 24);
        ring.setAttribute("class", "home-ring " + cls);
        svg.appendChild(ring);
      }
    }
    appendHomeRing(HOME_OF_A, "home-a");
    appendHomeRing(HOME_OF_B, "home-b");

    // Interactive intersection nodes
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        if (isTianYuan(x, y)) continue; // skip the impassable centre
        var pt2 = nodeToPx(x, y);
        var g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "node");
        g.setAttribute("data-x", x);
        g.setAttribute("data-y", y);
        g.setAttribute("transform", "translate(" + pt2.cx + "," + pt2.cy + ")");

        // Wide invisible hit area
        var hit = document.createElementNS(svgNS, "circle");
        hit.setAttribute("r", CELL_SIZE / 2 - 2);
        hit.setAttribute("class", "node-hit");
        g.appendChild(hit);

        // Small dot for empty intersections
        var dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("r", 3);
        dot.setAttribute("class", "node-dot");
        g.appendChild(dot);

        var circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", 18);
        circle.setAttribute("class", "node-circle");
        g.appendChild(circle);

        var text = document.createElementNS(svgNS, "text");
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

  // Build a map of reachable destination cells from `selectedPiece`,
  // and remember whether each is a single step or a jump.
  function reachableTargets() {
    var map = {};
    if (!selectedPiece) return map;
    var moves = getValidMoves(state.board, state.currentPlayer);
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      if (m.fromX === selectedPiece.x && m.fromY === selectedPiece.y) {
        map[m.toX + "," + m.toY] = m;
      }
    }
    return map;
  }

  function renderGame() {
    if (!state) return;
    var reachable = reachableTargets();

    var nodes = document.querySelectorAll("#board .node");
    nodes.forEach((g) => {
      var nx = Number.parseInt(g.getAttribute("data-x"));
      var ny = Number.parseInt(g.getAttribute("data-y"));
      var classes = ["node"];
      if (state.board[ny][nx] === PLAYER_A) classes.push("node-a");
      else if (state.board[ny][nx] === PLAYER_B) classes.push("node-b");
      else classes.push("node-empty");
      if (selectedPiece && selectedPiece.x === nx && selectedPiece.y === ny) {
        classes.push("node-selected");
      }
      var key = nx + "," + ny;
      if (reachable[key]) {
        classes.push(reachable[key].jump ? "node-jump" : "node-highlight");
      }
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
    document.getElementById("home-a").textContent = countOccupiedHome(PLAYER_B);
    document.getElementById("home-b").textContent = countOccupiedHome(PLAYER_A);

    var msg = document.getElementById("message");
    if (state.aiThinking) {
      msg.textContent = "AI 思考中…";
      msg.className = "info";
    } else {
      msg.textContent = "";
      msg.className = "";
    }

    if (state.gameOver) {
      var winnerText;
      if (state.winner === PLAYER_A || state.winner === PLAYER_B) {
        // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of position name
        var winnerLabel = getCurrentPlayerLabel({
          mode: state.mode,
          currentSide: state.winner,
          playerSide: state.playerTeam,
          sidesOrder: state.firstPlayer
            ? [state.firstPlayer, state.firstPlayer === PLAYER_A ? PLAYER_B : PLAYER_A]
            : [PLAYER_A, PLAYER_B],
        });
        winnerText = winnerLabel.text + " 占领对方家，获胜！";
      } else {
        winnerText = "平局";
      }
      document.getElementById("winner-text").textContent = winnerText;
      document.getElementById("game-over").style.display = "flex";
    }
  }

  // Number of `player`'s pieces already sitting in the opponent's home.
  function countOccupiedHome(player) {
    var home = player === PLAYER_A ? HOME_OF_B : HOME_OF_A;
    var c = 0;
    for (var i = 0; i < home.length; i++) {
      if (state.board[home[i].y][home[i].x] === player) c++;
    }
    return c;
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

    // Click on a reachable target: commit move
    if (selectedPiece) {
      var moves = getValidMoves(state.board, state.currentPlayer);
      for (var i = 0; i < moves.length; i++) {
        var m = moves[i];
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
    state.board = movePiece(state.board, move.fromX, move.fromY, move.toX, move.toY);
    state.lastMove = move;
    selectedPiece = null;

    if (state.mode === "online" && networkProtocol) {
      var actionData = {
        a: "move",
        fromX: move.fromX,
        fromY: move.fromY,
        toX: move.toX,
        toY: move.toY,
        jump: !!move.jump,
      };
      if (move.jump) {
        actionData.jumpedX = move.jumpedX;
        actionData.jumpedY = move.jumpedY;
      }
      networkProtocol.sendAction(actionData);
    }

    var winResult = checkWin(state.board, state.currentPlayer);
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
    var resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document
        .querySelectorAll("#rps-online-buttons .btn-rps")
        .forEach((btn) => btn.classList.remove("selected"));
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
      (iWin ? "，你赢了！你先手。" : "，你输了！对方先手。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    state = createInitialState("online");

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
    document.getElementById("rule-pve").style.display = "none";
    document.getElementById("game-over").style.display = "none";
    initBoard();
    renderGame();
  }

  function applyRemoteAction(actionData) {
    if (!state || state.gameOver) return;
    if (state.currentPlayer !== remoteTeam) return;
    var move = {
      fromX: actionData.fromX,
      fromY: actionData.fromY,
      toX: actionData.toX,
      toY: actionData.toY,
      jump: actionData.jump,
    };
    if (actionData.jump) {
      move.jumpedX = actionData.jumpedX;
      move.jumpedY = actionData.jumpedY;
    }
    commitMove(move);
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
    var aiChoices = ["rock", "scissors", "paper"];
    var aiChoice = aiChoices[Math.floor(Math.random() * 3)];
    var result = judgeRPS(choice, aiChoice);
    var resultDiv = document.getElementById("rps-result");
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
    var btnOnline = document.getElementById("btn-online");
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
        var choice = ev.target.dataset.choice;
        handleOnlineRPSChoice(choice, ev);
      });
    });

    document.getElementById("btn-restart").addEventListener("click", restartGame);
  });
}
