// ============================================================
// Network Game Protocol
// Game-level messaging over WebRTC data channel
// ============================================================

const HEARTBEAT_INTERVAL_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 45000;

const VALID_RPS = ["rock", "scissors", "paper"];

/**
 * Validate an action message payload.
 * @param {Object} data - parsed action data
 * @returns {boolean}
 */
function validateAction(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.a !== "string") return false;
  return true;
}

/**
 * Validate an RPS choice string.
 * @param {string} choice
 * @returns {boolean}
 */
function validateRPSChoice(choice) {
  return VALID_RPS.includes(choice);
}

/**
 * Game-level protocol over a WebRTCConnection.
 * Handles action messages, RPS exchange, restart, and heartbeat.
 */
class NetworkGameProtocol {
  /**
   * @param {WebRTCConnection} connection
   * @param {Object} callbacks
   * @param {function(Object):void} callbacks.onAction - remote player sent an action
   * @param {function(string):void} callbacks.onRPSChoice - remote RPS choice
   * @param {function(Object):void} callbacks.onRPSResult - host resolved RPS
   * @param {function():void} callbacks.onRestart - remote restart request
   * @param {function():void} callbacks.onDisconnect - connection lost
   * @param {function(string):void} callbacks.onProtocolError - protocol error
   */
  constructor(connection, callbacks) {
    this._conn = connection;
    this._callbacks = callbacks || {};
    this._heartbeatTimer = null;
    this._timeoutTimer = null;
    this._lastReceived = Date.now();
    this._started = false;
  }

  /**
   * Start listening for messages and begin heartbeat.
   */
  start() {
    if (this._started) return;
    this._started = true;
    this._lastReceived = Date.now();

    // Override onData on the connection to intercept messages
    const prevOnData = this._conn._callbacks.onData;
    this._conn._callbacks.onData = (raw) => {
      this._lastReceived = Date.now();
      this._handleMessage(raw);
      // Chain previous handler if any
      if (prevOnData) prevOnData(raw);
    };

    // Also listen for channel close as disconnect
    const prevOnClose = this._conn._callbacks.onChannelClose;
    this._conn._callbacks.onChannelClose = () => {
      this._fireDisconnect();
      if (prevOnClose) prevOnClose();
    };

    // Start heartbeat
    this._heartbeatTimer = setInterval(() => {
      this._send({ t: "h" });
      this._checkTimeout();
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Update callbacks after construction.
   * @param {Object} callbacks
   */
  setCallbacks(callbacks) {
    this._callbacks = callbacks || {};
  }

  /**
   * Send a game action to the remote player.
   * @param {Object} actionData - game-specific action object
   */
  sendAction(actionData) {
    this._send({ t: "a", d: actionData });
  }

  /**
   * Send an RPS choice.
   * @param {string} choice - 'rock' | 'scissors' | 'paper'
   */
  sendRPSChoice(choice) {
    if (!validateRPSChoice(choice)) return;
    this._send({ t: "r", d: choice });
  }

  /**
   * Send RPS result (host only).
   * @param {Object|null} choices - { host, guest } choices, null for draw
   * @param {string|null} firstPlayer - 'host' | 'guest', null for draw
   */
  sendRPSResult(choices, firstPlayer) {
    this._send({
      t: "R",
      d: {
        h: choices ? choices.host : null,
        g: choices ? choices.guest : null,
        f: firstPlayer,
      },
    });
  }

  /**
   * Send restart request.
   */
  sendRestart() {
    this._send({ t: "n" });
  }

  /**
   * Stop heartbeat and clean up.
   */
  destroy() {
    this._started = false;
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._timeoutTimer) {
      clearTimeout(this._timeoutTimer);
      this._timeoutTimer = null;
    }
  }

  /**
   * @private
   * @param {Object} obj
   */
  _send(obj) {
    try {
      this._conn.send(JSON.stringify(obj));
    } catch {
      // Connection may be closed
    }
  }

  /**
   * @private
   * @param {string} raw
   */
  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      if (this._callbacks.onProtocolError) {
        this._callbacks.onProtocolError("Invalid JSON message");
      }
      return;
    }

    if (!msg || typeof msg.t !== "string") {
      if (this._callbacks.onProtocolError) {
        this._callbacks.onProtocolError("Missing message type");
      }
      return;
    }

    switch (msg.t) {
      case "a": // Action
        if (validateAction(msg.d)) {
          if (this._callbacks.onAction) this._callbacks.onAction(msg.d);
        } else if (this._callbacks.onProtocolError) {
          this._callbacks.onProtocolError("Invalid action data");
        }
        break;

      case "r": // RPS choice
        if (validateRPSChoice(msg.d)) {
          if (this._callbacks.onRPSChoice) this._callbacks.onRPSChoice(msg.d);
        } else if (this._callbacks.onProtocolError) {
          this._callbacks.onProtocolError("Invalid RPS choice");
        }
        break;

      case "R": // RPS result
        if (msg.d && typeof msg.d === "object") {
          if (this._callbacks.onRPSResult) {
            this._callbacks.onRPSResult({
              hostChoice: msg.d.h,
              guestChoice: msg.d.g,
              firstPlayer: msg.d.f,
            });
          }
        } else if (this._callbacks.onProtocolError) {
          this._callbacks.onProtocolError("Invalid RPS result");
        }
        break;

      case "n": // Restart
        if (this._callbacks.onRestart) this._callbacks.onRestart();
        break;

      case "h": // Heartbeat
        // Already handled by updating _lastReceived above
        break;

      default:
        if (this._callbacks.onProtocolError) {
          this._callbacks.onProtocolError("Unknown message type: " + msg.t);
        }
        break;
    }
  }

  /**
   * @private
   */
  _checkTimeout() {
    if (Date.now() - this._lastReceived > HEARTBEAT_TIMEOUT_MS) {
      this._fireDisconnect();
    }
  }

  /**
   * @private
   */
  _fireDisconnect() {
    if (this._callbacks.onDisconnect) {
      this._callbacks.onDisconnect();
    }
    this.destroy();
  }
}

// Expose on window for browser use
if (typeof window !== "undefined") {
  window.NetworkGameProtocol = NetworkGameProtocol;
}

// Module exports for Node.js testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    NetworkGameProtocol,
    validateAction,
    validateRPSChoice,
    HEARTBEAT_INTERVAL_MS,
    HEARTBEAT_TIMEOUT_MS,
    VALID_RPS,
  };
}
