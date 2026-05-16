/**
 * Computer player
 * @constructor
 */
const Computer = function () {
  this.performing = function () {
    setTimeout(() => {
      const planeList = new Array();
      $j(".plane").each(function () {
        if (planeOption.currentUser == $j(this).attr("type") && $j(this).hasClass("pointer")) {
          planeList.push($j(this));
        }
      });
      if (planeList && planeList.length > 0) {
        const randomNum = obtainRandomNum(planeList.length);
        $j(planeList[randomNum]).trigger("click");
        if (diceNum == 6) {
          diceClick();
        }
      }
    }, 1500);
  };

  /**
   * Execute next step
   */
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

  /**
   * Get a random integer (0 to length-1) with uniform distribution
   * @param leng  length
   * @returns {*}
   */
  function obtainRandomNum(leng) {
    const num = Math.floor(Math.random() * 10); //Get a random integer from 0-9 with uniform distribution
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
