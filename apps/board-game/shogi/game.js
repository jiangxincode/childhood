// ============================================================
// Shogi (Japanese Chess) - Game Core Logic
// ============================================================

// Piece types
const PIECE_TYPES = {
  KING: "king",
  ROOK: "rook",
  BISHOP: "bishop",
  GOLD: "gold",
  SILVER: "silver",
  KNIGHT: "knight",
  LANCE: "lance",
  PAWN: "pawn",
};

// Piece symbols (Unicode characters)
const PIECE_SYMBOLS = {
  [PIECE_TYPES.KING]: { sente: "王", gote: "玉" },
  [PIECE_TYPES.ROOK]: { sente: "飛", gote: "飛" },
  [PIECE_TYPES.BISHOP]: { sente: "角", gote: "角" },
  [PIECE_TYPES.GOLD]: { sente: "金", gote: "金" },
  [PIECE_TYPES.SILVER]: { sente: "銀", gote: "銀" },
  [PIECE_TYPES.KNIGHT]: { sente: "桂", gote: "桂" },
  [PIECE_TYPES.LANCE]: { sente: "香", gote: "香" },
  [PIECE_TYPES.PAWN]: { sente: "歩", gote: "歩" },
};

// Promoted piece symbols
const PROMOTED_SYMBOLS = {
  [PIECE_TYPES.ROOK]: { sente: "龍", gote: "龍" },
  [PIECE_TYPES.BISHOP]: { sente: "馬", gote: "馬" },
  [PIECE_TYPES.SILVER]: { sente: "全", gote: "全" },
  [PIECE_TYPES.KNIGHT]: { sente: "圭", gote: "圭" },
  [PIECE_TYPES.LANCE]: { sente: "杏", gote: "杏" },
  [PIECE_TYPES.PAWN]: { sente: "と", gote: "と" },
};

// Piece values for AI evaluation
const PIECE_VALUES = {
  [PIECE_TYPES.KING]: 10000,
  [PIECE_TYPES.ROOK]: 1000,
  [PIECE_TYPES.BISHOP]: 800,
  [PIECE_TYPES.GOLD]: 500,
  [PIECE_TYPES.SILVER]: 400,
  [PIECE_TYPES.KNIGHT]: 300,
  [PIECE_TYPES.LANCE]: 300,
  [PIECE_TYPES.PAWN]: 100,
};

// Promoted piece values
const PROMOTED_VALUES = {
  [PIECE_TYPES.ROOK]: 1200,
  [PIECE_TYPES.BISHOP]: 1000,
  [PIECE_TYPES.SILVER]: 600,
  [PIECE_TYPES.KNIGHT]: 500,
  [PIECE_TYPES.LANCE]: 500,
  [PIECE_TYPES.PAWN]: 400,
};

// Board dimensions
const BOARD_SIZE = 9;
const CELL_SIZE = 60;
const BOARD_PADDING = 40;

// Player constants
const SENTE = "sente";
const GOTE = "gote";

// Check if position is valid
function isValidPosition(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// Initialize the board with pieces
function initializeBoard() {
  // Create empty board
  const board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  // Set up gote pieces (top of board)
  board[0][0] = { type: PIECE_TYPES.LANCE, player: GOTE, promoted: false };
  board[0][1] = { type: PIECE_TYPES.KNIGHT, player: GOTE, promoted: false };
  board[0][2] = { type: PIECE_TYPES.SILVER, player: GOTE, promoted: false };
  board[0][3] = { type: PIECE_TYPES.GOLD, player: GOTE, promoted: false };
  board[0][4] = { type: PIECE_TYPES.KING, player: GOTE, promoted: false };
  board[0][5] = { type: PIECE_TYPES.GOLD, player: GOTE, promoted: false };
  board[0][6] = { type: PIECE_TYPES.SILVER, player: GOTE, promoted: false };
  board[0][7] = { type: PIECE_TYPES.KNIGHT, player: GOTE, promoted: false };
  board[0][8] = { type: PIECE_TYPES.LANCE, player: GOTE, promoted: false };

  // Gote rooks and bishops
  board[1][1] = { type: PIECE_TYPES.BISHOP, player: GOTE, promoted: false };
  board[1][7] = { type: PIECE_TYPES.ROOK, player: GOTE, promoted: false };

  // Gote pawns
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[2][col] = { type: PIECE_TYPES.PAWN, player: GOTE, promoted: false };
  }

  // Set up sente pieces (bottom of board)
  board[8][0] = { type: PIECE_TYPES.LANCE, player: SENTE, promoted: false };
  board[8][1] = { type: PIECE_TYPES.KNIGHT, player: SENTE, promoted: false };
  board[8][2] = { type: PIECE_TYPES.SILVER, player: SENTE, promoted: false };
  board[8][3] = { type: PIECE_TYPES.GOLD, player: SENTE, promoted: false };
  board[8][4] = { type: PIECE_TYPES.KING, player: SENTE, promoted: false };
  board[8][5] = { type: PIECE_TYPES.GOLD, player: SENTE, promoted: false };
  board[8][6] = { type: PIECE_TYPES.SILVER, player: SENTE, promoted: false };
  board[8][7] = { type: PIECE_TYPES.KNIGHT, player: SENTE, promoted: false };
  board[8][8] = { type: PIECE_TYPES.LANCE, player: SENTE, promoted: false };

  // Sente rooks and bishops
  board[7][7] = { type: PIECE_TYPES.BISHOP, player: SENTE, promoted: false };
  board[7][1] = { type: PIECE_TYPES.ROOK, player: SENTE, promoted: false };

  // Sente pawns
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[6][col] = { type: PIECE_TYPES.PAWN, player: SENTE, promoted: false };
  }

  return board;
}

// Get piece name
function getPieceName(piece) {
  const names = {
    [PIECE_TYPES.KING]: "王",
    [PIECE_TYPES.ROOK]: "飞车",
    [PIECE_TYPES.BISHOP]: "角行",
    [PIECE_TYPES.GOLD]: "金将",
    [PIECE_TYPES.SILVER]: "银将",
    [PIECE_TYPES.KNIGHT]: "桂马",
    [PIECE_TYPES.LANCE]: "香车",
    [PIECE_TYPES.PAWN]: "步兵",
  };

  let name = names[piece.type] || "未知";
  if (piece.promoted) {
    name = "成" + name;
  }
  return name;
}

// Check if piece can promote
function canPromote(piece, row) {
  if (piece.promoted) return false;
  if (piece.type === PIECE_TYPES.KING || piece.type === PIECE_TYPES.GOLD) return false;

  // Sente promotes in top 3 rows, gote in bottom 3 rows
  if (piece.player === SENTE) {
    return row <= 2;
  } else {
    return row >= 6;
  }
}

// Check if game is over (king captured)
function isGameOver(board) {
  let senteKingExists = false;
  let goteKingExists = false;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.type === PIECE_TYPES.KING) {
        if (piece.player === SENTE) senteKingExists = true;
        if (piece.player === GOTE) goteKingExists = true;
      }
    }
  }

  return !senteKingExists || !goteKingExists;
}

// Get king moves
function getKingMoves(row, col, piece, board) {
  const moves = [];
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (isValidPosition(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
}

// Get rook moves (straight lines)
function getRookMoves(row, col, piece, board) {
  const moves = [];
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [dr, dc] of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const newRow = row + dr * i;
      const newCol = col + dc * i;

      if (!isValidPosition(newRow, newCol)) break;

      const targetPiece = board[newRow][newCol];
      if (!targetPiece) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
    }
  }

  return moves;
}

// Get bishop moves (diagonals)
function getBishopMoves(row, col, piece, board) {
  const moves = [];
  const directions = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  for (const [dr, dc] of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const newRow = row + dr * i;
      const newCol = col + dc * i;

      if (!isValidPosition(newRow, newCol)) break;

      const targetPiece = board[newRow][newCol];
      if (!targetPiece) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
    }
  }

  return moves;
}

// Get gold moves
function getGoldMoves(row, col, piece, board) {
  const moves = [];
  const directions =
    piece.player === SENTE
      ? [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
        ]
      : [
          [1, -1],
          [1, 0],
          [1, 1],
          [0, -1],
          [0, 1],
          [-1, 0],
        ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (isValidPosition(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
}

// Get silver moves
function getSilverMoves(row, col, piece, board) {
  const moves = [];
  const directions =
    piece.player === SENTE
      ? [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : [
          [1, -1],
          [1, 0],
          [1, 1],
          [-1, -1],
          [-1, 1],
        ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (isValidPosition(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
}

// Get knight moves
function getKnightMoves(row, col, piece, board) {
  const moves = [];
  const directions =
    piece.player === SENTE
      ? [
          [-2, -1],
          [-2, 1],
        ]
      : [
          [2, -1],
          [2, 1],
        ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (isValidPosition(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
}

// Get lance moves (forward only)
function getLanceMoves(row, col, piece, board) {
  const moves = [];
  const direction = piece.player === SENTE ? -1 : 1;

  for (let i = 1; i < BOARD_SIZE; i++) {
    const newRow = row + direction * i;

    if (!isValidPosition(newRow, col)) break;

    const targetPiece = board[newRow][col];
    if (!targetPiece) {
      moves.push({ row: newRow, col });
    } else {
      if (targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col });
      }
      break;
    }
  }

  return moves;
}

// Get pawn moves (forward one step)
function getPawnMoves(row, col, piece, board) {
  const moves = [];
  const direction = piece.player === SENTE ? -1 : 1;
  const newRow = row + direction;

  if (isValidPosition(newRow, col)) {
    const targetPiece = board[newRow][col];
    if (!targetPiece || targetPiece.player !== piece.player) {
      moves.push({ row: newRow, col });
    }
  }

  return moves;
}

// Get dragon moves (promoted rook)
function getDragonMoves(row, col, piece, board) {
  const moves = [];

  // Rook moves
  moves.push(...getRookMoves(row, col, piece, board));

  // King diagonal moves
  const directions = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (isValidPosition(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
}

// Get horse moves (promoted bishop)
function getHorseMoves(row, col, piece, board) {
  const moves = [];

  // Bishop moves
  moves.push(...getBishopMoves(row, col, piece, board));

  // King straight moves
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (isValidPosition(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
}

// Get valid moves for a piece
function getValidMoves(row, col, piece, board) {
  if (!piece) return [];

  const moves = [];

  // Get moves based on piece type
  switch (piece.type) {
    case PIECE_TYPES.KING:
      moves.push(...getKingMoves(row, col, piece, board));
      break;
    case PIECE_TYPES.ROOK:
      if (piece.promoted) {
        moves.push(...getDragonMoves(row, col, piece, board));
      } else {
        moves.push(...getRookMoves(row, col, piece, board));
      }
      break;
    case PIECE_TYPES.BISHOP:
      if (piece.promoted) {
        moves.push(...getHorseMoves(row, col, piece, board));
      } else {
        moves.push(...getBishopMoves(row, col, piece, board));
      }
      break;
    case PIECE_TYPES.GOLD:
      moves.push(...getGoldMoves(row, col, piece, board));
      break;
    case PIECE_TYPES.SILVER:
      if (piece.promoted) {
        moves.push(...getGoldMoves(row, col, piece, board));
      } else {
        moves.push(...getSilverMoves(row, col, piece, board));
      }
      break;
    case PIECE_TYPES.KNIGHT:
      if (piece.promoted) {
        moves.push(...getGoldMoves(row, col, piece, board));
      } else {
        moves.push(...getKnightMoves(row, col, piece, board));
      }
      break;
    case PIECE_TYPES.LANCE:
      if (piece.promoted) {
        moves.push(...getGoldMoves(row, col, piece, board));
      } else {
        moves.push(...getLanceMoves(row, col, piece, board));
      }
      break;
    case PIECE_TYPES.PAWN:
      if (piece.promoted) {
        moves.push(...getGoldMoves(row, col, piece, board));
      } else {
        moves.push(...getPawnMoves(row, col, piece, board));
      }
      break;
  }

  return moves;
}

// Get all possible moves for a player
function getAllMoves(board, player, capturedPieces) {
  const allMoves = [];

  // Board moves
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.player === player) {
        const moves = getValidMoves(row, col, piece, board);
        for (const move of moves) {
          allMoves.push({
            type: "move",
            from: { row, col },
            to: move,
            piece: piece,
          });
        }
      }
    }
  }

  // Drop moves (if captured pieces available)
  if (capturedPieces && capturedPieces[player]) {
    const uniquePieces = [];
    const seen = new Set();
    for (const piece of capturedPieces[player]) {
      const key = piece.type;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePieces.push(piece);
      }
    }

    for (const piece of uniquePieces) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (!board[row][col]) {
            // Check pawn restrictions
            if (piece.type === PIECE_TYPES.PAWN) {
              let hasPawn = false;
              for (let r = 0; r < BOARD_SIZE; r++) {
                const p = board[r][col];
                if (p && p.type === PIECE_TYPES.PAWN && p.player === player && !p.promoted) {
                  hasPawn = true;
                  break;
                }
              }
              if (hasPawn) continue;
            }
            allMoves.push({
              type: "drop",
              to: { row, col },
              piece: piece,
            });
          }
        }
      }
    }
  }

  return allMoves;
}

// Evaluate board position
function evaluateBoard(board, player) {
  let score = 0;
  const opponent = player === SENTE ? GOTE : SENTE;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      let value = piece.promoted ? PROMOTED_VALUES[piece.type] : PIECE_VALUES[piece.type];

      // Position bonus: pieces in center are more valuable
      const centerBonus = (4 - Math.abs(col - 4)) * 10 + (4 - Math.abs(row - 4)) * 10;
      value += centerBonus;

      // Promotion zone bonus
      if (!piece.promoted && canPromote(piece, row)) {
        value += 50;
      }

      if (piece.player === player) {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  // Bonus for captured pieces
  return score;
}

// Apply a move to the board (returns new board)
function applyMove(board, move, capturedPieces) {
  const newBoard = board.map((row) => [...row]);
  const newCaptured = {
    sente: [...(capturedPieces?.sente || [])],
    gote: [...(capturedPieces?.gote || [])],
  };

  if (move.type === "drop") {
    newBoard[move.to.row][move.to.col] = {
      type: move.piece.type,
      player: move.piece.player,
      promoted: false,
    };
    // Remove from captured pieces
    const idx = newCaptured[move.piece.player].findIndex((p) => p.type === move.piece.type);
    if (idx !== -1) {
      newCaptured[move.piece.player].splice(idx, 1);
    }
  } else {
    const piece = newBoard[move.from.row][move.from.col];
    const target = newBoard[move.to.row][move.to.col];

    // Capture
    if (target) {
      newCaptured[piece.player].push({
        type: target.type,
        promoted: false,
      });
    }

    // Move piece
    newBoard[move.to.row][move.to.col] = { ...piece };
    newBoard[move.from.row][move.from.col] = null;

    // Auto-promote if in promotion zone
    const movedPiece = newBoard[move.to.row][move.to.col];
    if (canPromote(movedPiece, move.to.row)) {
      // Auto-promote if entering or leaving promotion zone with non-king/gold
      if (move.to.row <= 2 || move.to.row >= 6) {
        movedPiece.promoted = true;
      }
    }
  }

  return { board: newBoard, capturedPieces: newCaptured };
}

// Alpha-Beta with pruning
function alphaBeta(board, capturedPieces, depth, alpha, beta, maximizingPlayer, aiPlayer) {
  if (depth === 0 || isGameOver(board)) {
    return { score: evaluateBoard(board, aiPlayer), move: null };
  }

  const currentPlayer = maximizingPlayer ? aiPlayer : aiPlayer === SENTE ? GOTE : SENTE;
  const moves = getAllMoves(board, currentPlayer, capturedPieces);

  if (moves.length === 0) {
    return { score: maximizingPlayer ? -99999 : 99999, move: null };
  }

  // Sort moves for better pruning (captures first)
  moves.sort((a, b) => {
    const aCapture = a.type === "move" && board[a.to.row][a.to.col] ? 1 : 0;
    const bCapture = b.type === "move" && board[b.to.row][b.to.col] ? 1 : 0;
    return bCapture - aCapture;
  });

  let bestMove = moves[0];

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = applyMove(board, move, capturedPieces);
      const evaluation = alphaBeta(
        result.board,
        result.capturedPieces,
        depth - 1,
        alpha,
        beta,
        false,
        aiPlayer
      );
      if (evaluation.score > maxEval) {
        maxEval = evaluation.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = applyMove(board, move, capturedPieces);
      const evaluation = alphaBeta(
        result.board,
        result.capturedPieces,
        depth - 1,
        alpha,
        beta,
        true,
        aiPlayer
      );
      if (evaluation.score < minEval) {
        minEval = evaluation.score;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

// Get best AI move
function getBestAIMove(board, capturedPieces, aiPlayer, depth = 3) {
  const result = alphaBeta(board, capturedPieces, depth, -Infinity, Infinity, true, aiPlayer);
  return result.move;
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PIECE_TYPES: PIECE_TYPES,
    PIECE_SYMBOLS: PIECE_SYMBOLS,
    PROMOTED_SYMBOLS: PROMOTED_SYMBOLS,
    PIECE_VALUES: PIECE_VALUES,
    PROMOTED_VALUES: PROMOTED_VALUES,
    BOARD_SIZE: BOARD_SIZE,
    CELL_SIZE: CELL_SIZE,
    BOARD_PADDING: BOARD_PADDING,
    SENTE: SENTE,
    GOTE: GOTE,
    isValidPosition: isValidPosition,
    initializeBoard: initializeBoard,
    getPieceName: getPieceName,
    canPromote: canPromote,
    isGameOver: isGameOver,
    getKingMoves: getKingMoves,
    getRookMoves: getRookMoves,
    getBishopMoves: getBishopMoves,
    getGoldMoves: getGoldMoves,
    getSilverMoves: getSilverMoves,
    getKnightMoves: getKnightMoves,
    getLanceMoves: getLanceMoves,
    getPawnMoves: getPawnMoves,
    getDragonMoves: getDragonMoves,
    getHorseMoves: getHorseMoves,
    getValidMoves: getValidMoves,
    getAllMoves: getAllMoves,
    evaluateBoard: evaluateBoard,
    applyMove: applyMove,
    alphaBeta: alphaBeta,
    getBestAIMove: getBestAIMove,
  };
}

// Browser UI
if (typeof document !== "undefined") {
  // Game state
  const gameState = {
    board: [],
    currentPlayer: SENTE,
    selectedPiece: null,
    validMoves: [],
    capturedPieces: { sente: [], gote: [] },
    moveHistory: [],
    turnCount: 0,
    gameOver: false,
    mode: "pvp",
    aiDepth: 3,
  };

  // DOM elements
  const boardCanvas = document.getElementById("board-canvas");
  const ctx = boardCanvas.getContext("2d");
  const currentPlayerDisplay = document.getElementById("current-player");
  const turnCountDisplay = document.getElementById("turn-count");
  const scoreSenteDisplay = document.getElementById("score-sente");
  const scoreGoteDisplay = document.getElementById("score-gote");
  const messageDisplay = document.getElementById("message");
  const promotionOverlay = document.getElementById("promotion-overlay");
  const dropOverlay = document.getElementById("drop-overlay");
  const dropPiecesContainer = document.getElementById("drop-pieces");

  // Initialize the game
  function initGame() {
    // Set canvas size
    boardCanvas.width = BOARD_SIZE * CELL_SIZE + BOARD_PADDING * 2;
    boardCanvas.height = BOARD_SIZE * CELL_SIZE + BOARD_PADDING * 2;

    // Initialize board
    gameState.board = initializeBoard();

    // Reset game state
    gameState.currentPlayer = SENTE;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.capturedPieces = { sente: [], gote: [] };
    gameState.moveHistory = [];
    gameState.turnCount = 0;
    gameState.gameOver = false;

    // Draw the board
    drawBoard();

    // Update display
    updateDisplay();
  }

  // Draw the board
  function drawBoard() {
    // Clear canvas
    ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

    // Draw board background
    ctx.fillStyle = "#f0d9b5";
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

    // Draw grid lines
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_PADDING + i * CELL_SIZE, BOARD_PADDING);
      ctx.lineTo(BOARD_PADDING + i * CELL_SIZE, BOARD_PADDING + BOARD_SIZE * CELL_SIZE);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_PADDING, BOARD_PADDING + i * CELL_SIZE);
      ctx.lineTo(BOARD_PADDING + BOARD_SIZE * CELL_SIZE, BOARD_PADDING + i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw star points (for reference)
    ctx.fillStyle = "#333";
    for (const row of [2, 5, 8]) {
      for (const col of [2, 5, 8]) {
        ctx.beginPath();
        ctx.arc(
          BOARD_PADDING + col * CELL_SIZE,
          BOARD_PADDING + row * CELL_SIZE,
          3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Draw pieces
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = gameState.board[row][col];
        if (piece) {
          drawPiece(row, col, piece);
        }
      }
    }

    // Draw valid moves
    if (gameState.validMoves.length > 0) {
      drawValidMoves();
    }

    // Draw selected piece highlight
    if (gameState.selectedPiece) {
      drawSelectedPiece();
    }
  }

  // Draw a piece
  function drawPiece(row, col, piece) {
    const x = BOARD_PADDING + col * CELL_SIZE;
    const y = BOARD_PADDING + row * CELL_SIZE;

    // Both players use the same wood color
    ctx.fillStyle = "#DEB887"; // BurlyWood - traditional shogi piece color
    ctx.strokeStyle = "#8B7355"; // Darker wood color for border
    ctx.lineWidth = 2;

    // Draw pentagon shape - direction indicates player
    // Sente pieces point upward (toward row 0), gote pieces point downward (toward row 8)
    ctx.beginPath();
    if (piece.player === SENTE) {
      // Sente: point at top
      ctx.moveTo(x + CELL_SIZE * 0.5, y + CELL_SIZE * 0.1); // Top point
      ctx.lineTo(x + CELL_SIZE * 0.8, y + CELL_SIZE * 0.5); // Right
      ctx.lineTo(x + CELL_SIZE * 0.7, y + CELL_SIZE * 0.9); // Bottom right
      ctx.lineTo(x + CELL_SIZE * 0.3, y + CELL_SIZE * 0.9); // Bottom left
      ctx.lineTo(x + CELL_SIZE * 0.2, y + CELL_SIZE * 0.5); // Left
    } else {
      // Gote: point at bottom
      ctx.moveTo(x + CELL_SIZE * 0.5, y + CELL_SIZE * 0.9); // Bottom point
      ctx.lineTo(x + CELL_SIZE * 0.8, y + CELL_SIZE * 0.5); // Right
      ctx.lineTo(x + CELL_SIZE * 0.7, y + CELL_SIZE * 0.1); // Top right
      ctx.lineTo(x + CELL_SIZE * 0.3, y + CELL_SIZE * 0.1); // Top left
      ctx.lineTo(x + CELL_SIZE * 0.2, y + CELL_SIZE * 0.5); // Left
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw piece symbol
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let symbol;
    if (piece.promoted) {
      symbol = PROMOTED_SYMBOLS[piece.type]?.[piece.player] || "?";
    } else {
      symbol = PIECE_SYMBOLS[piece.type]?.[piece.player] || "?";
    }

    // Draw the symbol in red for promoted pieces, black otherwise
    ctx.fillStyle = piece.promoted ? "#CC0000" : "#000";
    ctx.fillText(symbol, x + CELL_SIZE * 0.5, y + CELL_SIZE * 0.5);

    // Draw small direction indicator
    ctx.fillStyle = "#000";
    ctx.beginPath();
    if (piece.player === SENTE) {
      // Small triangle pointing up at top of piece
      ctx.moveTo(x + CELL_SIZE * 0.5, y + CELL_SIZE * 0.15);
      ctx.lineTo(x + CELL_SIZE * 0.55, y + CELL_SIZE * 0.25);
      ctx.lineTo(x + CELL_SIZE * 0.45, y + CELL_SIZE * 0.25);
    } else {
      // Small triangle pointing down at bottom of piece
      ctx.moveTo(x + CELL_SIZE * 0.5, y + CELL_SIZE * 0.85);
      ctx.lineTo(x + CELL_SIZE * 0.55, y + CELL_SIZE * 0.75);
      ctx.lineTo(x + CELL_SIZE * 0.45, y + CELL_SIZE * 0.75);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Draw valid moves
  function drawValidMoves() {
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";

    for (const move of gameState.validMoves) {
      const x = BOARD_PADDING + move.col * CELL_SIZE;
      const y = BOARD_PADDING + move.row * CELL_SIZE;

      ctx.beginPath();
      ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw selected piece highlight
  function drawSelectedPiece() {
    if (!gameState.selectedPiece) return;

    const { row, col } = gameState.selectedPiece;
    const x = BOARD_PADDING + col * CELL_SIZE;
    const y = BOARD_PADDING + row * CELL_SIZE;

    ctx.strokeStyle = "#ff0";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  // Update display
  function updateDisplay() {
    currentPlayerDisplay.textContent = gameState.currentPlayer === SENTE ? "先手" : "后手";
    turnCountDisplay.textContent = gameState.turnCount;

    // Update captured pieces count
    scoreSenteDisplay.textContent = gameState.capturedPieces.sente.length;
    scoreGoteDisplay.textContent = gameState.capturedPieces.gote.length;
  }

  // Show message
  function showMessage(text, type = "info") {
    messageDisplay.textContent = text;
    messageDisplay.className = type;
  }

  // Handle board click
  function handleBoardClick(e) {
    if (gameState.gameOver) return;

    const rect = boardCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to board coordinates
    const col = Math.floor((x - BOARD_PADDING) / CELL_SIZE);
    const row = Math.floor((y - BOARD_PADDING) / CELL_SIZE);

    // Check if click is within board bounds
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return;
    }

    // Handle click based on game state
    if (gameState.selectedPiece) {
      // Try to move or capture
      handleMoveOrCapture(row, col);
    } else {
      // Select a piece
      handlePieceSelection(row, col);
    }
  }

  // Handle piece selection
  function handlePieceSelection(row, col) {
    const piece = gameState.board[row][col];

    // Check if there's a piece and it belongs to current player
    if (piece && piece.player === gameState.currentPlayer) {
      gameState.selectedPiece = { row, col };
      gameState.validMoves = getValidMoves(row, col, piece, gameState.board);
      drawBoard();
      showMessage(`已选中 ${getPieceName(piece)}`);
    }
  }

  // Handle move or capture
  function handleMoveOrCapture(row, col) {
    const { row: fromRow, col: fromCol } = gameState.selectedPiece;
    const targetPiece = gameState.board[row][col];

    // Check if clicking on own piece (change selection)
    if (targetPiece && targetPiece.player === gameState.currentPlayer) {
      gameState.selectedPiece = { row, col };
      gameState.validMoves = getValidMoves(row, col, targetPiece, gameState.board);
      drawBoard();
      showMessage(`已选中 ${getPieceName(targetPiece)}`);
      return;
    }

    // Check if move is valid
    const isValidMove = gameState.validMoves.some((move) => move.row === row && move.col === col);

    if (isValidMove) {
      // Make the move
      makeMove(fromRow, fromCol, row, col);
    } else {
      showMessage("无效的移动");
    }
  }

  // Make a move
  function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = gameState.board[fromRow][fromCol];
    const targetPiece = gameState.board[toRow][toCol];

    // Capture piece if exists
    if (targetPiece) {
      // Add to captured pieces
      gameState.capturedPieces[gameState.currentPlayer].push({
        type: targetPiece.type,
        promoted: false, // Captured pieces lose promotion
      });
      showMessage(`吃掉了 ${getPieceName(targetPiece)}`);
    }

    // Move piece
    gameState.board[toRow][toCol] = piece;
    gameState.board[fromRow][fromCol] = null;

    // Check for promotion
    if (canPromote(piece, toRow)) {
      showPromotionDialog(piece, toRow, toCol);
    } else {
      // Record move
      recordMove(fromRow, fromCol, toRow, toCol, piece, targetPiece);

      // Switch player
      switchPlayer();

      // Check for game over
      if (isGameOver(gameState.board)) {
        endGame();
      }
    }
  }

  // Show promotion dialog
  function showPromotionDialog(piece, row, col) {
    promotionOverlay.style.display = "flex";
    promotionOverlay.dataset.row = row;
    promotionOverlay.dataset.col = col;
  }

  // Handle promotion choice
  function handlePromotionChoice(e) {
    const choice = e.target.dataset.promo;
    const row = Number.parseInt(promotionOverlay.dataset.row);
    const col = Number.parseInt(promotionOverlay.dataset.col);
    const piece = gameState.board[row][col];

    if (choice === "promote") {
      piece.promoted = true;
      showMessage(`${getPieceName(piece)} 已升变`);
    }

    promotionOverlay.style.display = "none";

    // Record move
    const fromRow = gameState.selectedPiece.row;
    const fromCol = gameState.selectedPiece.col;
    recordMove(fromRow, fromCol, row, col, piece, null);

    // Switch player
    switchPlayer();

    // Check for game over
    if (isGameOver(gameState.board)) {
      endGame();
    }
  }

  // Record a move
  function recordMove(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
    gameState.moveHistory.push({
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: { ...piece },
      captured: capturedPiece ? { ...capturedPiece } : null,
      player: gameState.currentPlayer,
    });

    gameState.turnCount++;
  }

  // Switch player
  function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === SENTE ? GOTE : SENTE;
    gameState.selectedPiece = null;
    gameState.validMoves = [];

    // Update display
    updateDisplay();
    drawBoard();

    // If PvE mode and it's AI's turn
    if (gameState.mode === "pve" && gameState.currentPlayer === GOTE) {
      setTimeout(makeAIMove, 500);
    }
  }

  // End the game
  function endGame() {
    gameState.gameOver = true;
    const winner = gameState.currentPlayer === SENTE ? "后手" : "先手";

    document.getElementById("winner-text").textContent = `${winner} 获胜！`;
    document.getElementById("game-over").style.display = "flex";
  }

  // Restart the game
  function restartGame() {
    document.getElementById("game-over").style.display = "none";
    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("game-area").style.display = "none";
    gameState.gameOver = false;
  }

  // Make AI move using Alpha-Beta pruning
  function makeAIMove() {
    if (gameState.gameOver || gameState.currentPlayer !== GOTE) return;

    showMessage("电脑正在思考...", "info");

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const bestMove = getBestAIMove(
        gameState.board,
        gameState.capturedPieces,
        GOTE,
        gameState.aiDepth
      );

      if (!bestMove) {
        endGame();
        return;
      }

      if (bestMove.type === "drop") {
        // Drop move
        gameState.board[bestMove.to.row][bestMove.to.col] = {
          type: bestMove.piece.type,
          player: GOTE,
          promoted: false,
        };
        // Remove from captured pieces
        const idx = gameState.capturedPieces.gote.findIndex((p) => p.type === bestMove.piece.type);
        if (idx !== -1) {
          gameState.capturedPieces.gote.splice(idx, 1);
        }
        showMessage(`电脑打入了 ${getPieceName(bestMove.piece)}`);
        switchPlayer();
      } else {
        // Normal move
        makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
      }
    }, 100);
  }

  // Drop piece functionality (for captured pieces)
  function showDropDialog() {
    if (gameState.capturedPieces[gameState.currentPlayer].length === 0) {
      showMessage("没有可打入的棋子");
      return;
    }

    dropOverlay.style.display = "flex";
    dropPiecesContainer.innerHTML = "";

    // Create buttons for each captured piece
    gameState.capturedPieces[gameState.currentPlayer].forEach((piece, index) => {
      const btn = document.createElement("button");
      btn.className = "drop-btn";
      btn.textContent = PIECE_SYMBOLS[piece.type]?.[gameState.currentPlayer] || "?";
      btn.addEventListener("click", () => handleDropPiece(index));
      dropPiecesContainer.appendChild(btn);
    });
  }

  // Handle dropping a piece
  function handleDropPiece(pieceIndex) {
    dropOverlay.style.display = "none";
    showMessage("点击棋盘位置打入棋子");

    // Store the piece to drop
    gameState.pieceToDrop = pieceIndex;

    // Set up click handler for drop position
    const dropHandler = (e) => {
      const rect = boardCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor((x - BOARD_PADDING) / CELL_SIZE);
      const row = Math.floor((y - BOARD_PADDING) / CELL_SIZE);

      if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        // Check if position is empty
        if (!gameState.board[row][col]) {
          // Check for pawn restrictions
          const pieceToDrop = gameState.capturedPieces[gameState.currentPlayer][pieceIndex];
          if (pieceToDrop.type === PIECE_TYPES.PAWN) {
            // Check for existing pawn in same column
            let hasPawn = false;
            for (let r = 0; r < BOARD_SIZE; r++) {
              const p = gameState.board[r][col];
              if (
                p &&
                p.type === PIECE_TYPES.PAWN &&
                p.player === gameState.currentPlayer &&
                !p.promoted
              ) {
                hasPawn = true;
                break;
              }
            }
            if (hasPawn) {
              showMessage("同列不能有两个步兵");
              return;
            }

            // Check for immediate checkmate with pawn drop
            if (wouldCauseCheckmate(row, col, pieceToDrop)) {
              showMessage("不能通过打入步兵将死对方");
              return;
            }
          }

          // Place the piece
          gameState.board[row][col] = {
            type: pieceToDrop.type,
            player: gameState.currentPlayer,
            promoted: false,
          };

          // Remove from captured pieces
          gameState.capturedPieces[gameState.currentPlayer].splice(pieceIndex, 1);

          // Switch player
          switchPlayer();
          showMessage(`打入了 ${getPieceName(pieceToDrop)}`);
        } else {
          showMessage("该位置已有棋子");
        }
      }

      // Remove handler
      boardCanvas.removeEventListener("click", dropHandler);
    };

    boardCanvas.addEventListener("click", dropHandler);
  }

  // Check if dropping a pawn would cause checkmate
  function wouldCauseCheckmate(row, col, piece) {
    // Simple check - just verify if the pawn would directly attack the king
    const opponent = piece.player === SENTE ? GOTE : SENTE;
    const direction = piece.player === SENTE ? -1 : 1;

    // Check if pawn attacks opponent's king
    const targetRow = row + direction;
    if (targetRow >= 0 && targetRow < BOARD_SIZE) {
      const targetPiece = gameState.board[targetRow][col];
      if (targetPiece && targetPiece.type === PIECE_TYPES.KING && targetPiece.player === opponent) {
        return true;
      }
    }

    return false;
  }

  // Start the game
  function startGame(mode) {
    gameState.mode = mode;

    // Hide mode selection, show game area
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("game-area").style.display = "flex";

    // Show/hide AI rules
    const rulePve = document.getElementById("rule-pve");
    if (rulePve) {
      rulePve.style.display = mode === "pve" ? "block" : "none";
    }

    // Initialize game
    initGame();

    // If PvE mode and AI goes first (gote)
    if (mode === "pve" && gameState.currentPlayer === GOTE) {
      setTimeout(makeAIMove, 500);
    }
  }

  // Set up event listeners
  document.addEventListener("DOMContentLoaded", () => {
    // Mode selection buttons
    document.getElementById("btn-pvp").addEventListener("click", () => startGame("pvp"));
    document.getElementById("btn-pve").addEventListener("click", () => startGame("pve"));
    document.getElementById("btn-online").addEventListener("click", () => startGame("online"));

    // Restart button
    document.getElementById("btn-restart").addEventListener("click", restartGame);

    // Board click
    boardCanvas.addEventListener("click", handleBoardClick);

    // Promotion buttons
    document.querySelectorAll(".promo-btn").forEach((btn) => {
      btn.addEventListener("click", handlePromotionChoice);
    });

    // Show mode selection
    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
    document.getElementById("promotion-overlay").style.display = "none";
  });
}
