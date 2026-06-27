const AI_NAMES = ["小明", "小红", "小军"];

function pickRandom(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}

function chooseWanted(criminals, rng = Math.random) {
  return pickRandom(criminals, rng);
}

function chooseOfficer(officers, rng = Math.random) {
  return pickRandom(officers, rng);
}

function chooseSuspect(players, officerPlayerId, wanted, rng = Math.random) {
  const officer = players[officerPlayerId];
  if (officer.cards.includes(wanted)) return officerPlayerId;
  const candidates = players.filter((player) => player.id !== officerPlayerId);
  return pickRandom(candidates, rng).id;
}

const GUAN_DA_AI = { AI_NAMES, pickRandom, chooseWanted, chooseOfficer, chooseSuspect };

if (typeof module !== "undefined" && module.exports) {
  module.exports = GUAN_DA_AI;
}
