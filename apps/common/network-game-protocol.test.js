import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const {
  NetworkGameProtocol,
  validateAction,
  validateRPSChoice,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
} = require("./network-game-protocol.js");

// --- Validation ---

describe("validateAction", () => {
  it("accepts valid action object", () => {
    expect(validateAction({ a: "place", x: 7, y: 7 })).toBe(true);
  });
  it("accepts minimal action with only 'a' field", () => {
    expect(validateAction({ a: "roll" })).toBe(true);
  });
  it("rejects null", () => {
    expect(validateAction(null)).toBe(false);
  });
  it("rejects non-object", () => {
    expect(validateAction("string")).toBe(false);
  });
  it("rejects missing 'a' field", () => {
    expect(validateAction({ x: 1 })).toBe(false);
  });
  it("rejects non-string 'a' field", () => {
    expect(validateAction({ a: 123 })).toBe(false);
  });
});

describe("validateRPSChoice", () => {
  it("accepts rock", () => {
    expect(validateRPSChoice("rock")).toBe(true);
  });
  it("accepts scissors", () => {
    expect(validateRPSChoice("scissors")).toBe(true);
  });
  it("accepts paper", () => {
    expect(validateRPSChoice("paper")).toBe(true);
  });
  it("rejects invalid string", () => {
    expect(validateRPSChoice("lizard")).toBe(false);
  });
  it("rejects empty string", () => {
    expect(validateRPSChoice("")).toBe(false);
  });
  it("rejects null", () => {
    expect(validateRPSChoice(null)).toBe(false);
  });
});

// --- Protocol ---

describe("NetworkGameProtocol", () => {
  let mockConn;
  let sentMessages;

  beforeEach(() => {
    vi.useFakeTimers();
    sentMessages = [];
    mockConn = {
      _callbacks: {
        onData: null,
        onChannelClose: null,
      },
      send: vi.fn((data) => {
        sentMessages.push(JSON.parse(data));
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createProtocol(callbacks) {
    return new NetworkGameProtocol(mockConn, callbacks);
  }

  function simulateIncoming(protocol, obj) {
    const raw = JSON.stringify(obj);
    // The start() method overrides _callbacks.onData
    mockConn._callbacks.onData(raw);
  }

  describe("sendAction", () => {
    it("sends action message with correct format", () => {
      const p = createProtocol();
      p.sendAction({ a: "place", x: 7, y: 7 });
      expect(mockConn.send).toHaveBeenCalled();
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.t).toBe("a");
      expect(msg.d).toEqual({ a: "place", x: 7, y: 7 });
    });

    it("sends move action", () => {
      const p = createProtocol();
      p.sendAction({ a: "move", fx: 1, fy: 2, tx: 3, ty: 4 });
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.d.a).toBe("move");
      expect(msg.d.fx).toBe(1);
    });

    it("sends flip action", () => {
      const p = createProtocol();
      p.sendAction({ a: "flip", x: 2, y: 3 });
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.d.a).toBe("flip");
    });

    it("sends roll action for flying chess", () => {
      const p = createProtocol();
      p.sendAction({ a: "roll" });
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.d.a).toBe("roll");
    });
  });

  describe("sendRPSChoice", () => {
    it("sends valid RPS choice", () => {
      const p = createProtocol();
      p.sendRPSChoice("rock");
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.t).toBe("r");
      expect(msg.d).toBe("rock");
    });

    it("rejects invalid choice", () => {
      const p = createProtocol();
      p.sendRPSChoice("lizard");
      expect(mockConn.send).not.toHaveBeenCalled();
    });
  });

  describe("sendRPSResult", () => {
    it("sends result with choices and firstPlayer", () => {
      const p = createProtocol();
      p.sendRPSResult({ host: "rock", guest: "scissors" }, "host");
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.t).toBe("R");
      expect(msg.d.h).toBe("rock");
      expect(msg.d.g).toBe("scissors");
      expect(msg.d.f).toBe("host");
    });

    it("sends draw result", () => {
      const p = createProtocol();
      p.sendRPSResult(null, null);
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.d.h).toBeNull();
      expect(msg.d.f).toBeNull();
    });
  });

  describe("sendRestart", () => {
    it("sends restart message", () => {
      const p = createProtocol();
      p.sendRestart();
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.t).toBe("n");
    });
  });

  describe("message receiving", () => {
    it("dispatches action messages to onAction", () => {
      const onAction = vi.fn();
      const p = createProtocol({ onAction });
      p.start();

      const actionData = { a: "place", x: 3, y: 4 };
      simulateIncoming(p, { t: "a", d: actionData });

      expect(onAction).toHaveBeenCalledWith(actionData);
    });

    it("dispatches RPS choice to onRPSChoice", () => {
      const onRPSChoice = vi.fn();
      const p = createProtocol({ onRPSChoice });
      p.start();

      simulateIncoming(p, { t: "r", d: "paper" });

      expect(onRPSChoice).toHaveBeenCalledWith("paper");
    });

    it("dispatches RPS result to onRPSResult", () => {
      const onRPSResult = vi.fn();
      const p = createProtocol({ onRPSResult });
      p.start();

      simulateIncoming(p, { t: "R", d: { h: "rock", g: "scissors", f: "host" } });

      expect(onRPSResult).toHaveBeenCalledWith({
        hostChoice: "rock",
        guestChoice: "scissors",
        firstPlayer: "host",
      });
    });

    it("dispatches restart to onRestart", () => {
      const onRestart = vi.fn();
      const p = createProtocol({ onRestart });
      p.start();

      simulateIncoming(p, { t: "n" });

      expect(onRestart).toHaveBeenCalled();
    });

    it("ignores heartbeat messages silently", () => {
      const onAction = vi.fn();
      const onRestart = vi.fn();
      const p = createProtocol({ onAction, onRestart });
      p.start();

      simulateIncoming(p, { t: "h" });

      expect(onAction).not.toHaveBeenCalled();
      expect(onRestart).not.toHaveBeenCalled();
    });

    it("reports protocol error for invalid JSON", () => {
      const onProtocolError = vi.fn();
      const p = createProtocol({ onProtocolError });
      p.start();

      // Simulate raw invalid JSON
      mockConn._callbacks.onData("not-json{{{");

      expect(onProtocolError).toHaveBeenCalledWith("Invalid JSON message");
    });

    it("reports protocol error for missing type", () => {
      const onProtocolError = vi.fn();
      const p = createProtocol({ onProtocolError });
      p.start();

      simulateIncoming(p, { d: "something" });

      expect(onProtocolError).toHaveBeenCalledWith("Missing message type");
    });

    it("reports protocol error for unknown type", () => {
      const onProtocolError = vi.fn();
      const p = createProtocol({ onProtocolError });
      p.start();

      simulateIncoming(p, { t: "z" });

      expect(onProtocolError).toHaveBeenCalledWith("Unknown message type: z");
    });

    it("reports protocol error for invalid action", () => {
      const onProtocolError = vi.fn();
      const p = createProtocol({ onProtocolError });
      p.start();

      simulateIncoming(p, { t: "a", d: "not-an-object" });

      expect(onProtocolError).toHaveBeenCalledWith("Invalid action data");
    });

    it("reports protocol error for invalid RPS choice", () => {
      const onProtocolError = vi.fn();
      const p = createProtocol({ onProtocolError });
      p.start();

      simulateIncoming(p, { t: "r", d: "rockets" });

      expect(onProtocolError).toHaveBeenCalledWith("Invalid RPS choice");
    });
  });

  describe("heartbeat", () => {
    it("sends heartbeat at interval", () => {
      const p = createProtocol();
      p.start();

      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

      expect(mockConn.send).toHaveBeenCalled();
      const msg = JSON.parse(mockConn.send.mock.calls[0][0]);
      expect(msg.t).toBe("h");
    });

    it("fires onDisconnect after timeout", () => {
      const onDisconnect = vi.fn();
      const p = createProtocol({ onDisconnect });
      p.start();

      // Advance past heartbeat timeout without receiving any messages
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS + 1000);

      expect(onDisconnect).toHaveBeenCalled();
    });

    it("resets timeout on receiving messages", () => {
      const onDisconnect = vi.fn();
      const p = createProtocol({ onDisconnect });
      p.start();

      // Advance partway
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      // Receive a message (resets timeout)
      simulateIncoming(p, { t: "h" });
      // Advance partway again
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      // Should not have disconnected
      expect(onDisconnect).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("stops heartbeat", () => {
      const p = createProtocol();
      p.start();
      p.destroy();

      mockConn.send.mockClear();
      vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);

      expect(mockConn.send).not.toHaveBeenCalled();
    });

    it("can be called multiple times", () => {
      const p = createProtocol();
      p.start();
      expect(() => {
        p.destroy();
        p.destroy();
      }).not.toThrow();
    });
  });

  describe("setCallbacks", () => {
    it("updates callbacks", () => {
      const onAction1 = vi.fn();
      const onAction2 = vi.fn();
      const p = createProtocol({ onAction: onAction1 });
      p.start();

      p.setCallbacks({ onAction: onAction2 });
      simulateIncoming(p, { t: "a", d: { a: "roll" } });

      expect(onAction1).not.toHaveBeenCalled();
      expect(onAction2).toHaveBeenCalled();
    });
  });
});
