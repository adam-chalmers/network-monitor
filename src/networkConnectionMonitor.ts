import { BaseMonitor } from "./baseMonitor";
import { pingAddress } from "./pingAddress";
import { Task } from "./task";
import { ConnectionMonitorConfig } from "./types/connectionMonitorConfig";
import { ConnectivityDetails } from "./types/connectivityDetails";
import { Defaults } from "./types/defaults";

export class NetworkConnectionMonitor extends BaseMonitor<ConnectivityDetails> {
    private readonly playSoundOnDisconnect: boolean;
    private readonly gatewayAddress: string;
    private readonly logConnectivityChanges: boolean;
    private readonly onConnectTasks: Task<ConnectivityDetails>[];
    private readonly onDisconnectTasks: Task<ConnectivityDetails>[];
    private readonly pingRate: number;
    private readonly pingRetries: number;
    private readonly extraDetails: Record<string, any>;

    private monitorInterval: NodeJS.Timeout | null = null;
    private retryCount: number = 0;

    constructor(config: ConnectionMonitorConfig, defaults: Defaults) {
        super("Connection Monitor", config.logTasks ?? defaults.logTasks ?? false);

        // Unused variables here to facilitate grouping extra parameters into the "rest" object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
            gatewayAddress,
            pingRate,
            pingRetries,
            onConnected,
            onDisconnected,
            logConnectivityChanges,
            logTasks,
            playSoundOnDisconnect,
            enabled,
            ...rest
        } = config;

        this.gatewayAddress = gatewayAddress;
        this.pingRate = pingRate ?? defaults.networkPingRate;
        this.pingRetries = pingRetries ?? defaults.networkPingRetries;
        this.logConnectivityChanges = logConnectivityChanges ?? defaults.logNetworkConnectivityChanges ?? false;
        this.playSoundOnDisconnect = playSoundOnDisconnect ?? false;
        this.onConnectTasks = this.makeTasks(onConnected);
        this.onDisconnectTasks = this.makeTasks(onDisconnected);
        this.extraDetails = rest;
    }

    private _monitoring: boolean = false;
    public get monitoring(): boolean {
        return this._monitoring;
    }

    private _isOnline = false;
    public get isOnline(): boolean {
        return this._isOnline;
    }

    private connected(): void {
        this._isOnline = true;
        this.logStatus();
        const details = this.getDetails();
        this.eventEmitter.emit("connected", details);
        this.fireTasks(this.onConnectTasks, details);
    }

    private disconnected(): void {
        this._isOnline = false;
        this.logStatus();
        if (this.playSoundOnDisconnect) {
            process.stderr.write("\x07");
        }

        const details = this.getDetails();
        this.eventEmitter.emit("disconnected", details);
        this.fireTasks(this.onDisconnectTasks, details);
    }

    private async getStatus(): Promise<boolean> {
        try {
            return await pingAddress(this.gatewayAddress);
        } catch (err) {
            return false;
        }
    }

    // Check the status of the host by pinging it
    private async checkStatus(): Promise<boolean> {
        const status = await this.getStatus();

        if (this.isOnline === status) {
            this.retryCount = 0;
            return status;
        }

        if (status) {
            this.connected();
        } else {
            if (this.retryCount === this.pingRetries) {
                this.retryCount = 0;
                this.disconnected();
            } else {
                this.retryCount++;
            }
        }
        return status;
    }

    private logStatus(): void {
        if (this.logConnectivityChanges) {
            let message = `System ${this._isOnline ? "on" : "off"}line at ${new Date().toLocaleString()}`;
            let padding = 80 - message.length;
            if (padding > 0) {
                message = ` ${message}`;
                padding--;
            }
            if (padding > 0) {
                message = `${message} `;
                padding--;
            }
            if (padding > 0) {
                const leftSide = Math.ceil((padding - 2) / 2);
                const rightSide = padding - 2 - leftSide;
                message = `${"-".repeat(leftSide)} ${message} ${"-".repeat(rightSide)}`;
            }

            console.log(message);
        }
    }

    public async startMonitoring(): Promise<void> {
        this._monitoring = true;

        // Check for an initial status without firing tasks and allow the startMonitoring function to return a promise that resolves after a single check
        const status = await this.getStatus();
        this._isOnline = status;
        this.logStatus();

        this.monitorInterval = setInterval(() => this.checkStatus(), this.pingRate);
    }

    public stopMonitoring(): void {
        this._monitoring = false;
        if (this.monitorInterval != null) {
            clearInterval(this.monitorInterval);
        }
    }

    public getDetails(): ConnectivityDetails {
        return {
            isOnline: this._isOnline,
            ...this.extraDetails
        };
    }

    public dispose(): void {
        super.dispose();
        this.stopMonitoring();
    }
}
