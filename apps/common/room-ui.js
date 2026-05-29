/* eslint-disable no-undef */
// ============================================================
// Room UI Component
// Overlay for creating/joining WebRTC game rooms
// ============================================================

/**
 * Reusable room creation/joining UI overlay.
 * Manages the full flow: choice → create/join → exchange codes → connected.
 */
class RoomUI {
  /**
   * @param {Object} callbacks
   * @param {function(WebRTCConnection, NetworkGameProtocol, string):void} callbacks.onConnectionEstablished
   * @param {function(string):void} callbacks.onError
   * @param {function():void} callbacks.onCancel
   */
  constructor(callbacks) {
    this._callbacks = callbacks || {};
    this._overlay = null;
    this._connection = null;
    this._protocol = null;
    this._role = null;
    this._destroyed = false;
  }

  /**
   * Check if WebRTC is supported.
   * @returns {boolean}
   */
  static isSupported() {
    return typeof WebRTCConnection !== "undefined" && WebRTCConnection.isSupported();
  }

  /**
   * Show the room overlay.
   */
  show() {
    if (this._destroyed) return;
    this._createDOM();
    this._overlay.style.display = "flex";
    this._showState("choice");
  }

  /**
   * Hide the room overlay.
   */
  hide() {
    if (this._overlay) {
      this._overlay.style.display = "none";
    }
  }

  /**
   * Remove the overlay and clean up.
   */
  destroy() {
    this._destroyed = true;
    this._cleanupConnection();
    if (this._overlay?.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
  }

  // --- DOM ---

  _createDOM() {
    if (this._overlay) return;

    const el = document.createElement("div");
    el.id = "room-overlay";
    el.className = "room-overlay";
    el.style.display = "none";
    el.innerHTML = `
      <div class="room-content">
        <h2>联网对战</h2>

        <!-- State 1: Choice -->
        <div id="room-choice">
          <div class="room-buttons">
            <button id="btn-create-room" class="btn-room">创建房间</button>
            <button id="btn-join-room" class="btn-room">加入房间</button>
          </div>
        </div>

        <!-- State 2a: Creating -->
        <div id="room-create" style="display:none;">
          <p class="room-status" id="create-status">正在创建房间...</p>
          <div id="room-code-section" class="room-section" style="display:none;">
            <label>房间码（发送给对方）：</label>
            <textarea id="room-code-output" readonly rows="4"></textarea>
            <div class="room-actions">
              <button id="btn-copy-room-code" class="btn-small">复制</button>
            </div>
          </div>
          <div class="room-divider"></div>
          <div id="response-code-section" class="room-section" style="display:none;">
            <label>粘贴对方的响应码：</label>
            <textarea id="response-code-input" rows="4" placeholder="粘贴响应码..."></textarea>
            <div class="room-actions">
              <button id="btn-connect" class="btn-small" disabled>连接</button>
            </div>
          </div>
        </div>

        <!-- State 2b: Joining -->
        <div id="room-join" style="display:none;">
          <div class="room-section">
            <label>粘贴房间码：</label>
            <textarea id="room-code-input" rows="4" placeholder="粘贴房间码..."></textarea>
            <div class="room-actions">
              <button id="btn-join" class="btn-small" disabled>加入</button>
            </div>
          </div>
          <div id="join-response-section" style="display:none;">
            <div class="room-divider"></div>
            <p class="room-status" id="join-status">正在生成响应码...</p>
            <div class="room-section">
              <label>响应码（发送给对方）：</label>
              <textarea id="response-code-output" readonly rows="4"></textarea>
              <div class="room-actions">
                <button id="btn-copy-response" class="btn-small">复制</button>
              </div>
            </div>
            <p class="room-status">等待对方连接...</p>
          </div>
        </div>

        <!-- State 3: Connected -->
        <div id="room-connected" style="display:none;">
          <p class="room-status success">连接成功！</p>
        </div>

        <!-- Error -->
        <p id="room-error" class="room-error" style="display:none;"></p>

        <!-- Cancel -->
        <button id="btn-cancel-room" class="btn-cancel">取消</button>
      </div>
    `;

    document.body.appendChild(el);
    this._overlay = el;
    this._bindEvents();
  }

  _bindEvents() {
    const $ = (id) => this._overlay.querySelector("#" + id);

    // Choice buttons
    $("btn-create-room").addEventListener("click", () => {
      this._startCreate();
    });

    $("btn-join-room").addEventListener("click", () => {
      this._showState("join");
    });

    // Copy buttons
    $("btn-copy-room-code").addEventListener("click", () => {
      this._copyToClipboard($("room-code-output").value, $("btn-copy-room-code"));
    });

    $("btn-copy-response").addEventListener("click", () => {
      this._copyToClipboard($("response-code-output").value, $("btn-copy-response"));
    });

    // Response code input
    $("response-code-input").addEventListener("input", () => {
      $("btn-connect").disabled = !$("response-code-input").value.trim();
    });

    // Connect button (host pastes guest's response)
    $("btn-connect").addEventListener("click", () => {
      this._connectAsHost();
    });

    // Room code input (guest pastes host's room code)
    $("room-code-input").addEventListener("input", () => {
      $("btn-join").disabled = !$("room-code-input").value.trim();
    });

    // Join button (guest submits host's room code)
    $("btn-join").addEventListener("click", () => {
      this._joinAsGuest();
    });

    // Cancel
    $("btn-cancel-room").addEventListener("click", () => {
      this._cancel();
    });
  }

  // --- State Machine ---

  _showState(state) {
    const $ = (id) => this._overlay.querySelector("#" + id);

    $("room-choice").style.display = "none";
    $("room-create").style.display = "none";
    $("room-join").style.display = "none";
    $("room-connected").style.display = "none";
    $("room-error").style.display = "none";

    switch (state) {
      case "choice":
        $("room-choice").style.display = "block";
        break;
      case "create":
        $("room-create").style.display = "block";
        break;
      case "join":
        $("room-join").style.display = "block";
        break;
      case "connected":
        $("room-connected").style.display = "block";
        break;
    }
  }

  _showError(msg) {
    const el = this._overlay.querySelector("#room-error");
    el.textContent = msg;
    el.style.display = "block";
  }

  // --- Host Flow ---

  async _startCreate() {
    this._showState("create");
    this._role = "host";

    const $ = (id) => this._overlay.querySelector("#" + id);
    $("create-status").textContent = "正在创建房间...";

    try {
      this._connection = new WebRTCConnection({
        onError: (err) => {
          this._showError("连接错误：" + (err.message || err));
        },
      });

      const roomCode = await this._connection.createOffer();

      if (this._destroyed) return;

      $("room-code-output").value = roomCode;
      $("room-code-section").style.display = "block";
      $("response-code-section").style.display = "block";
      $("create-status").textContent = "请将房间码发送给对方，然后粘贴对方的响应码";
    } catch (err) {
      if (this._destroyed) return;
      this._showError("创建房间失败：" + err.message);
    }
  }

  async _connectAsHost() {
    const $ = (id) => this._overlay.querySelector("#" + id);
    const responseCode = $("response-code-input").value.trim();
    if (!responseCode) return;

    $("btn-connect").disabled = true;
    $("btn-connect").textContent = "连接中...";

    try {
      // Set up channel open listener before accepting answer
      this._connection._callbacks.onChannelOpen = () => {
        this._onConnected();
      };

      await this._connection.acceptAnswer(responseCode);

      // Connection may already be open or will open shortly
      // The onChannelOpen callback handles the rest
    } catch (err) {
      if (this._destroyed) return;
      this._showError("连接失败：" + err.message);
      $("btn-connect").disabled = false;
      $("btn-connect").textContent = "连接";
    }
  }

  // --- Guest Flow ---

  async _joinAsGuest() {
    const $ = (id) => this._overlay.querySelector("#" + id);
    const roomCode = $("room-code-input").value.trim();
    if (!roomCode) return;

    $("btn-join").disabled = true;
    $("btn-join").textContent = "加入中...";
    this._role = "guest";

    try {
      this._connection = new WebRTCConnection({
        onChannelOpen: () => {
          this._onConnected();
        },
        onError: (err) => {
          this._showError("连接错误：" + (err.message || err));
        },
      });

      const responseCode = await this._connection.acceptOffer(roomCode);

      if (this._destroyed) return;

      $("response-code-output").value = responseCode;
      $("join-response-section").style.display = "block";
      $("join-status").textContent = "请将响应码发送给对方，等待连接建立...";
    } catch (err) {
      if (this._destroyed) return;
      this._showError("加入房间失败：" + err.message);
      $("btn-join").disabled = false;
      $("btn-join").textContent = "加入";
    }
  }

  // --- Connected ---

  _onConnected() {
    if (this._destroyed) return;

    this._protocol = new NetworkGameProtocol(this._connection, {});
    this._protocol.start();

    this._showState("connected");

    setTimeout(() => {
      if (this._destroyed) return;
      this.hide();
      if (this._callbacks.onConnectionEstablished) {
        this._callbacks.onConnectionEstablished(this._connection, this._protocol, this._role);
      }
    }, 1500);
  }

  // --- Cancel ---

  _cancel() {
    this._cleanupConnection();
    this.hide();
    if (this._callbacks.onCancel) {
      this._callbacks.onCancel();
    }
  }

  _cleanupConnection() {
    if (this._protocol) {
      this._protocol.destroy();
      this._protocol = null;
    }
    if (this._connection) {
      this._connection.close();
      this._connection = null;
    }
  }

  // --- Clipboard ---

  async _copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const orig = button.textContent;
      button.textContent = "已复制!";
      setTimeout(() => {
        button.textContent = orig;
      }, 1500);
    } catch {
      // Silently fail
    }
  }
}

// Expose on window for browser use
if (typeof window !== "undefined") {
  window.RoomUI = RoomUI;
}

// Module exports for Node.js testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RoomUI };
}
