let DICE; //Dice
let nextDiceValue = 0; // Next dice target index
let diceNum = 1; //Dice result
let sixTime = 0; //Consecutive 6 count
let nextStep = false; //Whether next step can be executed

/**
 * Create planes
 * @param type   red/blue/yellow/green
 */
function createPlane(type) {
  if (type && type.length > 0) {
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
    //plane.innerHTML = i + 1;
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
  addPlaneEvent(userState(planeOption.currentUser));
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
    setTimeout(nextUser(), 1000);
  } else if (state == "computer") {
    //Computer executes
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
        //6 allows continuous dice roll
        addDiceEvent();
        nextStep = true;
      }
    });
  } else {
    $j(obj).attr({ state: "running" });
    const yuanCoord = $j(obj).attr("coordId") ? parseInt($j(obj).attr("coordId")) : 0;
    const yuanStep = $j(obj).attr("step") ? parseInt($j(obj).attr("step")) : 0;
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
        //Execute when the last step is completed
        if (coordValue.state != null && coordValue.state == "win") {
          rule.planeBack("win", $j(this).attr("type"), $j(this));
          if (rule.victory()) {
            planeAudio.playWinMusic();
            alert(planeOption.currentUser + "用户胜利!");
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
          coordId = parseInt(coordValue.id);
          step += 12;
          superFlag = true;
          planeAudio.playFlyAcrossMusic();
          $j(obj).animate({ top: coordValue.top, left: coordValue.left }, 600);
          if (superTime == 1) {
            moveCoord();
            flyAttackFlag = false;
          } else {
            //Check for attackable planes after fly-across
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
          coordId = parseInt(coordValue.id);
          step += 4;
          planeAudio.playJumpMusic();
          $j(obj).animate({ top: coordValue.top, left: coordValue.left }, 600);
          if (coordValue.superCoord != null) {
            moveCoord();
            flyAttackFlag = false;
          } else {
            //Check for attackable planes after fly-across
            rule.attactPlane(coordValue, obj, superFlag);
            flyAttackFlag = true;
          }
        }
        if (flyAttackFlag) {
          $j(obj).attr({ coordId: coordValue.id, step: step }).off("click").removeClass("pointer");
          if (diceNum != 6) {
            nextUser();
          } else {
            //6 allows continuous dice roll
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
 * Query coordinate data by coordId
 * @param coordId
 * @returns {{id: *, top: number, left: number, coordColor: string, superCoord: null, r: null}}
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
 * Get user state
 * @param color
 * @returns {*}
 */
function userState(color) {
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
  const state = userState(planeOption.currentUser);
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
 * Update status bar
 */
function updateStatusBar() {
  const COLOR_NAMES = { red: "红", blue: "蓝", yellow: "黄", green: "绿" };
  const TYPE_NAMES = { normal: "玩家", computer: "电脑", close: "无" };
  const current = planeOption.currentUser;
  $j("#current-player")
    .text(COLOR_NAMES[current] + "方")
    .css("color", current);
  for (let i = 0; i < planeOption.userList.length; i++) {
    const user = planeOption.userList[i];
    const count = $j(".plane[type=" + user.color + "][state=win]").length;
    $j("#count-" + user.color).text(count);
    $j("#type-" + user.color).text(TYPE_NAMES[user.state] || "");
  }
}

/**
 * Add dice roll event
 */
function addDiceEvent() {
  $j("#dice")
    .off("click")
    .on("click", () => {
      $j("#dice").off("click").removeClass("pointer");
      nextDiceValue = Math.floor(Math.random() * 6);
      DICE.nextActive = nextDiceValue;
      DICE.shuffle(3).then(() => {
        onComplete(null, { index: DICE.active });
      });
      planeAudio.playDiceMusic();
    })
    .addClass("pointer");
}

$j(() => {
  //Prompt on browser close event
  window.onbeforeunload = function (event) {
    const n = event.screenX - window.screenLeft;
    const b = n > document.documentElement.scrollWidth - 20;
    if ((b && event.clientY < 0) || event.altKey) {
      return "确定关闭吗";
      //event.returnValue = ""; //You can place your custom action code here
    }
  };
  //Handle F5 refresh key
  window.onkeydown = function (e) {
    if (e.which) {
      if (e.which == 116) {
        if (confirm("确定刷新页面吗？刷新后页面数据将被清除！")) {
          return true;
        } else {
          return false;
        }
      }
    } else if (event.keyCode) {
      if (event.keyCode == 116) {
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
});
