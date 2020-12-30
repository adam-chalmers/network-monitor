import { Task } from "./task";
import { Host } from "./types/host";
import { HostDetails } from "./types/hostDetails";
import { pingAddress } from "./pingAddress";
import { Defaults } from "./types/defaults";
import { BaseMonitor } from "./baseMonitor";

export class HostMonitor extends BaseMonitor<HostDetails> {
    private readonly address: string;
    private readonly pingRate: number;
    private readonly pingRetries: number;
    private readonly logConnectivityChanges: boolean;
    private readonly onConnectTasks: Task<HostDetails>[];
    private readonly onDisconnectTasks: Task<HostDetails>[];
    private readonly extraDetails: Record<string, any>;

    private monitorInterval: NodeJS.Timeout | null = null;
    private retryCount: number = 0;

    constructor(host: Host, defaults: Defaults) {
        super(host.name, host.logTasks ?? defaults.logHostTasks ?? defaults.logTasks ?? false);

        // Unused variables here to facilitate grouping extra parameters into the "rest" object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { name, address, pingRate, pingRetries, logConnectivityChanges, onConnected, onDisconnected, logTasks, enabled, ...rest } = host;

        this.address = address;
        this.pingRate = pingRate ?? defaults.hostPingRate;
        this.pingRetries = pingRetries ?? defaults.hostPingRetries;
        this.logConnectivityChanges = logConnectivityChanges ?? defaults.logHostConnectivityChanges ?? false;
        this.onConnectTasks = this.makeTasks(onConnected);
        this.onDisconnectTasks = this.makeTasks(onDisconnected);
        this.extraDetails = rest;
    }

    private _monitoring: boolean = false;
    public get monitoring(): boolean {
        return this._monitoring;
    }

    private _isOnline: boolean = false;
    public get isOnline(): boolean {
        return this._isOnline;
    }

    private async getInitialStatus(): Promise<boolean> {
        let status: boolean;
        try {
            status = await pingAddress(this.address);
        } catch (err) {
            status = false;
        }

        this._isOnline = status;
        this.logStatusChange();
        return status;
    }

    // Check the status of the host by pinging it
    private async checkStatus(): Promise<boolean> {
        let status: boolean;
        try {
            status = await pingAddress(this.address);
        } catch (err) {
            status = false;
        }

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

    private connected(): void {
        this._isOnline = true;
        this.logStatusChange();
        const details = this.getDetails();
        this.eventEmitter.emit("connected", details);
        this.fireTasks(this.onConnectTasks, details);
    }

    private disconnected(): void {
        this._isOnline = false;
        this.logStatusChange();
        const details = this.getDetails();
        this.eventEmitter.emit("disconnected", details);
        this.fireTasks(this.onDisconnectTasks, details);
    }

    private logStatusChange(): void {
        if (this.logConnectivityChanges) {
            console.log(`${new Date().toLocaleString()} - Host ${this.name} (${this.address}) is ${this._isOnline ? "online" : "offline"}.`);
        }
    }

    public async startMonitoring(): Promise<void> {
        this._monitoring = true;

        // Check for an initial status without firing tasks and allow the startMonitoring function to return a promise that resolves after a single check
        await this.getInitialStatus();
        this.monitorInterval = setInterval(() => this.checkStatus(), this.pingRate);
    }

    public stopMonitoring(): void {
        this._monitoring = false;
        if (this.monitorInterval != null) {
            clearInterval(this.monitorInterval);
        }
    }

    public getDetails(): HostDetails {
        return {
            name: this.name,
            address: this.address,
            isOnline: this.isOnline,
            ...this.extraDetails
        };
    }

    public dispose(): void {
        super.dispose();
        this.stopMonitoring();
    }
}
