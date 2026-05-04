/**
 * 设置
 * @constructor
 */
var PlaneOption = function () {
    /**
     *
     * @param color /red/blue/yellow/green
     * @param state /normal/close/win/computer
     * @constructor
     */
    var PLANEUSER = function (color, state) {
        this.color = color;
        this.state = state;
    };
    this.userList = [new PLANEUSER('red', 'normal'), new PLANEUSER('blue', 'computer'), new PLANEUSER('yellow', 'computer'), new PLANEUSER('green', 'computer')];
    this.difficulty = 'normal';  //难度
    this.currentUser = 'red';  //当前用户
    this.backgroundMusic = true;    //背景音乐开关
    this.gameMusic = true;  //游戏音效开关

    /**
     * 设置难度
     */
    this.setDifficulty = function () {
        this.difficulty = $j('#nandu').val();
    };

    /**
     * 设置默认首个启动用户
     */
    function setFirstUser() {
        for (var i = 0; i < this.userList.length; i++) {
            if (this.userList.state == 'normal') {
                this.currentUser = this.userList.color;
                return;
            }
        }
    }

    this.setUserList = function () {
        this.userList[0].state = $j('#redUser').val();
        this.userList[1].state = $j('#blueUser').val();
        this.userList[2].state = $j('#yellowUser').val();
        this.userList[3].state = $j('#greenUser').val();
    };

    /**
     * 开始
     */
    this.begin = function () {
        this.setUserList();
        this.setDifficulty();
        var qifeiVal = $j('#qifei').val();
        $j('#rule-takeoff').text('掷到' + qifeiVal + '飞机才能起飞');
        createPlane(planeOption.userList);
        $j("#sdn" + planeOption.currentUser).text('请投骰');
        $j('.option-panel').addClass('hidden');
        $j('#game-main').css('display', 'flex');
        $j('#rules-panel').show();
    };
};
var planeOption = new PlaneOption();
