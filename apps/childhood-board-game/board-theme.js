// ============================================================
// Shared board theme for childhood board games.
// Injects glossy stone gradients into each game's SVG board so
// the unified wooden-board + stone-piece look can be applied
// purely from board-theme.css.
// ============================================================

(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  /**
   * Read a CSS custom property from :root with a fallback.
   * @param {string} name - Custom property name, e.g. "--a-color"
   * @param {string} fallback - Value to use when the property is empty
   * @returns {string}
   */
  function cssVar(name, fallback) {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  /**
   * Parse a hex color into RGB channels.
   * @param {string} hex - "#rgb" or "#rrggbb"
   * @returns {{r: number, g: number, b: number}}
   */
  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const full =
      value.length === 3
        ? value
            .split("")
            .map((c) => c + c)
            .join("")
        : value;
    const num = Number.parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  /**
   * Blend a hex color toward a target color.
   * @param {string} hex - Base color
   * @param {string} target - Target color ("#ffffff" / "#000000")
   * @param {number} ratio - 0..1 blend amount
   * @returns {string} rgb() color string
   */
  function mix(hex, target, ratio) {
    const from = hexToRgb(hex);
    const to = hexToRgb(target);
    const channel = (key) => Math.round(from[key] + (to[key] - from[key]) * ratio);
    return `rgb(${channel("r")}, ${channel("g")}, ${channel("b")})`;
  }

  /**
   * Build a radial gradient that gives pieces a polished stone look.
   * @param {string} id - Unique gradient id used by the CSS
   * @param {string} base - Team color
   * @returns {SVGElement}
   */
  function buildGradient(id, base) {
    const gradient = document.createElementNS(SVG_NS, "radialGradient");
    gradient.setAttribute("id", id);
    gradient.setAttribute("cx", "35%");
    gradient.setAttribute("cy", "30%");
    gradient.setAttribute("r", "75%");

    const stops = [
      ["0%", mix(base, "#ffffff", 0.45)],
      ["55%", base],
      ["100%", mix(base, "#000000", 0.3)],
    ];
    stops.forEach(([offset, color]) => {
      const stop = document.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      gradient.appendChild(stop);
    });
    return gradient;
  }

  /**
   * Inject the two stone gradients into a board SVG.
   * @param {SVGElement} svg - The game's board SVG element
   */
  function addGradients(svg) {
    const colorA = cssVar("--a-color", cssVar("--x-color", "#1565c0"));
    const colorB = cssVar("--b-color", cssVar("--o-color", "#e53935"));
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.appendChild(buildGradient("piece-a", colorA));
    defs.appendChild(buildGradient("piece-b", colorB));
    svg.appendChild(defs);
  }

  window.ChildhoodBoardTheme = { addGradients };
})();
