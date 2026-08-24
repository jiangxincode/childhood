(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const BOARD_SIZE = 985;
  const CELL_SIZE = 50;
  const BOARD_COLOR = "#fffccb";
  const TEAM_COLORS = {
    red: "#dc1c4b",
    blue: "#69bce2",
    yellow: "#ed780b",
    green: "#7bc31c",
  };
  const PAD_COLORS = {
    red: "#ee9bbb",
    blue: "#b9dff2",
    yellow: "#fff000",
    green: "#c5e66b",
  };
  const FINISH_COLORS = { 6: "red", 7: "blue", 8: "yellow", 9: "green" };
  const CELL_LABELS = {
    1: "N",
    3: "P",
    4: "O",
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
    50: "M",
  };

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes || {})) {
      element.setAttribute(key, value);
    }
    return element;
  }

  function centerOf(coord) {
    return {
      x: Number.parseInt(coord.left, 10) + CELL_SIZE / 2,
      y: Number.parseInt(coord.top, 10) + CELL_SIZE / 2,
    };
  }

  function addDefinitions(svg) {
    const defs = svgElement("defs");
    for (const [team, color] of Object.entries(TEAM_COLORS)) {
      const marker = svgElement("marker", {
        id: `flying-arrow-${team}`,
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "6",
        markerHeight: "6",
        orient: "auto",
      });
      marker.appendChild(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: color }));
      defs.appendChild(marker);
    }
    svg.appendChild(defs);
  }

  function drawHangars(svg) {
    const hangars = {
      green: { x: 39, y: 39 },
      red: { x: 738, y: 39 },
      yellow: { x: 39, y: 738 },
      blue: { x: 738, y: 738 },
    };
    for (const [team, position] of Object.entries(hangars)) {
      svg.appendChild(
        svgElement("rect", {
          x: position.x,
          y: position.y,
          width: "208",
          height: "208",
          fill: TEAM_COLORS[team],
        })
      );
    }

    const labels = [
      { team: "green", x: 45, y: 281 },
      { team: "red", x: 675, y: 70 },
      { team: "yellow", x: 259, y: 930 },
      { team: "blue", x: 884, y: 719 },
    ];
    for (const labelData of labels) {
      const label = svgElement("text", {
        x: labelData.x,
        y: labelData.y,
        fill: TEAM_COLORS[labelData.team],
        "font-size": "19",
        "font-weight": "700",
      });
      label.textContent = "ready";
      svg.appendChild(label);
    }
  }

  function drawHangarPads(svg, initialCoords) {
    for (const [team, coords] of Object.entries(initialCoords)) {
      for (const coord of coords) {
        const center = centerOf(coord);
        svg.appendChild(
          svgElement("circle", {
            cx: center.x,
            cy: center.y,
            r: "36",
            fill: PAD_COLORS[team],
          })
        );
      }
    }
  }

  function drawCenter(svg) {
    const triangles = [
      { team: "red", points: "413,405 573,405 493,485" },
      { team: "blue", points: "581,413 581,573 501,493" },
      { team: "yellow", points: "413,581 573,581 493,501" },
      { team: "green", points: "405,413 405,573 485,493" },
    ];
    for (const triangle of triangles) {
      svg.appendChild(
        svgElement("polygon", {
          points: triangle.points,
          fill: TEAM_COLORS[triangle.team],
          stroke: BOARD_COLOR,
          "stroke-width": "5",
        })
      );
    }
  }

  function drawFuelStations(svg) {
    const routes = [
      { team: "yellow", x1: 366, y1: 307, x2: 458, y2: 307 },
      { team: "yellow", x1: 527, y1: 307, x2: 619, y2: 307 },
      { team: "green", x1: 686, y1: 366, x2: 686, y2: 458 },
      { team: "green", x1: 686, y1: 527, x2: 686, y2: 619 },
      { team: "red", x1: 619, y1: 686, x2: 527, y2: 686 },
      { team: "red", x1: 458, y1: 686, x2: 366, y2: 686 },
      { team: "blue", x1: 300, y1: 619, x2: 300, y2: 527 },
      { team: "blue", x1: 300, y1: 458, x2: 300, y2: 366 },
    ];
    for (const route of routes) {
      svg.appendChild(
        svgElement("line", {
          x1: route.x1,
          y1: route.y1,
          x2: route.x2,
          y2: route.y2,
          stroke: TEAM_COLORS[route.team],
          "stroke-width": "2",
          "stroke-dasharray": "12 9",
          "marker-end": `url(#flying-arrow-${route.team})`,
        })
      );
    }

    const labels = [
      { team: "yellow", x: 412, y: 294, transform: "" },
      { team: "green", x: 700, y: 415, transform: "rotate(90 700 415)" },
      { team: "red", x: 573, y: 705, transform: "" },
      { team: "blue", x: 286, y: 573, transform: "rotate(-90 286 573)" },
    ];
    for (const labelData of labels) {
      const label = svgElement("text", {
        x: labelData.x,
        y: labelData.y,
        fill: TEAM_COLORS[labelData.team],
        "font-size": "14",
        "font-weight": "700",
        transform: labelData.transform,
      });
      label.textContent = "加油站";
      svg.appendChild(label);
    }
  }

  function drawCell(svg, coord) {
    const center = centerOf(coord);
    const finishTeam = coord.id > 52 ? FINISH_COLORS[Math.floor(coord.id / 10)] : null;
    const team = coord.color || finishTeam;
    const group = svgElement("g", {
      class: `board-cell board-cell-${team}`,
      "data-coord-id": coord.id,
    });
    group.appendChild(
      svgElement("rect", {
        x: Number.parseInt(coord.left, 10),
        y: Number.parseInt(coord.top, 10),
        width: CELL_SIZE,
        height: CELL_SIZE,
        fill: TEAM_COLORS[team],
      })
    );
    group.appendChild(
      svgElement("circle", {
        cx: center.x,
        cy: center.y,
        r: "19",
        fill: BOARD_COLOR,
      })
    );

    const cellLabel = CELL_LABELS[coord.id];
    if (cellLabel) {
      const label = svgElement("text", {
        x: center.x,
        y: center.y + 9,
        "text-anchor": "middle",
        fill: TEAM_COLORS[team],
        "font-size": "29",
        "font-weight": "700",
      });
      label.textContent = cellLabel;
      group.appendChild(label);
    }
    svg.appendChild(group);
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
    addDefinitions(svg);
    svg.appendChild(
      svgElement("rect", { width: BOARD_SIZE, height: BOARD_SIZE, fill: BOARD_COLOR })
    );
    drawHangars(svg);
    drawHangarPads(svg, initialCoords);
    drawFuelStations(svg);
    drawCenter(svg);
    for (const coord of coords) drawCell(svg, coord);
    container.prepend(svg);
  }

  globalThis.FlyingChessBoard = { render };
})();
