"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SOConnection = void 0;
var _SOClient = require("./SOClient");
class SOConnection {
  static _instance = null;
  _lastUsername = "";
  _lastPassword = "";
  constructor(cfg) {
    this._config = {
      host: cfg.host,
      application: cfg.application,
      deviceWidth: cfg.deviceWidth ?? 1024,
      deviceHeight: cfg.deviceHeight ?? 768,
      secured: cfg.secured ?? true,
      apiKey: cfg.apiKey ?? ""
    };
    this._client = this.createClient();
  }

  // ---------------- Singleton ----------------
  static init(cfg) {
    SOConnection._instance = new SOConnection(cfg);
    return SOConnection._instance;
  }
  static get() {
    if (!SOConnection._instance) {
      throw new Error("SOConnection not initialized. Call SOConnection.init(...) at app startup.");
    }
    return SOConnection._instance;
  }

  // ---------------- Client lifecycle ----------------
  createClient() {
    return new _SOClient.SOClient(this._config.host, this._config.application, this._config.deviceWidth, this._config.deviceHeight, this._config.secured, this._config.apiKey);
  }
  reset() {
    this._client = this.createClient();
    this._lastUsername = "";
    this._lastPassword = "";
  }
  rawClient() {
    return this._client;
  }

  // ---------------- Auth ----------------
  /**
   * Returns "" on success, or error message on failure (same contract as SOClient.login).
   * If login fails, it recreates the client (same pattern you used in Flutter).
   */
  async login(username, password) {
    if (!username?.trim()) return "Username can't be empty";
    if (password == null) password = "";
    this._lastUsername = username;
    this._lastPassword = password;
    const status = await this._client.login(username, password);
    if (status !== "") {
      // recreate client on failure (important when server expects clean state)
      this._client = this.createClient();
    }
    return status;
  }
  async logout() {
    try {
      await this._client.logout();
    } finally {
      // keep wrapper alive; create a fresh client for next login
      this._client = this.createClient();
      this._lastUsername = "";
      this._lastPassword = "";
    }
  }

  /**
   * Attempt re-login using the last successful credentials you provided.
   */
  async relogin() {
    if (!this._lastUsername) return "No previous username available";
    return this.login(this._lastUsername, this._lastPassword);
  }

  // ---------------- Commands ----------------
  async command(command, attributes, preserveServerState = false) {
    if (!command?.trim()) return {
      status: "ERROR",
      message: "Command can't be empty"
    };
    return this._client.command(command, attributes, preserveServerState);
  }
  async info(command, attributes) {
    if (!command?.trim()) return {
      status: "ERROR",
      message: "Command can't be empty"
    };
    return this._client.info(command, attributes);
  }

  // ---------------- Register / Password policy ----------------
  async registerInit(args) {
    return this._client.command("register", {
      action: "init",
      firstName: args.firstName,
      middleName: args.middleName ?? "",
      lastName: args.lastName,
      gender: args.gender,
      email: args.email,
      mobile: args.mobile,
      password: args.password
    });
  }

  /**
   * For register step-2 using OTP (Flutter: registerCreate)
   * uses preserveServerState=true to continue server workflow.
   */
  async registerCreate(emailOtp) {
    return this._client.command("register", {
      action: "create",
      emailOTP: emailOtp
    }, true);
  }
  async applyPasswordPolicy(password) {
    return this._client.command("register", {
      action: "applyPasswordPolicy",
      password
    });
  }

  // ---------------- Binary APIs ----------------
  async stream(fileName) {
    if (!fileName?.trim()) return [null, null, "Invalid file name"];
    return this._client.file(fileName);
  }
  async report(logic, parameters) {
    if (!logic?.trim()) return [null, null, "Invalid report logic"];
    return this._client.report(logic, parameters);
  }
  async upload(mimeType, data, streamNameOrID = "") {
    if (!mimeType?.trim()) return {
      status: "ERROR",
      message: "mimeType can't be empty"
    };
    if (!data || data.byteLength === 0) return {
      status: "ERROR",
      message: "data can't be empty"
    };
    return this._client.upload(mimeType, data, streamNameOrID);
  }
  async menu() {
    return await this._client.command("listMenu", {});
  }

  // ---------------- Static Convenience Wrappers ----------------

  static async login(username, password) {
    return SOConnection.get().login(username, password);
  }
  static async logout() {
    return SOConnection.get().logout();
  }
  static async command(command, attributes, preserveServerState = false) {
    return SOConnection.get().command(command, attributes, preserveServerState);
  }
  static async info(command, attributes) {
    return SOConnection.get().info(command, attributes);
  }
  static async relogin() {
    return SOConnection.get().relogin();
  }
  static async registerInit(args) {
    return SOConnection.get().registerInit(args);
  }
  static async registerCreate(emailOtp) {
    return SOConnection.get().registerCreate(emailOtp);
  }
  static async applyPasswordPolicy(password) {
    return SOConnection.get().applyPasswordPolicy(password);
  }
  static async upload(mimeType, data, streamNameOrID = "") {
    return SOConnection.get().upload(mimeType, data, streamNameOrID);
  }
  static async menu() {
    return SOConnection.get().menu();
  }
  static async stream(fileName) {
    return SOConnection.get().stream(fileName);
  }
  static async report(logic, parameters) {
    return SOConnection.get().report(logic, parameters);
  }
}
exports.SOConnection = SOConnection;
//# sourceMappingURL=SOConnection.js.map