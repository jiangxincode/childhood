/* eslint-disable prefer-arrow-callback */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AIDifficulty = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const LEVELS = Object.freeze(["easy", "normal", "hard", "master"]);
  const LABELS = Object.freeze({ easy: "简单", normal: "普通", hard: "困难", master: "大师" });
  let currentLevel = "normal";
  let currentMode = null;
  let control = null;

  function normalizeLevel(level) {
    return LEVELS.includes(level) ? level : "normal";
  }

  function getLevel() {
    return currentLevel;
  }

  function setLevel(level) {
    const next = normalizeLevel(level);
    if (next === currentLevel) return currentLevel;
    currentLevel = next;
    if (control) control.value = next;
    if (
      root &&
      typeof root.dispatchEvent === "function" &&
      typeof root.CustomEvent === "function"
    ) {
      root.dispatchEvent(new root.CustomEvent("ai-difficulty-change", { detail: { level: next } }));
    }
    return currentLevel;
  }

  function setMode(mode) {
    currentMode = mode;
    if (control) control.parentElement.hidden = mode !== "pve";
  }

  function getProfile(level, profiles) {
    return profiles[normalizeLevel(level || currentLevel)] || profiles.normal;
  }

  function pickRandom(items, random) {
    if (!items || items.length === 0) return null;
    const randomFn = typeof random === "function" ? random : Math.random;
    return items[Math.floor(randomFn() * items.length)];
  }

  function hasComputerSeat() {
    for (const select of document.querySelectorAll("select")) {
      if (select.value === "computer" || select.value === "npc") return true;
    }
    return false;
  }

  function inferModeFromClick(target) {
    if (!target || typeof target.closest !== "function") return;
    const button = target.closest("button");
    if (!button) return;
    if (button.dataset.oppType) return setMode(button.dataset.oppType);
    if (button.id === "btn-pve") return setMode("pve");
    if (button.id === "btn-pvp") return setMode("pvp");
    if (button.id === "btn-online" || button.classList.contains("btn-online"))
      return setMode("online");
    if (["begin", "btn-begin", "btn-start"].includes(button.id)) {
      setMode(hasComputerSeat() ? "pve" : "pvp");
    }
  }

  function mount() {
    if (control || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.textContent =
      ".ai-difficulty-control{position:fixed;right:16px;bottom:16px;z-index:9000;display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(255,255,255,.35);border-radius:12px;background:rgba(20,25,35,.88);box-shadow:0 4px 16px rgba(0,0,0,.3);color:#fff;font:14px/1.2 sans-serif;backdrop-filter:blur(6px)}" +
      ".ai-difficulty-control[hidden]{display:none}.ai-difficulty-control select{min-width:76px;padding:5px 8px;border:1px solid rgba(255,255,255,.35);border-radius:7px;background:#fff;color:#222;font:inherit;cursor:pointer}" +
      ".ai-difficulty-control select:focus{outline:2px solid #64b5f6;outline-offset:2px}@media(max-width:600px){.ai-difficulty-control{right:8px;bottom:8px;padding:7px 10px}}";
    document.head.appendChild(style);

    const wrapper = document.createElement("label");
    wrapper.className = "ai-difficulty-control";
    wrapper.hidden = currentMode !== "pve";
    wrapper.append("AI 难度");
    control = document.createElement("select");
    control.setAttribute("aria-label", "AI 难度");
    for (const level of LEVELS) {
      const option = document.createElement("option");
      option.value = level;
      option.textContent = LABELS[level];
      option.selected = level === currentLevel;
      control.appendChild(option);
    }
    control.addEventListener("change", () => setLevel(control.value));
    wrapper.appendChild(control);
    document.body.appendChild(wrapper);
    document.addEventListener("click", (event) => inferModeFromClick(event.target), true);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
    else mount();
  }

  return {
    LEVELS,
    LABELS,
    normalizeLevel,
    getLevel,
    setLevel,
    setMode,
    getProfile,
    pickRandom,
    mount,
  };
});
