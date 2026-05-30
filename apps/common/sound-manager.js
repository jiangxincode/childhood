// ============================================================
// Sound Manager - Shared audio playback for all games
// ============================================================

/**
 * SoundManager - Centralized audio playback system
 *
 * Usage:
 *   SoundManager.init('../../audio');  // Set base path once
 *   SoundManager.play('flip');        // Play a sound
 *   SoundManager.toggle();            // Toggle sound on/off
 *   SoundManager.setEnabled(false);   // Disable sound
 */
const SoundManager = (() => {
  // Audio instances cache
  const sounds = {};

  // Base path to audio files (relative to game HTML)
  let basePath = "../../audio";

  // Sound enabled state
  let enabled = true;

  // Sound definitions with paths and format
  const soundDefs = {
    // Common sounds
    victory: { file: "common/victory", format: "mp3" },
    lose: { file: "common/lose", format: "mp3" },
    draw: { file: "common/draw", format: "mp3" },
    click: { file: "common/click", format: "mp3" },
    error: { file: "common/error", format: "mp3" },

    // Card game sounds
    flip: { file: "card/flip", format: "mp3" },
    capture: { file: "card/capture", format: "mp3" },
    destroy: { file: "card/destroy", format: "mp3" },
    move: { file: "card/move", format: "mp3" },

    // Board game sounds
    place: { file: "board/place", format: "mp3" },
    take: { file: "board/take", format: "mp3" },
    slide: { file: "board/slide", format: "mp3" },
    remove: { file: "board/remove", format: "mp3" },

    // Dice game sounds
    roll: { file: "dice/roll", format: "ogg" },
    fly: { file: "dice/fly", format: "ogg" },
    jump: { file: "dice/jump", format: "ogg" },
    diceMove: { file: "dice/move", format: "ogg" },
    fall: { file: "dice/fall", format: "ogg" },
    up: { file: "dice/up", format: "ogg" },
    tripleSix: { file: "dice/triple_six", format: "ogg" },
    six: { file: "dice/six", format: "ogg" },
    win: { file: "dice/win", format: "ogg" },
    home: { file: "dice/home", format: "ogg" },

    // Special sounds
    block: { file: "special/block", format: "mp3" },
    fishing: { file: "special/fishing", format: "mp3" },
    carry: { file: "special/carry", format: "mp3" },
    wolf: { file: "special/wolf", format: "mp3" },
    sheep: { file: "special/sheep", format: "mp3" },
  };

  /**
   * Initialize the sound manager
   * @param {string} [base] - Base path to audio directory
   */
  function init(base) {
    if (base) {
      basePath = base;
    }
    // Preload commonly used sounds
    preload(["click", "error", "flip", "place", "move"]);
  }

  /**
   * Preload specific sounds
   * @param {string[]} soundNames - Array of sound names to preload
   */
  function preload(soundNames) {
    soundNames.forEach((name) => {
      getAudio(name);
    });
  }

  /**
   * Get or create Audio instance
   * @param {string} name - Sound name
   * @returns {HTMLAudioElement|null}
   */
  function getAudio(name) {
    if (sounds[name]) {
      return sounds[name];
    }

    const def = soundDefs[name];
    if (!def) {
      console.warn(`SoundManager: Unknown sound "${name}"`);
      return null;
    }

    const audio = new Audio(`${basePath}/${def.file}.${def.format}`);
    audio.preload = "auto";
    sounds[name] = audio;
    return audio;
  }

  /**
   * Play a sound
   * @param {string} name - Sound name
   * @returns {Promise<void>}
   */
  function play(name) {
    if (!enabled) return Promise.resolve();

    const audio = getAudio(name);
    if (!audio) return Promise.resolve();

    // Reset playback position
    audio.currentTime = 0;

    // Play with error handling
    return audio.play().catch((err) => {
      // Silently handle autoplay restrictions
      if (err.name !== "NotAllowedError") {
        console.warn(`SoundManager: Failed to play "${name}":`, err);
      }
    });
  }

  /**
   * Stop a sound
   * @param {string} name - Sound name
   */
  function stop(name) {
    const audio = sounds[name];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Stop all sounds
   */
  function stopAll() {
    Object.values(sounds).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Toggle sound on/off
   * @returns {boolean} New enabled state
   */
  function toggle() {
    enabled = !enabled;
    if (!enabled) {
      stopAll();
    }
    return enabled;
  }

  /**
   * Set enabled state
   * @param {boolean} state - Whether sound is enabled
   */
  function setEnabled(state) {
    enabled = state;
    if (!enabled) {
      stopAll();
    }
  }

  /**
   * Get enabled state
   * @returns {boolean}
   */
  function isEnabled() {
    return enabled;
  }

  /**
   * Set volume for all sounds
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  function setVolume(volume) {
    const vol = Math.max(0, Math.min(1, volume));
    Object.values(sounds).forEach((audio) => {
      audio.volume = vol;
    });
  }

  /**
   * Check if a sound exists
   * @param {string} name - Sound name
   * @returns {boolean}
   */
  function hasSound(name) {
    return name in soundDefs;
  }

  /**
   * Get list of available sounds
   * @returns {string[]}
   */
  function getAvailableSounds() {
    return Object.keys(soundDefs);
  }

  // Public API
  return {
    init,
    preload,
    play,
    stop,
    stopAll,
    toggle,
    setEnabled,
    isEnabled,
    setVolume,
    hasSound,
    getAvailableSounds,
  };
})();

// Export for Node.js (testing)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SoundManager };
}
