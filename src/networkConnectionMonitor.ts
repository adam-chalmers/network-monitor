import { numberFromEnv } from "./envHelper";
import { pingAddress } from "./pingAddress";
import { ConnectionMonitorConfig } from "./types/connectionMonitorConfig";

export class NetworkConnectionMonitor {
    private readonly playSoundOnDisconnect: boolean;
    private readonly gatewayAddress: string;
    private readonly logConnectivityChanges: boolean;
    private readonly pingRate: number;
    private readonly pingRetries: number;

    private heartbeatInterval: NodeJS.Timeout | null = null;
    private retryCount: number = 0;

    constructor(config: ConnectionMonitorConfig) {
        const NETWORK_PING_RATE = numberFromEnv("NETWORK_PING_RATE");
        const MIN_NETWORK_PING_RATE = numberFromEnv("MIN_NETWORK_PING_RATE");
        const NETWORK_PING_RETRIES = numberFromEnv("NETWORK_PING_RETRIES");

        if (config.pingRate != null && config.pingRate < MIN_NETWORK_PING_RATE) {
            throw new Error(`Network ping rate ${config.pingRate} is below minimum value of ${MIN_NETWORK_PING_RATE}`);
        }

        this.playSoundOnDisconnect = config.playSoundOnDisconnect ?? false;
        this.gatewayAddress = config.gatewayAddress;
        this.logConnectivityChanges = config.logConnectivityChanges ?? false;
        this.pingRate = config.pingRate ?? NETWORK_PING_RATE;
        this.pingRetries = config.pingRetries ?? NETWORK_PING_RETRIES;
    }

    private _isOnline = false;
    public get isOnline(): boolean {
        return this._isOnline;
    }

    private pingSuccess() {
        // If previously offline
        if (!this._isOnline) {
            if (this.logConnectivityChanges) {
                console.log(`---------- System online at ` + new Date().toLocaleString() + " ----------");
            }
            this.retryCount = 0;
            this._isOnline = true;
        }
    }

    private pingFailure() {
        // If previously online
        if (this._isOnline) {
            // If we've retried as many times as configured
            if (this.retryCount >= this.pingRetries) {
                this.retryCount = 0;
                if (this.logConnectivityChanges) {
                    console.log(`---------- System offline at ` + new Date().toLocaleString() + " ----------");
                }

                if (this.playSoundOnDisconnect) {
                    process.stderr.write("\x07");
                }

                this._isOnline = false;
            } else {
                this.retryCount++;
                if (this.logConnectivityChanges) {
                    console.log(`---------- Failed to ping gateway - retrying ${this.retryCount} / ${this.pingRetries} ----------`);
                }
            }
        }
    }

    // Check connection to the router
    private async heartbeat() {
        try {
            const result = await pingAddress(this.gatewayAddress);
            if (result) {
                this.pingSuccess();
            } else {
                this.pingFailure();
            }
        } catch (err) {
            this.pingFailure();
        }
    }

    public async startMonitoring() {
        await this.heartbeat();
        this.heartbeatInterval = setInterval(() => this.heartbeat(), this.pingRate);
    }

    public stopMonitoring() {
        if (this.heartbeatInterval != null) {
            clearInterval(this.heartbeatInterval);
        }
    }
}
