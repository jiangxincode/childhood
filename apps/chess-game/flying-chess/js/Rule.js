/**
 * Rules
 * @constructor
 */
const Rule = function () {
  /**
   * Check if current user has won
   * @returns {boolean}
   */
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

  /**
   *
   * @param type  type: 'attack' (knocked back) or 'win' (victory)
   * @param color color
   * @param obj   the plane element
   */
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
      //Knocked back by attack
      $j(obj).animate({ top: top, left: left }).attr({ coordId: 0, step: 0, state: "unready" });
    } else {
      //Victory return
      $j(obj)
        .animate({ top: top, left: left }, () => {
          //Change to victory pattern
        })
        .attr({ state: "win" })
        .html("win");
    }
  };

  /**
   * Rolled 6 three times consecutively, all planes of current user are sent back
   */
  function backCurrentUserAllPlane() {
    $j(".plane").each(function () {
      if (this.currentUser == $j(this).attr("type")) {
        this.planeBack("attack", this.currentUser, $j(this));
      }
    });
  }

  /**
   * Count consecutive 6 rolls
   * @returns {boolean}
   */
  this.countSixTime = function () {
    if (diceNum == 6) {
      sixTime++;
    }
    if (sixTime == 3) {
      //Recall all planes of current user that are on the board
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
            if (83 == parseInt($j(this).attr("coordId"))) {
              rule.planeBack("attack", $j(this).attr("type"), $j(this));
              stopFlag = true;
            }
            break;
          case "blue":
            if (93 == parseInt($j(this).attr("coordId"))) {
              rule.planeBack("attack", $j(this).attr("type"), $j(this));
              stopFlag = true;
            }
            break;
          case "yellow":
            if (63 == parseInt($j(this).attr("coordId"))) {
              rule.planeBack("attack", $j(this).attr("type"), $j(this));
              stopFlag = true;
            }
            break;
          case "green":
            if (73 == parseInt($j(this).attr("coordId"))) {
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
