// AI shootout: compare new (smart) AI vs simple greedy AI for the four games.
// Runs N games where both sides use AI; new AI plays one team, legacy AI plays the other.
// Tracks win rate. Designed as a quick sanity check; not a deterministic guarantee.

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Legacy AI implementation (greedy) - mirrors the original aiDecide.
function legacyAiDecide(state, aiTeam, deps) {
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
        const mutual = isMutualDestruction(card, target);
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

  const faceDownCells = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (card && !card.faceUp) faceDownCells.push({ x, y });
    }
  }
  if (faceDownCells.length > 0) {
    const pick = faceDownCells[Math.floor(Math.random() * faceDownCells.length)];
    return { type: "flip", x: pick.x, y: pick.y };
  }

  const allMoves = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const card = board[y][x];
      if (!card || !card.faceUp || card.team !== aiTeam) continue;
      const targets = getValidMoves(board, x, y);
      for (const t of targets) {
        allMoves.push({ from: { x, y }, to: t });
      }
    }
  }
  if (allMoves.length > 0) {
    const pick = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { type: "move", from: pick.from, to: pick.to };
  }
  return null;
}

function playGame(game, smartTeam, legacyTeam, makeDeps) {
  const state = game.createGameState("pvp");
  // Manually start
  state.currentTeam = smartTeam;
  state.firstPlayer = smartTeam;
  let steps = 0;
  while (!state.gameOver && steps < 500) {
    steps++;
    const team = state.currentTeam;
    const deps = makeDeps();
    const decision =
      team === smartTeam ? game.aiDecide(state, team) : legacyAiDecide(state, team, deps);
    if (!decision) break;
    if (decision.type === "flip") {
      game.flipCard(state, decision.x, decision.y);
    } else if (decision.type === "move") {
      game.moveCard(state, decision.from, decision.to);
    } else if (decision.type === "capture") {
      game.captureCard(state, decision.from, decision.to);
    }
    const result = game.checkGameOver(state.board, state.currentTeam);
    if (result.ended) {
      state.gameOver = true;
      state.winner = result.winner;
      break;
    }
  }
  return state.winner;
}

function runShootout(name, game, teamA, teamB, makeDeps, games = 200) {
  let smartWins = 0;
  let legacyWins = 0;
  let draws = 0;
  for (let i = 0; i < games; i++) {
    // Alternate which side starts to avoid first-move bias
    const smart = i % 2 === 0 ? teamA : teamB;
    const legacy = smart === teamA ? teamB : teamA;
    const winner = playGame(game, smart, legacy, makeDeps);
    if (winner === smart) smartWins++;
    else if (winner === legacy) legacyWins++;
    else draws++;
  }
  console.log(
    `${name}: smart ${smartWins} - legacy ${legacyWins} (draws ${draws}) over ${games} games`
  );
}

// Animal Chess
{
  const game = require("../apps/card-game/animal-chess/game.js");
  const makeDeps = () => ({
    canCapture: game.canCapture,
    isMutualDestruction: game.isMutualDestruction,
    getValidCaptures: (b, x, y, t) => game.getValidCaptures(b, x, y, t),
    getValidMoves: game.getValidMoves,
  });
  runShootout("animal-chess", game, "red", "blue", makeDeps);
}
// Cat and Mouse
{
  const game = require("../apps/card-game/cat-and-mouse/game.js");
  const makeDeps = () => ({
    canCapture: game.canCapture,
    isMutualDestruction: game.isMutualDestruction,
    getValidCaptures: (b, x, y, t) => game.getValidCaptures(b, x, y, t),
    getValidMoves: game.getValidMoves,
  });
  runShootout("cat-and-mouse", game, "red", "blue", makeDeps);
}
// Little Emperor
{
  const game = require("../apps/card-game/little-emperor/game.js");
  const makeDeps = () => ({
    canCapture: game.canCapture,
    isMutualDestruction: game.isMutualDestruction,
    getValidCaptures: (b, x, y, t) => game.getValidCaptures(b, x, y, t),
    getValidMoves: game.getValidMoves,
  });
  runShootout("little-emperor", game, "red", "blue", makeDeps);
}
// Dragon Tiger Fight
{
  const game = require("../apps/card-game/dragon-tiger-fight/game.js");
  const makeDeps = () => ({
    canCapture: game.canCapture,
    isMutualDestruction: game.isMutualDestruction,
    getValidCaptures: (b, x, y, t) => game.getValidCaptures(b, x, y, t),
    getValidMoves: game.getValidMoves,
  });
  runShootout("dragon-tiger-fight", game, "dragon", "tiger", makeDeps);
}
