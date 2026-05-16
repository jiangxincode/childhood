const DICEMUSICURL = "audio/dice.ogg"; //Dice roll sound effect
const ROLLEDSIXMUSICRUL = "audio/rolled_6.ogg"; //Rolled 6 sound effect
const ROLLEDTHREETIMESIXMUSICURL = "audio/rolled_3_6s.ogg"; //Consecutive three 6s sound effect
const OUTMUSICURL = "audio/plane_up.ogg"; //Takeoff sound effect
const STEPMUSICURL = "audio/move_short3.ogg"; //Step sound effect
const JUMPMUSICURL = "audio/jump4.ogg"; //Jump sound effect
const FLYACROSSMUSICURL = "audio/fly_across.ogg"; //Fly across sound effect
const ATTACTMUSICURL = "audio/plane_fall.ogg"; //Attack sound effect
const LITWINMUSICURL = "audio/win_fly_back_home.ogg"; //Minor win sound effect
const WINMUSICURL = "audio/win_cheer.ogg"; //Victory sound effect
const FAILMUSICURL = ""; //Defeat sound effect

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
