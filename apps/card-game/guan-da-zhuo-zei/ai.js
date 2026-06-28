const AI_NAMES = ["小明", "小红", "小军"];

const SUSPECT_PROFILES = {
  easy: { trustOwnCards: false, deductionChance: 0 },
  normal: { trustOwnCards: true, deductionChance: 0 },
  hard: { trustOwnCards: true, deductionChance: 0.65 },
  master: { trustOwnCards: true, deductionChance: 1 },
};

function getDifficultyLevel() {
  return globalThis.AIDifficulty && typeof globalThis.AIDifficulty.getLevel === "function"
    ? globalThis.AIDifficulty.getLevel()
    : "normal";
}

function pickRandom(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}

function chooseWanted(criminals, rng = Math.random) {
  return pickRandom(criminals, rng);
}

function chooseOfficer(officers, rng = Math.random) {
  return pickRandom(officers, rng);
}

function chooseSuspect(
  players,
  officerPlayerId,
  wanted,
  rng = Math.random,
  difficulty = getDifficultyLevel()
) {
  const officer = players[officerPlayerId];
  const profile = SUSPECT_PROFILES[difficulty] || SUSPECT_PROFILES.normal;
  if (profile.trustOwnCards && officer.cards.includes(wanted)) return officerPlayerId;

  const holder = players.find((player) => player.cards.includes(wanted));
  if (holder && profile.deductionChance > 0 && rng() < profile.deductionChance) return holder.id;

  const candidates = profile.trustOwnCards
    ? players.filter((player) => player.id !== officerPlayerId)
    : players;
  return pickRandom(candidates, rng).id;
}

const GUAN_DA_AI = { AI_NAMES, pickRandom, chooseWanted, chooseOfficer, chooseSuspect };

if (typeof module !== "undefined" && module.exports) {
  module.exports = GUAN_DA_AI;
}
