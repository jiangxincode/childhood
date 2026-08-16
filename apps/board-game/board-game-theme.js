// ============================================================
// Shared board & piece theme for classic board games
// (apps/board-game). Supplies the common wooden palette and
// canvas helpers so every game renders the same material look
// while keeping its own layout, labels and piece shapes.
// ============================================================

(function () {
  "use strict";

  const PALETTE = {
    woodLight: "#e2b877",
    woodMid: "#d9a95f",
    woodDark: "#cd9a52",
    carve: "#5d3a1a",
    frame: "#7a4a1d",
  };

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

  function mix(hex, target, ratio) {
    const from = hexToRgb(hex);
    const to = hexToRgb(target);
    const channel = (key) => Math.round(from[key] + (to[key] - from[key]) * ratio);
    return `rgb(${channel("r")}, ${channel("g")}, ${channel("b")})`;
  }

  // Fill the canvas with the shared wooden board base and subtle grain.
  function drawWoodenBoard(ctx, width, height) {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, PALETTE.woodLight);
    bg.addColorStop(0.5, PALETTE.woodMid);
    bg.addColorStop(1, PALETTE.woodDark);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(122, 74, 22, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 5) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i + Math.sin(i * 0.04) * 3);
      ctx.stroke();
    }
  }

  // Glossy circular piece with a shared highlight / rim treatment.
  // base is the team color; light and dark stops are derived from it.
  function glossyDisc(ctx, cx, cy, r, base, options) {
    const opts = options || {};
    const light = mix(base, "#ffffff", opts.light === undefined ? 0.55 : opts.light);
    const dark = mix(base, "#000000", opts.dark === undefined ? 0.35 : opts.dark);
    const rgb = hexToRgb(base);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

    if (opts.shadow !== false) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.arc(cx + 1.5, cy + 2.5, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const gradient = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.3, 2, cx, cy, r);
    gradient.addColorStop(0, light);
    gradient.addColorStop(0.5, base);
    gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle =
      opts.highlight ||
      (luminance < 0.5 ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.75)");
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.3, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    ctx.strokeStyle =
      opts.rim || (luminance < 0.5 ? "rgba(0, 0, 0, 0.6)" : "rgba(120, 120, 120, 0.5)");
    ctx.lineWidth = opts.rimWidth || 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  window.BoardGameTheme = { PALETTE, drawWoodenBoard, glossyDisc };
})();
