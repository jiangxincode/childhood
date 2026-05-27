/* eslint-disable no-undef */
// ============================================================
// WebRTC Connection Manager
// Peer-to-peer connection with manual room code exchange
// ============================================================

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const ICE_GATHER_TIMEOUT_MS = 5000;

/**
 * Strip unnecessary SDP lines for data-channel-only connections.
 * Keeps only what's needed for ICE, DTLS, and SCTP.
 * @param {string} sdp
 * @returns {string}
 */
function minimizeSdp(sdp) {
  const keepPrefixes = [
    "a=ice-ufrag",
    "a=ice-pwd",
    "a=fingerprint",
    "a=setup",
    "a=mid",
    "a=sctp-port",
    "m=application",
    "c=IN",
  ];
  const lines = sdp.split("\r\n");
  const kept = [];
  for (const line of lines) {
    if (keepPrefixes.some((p) => line.startsWith(p))) {
      kept.push(line);
    }
  }
  return kept.join("\r\n");
}

/**
 * Extract ICE candidate lines from an SDP string.
 * Returns { sdp, candidates } where sdp has candidate lines removed.
 * @param {string} sdp
 * @returns {{ sdp: string, candidates: string[] }}
 */
function extractCandidates(sdp) {
  const lines = sdp.split("\r\n");
  const kept = [];
  const candidates = [];
  for (const line of lines) {
    if (line.startsWith("a=candidate:")) {
      candidates.push(line);
    } else {
      kept.push(line);
    }
  }
  return { sdp: kept.join("\r\n"), candidates };
}

/**
 * Encode SDP + ICE candidates into a compact base64 room code.
 * @param {string} sdp - raw SDP string
 * @param {string[]} candidates - ICE candidate strings
 * @returns {string} base64-encoded room code
 */
function encodeRoomData(sdp, candidates) {
  const { sdp: cleanSdp, candidates: sdpCandidates } = extractCandidates(sdp);
  const minSdp = minimizeSdp(cleanSdp);
  const allCandidates = [...sdpCandidates, ...candidates];
  // Keep only the first ICE candidate
  const first = allCandidates.length > 0 ? [allCandidates[0]] : [];
  const payload = JSON.stringify({ s: minSdp, c: first });
  return btoa(unescape(encodeURIComponent(payload)));
}

/**
 * Decode a base64 room code back to SDP + ICE candidates.
 * @param {string} code - base64-encoded room code
 * @returns {{ sdp: string, candidates: string[] }}
 */
function decodeRoomData(code) {
  const payload = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  // Reconstruct SDP by appending candidate lines
  let sdp = payload.s;
  if (payload.c && payload.c.length > 0) {
    // Ensure SDP ends with \r\n before appending candidates
    if (!sdp.endsWith("\r\n")) sdp += "\r\n";
    sdp += payload.c.join("\r\n");
  }
  return { sdp, candidates: payload.c || [] };
}

/**
 * Wait for ICE gathering to complete, with timeout.
 * @param {RTCPeerConnection} pc
 * @returns {Promise<string[]>} collected ICE candidates
 */
function waitForIceGathering(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve([]);
      return;
    }

    const candidates = [];
    let resolved = false;

    const onCandidate = (e) => {
      if (e.candidate) {
        candidates.push(e.candidate.candidate);
      }
    };

    const onStateChange = () => {
      if (pc.iceGatheringState === "complete" && !resolved) {
        resolved = true;
        cleanup();
        resolve(candidates);
      }
    };

    const cleanup = () => {
      pc.removeEventListener("icecandidate", onCandidate);
      pc.removeEventListener("icegatheringstatechange", onStateChange);
    };

    pc.addEventListener("icecandidate", onCandidate);
    pc.addEventListener("icegatheringstatechange", onStateChange);

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(candidates);
      }
    }, ICE_GATHER_TIMEOUT_MS);
  });
}

/**
 * WebRTC P2P connection manager.
 * Supports manual room code exchange for signaling (no server needed).
 */
class WebRTCConnection {
  /**
   * @param {Object} callbacks
   * @param {function(string):void} callbacks.onData - received a message
   * @param {function(string):void} callbacks.onStateChange - connection state changed
   * @param {function():void} callbacks.onChannelOpen - data channel ready
   * @param {function():void} callbacks.onChannelClose - data channel closed
   * @param {function(Error):void} callbacks.onError - error occurred
   */
  constructor(callbacks) {
    this._callbacks = callbacks || {};
    this._pc = null;
    this._dc = null;
    this._onDataCallback = null;
  }

  /**
   * Check if WebRTC is supported in this browser.
   * @returns {boolean}
   */
  static isSupported() {
    return typeof RTCPeerConnection !== "undefined" && typeof RTCSessionDescription !== "undefined";
  }

  /**
   * Create an SDP offer and gather ICE candidates.
   * Call this on the host side.
   * @returns {Promise<string>} encoded room code
   */
  async createOffer() {
    this._pc = this._createPeerConnection();

    this._dc = this._pc.createDataChannel("game", { ordered: true });
    this._setupDataChannel(this._dc);

    const offer = await this._pc.createOffer();
    await this._pc.setLocalDescription(offer);

    const candidates = await waitForIceGathering(this._pc);
    const sdp = this._pc.localDescription.sdp;

    return encodeRoomData(sdp, candidates);
  }

  /**
   * Accept an offer room code and create an SDP answer.
   * Call this on the guest side.
   * @param {string} roomCode - base64-encoded room code from host
   * @returns {Promise<string>} encoded response code
   */
  async acceptOffer(roomCode) {
    const { sdp, candidates } = decodeRoomData(roomCode);

    this._pc = this._createPeerConnection();

    // Listen for data channel from host
    this._pc.addEventListener("datachannel", (e) => {
      this._dc = e.channel;
      this._setupDataChannel(this._dc);
    });

    const offerDesc = new RTCSessionDescription({ type: "offer", sdp });
    await this._pc.setRemoteDescription(offerDesc);

    // Add ICE candidates from the offer
    for (const c of candidates) {
      try {
        await this._pc.addIceCandidate(new RTCIceCandidate({ candidate: c }));
      } catch {
        // Ignore invalid candidates
      }
    }

    const answer = await this._pc.createAnswer();
    await this._pc.setLocalDescription(answer);

    const answerCandidates = await waitForIceGathering(this._pc);
    const answerSdp = this._pc.localDescription.sdp;

    return encodeRoomData(answerSdp, answerCandidates);
  }

  /**
   * Accept a response code from the guest to complete the connection.
   * Call this on the host side.
   * @param {string} responseCode - base64-encoded response code from guest
   * @returns {Promise<void>}
   */
  async acceptAnswer(responseCode) {
    const { sdp, candidates } = decodeRoomData(responseCode);

    const answerDesc = new RTCSessionDescription({ type: "answer", sdp });
    await this._pc.setRemoteDescription(answerDesc);

    for (const c of candidates) {
      try {
        await this._pc.addIceCandidate(new RTCIceCandidate({ candidate: c }));
      } catch {
        // Ignore invalid candidates
      }
    }
  }

  /**
   * Send a string message over the data channel.
   * @param {string} data
   */
  send(data) {
    if (this._dc && this._dc.readyState === "open") {
      this._dc.send(data);
    }
  }

  /**
   * Close the connection and clean up resources.
   */
  close() {
    if (this._dc) {
      this._dc.close();
      this._dc = null;
    }
    if (this._pc) {
      this._pc.close();
      this._pc = null;
    }
  }

  /**
   * @private
   * @returns {RTCPeerConnection}
   */
  _createPeerConnection() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.addEventListener("connectionstatechange", () => {
      const state = pc.connectionState;
      if (this._callbacks.onStateChange) {
        this._callbacks.onStateChange(state);
      }
    });

    return pc;
  }

  /**
   * @private
   * @param {RTCDataChannel} dc
   */
  _setupDataChannel(dc) {
    dc.addEventListener("open", () => {
      if (this._callbacks.onChannelOpen) {
        this._callbacks.onChannelOpen();
      }
    });

    dc.addEventListener("close", () => {
      if (this._callbacks.onChannelClose) {
        this._callbacks.onChannelClose();
      }
    });

    dc.addEventListener("message", (e) => {
      if (this._callbacks.onData) {
        this._callbacks.onData(e.data);
      }
    });

    dc.addEventListener("error", (e) => {
      if (this._callbacks.onError) {
        this._callbacks.onError(e.error || new Error("DataChannel error"));
      }
    });
  }
}

// Expose on window for browser use
if (typeof window !== "undefined") {
  window.WebRTCConnection = WebRTCConnection;
  window._webrtcUtils = {
    encodeRoomData,
    decodeRoomData,
    minimizeSdp,
    extractCandidates,
  };
}

// Module exports for Node.js testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WebRTCConnection,
    encodeRoomData,
    decodeRoomData,
    minimizeSdp,
    extractCandidates,
    waitForIceGathering,
    ICE_SERVERS,
    ICE_GATHER_TIMEOUT_MS,
  };
}
