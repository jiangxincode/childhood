/**
 * Settings
 * @constructor
 */
const PlaneOption = function () {
  /**
   *
   * @param color /red/blue/yellow/green
   * @param state /normal/close/win/computer
   * @constructor
   */
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
  this.difficulty = "normal"; //Difficulty
  this.currentUser = "red"; //Current user
  this.backgroundMusic = true; //Background music toggle
  this.gameMusic = true; //Game sound effect toggle

  /**
   * Set difficulty
   */
  this.setDifficulty = function () {
    this.difficulty = $j("#nandu").val();
  };

  /**
   * Set default first player
   */
  function setFirstUser() {
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList.state == "normal") {
        this.currentUser = this.userList.color;
        return;
      }
    }
  }

  this.setUserList = function () {
    this.userList[0].state = $j("#redUser").val();
    this.userList[1].state = $j("#blueUser").val();
    this.userList[2].state = $j("#yellowUser").val();
    this.userList[3].state = $j("#greenUser").val();
  };

  /**
   * Start game
   */
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
  };
};
const planeOption = new PlaneOption();
