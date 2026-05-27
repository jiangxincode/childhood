import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// RoomUI requires DOM (document, window) so we test what we can
// Full integration testing requires a browser environment

describe("RoomUI module exports", () => {
  it("exports RoomUI class", () => {
    // In Node.js, window is undefined so RoomUI won't be set on it
    // But module.exports should work
    const { RoomUI } = require("./room-ui.js");
    expect(typeof RoomUI).toBe("function");
  });

  it("has isSupported static method", () => {
    const { RoomUI } = require("./room-ui.js");
    expect(typeof RoomUI.isSupported).toBe("function");
  });

  it("isSupported returns false when WebRTCConnection is missing", () => {
    const { RoomUI } = require("./room-ui.js");
    // In Node.js, WebRTCConnection is not on globalThis
    expect(RoomUI.isSupported()).toBe(false);
  });

  it("isSupported returns true when WebRTCConnection exists and is supported", () => {
    const { RoomUI } = require("./room-ui.js");
    globalThis.WebRTCConnection = { isSupported: () => true };
    expect(RoomUI.isSupported()).toBe(true);
    delete globalThis.WebRTCConnection;
  });

  it("constructor stores callbacks", () => {
    const { RoomUI } = require("./room-ui.js");
    const cb = { onConnectionEstablished: () => {} };
    const ui = new RoomUI(cb);
    expect(ui._callbacks).toBe(cb);
    expect(ui._destroyed).toBe(false);
  });

  it("constructor handles missing callbacks", () => {
    const { RoomUI } = require("./room-ui.js");
    const ui = new RoomUI();
    expect(ui._callbacks).toEqual({});
  });

  it("destroy sets destroyed flag", () => {
    const { RoomUI } = require("./room-ui.js");
    const ui = new RoomUI();
    ui.destroy();
    expect(ui._destroyed).toBe(true);
  });

  it("show is a no-op after destroy", () => {
    const { RoomUI } = require("./room-ui.js");
    const ui = new RoomUI();
    ui.destroy();
    // Should not throw even without DOM
    expect(() => ui.show()).not.toThrow();
  });
});
