// Pure game logic for Flying Chess (no DOM dependency)

const COLORS = ["red", "blue", "yellow", "green"];
const COLOR_NAMES = { red: "红", blue: "蓝", yellow: "黄", green: "绿" };
const TYPE_NAMES = { normal: "玩家", computer: "电脑", close: "无" };
const WIN_COUNT = 4;

// Coordinate JSON - 52 main path cells + 4 finish channels (6 cells each), clockwise from red exit
const COORD = [
  { id: 1, top: "90", left: "630", color: "green" },
  { id: 2, top: "149", left: "653", color: "red" },
  { id: 3, top: "204", left: "653", color: "blue" },
  { id: 4, top: "263", left: "630", color: "yellow" },
  { id: 5, top: "306", left: "675", color: "green", super: "17" },
  { id: 6, top: "285", left: "733", color: "red" },
  { id: 7, top: "285", left: "787", color: "blue" },
  { id: 8, top: "305", left: "846", color: "yellow" },
  { id: 9, top: "364", left: "866", color: "green" },
  { id: 10, top: "415", left: "866", color: "red" },
  { id: 11, top: "468", left: "866", color: "blue", r: "yes" },
  { id: 12, top: "521", left: "866", color: "yellow" },
  { id: 13, top: "573", left: "866", color: "green" },
  { id: 14, top: "630", left: "845", color: "red" },
  { id: 15, top: "652", left: "788", color: "blue" },
  { id: 16, top: "652", left: "732", color: "yellow" },
  { id: 17, top: "633", left: "674", color: "green" },
  { id: 18, top: "674", left: "631", color: "red", super: "30" },
  { id: 19, top: "733", left: "653", color: "blue" },
  { id: 20, top: "787", left: "653", color: "yellow" },
  { id: 21, top: "844", left: "631", color: "green" },
  { id: 22, top: "868", left: "574", color: "red" },
  { id: 23, top: "868", left: "521", color: "blue" },
  { id: 24, top: "868", left: "468", color: "yellow", r: "yes" },
  { id: 25, top: "868", left: "416", color: "green" },
  { id: 26, top: "868", left: "364", color: "red" },
  { id: 27, top: "845", left: "307", color: "blue" },
  { id: 28, top: "787", left: "284", color: "yellow" },
  { id: 29, top: "732", left: "284", color: "green" },
  { id: 30, top: "675", left: "308", color: "red" },
  { id: 31, top: "631", left: "262", color: "blue", super: "43" },
  { id: 32, top: "652", left: "203", color: "yellow" },
  { id: 33, top: "652", left: "149", color: "green" },
  { id: 34, top: "629", left: "90", color: "red" },
  { id: 35, top: "573", left: "69", color: "blue" },
  { id: 36, top: "521", left: "69", color: "yellow" },
  { id: 37, top: "468", left: "69", color: "green", r: "yes" },
  { id: 38, top: "415", left: "69", color: "red" },
  { id: 39, top: "363", left: "69", color: "blue" },
  { id: 40, top: "306", left: "92", color: "yellow" },
  { id: 41, top: "285", left: "149", color: "green" },
  { id: 42, top: "285", left: "204", color: "red" },
  { id: 43, top: "305", left: "263", color: "blue" },
  { id: 44, top: "262", left: "306", color: "yellow", super: "4" },
  { id: 45, top: "204", left: "284", color: "green" },
  { id: 46, top: "149", left: "284", color: "red" },
  { id: 47, top: "92", left: "307", color: "blue" },
  { id: 48, top: "70", left: "364", color: "yellow" },
  { id: 49, top: "70", left: "416", color: "green" },
  { id: 50, top: "70", left: "469", color: "red", r: "yes" },
  { id: 51, top: "70", left: "521", color: "blue" },
  { id: 52, top: "70", left: "573", color: "yellow" },
  // Finish channels
  { id: 61, top: "154", left: "469" },
  { id: 62, top: "205", left: "469" },
  { id: 63, top: "258", left: "469" },
  { id: 64, top: "309", left: "469" },
  { id: 65, top: "361", left: "469" },
  { id: 66, top: "413", left: "469", state: "win" },
  { id: 71, top: "468", left: "783" },
  { id: 72, top: "468", left: "731" },
  { id: 73, top: "468", left: "679" },
  { id: 74, top: "468", left: "627" },
  { id: 75, top: "468", left: "575" },
  { id: 76, top: "468", left: "523", state: "win" },
  { id: 81, top: "783", left: "468" },
  { id: 82, top: "731", left: "468" },
  { id: 83, top: "679", left: "468" },
  { id: 84, top: "627", left: "468" },
  { id: 85, top: "575", left: "468" },
  { id: 86, top: "522", left: "468", state: "win" },
  { id: 91, top: "468", left: "154" },
  { id: 92, top: "468", left: "206" },
  { id: 93, top: "468", left: "258" },
  { id: 94, top: "468", left: "310" },
  { id: 95, top: "468", left: "362" },
  { id: 96, top: "468", left: "412", state: "win" },
];

// Starting positions for each color's planes in the hangar
const initRedCoord = [
  { id: 1, top: "73", left: "770" },
  { id: 2, top: "73", left: "865" },
  { id: 3, top: "165", left: "770" },
  { id: 4, top: "165", left: "865" },
];

const initBlueCoord = [
  { id: 1, top: "771", left: "770" },
  { id: 2, top: "771", left: "865" },
  { id: 3, top: "863", left: "770" },
  { id: 4, top: "863", left: "865" },
];

const initYellowCoord = [
  { id: 1, top: "771", left: "71" },
  { id: 2, top: "771", left: "166" },
  { id: 3, top: "863", left: "71" },
  { id: 4, top: "863", left: "166" },
];

const initGreenCoord = [
  { id: 1, top: "73", left: "71" },
  { id: 2, top: "73", left: "166" },
  { id: 3, top: "165", left: "71" },
  { id: 4, top: "165", left: "166" },
];

const INIT_COORDS = {
  red: initRedCoord,
  blue: initBlueCoord,
  yellow: initYellowCoord,
  green: initGreenCoord,
};

// Starting coordId for each color when leaving the hangar
const START_COORD = { red: 0, blue: 13, yellow: 26, green: 39 };

// Finish channel ranges per color
const FINISH_CHANNEL = {
  red: { min: 61, max: 66 },
  blue: { min: 71, max: 76 },
  yellow: { min: 81, max: 86 },
  green: { min: 91, max: 96 },
};

/**
 * Query coordinate data by coordId
 * @param coordId
 * @returns {object|null} coord data or null if coordId is falsy
 */
function selectCoordValue(coordId) {
  const coord = {
    id: coordId,
    top: 0,
    left: 0,
    coordColor: "",
    superCoord: null,
    r: null,
    state: null,
  };
  if (!coordId) {
    return null;
  }
  for (let j = 0; j < COORD.length; j++) {
    if (COORD[j].id == coordId) {
      coord.top = COORD[j].top + "px";
      coord.left = COORD[j].left + "px";
      coord.coordColor = COORD[j].color;
      coord.superCoord = COORD[j].super;
      coord.r = COORD[j].r;
      coord.state = COORD[j].state;
    }
  }
  return coord;
}

/**
 * Create default user list
 * @returns {Array} array of user objects with color and state
 */
function createDefaultUserList() {
  return COLORS.map((color) => ({ color: color, state: color === "red" ? "normal" : "computer" }));
}

/**
 * Get user state by color
 * @param color
 * @param userList
 * @returns {string|undefined}
 */
function userState(color, userList) {
  for (let i = 0; i < userList.length; i++) {
    if (color === userList[i].color) {
      return userList[i].state;
    }
  }
  return undefined;
}

/**
 * Get next user color in turn order
 * @param currentColor
 * @returns {string}
 */
function getNextColor(currentColor) {
  const idx = COLORS.indexOf(currentColor);
  if (idx === -1) return COLORS[0];
  return COLORS[(idx + 1) % COLORS.length];
}

/**
 * Check if a color has a 'r' (skip/relay) marker at given coordId
 * @param coordId
 * @returns {boolean}
 */
function hasRelayMarker(coordId) {
  for (let i = 0; i < COORD.length; i++) {
    if (COORD[i].id == coordId) {
      return COORD[i].r === "yes";
    }
  }
  return false;
}

/**
 * Get the super (fly-across) target coordId for a given coordId
 * @param coordId
 * @returns {string|null}
 */
function getSuperTarget(coordId) {
  for (let i = 0; i < COORD.length; i++) {
    if (COORD[i].id == coordId) {
      return COORD[i].super || null;
    }
  }
  return null;
}

/**
 * Count consecutive sixes and check if all planes should be sent back
 * @param diceNum current dice value
 * @param sixTime current consecutive six count (will be mutated)
 * @returns {boolean} true if three consecutive sixes were rolled
 */
function countSixTime(diceNum, sixTime) {
  if (diceNum === 6) {
    sixTime.count++;
  }
  return sixTime.count === 3;
}

/**
 * Calculate the destination coordId for a plane entering the finish channel
 * @param currentCoordId current position on the main path
 * @param steps how many steps to move
 * @param color player color
 * @returns {object} { coordId, backStep } - backStep indicates bounce-back from end
 */
function calcFinishChannelEntry(currentCoordId, steps, color) {
  const finish = FINISH_CHANNEL[color];
  const stepCount = 0;
  // find current step count from coordId
  for (let i = 0; i < COORD.length; i++) {
    if (COORD[i].id == currentCoordId) {
      // derive step from position
      break;
    }
  }
  // The coordId in finish channel = base + step offset
  // red: 60 + offset, blue: 70 + offset, yellow: 80 + offset, green: 90 + offset
  const base = { red: 60, blue: 70, yellow: 80, green: 90 }[color];
  let targetId = base + steps;
  if (targetId > finish.max) {
    // bounce back
    const overshoot = targetId - finish.max;
    targetId = finish.max - overshoot;
    return { coordId: targetId, backStep: true };
  }
  return { coordId: targetId, backStep: false };
}

/**
 * Check if a coordId is in a finish channel
 * @param coordId
 * @returns {boolean}
 */
function isInFinishChannel(coordId) {
  return (
    (coordId >= 61 && coordId <= 66) ||
    (coordId >= 71 && coordId <= 76) ||
    (coordId >= 81 && coordId <= 86) ||
    (coordId >= 91 && coordId <= 96)
  );
}

/**
 * Check if a coordId is a win (finish) cell
 * @param coordId
 * @returns {boolean}
 */
function isWinCell(coordId) {
  const coord = selectCoordValue(coordId);
  return coord && coord.state === "win";
}

/**
 * Check victory: all 4 planes of a color are in win state
 * @param planes array of { type, state }
 * @param color
 * @returns {boolean}
 */
function checkVictory(planes, color) {
  let winCount = 0;
  for (let i = 0; i < planes.length; i++) {
    if (planes[i].type === color && planes[i].state === "win") {
      winCount++;
    }
  }
  return winCount === WIN_COUNT;
}

/**
 * Get initial hangar coordinates for a color
 * @param color
 * @param planeNum plane number (1-4)
 * @returns {object|null} { top, left }
 */
function getInitCoord(color, planeNum) {
  const coords = INIT_COORDS[color];
  if (!coords) return null;
  for (let i = 0; i < coords.length; i++) {
    if (coords[i].id === planeNum) {
      return { top: coords[i].top, left: coords[i].left };
    }
  }
  return null;
}

/**
 * Get a random integer from 0 to length-1
 * @param length
 * @returns {number}
 */
function obtainRandomNum(length) {
  if (length <= 0) return 0;
  return Math.floor(Math.random() * length);
}

// Export for Node.js test environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COLORS,
    COLOR_NAMES,
    TYPE_NAMES,
    WIN_COUNT,
    COORD,
    INIT_COORDS,
    START_COORD,
    FINISH_CHANNEL,
    initRedCoord,
    initBlueCoord,
    initYellowCoord,
    initGreenCoord,
    selectCoordValue,
    createDefaultUserList,
    userState,
    getNextColor,
    hasRelayMarker,
    getSuperTarget,
    countSixTime,
    calcFinishChannelEntry,
    isInFinishChannel,
    isWinCell,
    checkVictory,
    getInitCoord,
    obtainRandomNum,
  };
}
