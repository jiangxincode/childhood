(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const BOARD_SIZE = 985;
  const BOARD_COLOR = "#fffdca";
  // Colours sampled from the original background artwork
  const TEAM_COLORS = {
    red: "#db224e",
    blue: "#76c5f0",
    yellow: "#e77918",
    green: "#83c326",
  };
  const PAD_COLORS = {
    red: "#f09abd",
    blue: "#c5e5fa",
    yellow: "#fff500",
    green: "#c5de69",
  };
  // Softer variants used for the fuel-station decorations, sampled from
  // the original artwork (they read duller than the team colours)
  const FUEL_COLORS = {
    red: "#b03545",
    blue: "#74aebc",
    yellow: "#c4761f",
    green: "#82b42c",
  };
  const CIRCLE_RADIUS = 17.5;
  const PAD_RADIUS = 37;
  const FONT_FAMILY = "Verdana, 'Microsoft YaHei', Arial, sans-serif";
  // Letters printed inside the track circles, keyed by coord id
  const CELL_LABELS = {
    1: "N",
    3: "P",
    5: "O",
    8: "Q",
    11: "R",
    14: "S",
    16: "A",
    18: "T",
    21: "B",
    24: "C",
    27: "D",
    29: "F",
    31: "E",
    34: "G",
    37: "H",
    40: "I",
    42: "K",
    44: "J",
    47: "L",
    50: "W",
  };
  // Hangar team per quadrant, clockwise from top-left
  const QUADRANT_TEAMS = ["green", "red", "blue", "yellow"];

  // ------------------------------------------------------------------
  // Geometry of one quadrant (top-left) measured from the original
  // artwork; the other three quadrants are 90° rotations of it.
  // Rectangles are [x, y, w, h]; triangles are flat vertex lists.
  // ------------------------------------------------------------------
  const QUADRANT_CELLS = [
    { id: 40, tri: [146, 259, 146, 360, 45, 360] },
    { id: 41, rect: [148, 256, 53, 105] },
    { id: 42, rect: [203, 256, 52, 105] },
    { id: 43, tri: [258, 260, 258, 360, 357, 360] },
    { id: 44, tri: [262, 257, 361, 257, 361, 357] },
    { id: 45, rect: [256, 203, 105, 52] },
    { id: 46, rect: [256, 148, 105, 52] },
    { id: 47, tri: [360, 46, 360, 145, 261, 145] },
    { id: 48, rect: [364, 42, 50, 104] },
    { id: 49, rect: [416, 42, 50, 104] },
    { id: 50, rect: [469, 42, 50, 104] },
    { id: 51, rect: [521, 42, 50, 104] },
    { id: 52, rect: [573, 42, 50, 104] },
  ];
  // Finish runway of the quadrant: shaft rectangle + arrow head polygon,
  // coloured with the team of the next quadrant (clockwise).
  const QUADRANT_RUNWAY = {
    shaft: [469, 42, 50, 366],
    head: [421, 408, 567, 408, 494, 480],
  };
  const HANGAR = [40, 40, 207, 207];
  // Dashed "fuel station" arrows: [from, to, tip] along the given axis.
  // Text mode: "h" horizontal, "h180" horizontal upside down,
  // "v" upright characters stacked vertically, "v180" the same column
  // rotated 180° (characters upside down, read bottom-up).
  const FUEL_SIDES = [
    {
      team: "yellow",
      axis: "h",
      line: 307,
      arrows: [
        [366, 456, 465],
        [527, 616, 625],
      ],
      texts: [
        { x: 434.5, y: 288.5, mode: "h" },
        { x: 587.5, y: 290.5, mode: "h" },
      ],
    },
    {
      team: "green",
      axis: "v",
      line: 686,
      arrows: [
        [366, 456, 465],
        [527, 616, 625],
      ],
      texts: [
        { x: 703.5, y: 432, mode: "v" },
        { x: 703.5, y: 588.5, mode: "v" },
      ],
    },
    {
      team: "red",
      axis: "h",
      line: 686,
      arrows: [
        [619, 529, 520],
        [458, 367, 358],
      ],
      texts: [
        { x: 547, y: 694.5, mode: "h180" },
        { x: 388.5, y: 694.5, mode: "h180" },
      ],
    },
    {
      team: "blue",
      axis: "v",
      line: 300,
      arrows: [
        [619, 529, 520],
        [458, 367, 358],
      ],
      texts: [
        { x: 281.5, y: 396.5, mode: "v180" },
        { x: 281.5, y: 553, mode: "v180" },
      ],
    },
  ];
  const READY_LABELS = [
    { team: "green", x: 74, y: 275, rotate: 180 },
    { team: "red", x: 700, y: 63, rotate: 180 },
    { team: "yellow", x: 287, y: 923, rotate: 0 },
    { team: "blue", x: 911, y: 712, rotate: 0 },
  ];

  // Rotate a point 90° clockwise about the board centre: (x, y) -> (985-y, x)
  function rotatePoint(point, times) {
    let [x, y] = point;
    for (let i = 0; i < ((times % 4) + 4) % 4; i++) {
      const next = BOARD_SIZE - y;
      y = x;
      x = next;
    }
    return [x, y];
  }

  function rotateRect(rect, times) {
    const [x, y, w, h] = rect;
    const corners = [rotatePoint([x, y], times), rotatePoint([x + w, y + h], times)];
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    return [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    ];
  }

  function rotatePoints(points, times) {
    const rotated = [];
    for (let i = 0; i < points.length; i += 2) {
      rotated.push(...rotatePoint([points[i], points[i + 1]], times));
    }
    return rotated;
  }

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes || {})) {
      element.setAttribute(key, value);
    }
    return element;
  }

  function appendShape(svg, name, attributes) {
    const element = svgElement(name, attributes);
    svg.appendChild(element);
    return element;
  }

  function centerOfRect(rect) {
    return [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
  }

  // Circle inside a triangle sits 29px diagonally inwards from the
  // right-angle corner (the vertex joined to the other two by one
  // horizontal and one vertical edge).
  function triangleCircleCenter(vertices) {
    for (let i = 0; i < 3; i++) {
      const ax = vertices[i * 2];
      const ay = vertices[i * 2 + 1];
      const bx = vertices[((i + 1) % 3) * 2];
      const by = vertices[((i + 1) % 3) * 2 + 1];
      const cx = vertices[((i + 2) % 3) * 2];
      const cy = vertices[((i + 2) % 3) * 2 + 1];
      const bVertical = bx === ax && by !== ay;
      const bHorizontal = by === ay && bx !== ax;
      const cVertical = cx === ax && cy !== ay;
      const cHorizontal = cy === ay && cx !== ax;
      if (bVertical && cHorizontal) {
        return [ax + Math.sign(cx - ax) * 29, ay + Math.sign(by - ay) * 29];
      }
      if (bHorizontal && cVertical) {
        return [ax + Math.sign(bx - ax) * 29, ay + Math.sign(cy - ay) * 29];
      }
    }
    return null;
  }

  function drawHangar(svg, rect, team, pads) {
    appendShape(svg, "rect", {
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
      fill: TEAM_COLORS[team],
    });
    for (const pad of pads) {
      appendShape(svg, "circle", {
        cx: Number.parseInt(pad.left, 10) + 25,
        cy: Number.parseInt(pad.top, 10) + 25,
        r: PAD_RADIUS,
        fill: PAD_COLORS[team],
      });
    }
  }

  function drawRunway(svg, shaft, head, team, finishCoords) {
    appendShape(svg, "rect", {
      x: shaft[0],
      y: shaft[1],
      width: shaft[2],
      height: shaft[3],
      fill: TEAM_COLORS[team],
    });
    appendShape(svg, "polygon", { points: head.join(" "), fill: TEAM_COLORS[team] });
    for (const coord of finishCoords) {
      appendShape(svg, "circle", {
        cx: Number.parseInt(coord.left, 10) + 25,
        cy: Number.parseInt(coord.top, 10) + 25,
        r: CIRCLE_RADIUS,
        fill: BOARD_COLOR,
      });
    }
  }

  function drawCell(svg, shape, color) {
    const label = CELL_LABELS[shape.id];
    const group = svgElement("g", {
      class: `board-cell board-cell-${color}`,
      "data-coord-id": shape.id,
    });
    let center;
    if (shape.rect) {
      const [x, y, w, h] = shape.rect;
      appendShape(group, "rect", { x, y, width: w, height: h, fill: TEAM_COLORS[color] });
      center = centerOfRect(shape.rect);
    } else {
      appendShape(group, "polygon", { points: shape.tri.join(" "), fill: TEAM_COLORS[color] });
      center = triangleCircleCenter(shape.tri);
    }
    if (center) {
      appendShape(group, "circle", {
        cx: center[0],
        cy: center[1],
        r: CIRCLE_RADIUS,
        fill: BOARD_COLOR,
      });
    }
    if (label && center) {
      const text = appendShape(group, "text", {
        x: center[0],
        y: center[1],
        dy: "0.35em",
        "text-anchor": "middle",
        fill: TEAM_COLORS[color],
        "font-family": FONT_FAMILY,
        "font-size": "30",
        "font-weight": "700",
      });
      text.textContent = label;
    }
    svg.appendChild(group);
  }

  function drawFuelText(svg, color, text) {
    if (text.mode === "v" || text.mode === "v180") {
      const chars = [..."加油站"];
      chars.forEach((char, i) => {
        const y = text.y - 14.5 + i * 14.5;
        const element = appendShape(svg, "text", {
          x: text.x,
          y,
          dy: "0.35em",
          "text-anchor": "middle",
          fill: color,
          "font-family": FONT_FAMILY,
          "font-size": "14",
          "font-weight": "700",
          transform: text.mode === "v180" ? `rotate(180 ${text.x} ${text.y})` : undefined,
        });
        element.textContent = char;
      });
      return;
    }
    const element = appendShape(svg, "text", {
      x: text.x,
      y: text.y,
      dy: "0.35em",
      "text-anchor": "middle",
      fill: color,
      "font-family": FONT_FAMILY,
      "font-size": "14",
      "font-weight": "700",
      transform: text.mode === "h180" ? `rotate(180 ${text.x} ${text.y})` : undefined,
    });
    element.textContent = "加油站";
  }

  function drawFuelSide(svg, side) {
    const color = FUEL_COLORS[side.team];
    for (const [from, to, tip] of side.arrows) {
      const dash = { stroke: color, "stroke-width": "3", "stroke-dasharray": "14.5 13.5" };
      if (side.axis === "h") {
        appendShape(svg, "line", { x1: from, y1: side.line, x2: to, y2: side.line, ...dash });
        appendShape(svg, "polygon", {
          points: `${to},${side.line - 4.5} ${to},${side.line + 4.5} ${tip},${side.line}`,
          fill: color,
        });
      } else {
        appendShape(svg, "line", { x1: side.line, y1: from, x2: side.line, y2: to, ...dash });
        appendShape(svg, "polygon", {
          points: `${side.line - 4.5},${to} ${side.line + 4.5},${to} ${side.line},${tip}`,
          fill: color,
        });
      }
    }
    for (const text of side.texts) drawFuelText(svg, color, text);
  }

  function drawReadyLabel(svg, label) {
    const text = appendShape(svg, "text", {
      x: label.x,
      y: label.y,
      dy: "0.35em",
      "text-anchor": "middle",
      fill: TEAM_COLORS[label.team],
      "font-family": FONT_FAMILY,
      "font-size": "20",
      "font-weight": "700",
      "font-style": "italic",
      transform: label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined,
    });
    text.textContent = "ready";
  }

  function render(container, coords, initialCoords) {
    if (!container) return;
    const oldBoard = container.querySelector(".flying-board");
    if (oldBoard) oldBoard.remove();

    const svg = svgElement("svg", {
      class: "flying-board",
      viewBox: `0 0 ${BOARD_SIZE} ${BOARD_SIZE}`,
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      "aria-hidden": "true",
      focusable: "false",
    });

    appendShape(svg, "rect", { width: BOARD_SIZE, height: BOARD_SIZE, fill: BOARD_COLOR });

    const coordsById = new Map(coords.map((coord) => [coord.id, coord]));
    const finishCoordsByQuadrant = [[], [], [], []];
    for (const coord of coords) {
      if (coord.id > 52) {
        finishCoordsByQuadrant[Math.floor(coord.id / 10) - 6].push(coord);
      }
    }

    // Hangars with their four parking pads
    for (let q = 0; q < 4; q++) {
      const team = QUADRANT_TEAMS[q];
      drawHangar(svg, rotateRect(HANGAR, q), team, initialCoords[team] || []);
    }

    // Finish runways (shaft + arrow head + finish circles); the runway of
    // quadrant q points at the centre and belongs to the next team clockwise
    for (let q = 0; q < 4; q++) {
      const team = QUADRANT_TEAMS[(q + 1) % 4];
      drawRunway(
        svg,
        rotateRect(QUADRANT_RUNWAY.shaft, q),
        rotatePoints(QUADRANT_RUNWAY.head, q),
        team,
        finishCoordsByQuadrant[q]
      );
    }

    // 52 track cells: one quadrant of shapes rotated four ways
    for (let q = 0; q < 4; q++) {
      for (const cell of QUADRANT_CELLS) {
        const id = ((cell.id + q * 13 - 1) % 52) + 1;
        const coord = coordsById.get(id);
        if (!coord) continue;
        const shape = { id };
        if (cell.rect) shape.rect = rotateRect(cell.rect, q);
        if (cell.tri) shape.tri = rotatePoints(cell.tri, q);
        drawCell(svg, shape, coord.color);
      }
    }

    for (const side of FUEL_SIDES) drawFuelSide(svg, side);
    for (const label of READY_LABELS) drawReadyLabel(svg, label);

    container.prepend(svg);
  }

  globalThis.FlyingChessBoard = { render };
})();
