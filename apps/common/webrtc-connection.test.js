/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const {
  encodeRoomData,
  decodeRoomData,
  minimizeSdp,
  extractCandidates,
  WebRTCConnection,
} = require("./webrtc-connection.js");

// --- SDP Minimization ---

describe("minimizeSdp", () => {
  it("keeps essential SDP lines", () => {
    const sdp = [
      "v=0",
      "o=- 1234567890 2 IN IP4 127.0.0.1",
      "s=-",
      "t=0 0",
      "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
      "c=IN IP4 0.0.0.0",
      "a=ice-ufrag:abc1",
      "a=ice-pwd:def123456789012345678901",
      "a=fingerprint:sha-256 AA:BB:CC",
      "a=setup:actpass",
      "a=mid:0",
      "a=sctp-port:5000",
      "a=max-message-size:65536",
    ].join("\r\n");

    const result = minimizeSdp(sdp);
    expect(result).toContain("a=ice-ufrag:abc1");
    expect(result).toContain("a=ice-pwd:def123456789012345678901");
    expect(result).toContain("a=fingerprint:sha-256 AA:BB:CC");
    expect(result).toContain("a=setup:actpass");
    expect(result).toContain("a=mid:0");
    expect(result).toContain("a=sctp-port:5000");
    expect(result).toContain("m=application");
    expect(result).not.toContain("v=0");
    expect(result).not.toContain("a=max-message-size");
  });

  it("strips unnecessary SDP lines", () => {
    const sdp = [
      "v=0",
      "o=- 1234567890 2 IN IP4 127.0.0.1",
      "s=-",
      "t=0 0",
      "a=group:BUNDLE 0",
      "a=msid-semantic: WMS",
      "a=extmap-allow-mixed",
      "a=sendrecv",
      "a=rtcp-mux",
      "a=rtcp-rsize",
      "a=msid:stream1 track1",
      "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
      "c=IN IP4 0.0.0.0",
      "a=ice-ufrag:abc1",
      "a=ice-pwd:def123456789012345678901",
      "a=fingerprint:sha-256 AA:BB:CC",
      "a=setup:actpass",
      "a=mid:0",
      "a=sctp-port:5000",
      "a=max-message-size:65536",
    ].join("\r\n");

    const result = minimizeSdp(sdp);
    expect(result).not.toContain("group:BUNDLE");
    expect(result).not.toContain("msid-semantic");
    expect(result).not.toContain("extmap-allow-mixed");
    expect(result).not.toContain("sendrecv");
    expect(result).not.toContain("rtcp-mux");
    expect(result).not.toContain("rtcp-rsize");
    expect(result).not.toContain("msid:stream1");
    expect(result).not.toContain("o=-");
    expect(result).not.toContain("s=-");
    expect(result).not.toContain("t=0 0");
    expect(result).not.toContain("v=0");
  });
});

// --- Candidate Extraction ---

describe("extractCandidates", () => {
  it("separates candidate lines from SDP", () => {
    const sdp = [
      "v=0",
      "a=ice-ufrag:abc",
      "a=candidate:1 1 udp 2122260223 192.168.1.1 12345 typ host",
      "a=candidate:2 1 udp 1677729535 203.0.113.1 54321 typ srflx",
    ].join("\r\n");

    const { sdp: clean, candidates } = extractCandidates(sdp);
    expect(clean).not.toContain("candidate:");
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toContain("192.168.1.1");
    expect(candidates[1]).toContain("203.0.113.1");
  });

  it("returns empty candidates when none present", () => {
    const sdp = "v=0\r\na=ice-ufrag:abc\r\n";
    const { sdp: clean, candidates } = extractCandidates(sdp);
    expect(clean).toBe(sdp);
    expect(candidates).toEqual([]);
  });
});

// --- Room Code Encoding/Decoding ---

describe("encodeRoomData / decodeRoomData", () => {
  it("round-trips SDP and candidates", () => {
    const sdp =
      "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=ice-ufrag:test\r\na=ice-pwd:abcdefghijklmnop\r\n";
    const candidates = ["candidate:1 1 udp 2122260223 192.168.1.1 12345 typ host"];

    const encoded = encodeRoomData(sdp, candidates);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeRoomData(encoded);
    expect(decoded.sdp).toContain("a=ice-ufrag:test");
    expect(decoded.sdp).toContain("candidate:");
    expect(decoded.candidates).toHaveLength(1);
  });

  it("handles empty candidates", () => {
    const sdp = "v=0\r\na=ice-ufrag:x\r\na=ice-pwd:y\r\n";
    const encoded = encodeRoomData(sdp, []);
    const decoded = decodeRoomData(encoded);
    expect(decoded.sdp).toContain("a=ice-ufrag:x");
    expect(decoded.candidates).toEqual([]);
  });

  it("keeps only first candidate", () => {
    const sdp = "v=0\r\na=ice-ufrag:x\r\n";
    const candidates = [
      "candidate:1 1 udp 2122260223 192.168.1.1 12345 typ host",
      "candidate:2 1 udp 1677729535 203.0.113.1 54321 typ srflx",
      "candidate:3 1 udp 10000 10.0.0.1 9999 typ relay",
    ];
    const encoded = encodeRoomData(sdp, candidates);
    const decoded = decodeRoomData(encoded);
    expect(decoded.candidates).toHaveLength(1);
    expect(decoded.candidates[0]).toContain("192.168.1.1");
  });

  it("produces base64 output", () => {
    const sdp = "v=0\r\na=ice-ufrag:x\r\n";
    const encoded = encodeRoomData(sdp, []);
    // Should not throw when decoding as base64
    expect(() => atob(encoded)).not.toThrow();
  });
});

// --- WebRTCConnection class ---

describe("WebRTCConnection", () => {
  let mockPC;
  let mockDC;
  let eventHandlers;

  beforeEach(() => {
    eventHandlers = {};

    mockDC = {
      readyState: "open",
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (!eventHandlers.dc) eventHandlers.dc = {};
        eventHandlers.dc[event] = handler;
      }),
    };

    mockPC = {
      localDescription: null,
      remoteDescription: null,
      iceGatheringState: "new",
      connectionState: "new",
      createDataChannel: vi.fn(() => mockDC),
      createOffer: vi.fn(() =>
        Promise.resolve({ type: "offer", sdp: "v=0\r\na=ice-ufrag:offer\r\n" })
      ),
      createAnswer: vi.fn(() =>
        Promise.resolve({ type: "answer", sdp: "v=0\r\na=ice-ufrag:answer\r\n" })
      ),
      setLocalDescription: vi.fn((desc) => {
        mockPC.localDescription = desc;
        return Promise.resolve();
      }),
      setRemoteDescription: vi.fn((desc) => {
        mockPC.remoteDescription = desc;
        return Promise.resolve();
      }),
      addIceCandidate: vi.fn(() => Promise.resolve()),
      close: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (!eventHandlers.pc) eventHandlers.pc = {};
        eventHandlers.pc[event] = handler;
      }),
      removeEventListener: vi.fn(),
    };

    // Mock global WebRTC classes
    global.RTCPeerConnection = vi.fn(() => mockPC);
    global.RTCSessionDescription = vi.fn((desc) => desc);
    global.RTCIceCandidate = vi.fn((obj) => obj);
    global.window = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.RTCPeerConnection;
    delete global.RTCSessionDescription;
    delete global.RTCIceCandidate;
    delete global.window;
  });

  describe("isSupported", () => {
    it("returns true when RTCPeerConnection exists", () => {
      expect(WebRTCConnection.isSupported()).toBe(true);
    });

    it("returns false when RTCPeerConnection is missing", () => {
      delete global.RTCPeerConnection;
      expect(WebRTCConnection.isSupported()).toBe(false);
    });
  });

  describe("constructor", () => {
    it("stores callbacks", () => {
      const cb = { onData: vi.fn() };
      const conn = new WebRTCConnection(cb);
      expect(conn._callbacks).toBe(cb);
    });

    it("handles missing callbacks", () => {
      const conn = new WebRTCConnection();
      expect(conn._callbacks).toEqual({});
    });
  });

  describe("send", () => {
    it("sends data when channel is open", () => {
      const conn = new WebRTCConnection();
      conn._dc = mockDC;
      conn.send("hello");
      expect(mockDC.send).toHaveBeenCalledWith("hello");
    });

    it("does not send when channel is closed", () => {
      const conn = new WebRTCConnection();
      mockDC.readyState = "closed";
      conn._dc = mockDC;
      conn.send("hello");
      expect(mockDC.send).not.toHaveBeenCalled();
    });

    it("does not send when no channel", () => {
      const conn = new WebRTCConnection();
      conn.send("hello");
      expect(mockDC.send).not.toHaveBeenCalled();
    });
  });

  describe("close", () => {
    it("closes data channel and peer connection", () => {
      const conn = new WebRTCConnection();
      conn._dc = mockDC;
      conn._pc = mockPC;
      conn.close();
      expect(mockDC.close).toHaveBeenCalled();
      expect(mockPC.close).toHaveBeenCalled();
      expect(conn._dc).toBeNull();
      expect(conn._pc).toBeNull();
    });

    it("handles null dc and pc", () => {
      const conn = new WebRTCConnection();
      expect(() => conn.close()).not.toThrow();
    });
  });
});
