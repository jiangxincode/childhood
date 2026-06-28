/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function selectComputerPlaneIndex(candidates, difficulty, random = Math.random) {
    if (typeof difficulty === "function") {
      random = difficulty;
      difficulty = "normal";
    }
    const list = Array.isArray(candidates)
      ? candidates
      : Array.from({ length: candidates }, (_, index) => ({ index }));
    if (list.length === 0) return -1;
    const level =
      difficulty ||
      (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
        ? globalThis.AIDifficulty.getLevel()
        : "normal");
    if (level === "normal") return Math.floor(random() * list.length);

    const scored = list.map((plane, index) => {
      const progress = Number.isFinite(plane.coordId) ? plane.coordId : 0;
      const activeBonus = plane.state === "ready" ? 20 : 0;
      return { index, score: progress + activeBonus };
    });
    scored.sort((a, b) => (level === "easy" ? a.score - b.score : b.score - a.score));
    if (level === "hard" && scored.length > 1) {
      return scored[Math.floor(random() * Math.min(2, scored.length))].index;
    }
    return scored[0].index;
  }

  return { selectComputerPlaneIndex };
});
