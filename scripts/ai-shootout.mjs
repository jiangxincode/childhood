// AI shootout: compare new (smart) AI vs simple legacy AI for the card games.
// Each game runs N matches. New AI plays one side, legacy AI the other; sides
// alternate to remove first-move bias. Reports win counts.
//
// Designed as a quick sanity check; not a deterministic guarantee.

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// ============================================================
// Generic legacy AI for 4x4 capture/flip/move games (no carry, no flag)
// Mirrors the original aiDecide of animal-chess / cat-and-mouse / little-emperor / dragon-tiger-fight.
// ============================================================
function legacyAiDecide4x4(state, aiTeam, deps) {
  const { isMutualDestruction, getValidCaptures, getValidMoves } = deps;
  const board = state.board;

  const allCaptures = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidCaptures(board, x, y, aiTeam);
      for (const t of targets) {
        const target = board[t.y][t.x];
        const mutual = isMutualDestruction ? isMutualDestruction(card, target) : false;
        allCaptures.push({
          from: { x, y },
          to: t,
          defenderRank: target.rank,
          attackerRank: card.rank,
          mutual,
        });
      }
    }
  }
  if (allCaptures.length > 0) {
    allCaptures.sort((a, b) => {
      if (a.mutual !== b.mutual) return a.mutual ? 1 : -1;
      if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank;
      return b.attackerRank - a.attackerRank;
    });
    return { type: "capture", from: allCaptures[0].from, to: allCaptures[0].to };
  }

  const faceDown = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card && !card.faceUp) faceDown.push({ x, y });
    }
  }
  if (faceDown.length > 0) {
    const pick = faceDown[Math.floor(Math.random() * faceDown.length)];
    return { type: "flip", x: pick.x, y: pick.y };
  }

  const allMoves = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidMoves(board, x, y);
      for (const t of targets) allMoves.push({ from: { x, y }, to: t });
    }
  }
  if (allMoves.length > 0) {
    const pick = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { type: "move", from: pick.from, to: pick.to };
  }
  return null;
}

// ============================================================
// Legacy AI for chinese-army-chess (5x5, with flag-capture priority)
// ============================================================
function legacyAiDecideArmyChess(state, aiTeam, deps) {
  const { canCaptureFlag, getValidCaptures, getValidMoves, resolveCombat } = deps;
  const board = state.board;

  // Priority 1: capture flag
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
      const flagResult = canCaptureFlag(board, x, y, aiTeam);
      if (flagResult) {
        return { type: "move", from: { x, y }, to: { x: flagResult.flagX, y: flagResult.flagY } };
      }
    }
  }

  // Priority 2: capture
  const allCaptures = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
      const targets = getValidCaptures(board, x, y, aiTeam);
      for (const t of targets) {
        const target = board[t.y][t.x];
        const combatResult = resolveCombat(piece, target);
        const mutual = combatResult === "mutual_destruction";
        allCaptures.push({
          from: { x, y },
          to: t,
          defenderRank: target.rank !== null ? target.rank : 999,
          attackerRank: piece.rank !== null ? piece.rank : 999,
          mutual,
        });
      }
    }
  }
  if (allCaptures.length > 0) {
    allCaptures.sort((a, b) => {
      if (a.mutual !== b.mutual) return a.mutual ? 1 : -1;
      if (a.defenderRank !== b.defenderRank) return a.defenderRank - b.defenderRank;
      return b.attackerRank - a.attackerRank;
    });
    return { type: "capture", from: allCaptures[0].from, to: allCaptures[0].to };
  }

  // Priority 3: flip
  const faceDown = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (piece && !piece.faceUp) faceDown.push({ x, y });
    }
  }
  if (faceDown.length > 0) {
    const pick = faceDown[Math.floor(Math.random() * faceDown.length)];
    return { type: "flip", x: pick.x, y: pick.y };
  }

  // Priority 4: move
  const allMoves = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const piece = board[y][x];
      if (!piece || !piece.faceUp || piece.team !== aiTeam) continue;
      const targets = getValidMoves(board, x, y, aiTeam);
      for (const t of targets) allMoves.push({ from: { x, y }, to: t });
    }
  }
  if (allMoves.length > 0) {
    const pick = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { type: "move", from: pick.from, to: pick.to };
  }
  return null;
}

// ============================================================
// Legacy AI for knife-kills-chicken (4x4 with carry weapon)
// ============================================================
function legacyAiDecideKnife(state, aiTeam, deps) {
  const { getValidCaptures, getValidMoves, getCarryTargets } = deps;
  const board = state.board;

  const allCaptures = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidCaptures(board, x, y, aiTeam);
      for (const t of targets) allCaptures.push({ from: { x, y }, to: t });
    }
  }
  if (allCaptures.length > 0) {
    const pick = allCaptures[Math.floor(Math.random() * allCaptures.length)];
    return { type: "capture", from: pick.from, to: pick.to };
  }

  const allCarries = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getCarryTargets(board, x, y, aiTeam);
      for (const t of targets) allCarries.push({ from: { x, y }, to: t });
    }
  }
  if (allCarries.length > 0) {
    const pick = allCarries[Math.floor(Math.random() * allCarries.length)];
    return { type: "carry", from: pick.from, to: pick.to };
  }

  const faceDown = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card && !card.faceUp) faceDown.push({ x, y });
    }
  }
  if (faceDown.length > 0) {
    const pick = faceDown[Math.floor(Math.random() * faceDown.length)];
    return { type: "flip", x: pick.x, y: pick.y };
  }

  const allMoves = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidMoves(board, x, y);
      for (const t of targets) allMoves.push({ from: { x, y }, to: t });
    }
  }
  if (allMoves.length > 0) {
    const pick = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { type: "move", from: pick.from, to: pick.to };
  }
  return null;
}

// ============================================================
// Generic match runner. Strategies are 4-arg: (game, state, aiTeam, deps).
// `stepGame` applies a decision to the state and returns updated state.
// `checkOver` reports whether the game finished after the step.
// ============================================================
function playGame({ game, smartTeam, legacyTeam, deps, smartFn, legacyFn, stepGame, checkOver }) {
  const state = game.createGameState("pvp");
  state.currentTeam = smartTeam;
  state.firstPlayer = smartTeam;
  state.teamAssigned = true;
  state.aiFirst = false;
  let steps = 0;
  while (!state.gameOver && steps < 500) {
    steps++;
    const team = state.currentTeam;
    const decision = team === smartTeam ? smartFn(state, team) : legacyFn(state, team, deps);
    if (!decision) {
      // No legal action -> the side without options loses.
      state.gameOver = true;
      state.winner = team === smartTeam ? legacyTeam : smartTeam;
      break;
    }
    stepGame(state, decision);
    const over = checkOver(state);
    if (over.ended) {
      state.gameOver = true;
      state.winner = over.winner;
      break;
    }
  }
  return state.winner;
}

function runShootout(name, gameFactory, games = 200) {
  let smartWins = 0;
  let legacyWins = 0;
  let draws = 0;
  for (let i = 0; i < games; i++) {
    const cfg = gameFactory();
    const flip = i % 2 === 0;
    const smart = flip ? cfg.teamA : cfg.teamB;
    const legacy = smart === cfg.teamA ? cfg.teamB : cfg.teamA;
    const winner = playGame({
      game: cfg.game,
      smartTeam: smart,
      legacyTeam: legacy,
      deps: cfg.deps,
      smartFn: cfg.smartFn,
      legacyFn: cfg.legacyFn,
      stepGame: cfg.stepGame,
      checkOver: cfg.checkOver,
    });
    if (winner === smart) smartWins++;
    else if (winner === legacy) legacyWins++;
    else draws++;
  }
  console.log(
    `${name}: smart ${smartWins} - legacy ${legacyWins} (draws ${draws}) over ${games} games`
  );
}

// ============================================================
// Game configurations
// ============================================================

// Generic 4x4 capture/flip/move game (animal-chess / cat-and-mouse / little-emperor)
function configSimple4x4(game, teamA, teamB) {
  const deps = {
    canCapture: game.canCapture,
    isMutualDestruction: game.isMutualDestruction,
    getValidCaptures: (b, x, y, t) => game.getValidCaptures(b, x, y, t),
    getValidMoves: game.getValidMoves,
  };
  return {
    game,
    teamA,
    teamB,
    deps,
    smartFn: (state, team) => game.aiDecide(state, team),
    legacyFn: legacyAiDecide4x4,
    stepGame: (state, decision) => {
      if (decision.type === "flip") game.flipCard(state, decision.x, decision.y);
      else if (decision.type === "move") game.moveCard(state, decision.from, decision.to);
      else if (decision.type === "capture") game.captureCard(state, decision.from, decision.to);
    },
    checkOver: (state) => game.checkGameOver(state.board, state.currentTeam),
  };
}

// dragon-tiger-fight uses dragon/tiger team names
function configDragonTiger(game) {
  return configSimple4x4(game, "dragon", "tiger");
}

// chinese-army-chess (5x5 + flag)
function configArmyChess(game) {
  const deps = {
    canCaptureFlag: game.canCaptureFlag,
    getValidCaptures: (b, x, y, t) => game.getValidCaptures(b, x, y, t),
    getValidMoves: game.getValidMoves,
    resolveCombat: game.resolveCombat,
  };
  return {
    game,
    teamA: "red",
    teamB: "blue",
    deps,
    smartFn: (state, team) => game.aiDecide(state, team),
    legacyFn: legacyAiDecideArmyChess,
    stepGame: (state, decision) => {
      if (decision.type === "flip") game.flipCard(state, decision.x, decision.y);
      else if (decision.type === "move") game.moveCard(state, decision.from, decision.to);
      else if (decision.type === "capture") game.captureCard(state, decision.from, decision.to);
    },
    // checkGameOver(state) returns {ended, winner}; this game's signature
    // takes state, not (board, team).
    checkOver: (state) => game.checkGameOver(state),
  };
}

// knife-kills-chicken (4x4 + carry)
function configKnife(game) {
  const deps = {
    getValidCaptures: (b, x, y, t) => game.getValidCaptures(b, x, y, t),
    getValidMoves: game.getValidMoves,
    getCarryTargets: (b, x, y, t) => game.getCarryTargets(b, x, y, t),
  };
  return {
    game,
    teamA: "red",
    teamB: "blue",
    deps,
    smartFn: (state, team) => game.aiDecide(state, team),
    legacyFn: legacyAiDecideKnife,
    stepGame: (state, decision) => {
      if (decision.type === "flip") game.flipCard(state, decision.x, decision.y);
      else if (decision.type === "move") game.moveCard(state, decision.from, decision.to);
      else if (decision.type === "capture") game.captureCard(state, decision.from, decision.to);
      else if (decision.type === "carry") game.carryWeapon(state, decision.from, decision.to);
    },
    checkOver: (state) => game.checkGameOver(state.board, state.currentTeam),
  };
}

// ============================================================
// Run
// ============================================================
runShootout("animal-chess", () =>
  configSimple4x4(require("../apps/card-game/animal-chess/game.js"), "red", "blue")
);
runShootout("cat-and-mouse", () =>
  configSimple4x4(require("../apps/card-game/cat-and-mouse/game.js"), "red", "blue")
);
runShootout("little-emperor", () =>
  configSimple4x4(require("../apps/card-game/little-emperor/game.js"), "red", "blue")
);
runShootout("dragon-tiger-fight", () =>
  configDragonTiger(require("../apps/card-game/dragon-tiger-fight/game.js"))
);
runShootout("chinese-army-chess", () =>
  configArmyChess(require("../apps/card-game/chinese-army-chess/game.js"))
);
runShootout("knife-kills-chicken", () =>
  configKnife(require("../apps/card-game/knife-kills-chicken/game.js"))
);
