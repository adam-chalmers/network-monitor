import { EventEmitter } from "./eventEmitter";
import { Task } from "./task";
import { Host } from "./types/host";
import { HostDetails } from "./types/hostDetails";
import { pingAddress } from "./pingAddress";
import { Defaults } from "./types/defaults";

interface HostEvents {
    connected: HostDetails;
    disconnected: HostDetails;
    [key: string]: HostDetails;
}

export class HostMonitor {
    private readonly address: string;
    private readonly pingRate: number;
    private readonly pingRetries: number;
    private readonly logStatusChanges: boolean;
    private readonly onConnectTasks?: Task[];
    private readonly onDisconnectTasks?: Task[];
    private readonly extraDetails: Record<string, any>;

    private monitorInterval: NodeJS.Timeout | null = null;
    private retryCount: number = 0;

    constructor(host: Host, defaults: Defaults) {
        const { name, address, pingRate, pingRetries, logStatusChanges, onConnected, onDisconnected, logTasks, enabled, ...rest } = host;

        const logFiredTasks = logTasks ?? defaults.logHostTasks ?? defaults.logTasks ?? false;
        this.name = name;
        this.address = address;
        this.pingRate = pingRate ?? defaults.hostPingRate;
        this.pingRetries = pingRetries ?? defaults.hostPingRetries;
        this.logStatusChanges = logStatusChanges ?? defaults.logHostConnectivityChanges ?? false;
        this.onConnectTasks = onConnected?.map((x) => new Task(x, logFiredTasks));
        this.onDisconnectTasks = onDisconnected?.map((x) => new Task(x, logFiredTasks));
        this.extraDetails = rest;
    }

    public readonly name: string;
    public readonly eventEmitter: EventEmitter<HostEvents> = new EventEmitter();

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

    private connected() {
        this._isOnline = true;
        this.logStatusChange();
        const details = this.getHostDetails();
        this.eventEmitter.emit("connected", details);
        const now = new Date();
        if (this.onConnectTasks != null) {
            for (const task of this.onConnectTasks) {
                if (task.canTrigger(now)) {
                    task.trigger(this.eventEmitter, details);
                }
            }
        }
    }

    private disconnected() {
        this._isOnline = false;
        this.logStatusChange();
        const details = this.getHostDetails();
        this.eventEmitter.emit("disconnected", details);
        const now = new Date();
        if (this.onDisconnectTasks != null) {
            for (const task of this.onDisconnectTasks) {
                if (task.canTrigger(now)) {
                    task.trigger(this.eventEmitter, details);
                }
            }
        }
    }

    private logStatusChange() {
        if (this.logStatusChanges) {
            console.log(`${new Date().toLocaleString()} - Host ${this.name} (${this.address}) is ${this._isOnline ? "online" : "offline"}.`);
        }
    }

    public async startMonitoring(): Promise<void> {
        this._monitoring = true;

        // Check for an initial status without firing tasks and allow the startMonitoring function to return a promise that resolves after a single check
        await this.getInitialStatus();
        this.monitorInterval = setInterval(() => this.checkStatus(), this.pingRate);
    }

    public stopMonitoring() {
        this._monitoring = false;
        if (this.monitorInterval != null) {
            clearInterval(this.monitorInterval);
        }
    }

    public getHostDetails(): HostDetails {
        return {
            name: this.name,
            address: this.address,
            isOnline: this.isOnline,
            ...this.extraDetails
        };
    }
}
