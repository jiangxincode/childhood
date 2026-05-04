/**
 * 规则
 * @constructor
 */
var Rule = function () {
    /**
     * 验证当前用户是否胜利
     * @returns {boolean}
     */
    this.victory = function () {
        var winNum = 0, winFlag = false;
        $j('.plane').each(function () {
            if ($j(this).attr('type') == planeOption.currentUser && $j(this).attr('state') == 'win') {
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
     * @param type  类型  被攻击打回   胜利
     * @param color 颜色
     * @param obj   该飞机
     */
    this.planeBack = function (type, color, obj) {
        var top, left;
        switch (color) {
            case 'red':
                for (var i = 0; i < initRedCoord.length; i++) {
                    if (initRedCoord[i].id == $j(obj).attr('num')) {
                        top = initRedCoord[i].top;
                        left = initRedCoord[i].left;
                    }
                }
                break;
            case 'blue' :
                for (var i = 0; i < initBlueCoord.length; i++) {
                    if (initBlueCoord[i].id == $j(obj).attr('num')) {
                        top = initBlueCoord[i].top;
                        left = initBlueCoord[i].left;
                    }
                }
                break;
            case 'yellow' :
                for (var i = 0; i < initYellowCoord.length; i++) {
                    if (initYellowCoord[i].id == $j(obj).attr('num')) {
                        top = initYellowCoord[i].top;
                        left = initYellowCoord[i].left;
                    }
                }
                break;
            case 'green' :
                for (var i = 0; i < initGreenCoord.length; i++) {
                    if (initGreenCoord[i].id == $j(obj).attr('num')) {
                        top = initGreenCoord[i].top;
                        left = initGreenCoord[i].left;
                    }
                }
                break;
        }
        if (type == 'attack') { //被攻击打回
            $j(obj).animate({'top': top, 'left': left}).attr({'coordId': 0, 'step': 0, 'state': 'unready'});
        } else {  //胜利回归
            $j(obj).animate({'top': top, 'left': left}, function () {
                //变成胜利图案

            }).attr({'state': 'win'}).html('win');
        }
    };

    /**
     * 连投3次6，当前用户所有飞机打回
     */
    function backCurrentUserAllPlane() {
        $j('.plane').each(function () {
            if (this.currentUser == $j(this).attr('type')) {
                this.planeBack('attack', this.currentUser, $j(this));
            }
        });
    }

    /**
     * 计算连续投6次数
     * @returns {boolean}
     */
    this.countSixTime = function () {
        if (diceNum == 6) {
            sixTime++;
        }
        if (sixTime == 3) {
            //将该用户所有在外的飞机回收
            planeAudio.playRolledThreeTimeSixMusic();
            backCurrentUserAllPlane();
            return true;
        } else {
            return false;
        }
    };

    this.attactPlane = function (coordValue, obj, superFlag) {
        var stopFlag = false;
        $j('.plane').each(function () {
            if (coordValue.id == $j(this).attr('coordId') && $j(obj).attr('type') != $j(this).attr('type') && $j(this).attr('state') == 'running') {
                rule.planeBack('attack', $j(this).attr('type'), $j(this));
                planeAudio.playAttackMusic();
                stopFlag = true;
            }
            if (superFlag) {
                switch (planeOption.currentUser) {
                    case 'red':
                        if (83 == parseInt($j(this).attr('coordId'))) {
                            rule.planeBack('attack', $j(this).attr('type'), $j(this));
                            stopFlag = true;
                        }
                        break;
                    case 'blue' :
                        if (93 == parseInt($j(this).attr('coordId'))) {
                            rule.planeBack('attack', $j(this).attr('type'), $j(this));
                            stopFlag = true;
                        }
                        break;
                    case 'yellow' :
                        if (63 == parseInt($j(this).attr('coordId'))) {
                            rule.planeBack('attack', $j(this).attr('type'), $j(this));
                            stopFlag = true;
                        }
                        break;
                    case 'green' :
                        if (73 == parseInt($j(this).attr('coordId'))) {
                            rule.planeBack('attack', $j(this).attr('type'), $j(this));
                            stopFlag = true;
                        }
                        break;
                }
            }
        });
        return stopFlag;
    }
};
var rule = new Rule();