import { Event } from "./event";
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

    private monitorInterval: NodeJS.Timeout | null = null;
    private retryCount: number = 0;

    constructor(host: Host, defaults: Defaults) {
        this.name = host.name;
        this.address = host.address;
        this.pingRate = host.pingRate ?? defaults.hostPingRate;
        this.pingRetries = host.pingRetries ?? defaults.hostPingRetries;
        this.logStatusChanges = host.logStatusChanges ?? false;
        this.onConnectTasks = host.onConnected?.map((x) => new Task(x, host.logTasks));
        this.onDisconnectTasks = host.onDisconnected?.map((x) => new Task(x, host.logTasks));
    }

    public readonly name: string;

    private _monitoring: boolean = false;
    public get monitoring(): boolean {
        return this._monitoring;
    }

    private _isOnline: boolean = false;
    public get isOnline(): boolean {
        return this._isOnline;
    }

    public readonly events: Event<HostEvents> = new Event();

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
        const details: HostDetails = { name: this.name, address: this.address, isOnline: true };
        this.events.emit("connected", details);
        const now = new Date();
        if (this.onConnectTasks != null) {
            for (const task of this.onConnectTasks) {
                if (task.canTrigger(now)) {
                    task.trigger(this.events, details);
                }
            }
        }
    }

    private disconnected() {
        this._isOnline = false;
        this.logStatusChange();
        const details: HostDetails = { name: this.name, address: this.address, isOnline: false };
        this.events.emit("disconnected", details);
        const now = new Date();
        if (this.onDisconnectTasks != null) {
            for (const task of this.onDisconnectTasks) {
                if (task.canTrigger(now)) {
                    task.trigger(this.events, details);
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
            isOnline: this.isOnline
        };
    }
}
