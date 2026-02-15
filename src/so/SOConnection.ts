import { SOClient, SOResponse } from "./SOClient";

export type Uint8 = Uint8Array;
export type StreamResult = [Uint8 | null, string | null, string | null];

export type SOConnectionConfig = {
  host: string;           // e.g. storedobject.com
  application: string;    // e.g. yatramitra
  deviceWidth?: number;
  deviceHeight?: number;
  secured?: boolean;
  apiKey?: string;
};

export type RegisterInitArgs = {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: number;
  email: string;
  mobile: string;
  password: string;
};

export type SOMenuItem = {
  id: string | number;
  title: string;
  className: string;
  icon?: string;
  params?: any;
}

export type SOMenuResponse = SOResponse & {
  menu?: SOMenuItem[];
};

export class SOConnection {
  private static _instance: SOConnection | null = null;

  private _client: SOClient;
  private _config: Required<SOConnectionConfig>;
  private _lastUsername = "";
  private _lastPassword = "";

  private constructor(cfg: SOConnectionConfig) {
    this._config = {
      host: cfg.host,
      application: cfg.application,
      deviceWidth: cfg.deviceWidth ?? 1024,
      deviceHeight: cfg.deviceHeight ?? 768,
      secured: cfg.secured ?? true,
      apiKey: cfg.apiKey ?? "",
    };

    this._client = this.createClient();
  }

  // ---------------- Singleton ----------------
  static init(cfg: SOConnectionConfig): SOConnection {
    SOConnection._instance = new SOConnection(cfg);
    return SOConnection._instance;
  }

  static get(): SOConnection {
    if (!SOConnection._instance) {
      throw new Error("SOConnection not initialized. Call SOConnection.init(...) at app startup.");
    }
    return SOConnection._instance;
  }

  // ---------------- Client lifecycle ----------------
  private createClient(): SOClient {
    return new SOClient(
      this._config.host,
      this._config.application,
      this._config.deviceWidth,
      this._config.deviceHeight,
      this._config.secured,
      this._config.apiKey
    );
  }

  /**
   * Drops the current socket + client instance and creates a fresh one.
   * (Your Flutter pattern: _client = Client(host, application))
   */
  reset(): void {
    this._client = this.createClient();
    this._lastUsername = "";
    this._lastPassword = "";
  }

  /**
   * Returns the underlying client if you need low-level access.
   * Keep usage minimal to avoid bypassing the wrapper.
   */
  rawClient(): SOClient {
    return this._client;
  }

  // ---------------- Auth ----------------
  /**
   * Returns "" on success, or error message on failure (same contract as SOClient.login).
   * If login fails, it recreates the client (same pattern you used in Flutter).
   */
  async login(username: string, password: string): Promise<string> {
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

  async logout(): Promise<void> {
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
   * Optional helper: attempt re-login using the last successful credentials you provided.
   * Useful when server returns status=LOGIN and SOClient attempts re-login internally;
   * but exposing it here can be handy for UI flows.
   */
  async relogin(): Promise<string> {
    if (!this._lastUsername) return "No previous username available";
    return this.login(this._lastUsername, this._lastPassword);
  }

  // ---------------- Commands ----------------
  async command(command: string, attributes: SOResponse, preserveServerState = false): Promise<SOResponse> {
    if (!command?.trim()) return { status: "ERROR", message: "Command can't be empty" };
    return this._client.command(command, attributes, preserveServerState);
  }

  async info(command: string, attributes: SOResponse): Promise<SOResponse> {
    if (!command?.trim()) return { status: "ERROR", message: "Command can't be empty" };
    return this._client.info(command, attributes);
  }

  // ---------------- Register / Password policy ----------------
  async registerInit(args: RegisterInitArgs): Promise<SOResponse> {
    return this._client.command("register", {
      action: "init",
      firstName: args.firstName,
      middleName: args.middleName ?? "",
      lastName: args.lastName,
      gender: args.gender,
      email: args.email,
      mobile: args.mobile,
      password: args.password,
    });
  }

  /**
   * For register step-2 using OTP (Flutter: registerCreate)
   * uses preserveServerState=true to continue server workflow.
   */
  async registerCreate(emailOtp: number): Promise<SOResponse> {
    return this._client.command("register", { action: "create", emailOTP: emailOtp }, true);
  }

  async applyPasswordPolicy(password: string): Promise<SOResponse> {
    return this._client.command("register", { action: "applyPasswordPolicy", password });
  }

  // ---------------- Binary APIs ----------------
  async stream(fileName: string): Promise<StreamResult> {
    if (!fileName?.trim()) return [null, null, "Invalid file name"];
    return this._client.file(fileName);
  }

  async report(logic: string, parameters?: SOResponse): Promise<StreamResult> {
    if (!logic?.trim()) return [null, null, "Invalid report logic"];
    return this._client.report(logic, parameters);
  }

  async upload(mimeType: string, data: Uint8, streamNameOrID = ""): Promise<SOResponse> {
    if (!mimeType?.trim()) return { status: "ERROR", message: "mimeType can't be empty" };
    if (!data || data.byteLength === 0) return { status: "ERROR", message: "data can't be empty" };
    return this._client.upload(mimeType, data, streamNameOrID);
  }

  async menu(): Promise<SOMenuResponse> {
    return (await this._client.command("listMenu", {})) as SOMenuResponse;
  }

  // ---------------- Static Convenience Wrappers ----------------

  static async login(username: string, password: string): Promise<string> {
    return SOConnection.get().login(username, password);
  }

  static async logout(): Promise<void> {
    return SOConnection.get().logout();
  }

  static async command(
    command: string,
    attributes: SOResponse,
    preserveServerState = false
  ): Promise<SOResponse> {
    return SOConnection.get().command(command, attributes, preserveServerState);
  }

  static async info(
    command: string,
    attributes: SOResponse
  ): Promise<SOResponse> {
    return SOConnection.get().info(command, attributes);
  }

  static async relogin(): Promise<string> {
    return SOConnection.get().relogin();
  }


  static async registerInit(args: RegisterInitArgs): Promise<SOResponse> {
    return SOConnection.get().registerInit(args);
  }

  static async registerCreate(emailOtp: number): Promise<SOResponse> {
    return SOConnection.get().registerCreate(emailOtp);
  }

  static async applyPasswordPolicy(password:string): Promise<SOResponse> {
    return SOConnection.get().applyPasswordPolicy(password);
  }

  static async upload(
  mimeType: string,
  data: Uint8,
  streamNameOrID = ""
  ): Promise<SOResponse> {
    return SOConnection.get().upload(mimeType, data, streamNameOrID);
  }

  static async menu(): Promise<SOMenuResponse> {
    return SOConnection.get().menu();
  }

  static async stream(fileName: string): Promise<StreamResult> {
  return SOConnection.get().stream(fileName);
  }

  static async report(logic: string, parameters?: SOResponse): Promise<StreamResult> {
    return SOConnection.get().report(logic, parameters);
  }

}
