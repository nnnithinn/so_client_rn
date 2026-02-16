export type SOResponse = Record<string, any>;
type Uint8 = Uint8Array;
/**
 * SO Platform Client (Dart model)
 *
 * Usage:
 *   const c = new SOClient("storedobject.com", "yatramitra", 1024, 768, true, apiKey);
 *   const err = await c.login("user", "pass");
 *   const r = await c.command("someCommand", {x:1});
 */
export declare class SOClient {
    readonly application: string;
    readonly deviceWidth: number;
    readonly deviceHeight: number;
    readonly apiKey: string;
    readonly apiVersion: number;
    private ws;
    private subscriptionActive;
    private lock;
    private lockBinary;
    private username_;
    private password_;
    private session_;
    private otpEmail_;
    private received;
    private receivedBinary;
    constructor(host: string, application: string, deviceWidth?: number, deviceHeight?: number, secured?: boolean, apiKey?: string);
    get username(): string;
    checkPassword(password: string): boolean;
    logout(): Promise<void>;
    login(username: string, password?: string): Promise<string>;
    otp(email: string, mobile?: string): Promise<SOResponse>;
    otpLogin(emailOTP: number, mobileOTP?: number): Promise<string>;
    changePassword(currentPassword: string, newPassword: string): Promise<string>;
    command(command: string, attributes: SOResponse, preserveServerState?: boolean): Promise<SOResponse>;
    info(command: string, attributes: SOResponse): Promise<SOResponse>;
    stream(name: string): Promise<[Uint8 | null, string | null, string | null]>;
    file(name: string): Promise<[Uint8 | null, string | null, string | null]>;
    report(logic: string, parameters?: SOResponse): Promise<[Uint8 | null, string | null, string | null]>;
    upload(mimeType: string, data: Uint8, streamNameOrID?: string): Promise<SOResponse>;
    uploadStream(mimeType: string, data: AsyncIterable<Uint8>, streamNameOrID?: string): Promise<SOResponse>;
    private error;
    private action;
    private setOTPEmail;
    private _command;
    private _stream;
    private _upload;
    /**
     * Dart model: lock -> send -> wait for next string message
     */
    private post;
    private postBinary;
    private ensureOpen;
    private receive;
    private receiveBinary;
}
export {};
//# sourceMappingURL=SOClient.d.ts.map