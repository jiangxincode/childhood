var DICEMUSICURL = 'audio/dice.ogg';   //投骰子音效
var ROLLEDSIXMUSICRUL = 'audio/rolled_6.ogg';  //投到6音效
var ROLLEDTHREETIMESIXMUSICURL = 'audio/rolled_3_6s.ogg';   //连续投到3次6音效
var OUTMUSICURL = 'audio/plane_up.ogg';   //出库音效
var STEPMUSICURL = 'audio/move_short3.ogg';  //每步音效
var JUMPMUSICURL = 'audio/jump4.ogg';   //跳跃音效
var FLYACROSSMUSICURL = 'audio/fly_across.ogg'; //飞跃音效
var ATTACTMUSICURL = 'audio/plane_fall.ogg';    //攻击音效
var LITWINMUSICURL = 'audio/win_fly_back_home.ogg';    //小胜音效
var WINMUSICURL = 'audio/win_cheer.ogg';   //胜利音效
var FAILMUSICURL = '';  //失败音效

var PlaneAudio = function () {
    function playMusic(musicSrc) {
        if (planeOption.gameMusic) {
            $j('#yinxiao').attr('src', musicSrc);
            $j('#yinxiao')[0].play();
        }
    }

    this.playDiceMusic = function () {
        playMusic(DICEMUSICURL);
    };

    this.playRolledSixMusic = function () {
        playMusic(ROLLEDSIXMUSICRUL)
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
    }
};
var planeAudio = new PlaneAudio();