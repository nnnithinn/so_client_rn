import { SOClient, SOResponse } from "./SOClient";
export type Uint8 = Uint8Array;
export type StreamResult = [Uint8 | null, string | null, string | null];
export type SOConnectionConfig = {
    host: string;
    application: string;
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
};
export type SOMenuResponse = SOResponse & {
    menu?: SOMenuItem[];
};
export declare class SOConnection {
    private static _instance;
    private _client;
    private _config;
    private _lastUsername;
    private _lastPassword;
    private constructor();
    static init(cfg: SOConnectionConfig): SOConnection;
    static get(): SOConnection;
    private createClient;
    reset(): void;
    rawClient(): SOClient;
    /**
     * Returns "" on success, or error message on failure (same contract as SOClient.login).
     * If login fails, it recreates the client (same pattern you used in Flutter).
     */
    login(username: string, password: string): Promise<string>;
    logout(): Promise<void>;
    /**
     * Attempt re-login using the last successful credentials you provided.
     */
    relogin(): Promise<string>;
    command(command: string, attributes: SOResponse, preserveServerState?: boolean): Promise<SOResponse>;
    info(command: string, attributes: SOResponse): Promise<SOResponse>;
    registerInit(args: RegisterInitArgs): Promise<SOResponse>;
    /**
     * For register step-2 using OTP (Flutter: registerCreate)
     * uses preserveServerState=true to continue server workflow.
     */
    registerCreate(emailOtp: number): Promise<SOResponse>;
    applyPasswordPolicy(password: string): Promise<SOResponse>;
    stream(fileName: string): Promise<StreamResult>;
    report(logic: string, parameters?: SOResponse): Promise<StreamResult>;
    upload(mimeType: string, data: Uint8, streamNameOrID?: string): Promise<SOResponse>;
    menu(): Promise<SOMenuResponse>;
    static login(username: string, password: string): Promise<string>;
    static logout(): Promise<void>;
    static command(command: string, attributes: SOResponse, preserveServerState?: boolean): Promise<SOResponse>;
    static info(command: string, attributes: SOResponse): Promise<SOResponse>;
    static relogin(): Promise<string>;
    static registerInit(args: RegisterInitArgs): Promise<SOResponse>;
    static registerCreate(emailOtp: number): Promise<SOResponse>;
    static applyPasswordPolicy(password: string): Promise<SOResponse>;
    static upload(mimeType: string, data: Uint8, streamNameOrID?: string): Promise<SOResponse>;
    static menu(): Promise<SOMenuResponse>;
    static stream(fileName: string): Promise<StreamResult>;
    static report(logic: string, parameters?: SOResponse): Promise<StreamResult>;
}
//# sourceMappingURL=SOConnection.d.ts.map