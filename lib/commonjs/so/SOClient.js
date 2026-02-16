"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SOClient = void 0;
/**
 * Simple async mutex (like synchronized Lock in Dart)
 */
class Mutex {
  queue = [];
  locked = false;
  async runExclusive(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
  acquire() {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise(resolve => this.queue.push(resolve));
  }
  release() {
    const next = this.queue.shift();
    if (next) next();else this.locked = false;
  }
}
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function asString(e) {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * SO Platform Client (Dart model)
 *
 * Usage:
 *   const c = new SOClient("storedobject.com", "yatramitra", 1024, 768, true, apiKey);
 *   const err = await c.login("user", "pass");
 *   const r = await c.command("someCommand", {x:1});
 */
class SOClient {
  // Application name

  // Device width/height

  // API key (optional)

  // API version (fixed like Dart)
  apiVersion = 1;
  subscriptionActive = true;
  lock = new Mutex();
  lockBinary = new Mutex();
  username_ = "";
  password_ = "";
  session_ = "";
  otpEmail_ = "";
  received = [];
  receivedBinary = [];
  constructor(host, application, deviceWidth = 1024, deviceHeight = 768, secured = true, apiKey = "") {
    this.application = application;
    this.deviceWidth = deviceWidth;
    this.deviceHeight = deviceHeight;
    this.apiKey = apiKey;
    const url = `ws${secured ? "s" : ""}://${host}/${application}/CONNECTORWS`;

    // RN WebSocket supports (url, protocols?)
    // Dart used 'Bearer <apiKey>' as a protocol if apiKey set.
    const protocols = apiKey && apiKey.length > 0 ? [`Bearer ${apiKey}`] : undefined;
    this.ws = new WebSocket(url, protocols);
    this.ws.onmessage = event => {
      const msg = event.data;
      // RN may give string or ArrayBuffer
      if (typeof msg === "string") {
        this.received.push(msg);
      } else if (msg instanceof ArrayBuffer) {
        this.receivedBinary.push(new Uint8Array(msg));
      } else if (msg && msg.byteLength != null) {
        // sometimes Blob-like / typed array
        try {
          // best effort
          this.receivedBinary.push(new Uint8Array(msg));
        } catch {
          // ignore
        }
      }
    };
    this.ws.onerror = () => {
      // We don't throw here — Dart code also doesn't.
      // Requests will time out or fail when waiting for data.
    };
    this.ws.onclose = () => {
      this.subscriptionActive = false;
    };
  }

  // --- getters like Dart ---
  get username() {
    return this.username_;
  }
  checkPassword(password) {
    return password === this.password_;
  }

  // --- lifecycle ---
  async logout() {
    try {
      await this.command("logout", {});
      this.subscriptionActive = false;
      try {
        this.ws.close();
      } catch {}
    } finally {
      this.session_ = "";
      this.password_ = "";
      this.username_ = "";
    }
  }

  // --- auth ---
  async login(username, password = "") {
    if (this.username_ !== "") return "Already logged in";
    if (username === "") return "Username can't be empty";
    const map = {
      command: "login",
      user: username,
      password,
      version: this.apiVersion,
      deviceWidth: this.deviceWidth,
      deviceHeight: this.deviceHeight
    };
    this.session_ = "";
    const r = await this.post(map);
    if (r["status"] !== "OK") return String(r["message"] ?? "Login failed");
    this.session_ = String(r["session"] ?? "");
    this.username_ = username;
    this.password_ = password;
    return "";
  }
  async otp(email, mobile = "") {
    this.otpEmail_ = email;
    const map = {
      action: "init",
      email,
      mobile
    };
    return this.command("otp", map);
  }
  async otpLogin(emailOTP, mobileOTP = 0) {
    if (this.username_ !== "") return "Already logged in";
    if (this.otpEmail_ === "" || this.session_ === "") return "OTP was not generated";
    const map = {
      command: "otp",
      action: "login",
      continue: true,
      session: this.session_,
      emailOTP,
      mobileOTP,
      version: this.apiVersion,
      deviceWidth: this.deviceWidth,
      deviceHeight: this.deviceHeight
    };
    const r = await this.post(map);
    if (r["status"] !== "OK") return String(r["message"] ?? "OTP login failed");
    this.session_ = String(r["session"] ?? "");
    this.username_ = this.otpEmail_;
    this.password_ = r["secret"] ?? "";
    return "";
  }
  async changePassword(currentPassword, newPassword) {
    if (!this.checkPassword(currentPassword)) return "Current password is incorrect";
    const r = await this.command("changePassword", {
      oldPassword: this.password_,
      newPassword
    });
    if (r["status"] === "OK") {
      this.password_ = newPassword;
      return "";
    }
    return String(r["message"] ?? "Password change failed");
  }

  // --- core command API (matches Dart) ---
  async command(command, attributes, preserveServerState = false) {
    return this._command(command, attributes, true, preserveServerState, true);
  }
  async info(command, attributes) {
    return this._command(command, attributes, true, false, false);
  }

  // --- stream/file/report model (binary follows JSON response) ---
  async stream(name) {
    return this._stream("stream", name);
  }
  async file(name) {
    return this._stream("file", name);
  }
  async report(logic, parameters) {
    let m;
    if (parameters) {
      const p = parameters["parameters"];
      if (p && typeof p === "object" && !Array.isArray(p)) m = parameters;else m = {
        parameters
      };
    }
    return this._stream("report", logic, m);
  }
  async upload(mimeType, data, streamNameOrID = "") {
    let map = await this._upload(mimeType, streamNameOrID);
    if (map == null) map = await this.postBinary(data);
    delete map["session"];
    return map;
  }

  // NOTE: React Native WebSocket cannot stream incremental chunks like Dart addStream easily.
  // You can still send one binary payload. For real streaming, we can chunk it manually.
  async uploadStream(mimeType, data, streamNameOrID = "") {
    // minimal chunked implementation: concatenate (safe for small/medium payloads)
    const chunks = [];
    let total = 0;
    for await (const c of data) {
      chunks.push(c);
      total += c.byteLength;
    }
    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.byteLength;
    }
    return this.upload(mimeType, merged, streamNameOrID);
  }

  // ------------- internal helpers (close to Dart) -------------

  error(error) {
    return {
      status: "ERROR",
      message: error
    };
  }
  action(attributes) {
    const a = attributes["action"];
    return typeof a === "string" ? a : "";
  }
  setOTPEmail(attributes) {
    const email = attributes["email"];
    if (email != null) this.otpEmail_ = String(email);
  }
  async _command(command, attributes, checkCommand, preserveServerState, loginRequired) {
    let sessionRequired = loginRequired;
    if (sessionRequired && command === "register") {
      loginRequired = false;
      const act = this.action(attributes);
      sessionRequired = !(act === "init" || act === "otp");
    } else if (sessionRequired && command === "otp") {
      const act = this.action(attributes);
      sessionRequired = act !== "init";
      if (sessionRequired) loginRequired = act !== "verify";
    }
    if (!sessionRequired) this.setOTPEmail(attributes);
    if (sessionRequired && (loginRequired && this.username_ === "" || this.session_ === "")) {
      return this.error("Not logged in");
    }
    if (checkCommand) {
      switch (command) {
        case "file":
        case "stream":
          return this.error("Invalid command");
      }
    }
    if (sessionRequired) attributes["session"] = this.session_;
    attributes["command"] = command;
    if (preserveServerState) attributes["continue"] = true;
    const r = await this.post(attributes);
    if (r["status"] === "LOGIN") {
      this.session_ = String(r["session"] ?? "");
      const u = this.username_;
      this.username_ = "";
      const st = await this.login(u, this.password_);
      if (st !== "") return this.error(`Can't re-login. Reason: ${st}`);

      // Re-run command (Dart does: return await this.command(command, attributes, false); )
      // Important: avoid recursion with checkCommand to false
      return await this._command(command, attributes, false, preserveServerState, true);
    } else if (!sessionRequired) {
      this.session_ = String(r["session"] ?? "");
    }
    delete r["session"];
    return r;
  }
  async _stream(command, name, parameters) {
    const params = parameters ? {
      ...parameters
    } : {};
    params[command] = name;
    const r = await this._command(command, params, false, false, true);
    if (r["status"] === "ERROR") {
      return [null, null, String(r["message"] ?? "ERROR")];
    }

    // binary is received after the json response
    return await this.lockBinary.runExclusive(async () => {
      const bin = await this.receiveBinary();
      return [bin, String(r["type"] ?? ""), null];
    });
  }
  async _upload(mimeType, streamNameOrID = "") {
    const map = {
      type: mimeType,
      ...(streamNameOrID !== "" ? {
        stream: streamNameOrID
      } : {})
    };
    const r = await this.command("upload", map);
    return r["status"] === "OK" ? null : r;
  }

  /**
   * Dart model: lock -> send -> wait for next string message
   */
  async post(map) {
    return await this.lock.runExclusive(async () => {
      try {
        await this.ensureOpen();
        this.ws.send(JSON.stringify(map));
        const msg = await this.receive();
        return JSON.parse(msg);
      } catch (e) {
        return this.error(asString(e));
      }
    });
  }
  async postBinary(data) {
    return await this.lock.runExclusive(async () => {
      try {
        await this.ensureOpen();
        // RN WebSocket supports ArrayBuffer/TypedArray
        this.ws.send(data);
        const msg = await this.receive();
        return JSON.parse(msg);
      } catch (e) {
        return this.error(asString(e));
      }
    });
  }
  async ensureOpen() {
    // Wait until socket is open (like implicit in Dart channel connect)
    const start = Date.now();
    while (this.ws.readyState === WebSocket.CONNECTING) {
      await delay(50);
      if (Date.now() - start > 10_000) throw new Error("WebSocket connect timeout");
    }
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
  }
  async receive() {
    // Dart: while (_received.isEmpty) delay(100)
    while (this.received.length === 0) {
      if (!this.subscriptionActive && this.ws.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket closed");
      }
      await delay(100);
    }
    return this.received.shift();
  }
  async receiveBinary() {
    while (this.receivedBinary.length === 0) {
      if (!this.subscriptionActive && this.ws.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket closed");
      }
      await delay(100);
    }
    return this.receivedBinary.shift();
  }
}
exports.SOClient = SOClient;
//# sourceMappingURL=SOClient.js.map