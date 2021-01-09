import { HostMonitor } from "./hostMonitor";
import { Group } from "./types/group";
import { Task } from "./task";
import { GroupDetails } from "./types/groupDetails";
import { Defaults } from "./types/defaults";
import { BaseMonitor } from "./baseMonitor";

export class GroupMonitor extends BaseMonitor<GroupDetails> {
    private readonly allDisconnected?: Task<GroupDetails>[];
    private readonly allConnected?: Task<GroupDetails>[];
    private readonly anyDisconnected?: Task<GroupDetails>[];
    private readonly anyConnected?: Task<GroupDetails>[];
    private readonly extraDetails: Record<string, any>;

    constructor(group: Group, hostMonitors: HostMonitor[], defaults: Defaults) {
        super(group.name, group.logTasks ?? defaults.logGroupTasks ?? defaults.logTasks ?? false);

        // Unused variables here to facilitate grouping extra parameters into the "rest" object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { name, hosts, onAllDisconnected, onAllConnected, onAnyDisconnected, onAnyConnected, enabled, logTasks, ...rest } = group;

        this.allDisconnected = this.makeTasks(onAllDisconnected);
        this.allConnected = this.makeTasks(onAllConnected);
        this.anyDisconnected = this.makeTasks(onAnyDisconnected);
        this.anyConnected = this.makeTasks(onAnyConnected);
        this.extraDetails = rest;
        for (const monitor of hostMonitors) {
            this.addHost(monitor);
        }
    }

    private readonly _hostMonitors: HostMonitor[] = [];
    public get hostMonitors(): HostMonitor[] {
        return this._hostMonitors;
    }

    private addHost(monitor: HostMonitor): void {
        this._hostMonitors.push(monitor);
        monitor.eventEmitter.addListener("connected", () => this.hostConnected());
        monitor.eventEmitter.addListener("disconnected", () => this.hostDisconnected());
    }

    private hostConnected(): void {
        const online = this._hostMonitors.filter((x) => x.isOnline === true);

        const details = this.getDetails();
        // A host has connected and we can fire the "anyConnected" tasks
        if (this.anyConnected != null) {
            this.fireTasks(this.anyConnected, details);
        }
        // If all are online, then the final host of the group has connected and we can fire the "allConnected" tasks
        if (this.allConnected != null && online.length === this._hostMonitors.length) {
            this.fireTasks(this.allConnected, details);
        }
    }

    private hostDisconnected(): void {
        const online = this._hostMonitors.filter((x) => x.isOnline === true);

        const details = this.getDetails();
        // A host has disconnected and we can fire the "anyDisconnected" tasks
        if (this.anyDisconnected != null) {
            this.fireTasks(this.anyDisconnected, details);
        }
        // If none are online, the last host in the group has disconnected and we can fire the "allDisconnected" tasks
        if (this.allDisconnected != null && online.length === 0) {
            this.fireTasks(this.allDisconnected, details);
        }
    }

    public getDetails(): GroupDetails {
        const hostDetails = this._hostMonitors.map((x) => x.getDetails());
        return {
            hosts: hostDetails,
            aliveCount: hostDetails.filter((x) => x.isOnline).length,
            hostCount: hostDetails.length,
            ...this.extraDetails
        };
    }

    public dispose(): void {
        super.dispose();
    }
}
