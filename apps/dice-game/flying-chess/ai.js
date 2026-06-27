/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function selectComputerPlaneIndex(length, random = Math.random) {
    if (length <= 0) return -1;
    return Math.floor(random() * length);
  }

  return { selectComputerPlaneIndex };
});
