import { HostMonitor } from "./hostMonitor";
import { Group } from "./types/group";
import { Task } from "./task";
import { EventEmitter } from "./eventEmitter";
import { GroupDetails } from "./types/groupDetails";
import { Defaults } from "./types/defaults";

interface GroupEvents {
    [key: string]: GroupDetails;
}

export class GroupMonitor {
    private readonly allDisconnected?: Task[];
    private readonly allConnected?: Task[];
    private readonly anyDisconnected?: Task[];
    private readonly anyConnected?: Task[];
    private readonly hostMonitors: HostMonitor[] = [];
    private readonly extraDetails: Record<string, any>;

    constructor(group: Group, hostMonitors: HostMonitor[], defaults: Defaults) {
        const { name, hosts, onAllDisconnected, onAllConnected, onAnyDisconnected, onAnyConnected, enabled, logTasks, ...rest } = group;

        const logFiredTasks = logTasks ?? defaults.logGroupTasks ?? defaults.logTasks ?? false;
        this.name = name;
        this.allDisconnected = onAllDisconnected?.map((x) => new Task(x, logFiredTasks)) ?? [];
        this.allConnected = onAllConnected?.map((x) => new Task(x, logFiredTasks)) ?? [];
        this.anyDisconnected = onAnyDisconnected?.map((x) => new Task(x, logFiredTasks)) ?? [];
        this.anyConnected = onAnyConnected?.map((x) => new Task(x, logFiredTasks)) ?? [];
        this.extraDetails = rest;
        for (const monitor of hostMonitors) {
            this.addHost(monitor);
        }
    }

    public readonly name: string;
    public readonly events: EventEmitter<GroupEvents> = new EventEmitter();

    private addHost(monitor: HostMonitor) {
        this.hostMonitors.push(monitor);
        monitor.eventEmitter.addListener("connected", () => this.hostConnected());
        monitor.eventEmitter.addListener("disconnected", () => this.hostDisconnected());
    }

    private fireTasks(tasks: Task[]) {
        const now = new Date();
        const hosts = this.hostMonitors.map((x) => x.getHostDetails());
        const details: GroupDetails = {
            hosts,
            hostCount: hosts.length,
            aliveCount: hosts.filter((x) => x.isOnline).length
        };
        for (const task of tasks) {
            if (task.canTrigger(now)) {
                task.trigger(this.events, details);
            }
        }
    }

    private hostConnected() {
        const online = this.hostMonitors.filter((x) => x.isOnline === true);

        // If only one host is online, then the first host of the group has connected and we can fire the "anyConnected" tasks
        if (this.anyConnected != null && online.length === 1) {
            this.fireTasks(this.anyConnected);
        }
        // If all are online, then the final host of the group has connected and we can fire the "allConnected" tasks
        if (this.allConnected != null && online.length === this.hostMonitors.length) {
            this.fireTasks(this.allConnected);
        }
    }

    private hostDisconnected() {
        const online = this.hostMonitors.filter((x) => x.isOnline === true);

        // If all but one are offline, one host has disconnected and we can fire the "anyDisconnected" tasks
        if (this.anyDisconnected != null && online.length === this.hostMonitors.length - 1) {
            this.fireTasks(this.anyDisconnected);
        }
        // If none are offline, the last host in the group has disconnected and we can fire the "allDisconnected" tasks
        if (this.allDisconnected != null && online.length === 0) {
            this.fireTasks(this.allDisconnected);
        }
    }

    public getGroupDetails(): GroupDetails {
        const hostDetails = this.hostMonitors.map((x) => x.getHostDetails());
        return {
            hosts: hostDetails,
            aliveCount: hostDetails.filter((x) => x.isOnline).length,
            hostCount: hostDetails.length,
            ...this.extraDetails
        };
    }
}
