/* eslint-disable no-undef */
// =============================================
// Pure game logic for Flying Chess (no DOM dependency)
// =============================================

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
  const base = { red: 60, blue: 70, yellow: 80, green: 90 }[color];
  let targetId = base + steps;
  if (targetId > finish.max) {
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
  return coord?.state === "win";
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

// =============================================
// Browser UI code (requires DOM + jQuery)
// Wrapped in guard to prevent execution in Node.js test environment
// =============================================

if (typeof $j !== "undefined") {
  // Game state variables (global scope, same as original separate <script> tags)
  let DICE;
  let nextDiceValue = 0;
  let diceNum = 1;
  let sixTime = 0;
  let nextStep = false;

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localColor = null; // color assigned to local player
  let remoteColor = null; // color assigned to remote player

  // ---- Audio ----
  const DICEMUSICURL = "audio/dice.ogg";
  const ROLLEDSIXMUSICRUL = "audio/rolled_6.ogg";
  const ROLLEDTHREETIMESIXMUSICURL = "audio/rolled_3_6s.ogg";
  const OUTMUSICURL = "audio/plane_up.ogg";
  const STEPMUSICURL = "audio/move_short3.ogg";
  const JUMPMUSICURL = "audio/jump4.ogg";
  const FLYACROSSMUSICURL = "audio/fly_across.ogg";
  const ATTACTMUSICURL = "audio/plane_fall.ogg";
  const LITWINMUSICURL = "audio/win_fly_back_home.ogg";
  const WINMUSICURL = "audio/win_cheer.ogg";
  const FAILMUSICURL = "";

  const PlaneAudio = function () {
    function playMusic(musicSrc) {
      if (planeOption.gameMusic) {
        $j("#yinxiao").attr("src", musicSrc);
        $j("#yinxiao")[0].play();
      }
    }

    this.playDiceMusic = function () {
      playMusic(DICEMUSICURL);
    };

    this.playRolledSixMusic = function () {
      playMusic(ROLLEDSIXMUSICRUL);
    };

    this.playRolledThreeTimeSixMusic = function () {
      playMusic(ROLLEDTHREETIMESIXMUSICURL);
    };

    this.playOutMusic = function () {
      playMusic(OUTMUSICURL);
    };

    this.playStepMusic = function () {
      playMusic(STEPMUSICURL);
    };

    this.playJumpMusic = function () {
      playMusic(JUMPMUSICURL);
    };

    this.playFlyAcrossMusic = function () {
      playMusic(FLYACROSSMUSICURL);
    };

    this.playAttackMusic = function () {
      playMusic(ATTACTMUSICURL);
    };

    this.playLitWinMusic = function () {
      playMusic(LITWINMUSICURL);
    };

    this.playWinMusic = function () {
      playMusic(WINMUSICURL);
    };

    this.playFailMusic = function () {
      playMusic(FAILMUSICURL);
    };
  };
  const planeAudio = new PlaneAudio();

  // ---- Option ----
  const PlaneOption = function () {
    const PLANEUSER = function (color, state) {
      this.color = color;
      this.state = state;
    };
    this.userList = [
      new PLANEUSER("red", "normal"),
      new PLANEUSER("blue", "computer"),
      new PLANEUSER("yellow", "computer"),
      new PLANEUSER("green", "computer"),
    ];
    this.difficulty = "normal";
    this.currentUser = "red";
    this.backgroundMusic = true;
    this.gameMusic = true;

    this.setDifficulty = function () {
      this.difficulty = $j("#nandu").val();
    };

    this.setUserList = function () {
      this.userList[0].state = $j("#redUser").val();
      this.userList[1].state = $j("#blueUser").val();
      this.userList[2].state = $j("#yellowUser").val();
      this.userList[3].state = $j("#greenUser").val();
    };

    this.begin = function () {
      this.setUserList();
      this.setDifficulty();
      const qifeiVal = $j("#qifei").val();
      $j("#rule-takeoff").text("掷到" + qifeiVal + "飞机才能起飞");
      createPlane(planeOption.userList);
      $j("#sdn" + planeOption.currentUser).text("请投骰");
      $j(".option-panel").addClass("hidden");
      $j("#game-main").css("display", "flex");
      $j("#rules-panel").show();
      const hasComputer = planeOption.userList.some((u) => u.state === "computer");
      $j("#rule-pve").css("display", hasComputer ? "block" : "none");
    };
  };
  const planeOption = new PlaneOption();

  // ---- Rule ----
  const Rule = function () {
    this.victory = function () {
      let winNum = 0,
        winFlag = false;
      $j(".plane").each(function () {
        if ($j(this).attr("type") == planeOption.currentUser && $j(this).attr("state") == "win") {
          winNum++;
        }
      });
      if (winNum == 4) {
        winFlag = true;
      }
      return winFlag;
    };

    this.planeBack = function (type, color, obj) {
      let top, left;
      let i;
      switch (color) {
        case "red":
          for (i = 0; i < initRedCoord.length; i++) {
            if (initRedCoord[i].id == $j(obj).attr("num")) {
              top = initRedCoord[i].top;
              left = initRedCoord[i].left;
            }
          }
          break;
        case "blue":
          for (i = 0; i < initBlueCoord.length; i++) {
            if (initBlueCoord[i].id == $j(obj).attr("num")) {
              top = initBlueCoord[i].top;
              left = initBlueCoord[i].left;
            }
          }
          break;
        case "yellow":
          for (i = 0; i < initYellowCoord.length; i++) {
            if (initYellowCoord[i].id == $j(obj).attr("num")) {
              top = initYellowCoord[i].top;
              left = initYellowCoord[i].left;
            }
          }
          break;
        case "green":
          for (i = 0; i < initGreenCoord.length; i++) {
            if (initGreenCoord[i].id == $j(obj).attr("num")) {
              top = initGreenCoord[i].top;
              left = initGreenCoord[i].left;
            }
          }
          break;
      }
      if (type == "attack") {
        $j(obj).animate({ top: top, left: left }).attr({ coordId: 0, step: 0, state: "unready" });
      } else {
        $j(obj)
          .animate({ top: top, left: left }, () => {})
          .attr({ state: "win" })
          .html("win");
      }
    };

    function backCurrentUserAllPlane() {
      $j(".plane").each(function () {
        if (planeOption.currentUser == $j(this).attr("type")) {
          rule.planeBack("attack", planeOption.currentUser, $j(this));
        }
      });
    }

    this.countSixTime = function () {
      if (diceNum == 6) {
        sixTime++;
      }
      if (sixTime == 3) {
        planeAudio.playRolledThreeTimeSixMusic();
        backCurrentUserAllPlane();
        return true;
      } else {
        return false;
      }
    };

    this.attactPlane = function (coordValue, obj, superFlag) {
      let stopFlag = false;
      $j(".plane").each(function () {
        if (
          coordValue.id == $j(this).attr("coordId") &&
          $j(obj).attr("type") != $j(this).attr("type") &&
          $j(this).attr("state") == "running"
        ) {
          rule.planeBack("attack", $j(this).attr("type"), $j(this));
          planeAudio.playAttackMusic();
          stopFlag = true;
        }
        if (superFlag) {
          switch (planeOption.currentUser) {
            case "red":
              if (83 == Number.parseInt($j(this).attr("coordId"))) {
                rule.planeBack("attack", $j(this).attr("type"), $j(this));
                stopFlag = true;
              }
              break;
            case "blue":
              if (93 == Number.parseInt($j(this).attr("coordId"))) {
                rule.planeBack("attack", $j(this).attr("type"), $j(this));
                stopFlag = true;
              }
              break;
            case "yellow":
              if (63 == Number.parseInt($j(this).attr("coordId"))) {
                rule.planeBack("attack", $j(this).attr("type"), $j(this));
                stopFlag = true;
              }
              break;
            case "green":
              if (73 == Number.parseInt($j(this).attr("coordId"))) {
                rule.planeBack("attack", $j(this).attr("type"), $j(this));
                stopFlag = true;
              }
              break;
          }
        }
      });
      return stopFlag;
    };
  };
  const rule = new Rule();

  // ---- Computer ----
  const Computer = function () {
    this.performing = function () {
      setTimeout(() => {
        const planeList = new Array();
        $j(".plane").each(function () {
          if (planeOption.currentUser == $j(this).attr("type") && $j(this).hasClass("pointer")) {
            planeList.push($j(this));
          }
        });
        if (planeList?.length > 0) {
          const randomNum = obtainRandomNum(planeList.length);
          $j(planeList[randomNum]).trigger("click");
          if (diceNum == 6) {
            diceClick();
          }
        }
      }, 1500);
    };

    function diceClick() {
      const nextSt = setTimeout(() => {
        if (nextStep) {
          $j("#dice").trigger("click");
          clearTimeout(nextSt);
          return;
        } else {
          diceClick();
        }
      }, 500);
    }

    function obtainRandomNum(leng) {
      const num = Math.floor(Math.random() * 10);
      switch (leng) {
        case 1:
          return 0;
        case 2:
          if (num == 0 || num == 1) {
            return num;
          } else {
            return obtainRandomNum(leng);
          }
        case 3:
          if (num == 0 || num == 1 || num == 2) {
            return num;
          } else {
            return obtainRandomNum(leng);
          }
        case 4:
          if (num == 0 || num == 1 || num == 2 || num == 3) {
            return num;
          } else {
            return obtainRandomNum(leng);
          }
      }
    }
  };
  const computer = new Computer();

  // ---- Main controller functions ----

  /**
   * Create planes
   * @param type   red/blue/yellow/green
   */
  function createPlane(type) {
    if (type?.length > 0) {
      for (let i = 0; i < type.length; i++) {
        if (type[i].state != "close") {
          switch (type[i].color) {
            case "red":
              addPlaneDiv(type[i].color, 73, 770);
              break;
            case "blue":
              addPlaneDiv(type[i].color, 771, 770);
              break;
            case "yellow":
              addPlaneDiv(type[i].color, 771, 71);
              break;
            case "green":
              addPlaneDiv(type[i].color, 73, 71);
              break;
          }
        }
      }
    }
  }

  /**
   * Add plane div element
   * @param type
   * @param top
   * @param left
   */
  function addPlaneDiv(type, top, left) {
    for (let i = 0; i < 4; i++) {
      const plane = document.createElement("div");
      plane.className = "plane";
      switch (i) {
        case 1:
          left += 95;
          break;
        case 2:
          top += 92;
          left -= 95;
          break;
        case 3:
          left += 95;
          break;
      }
      let imgUrl = "";
      switch (type) {
        case "red":
          imgUrl = 'url("images/plane_red_b.png")';
          break;
        case "blue":
          imgUrl = 'url("images/plane_blue_b.png")';
          break;
        case "yellow":
          imgUrl = 'url("images/plane_yellow_b.png")';
          break;
        case "green":
          imgUrl = 'url("images/plane_green_b.png")';
          break;
      }
      $j(plane)
        .attr({ type: type, num: i + 1, state: "unready" })
        .css({
          top: top + "px",
          left: left + "px",
          "background-image": imgUrl,
          "background-size": "cover",
        });
      $j(".main").append(plane);
    }
  }

  /**
   * Dice roll completion event
   * @param $el
   * @param active
   */
  function onComplete($el, active) {
    diceNum = active.index + 1;
    if (rule.countSixTime()) {
      return;
    }
    $j("#sdn" + planeOption.currentUser).text(diceNum);
    addPlaneEvent(userStateBrowser(planeOption.currentUser));
  }

  /**
   * Add click events to current user's planes after dice roll
   * @param state current user state
   */
  function addPlaneEvent(state) {
    let flag = false;
    $j(".plane").each(function () {
      const currentUserPlane =
        $j(this).attr("type") == planeOption.currentUser ? $j(this) : undefined;
      if (currentUserPlane) {
        if (diceNum == 6) {
          planeAudio.playRolledSixMusic();
          if ($j(this).attr("state") != "win") {
            currentUserPlane
              .on("click", function () {
                movePlane(this);
              })
              .addClass("pointer");
            flag = true;
          }
        } else {
          if ($j(this).attr("state") == "ready" || $j(this).attr("state") == "running") {
            currentUserPlane
              .on("click", function () {
                movePlane(this);
              })
              .addClass("pointer");
            flag = true;
          }
        }
      }
    });
    if (!flag) {
      setTimeout(nextUser, 1000);
    } else if (state == "computer") {
      computer.performing();
    }
  }

  /**
   * Plane click movement event
   * @param obj
   */
  function movePlane(obj) {
    let coordId = 0,
      step = 0;
    // Guard: block plane move for remote player in online mode
    if (planeOption.gameOnline && planeOption.currentUser === remoteColor) return;
    // Send plane selection to remote
    if (planeOption.gameOnline && networkProtocol) {
      networkProtocol.sendAction({ a: "select", pn: Number.parseInt($j(obj).attr("num")) });
    }
    $j(obj)
      .siblings("[type=" + planeOption.currentUser + "]")
      .off("click")
      .removeClass("pointer");
    if ($j(obj).attr("state") == "unready") {
      let unTop, unLeft;
      switch (planeOption.currentUser) {
        case "red":
          unTop = "45px";
          unLeft = "678px";
          break;
        case "blue":
          unTop = "678px";
          unLeft = "896px";
          coordId = 13;
          break;
        case "yellow":
          unTop = "892px";
          unLeft = "258px";
          coordId = 26;
          break;
        case "green":
          unTop = "259px";
          unLeft = "45px";
          coordId = 39;
          break;
      }
      planeAudio.playOutMusic();
      $j(obj).animate({ top: unTop, left: unLeft }, 1500, () => {
        $j(obj)
          .attr({ state: "ready", coordId: coordId, step: step })
          .off("click")
          .removeClass("pointer");
        if (diceNum != 6) {
          nextUser();
        } else {
          addDiceEvent();
          nextStep = true;
        }
      });
    } else {
      $j(obj).attr({ state: "running" });
      const yuanCoord = $j(obj).attr("coordId") ? Number.parseInt($j(obj).attr("coordId")) : 0;
      const yuanStep = $j(obj).attr("step") ? Number.parseInt($j(obj).attr("step")) : 0;
      step = yuanStep + diceNum;
      let coordValue,
        currentStep = 0,
        i = 1,
        stopFlag = false,
        superTime = 0,
        backStepFlag = false,
        superFlag = false;
      const currentUser = planeOption.currentUser;
      let flyAttackFlag = true;
      moveCoord();

      function moveCoord() {
        if (i > diceNum) {
          if (coordValue.state != null && coordValue.state == "win") {
            rule.planeBack("win", $j(this).attr("type"), $j(this));
            if (rule.victory()) {
              planeAudio.playWinMusic();
              const winnerEl = document.getElementById("current-player");
              const winnerLabel = winnerEl ? winnerEl.textContent : planeOption.currentUser;
              alert(winnerLabel + "胜利!");
              return;
            }
            planeAudio.playLitWinMusic();
          }
          stopFlag = rule.attactPlane(coordValue, obj, superFlag);
          if (
            coordValue.coordColor == $j(obj).attr("type") &&
            coordValue.superCoord != null &&
            !stopFlag
          ) {
            superTime++;
            coordValue = selectCoordValue(coordValue.superCoord);
            coordId = Number.parseInt(coordValue.id);
            step += 12;
            superFlag = true;
            planeAudio.playFlyAcrossMusic();
            $j(obj).animate({ top: coordValue.top, left: coordValue.left }, 600);
            if (superTime == 1) {
              moveCoord();
              flyAttackFlag = false;
            } else {
              rule.attactPlane(coordValue, obj, superFlag);
              flyAttackFlag = true;
            }
          } else if (
            coordValue.coordColor == $j(obj).attr("type") &&
            !stopFlag &&
            coordValue.r == null
          ) {
            superTime++;
            coordId += 4;
            if (coordId > 52) {
              coordId -= 52;
            }
            coordValue = selectCoordValue(coordId);
            coordId = Number.parseInt(coordValue.id);
            step += 4;
            planeAudio.playJumpMusic();
            $j(obj).animate({ top: coordValue.top, left: coordValue.left }, 600);
            if (coordValue.superCoord != null) {
              moveCoord();
              flyAttackFlag = false;
            } else {
              rule.attactPlane(coordValue, obj, superFlag);
              flyAttackFlag = true;
            }
          }
          if (flyAttackFlag) {
            $j(obj)
              .attr({ coordId: coordValue.id, step: step })
              .off("click")
              .removeClass("pointer");
            if (diceNum != 6) {
              nextUser();
            } else {
              addDiceEvent();
              nextStep = true;
            }
          }
          return;
        }
        planeAudio.playStepMusic();
        if (backStepFlag) {
          coordId--;
        } else {
          coordId = yuanCoord + i;
        }
        currentStep = yuanStep + i;
        if (coordId > 52 && currentStep < 50) {
          coordId -= 52;
        }
        if (currentStep > 50 && !backStepFlag) {
          switch (currentUser) {
            case "red":
              if (yuanCoord < 61) {
                coordId = yuanCoord + i + 10;
              }
              if (coordId > 66) {
                backStepFlag = true;
                coordId = 65;
              }
              break;
            case "blue":
              if (yuanCoord < 71) {
                coordId = yuanCoord + i + 59;
              }
              if (coordId > 76) {
                backStepFlag = true;
                coordId = 75;
              }
              break;
            case "yellow":
              if (yuanCoord < 81) {
                coordId = yuanCoord + i + 56;
              }
              if (coordId > 86) {
                backStepFlag = true;
                coordId = 85;
              }
              break;
            case "green":
              if (yuanCoord < 91) {
                coordId = yuanCoord + i + 53;
              }
              if (coordId > 96) {
                backStepFlag = true;
                coordId = 95;
              }
              break;
          }
        }
        coordValue = selectCoordValue(coordId);
        i++;
        $j(obj).animate({ top: coordValue.top, left: coordValue.left }, 300, moveCoord);
      }
    }
  }

  /**
   * Get user state (single-arg version, uses planeOption.userList)
   * @param color
   * @returns {*}
   */
  function userStateBrowser(color) {
    let state;
    for (let i = 0; i < planeOption.userList.length; i++) {
      if (color == planeOption.userList[i].color) {
        state = planeOption.userList[i].state;
      }
    }
    return state;
  }

  /**
   * Switch to next user
   */
  function nextUser() {
    nextStep = false;
    $j("#sdn" + planeOption.currentUser).text("等待");
    updateStatusBar();
    let computer = false;
    switch (planeOption.currentUser) {
      case "red":
        planeOption.currentUser = "blue";
        break;
      case "blue":
        planeOption.currentUser = "yellow";
        break;
      case "yellow":
        planeOption.currentUser = "green";
        break;
      case "green":
        planeOption.currentUser = "red";
        break;
    }
    sixTime = 0;
    const state = userStateBrowser(planeOption.currentUser);
    if (state == "computer") {
      computer = true;
      $j(".shade").show();
    } else if (state == "win" || state == "close") {
      nextUser();
      return;
    } else {
      $j(".shade").hide();
    }
    $j("#sdn" + planeOption.currentUser).text("请投骰");
    addDiceEvent();
    if (computer) {
      setTimeout(() => {
        $j("#dice").trigger("click");
      }, 1500);
    }
  }

  /**
   * Update status bar - show the current user's role (玩家N/电脑) instead of color
   * If multiple human players exist, distinguish them with player numbers.
   */
  function updateStatusBar() {
    const TYPE_NAMES_BROWSER = { normal: "玩家", computer: "电脑", close: "无" };
    const current = planeOption.currentUser;
    // Count totals first
    let humanTotal = 0;
    let aiTotal = 0;
    for (let i = 0; i < planeOption.userList.length; i++) {
      const st = planeOption.userList[i].state;
      if (st === "normal") humanTotal++;
      else if (st === "computer") aiTotal++;
    }
    // Assign labels in userList order (stable)
    let humanIdx = 0;
    let aiIdx = 0;
    let currentLabel = "玩家";
    for (let i = 0; i < planeOption.userList.length; i++) {
      const user = planeOption.userList[i];
      let label;
      if (user.state === "normal") {
        humanIdx++;
        label = humanTotal > 1 ? "玩家" + humanIdx : "玩家";
      } else if (user.state === "computer") {
        aiIdx++;
        label = aiTotal > 1 ? "电脑" + aiIdx : "电脑";
      } else {
        label = TYPE_NAMES_BROWSER[user.state] || "";
      }
      if (user.color === current) {
        currentLabel = label;
      }
      $j("#type-" + user.color).text(label);
      const count = $j(".plane[type=" + user.color + "][state=win]").length;
      $j("#count-" + user.color).text(count);
    }
    $j("#current-player").text(currentLabel).css("color", current);
  }

  /**
   * Add dice roll event
   */
  function addDiceEvent() {
    $j("#dice")
      .off("click")
      .on("click", () => {
        // Guard: block dice click for remote player in online mode
        if (planeOption.gameOnline && planeOption.currentUser === remoteColor) return;
        $j("#dice").off("click").removeClass("pointer");
        nextDiceValue = Math.floor(Math.random() * 6);
        DICE.nextActive = nextDiceValue;
        DICE.shuffle(3).then(() => {
          onComplete(null, { index: DICE.active });
        });
        planeAudio.playDiceMusic();
        if (planeOption.gameOnline && networkProtocol) {
          networkProtocol.sendAction({ a: "roll" });
        }
      })
      .addClass("pointer");
  }

  // ---- Online mode functions ----

  function cleanupNetwork() {
    if (networkProtocol) {
      networkProtocol.destroy();
      networkProtocol = null;
    }
    if (networkConnection) {
      networkConnection.close();
      networkConnection = null;
    }
    planeOption.gameOnline = false;
    localPlayerRole = null;
    localColor = null;
    remoteColor = null;
  }

  function setupNetworkHandlers() {
    networkProtocol.setCallbacks({
      onAction: function (actionData) {
        applyRemoteAction(actionData);
      },
      onRPSChoice: function (choice) {
        handleOnlineRPSReceived(choice);
      },
      onRPSResult: function (result) {
        handleOnlineRPSResult(result);
      },
      onRestart: function () {
        cleanupNetwork();
        $j("#rps-online").hide();
        $j(".option-panel").removeClass("hidden");
        $j("#game-main").hide();
      },
      onDisconnect: function () {
        handleDisconnect();
      },
    });
  }

  let rpsOnlineChoices = { online: null, remote: null };

  function startOnlineRPS() {
    $j(".option-panel").addClass("hidden");
    $j("#rps-online").css("display", "flex");
    rpsOnlineChoices = { online: null, remote: null };
    $j("#rps-online-status").text("请选择");
    $j("#rps-online-result").text("");
    $j("#rps-online-buttons .btn-rps").removeClass("selected");
  }

  function handleOnlineRPSChoice(choice, ev) {
    rpsOnlineChoices.online = choice;
    $j("#rps-online-buttons .btn-rps").removeClass("selected");
    $j(ev.target).addClass("selected");
    $j("#rps-online-status").text("已选择：" + getRPSName(choice) + "，等待对方...");
    networkProtocol.sendRPSChoice(choice);
  }

  function handleOnlineRPSReceived(remoteChoice) {
    rpsOnlineChoices.remote = remoteChoice;
    checkOnlineRPSComplete();
  }

  function checkOnlineRPSComplete() {
    if (!rpsOnlineChoices.online || !rpsOnlineChoices.remote) return;

    if (localPlayerRole === "host") {
      const winner = judgeRPS(rpsOnlineChoices.online, rpsOnlineChoices.remote);
      let firstPlayer;
      if (winner === 1) {
        firstPlayer = "host";
      } else if (winner === -1) {
        firstPlayer = "guest";
      } else {
        networkProtocol.sendRPSResult(null, null);
        rpsOnlineChoices.online = null;
        rpsOnlineChoices.remote = null;
        $j("#rps-online-status").text("平局！请重新选择");
        $j("#rps-online-buttons .btn-rps").removeClass("selected");
        return;
      }
      networkProtocol.sendRPSResult(
        {
          host: localPlayerRole === "host" ? rpsOnlineChoices.online : rpsOnlineChoices.remote,
          guest: localPlayerRole === "host" ? rpsOnlineChoices.remote : rpsOnlineChoices.online,
        },
        firstPlayer
      );
    }
  }

  function handleOnlineRPSResult(result) {
    if (result.firstPlayer === null) {
      rpsOnlineChoices.online = null;
      rpsOnlineChoices.remote = null;
      $j("#rps-online-status").text("平局！请重新选择");
      $j("#rps-online-buttons .btn-rps").removeClass("selected");
      return;
    }

    const myChoice = rpsOnlineChoices.online;
    const theirChoice = rpsOnlineChoices.remote;
    const iWin = result.firstPlayer === localPlayerRole;

    $j("#rps-online-result").text(
      "你选择了" +
        getRPSName(myChoice) +
        "，对方选择了" +
        getRPSName(theirChoice) +
        (iWin ? "，你赢了！你先手。" : "，你输了！对方先手。")
    );

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    // Assign colors: host=red, guest=blue, others=close
    localColor = localPlayerRole === "host" ? "red" : "blue";
    remoteColor = localPlayerRole === "host" ? "blue" : "red";

    planeOption.gameOnline = true;
    planeOption.userList = [
      { color: "red", state: localColor === "red" ? "normal" : "close" },
      { color: "blue", state: localColor === "blue" ? "normal" : "close" },
      { color: "yellow", state: "close" },
      { color: "green", state: "close" },
    ];

    // Determine starting color
    const startColor = firstPlayerRole === "host" ? "red" : "blue";
    planeOption.currentUser = startColor;

    $j("#rps-online").hide();
    $j(".option-panel").addClass("hidden");
    $j("#game-main").css("display", "flex");

    // Update rule panel visibility
    $j("#rule-pve").css("display", "none");

    createPlane(planeOption.userList);
    $j("#sdn" + planeOption.currentUser).text("请投骰");
    addDiceEvent();
    updateStatusBar();
    setInterval(updateStatusBar, 500);

    // If remote goes first, wait for their roll
    if (planeOption.currentUser === remoteColor) {
      $j("#dice").off("click").removeClass("pointer");
    }
  }

  function applyRemoteAction(actionData) {
    if (actionData.a === "roll") {
      // Remote player rolls the dice
      if (planeOption.currentUser !== remoteColor) return;
      $j("#dice").off("click").removeClass("pointer");
      nextDiceValue = Math.floor(Math.random() * 6);
      DICE.nextActive = nextDiceValue;
      DICE.shuffle(3).then(() => {
        onComplete(null, { index: DICE.active });
      });
      planeAudio.playDiceMusic();
    } else if (actionData.a === "select") {
      // Remote player selects a plane
      if (planeOption.currentUser !== remoteColor) return;
      const pn = actionData.pn;
      let targetPlane = null;
      $j(".plane").each(function () {
        if (
          $j(this).attr("type") === remoteColor &&
          $j(this).attr("num") == pn &&
          $j(this).hasClass("pointer")
        ) {
          targetPlane = this;
          return false; // break
        }
      });
      if (targetPlane) {
        $j(targetPlane).trigger("click");
      }
    }
  }

  function handleDisconnect() {
    alert("对方已断开连接，你获胜！");
    cleanupNetwork();
    $j("#game-main").hide();
    $j(".option-panel").removeClass("hidden");
  }

  // ---- DOMContentLoaded ----
  $j(() => {
    window.onbeforeunload = function (event) {
      const n = event.screenX - window.screenLeft;
      const b = n > document.documentElement.scrollWidth - 20;
      if ((b && event.clientY < 0) || event.altKey) {
        return "确定关闭吗";
      }
    };
    window.onkeydown = function (e) {
      if (e.which) {
        if (e.which == 116) {
          if (confirm("确定刷新页面吗？刷新后页面数据将被清除！")) {
            return true;
          } else {
            return false;
          }
        }
      } else if (e.keyCode) {
        if (e.keyCode == 116) {
          if (confirm("确定刷新页面吗？刷新后页面数据将被清除！")) {
            return true;
          } else {
            return false;
          }
        }
      }
    };
    DICE = new SlotMachine(document.getElementById("dice"), {
      active: 0,
      delay: 500,
      randomize: function () {
        return nextDiceValue;
      },
    });
    addDiceEvent();
    $j("#begin").on("click", () => {
      planeOption.begin();
      updateStatusBar();
      setInterval(updateStatusBar, 500);
    });

    // Online mode button
    const btnOnline = document.getElementById("btn-online");
    if (btnOnline) {
      if (typeof RoomUI === "undefined" || !RoomUI.isSupported()) {
        btnOnline.style.display = "none";
      } else {
        btnOnline.addEventListener("click", () => {
          roomUI = new RoomUI({
            onConnectionEstablished: function (connection, protocol, role) {
              networkConnection = connection;
              networkProtocol = protocol;
              localPlayerRole = role;
              setupNetworkHandlers();
              startOnlineRPS();
            },
            onError: function (msg) {
              alert(msg);
            },
            onCancel: function () {
              cleanupNetwork();
            },
          });
          roomUI.show();
        });
      }
    }

    // Online RPS buttons
    $j("#rps-online-buttons .btn-rps").on("click", function (ev) {
      const choice = $j(this).data("choice");
      handleOnlineRPSChoice(choice, ev);
    });
  });
} // end if (typeof $j !== "undefined")
