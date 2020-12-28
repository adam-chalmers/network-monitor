import { HostMonitor } from "./hostMonitor";
import { Group } from "./types/group";
import { Task } from "./task";
import { Event } from "./event";
import { GroupDetails } from "./types/groupDetails";

interface GroupEvents {
    [key: string]: GroupDetails;
}

export class GroupMonitor {
    private readonly allOff?: Task[];
    private readonly allOn?: Task[];
    private readonly anyOff?: Task[];
    private readonly anyOn?: Task[];
    private readonly hostMonitors: HostMonitor[] = [];

    constructor(group: Group, hostMonitors: HostMonitor[]) {
        this.name = group.name;
        this.allOff = group.onAllDisconnected?.map((x) => new Task(x, group.logTasks)) ?? [];
        this.allOn = group.onAllConnected?.map((x) => new Task(x, group.logTasks)) ?? [];
        this.anyOff = group.onAnyDisconnected?.map((x) => new Task(x, group.logTasks)) ?? [];
        this.anyOn = group.onAnyConnected?.map((x) => new Task(x, group.logTasks)) ?? [];
        for (const monitor of hostMonitors) {
            this.addHost(monitor);
        }
    }

    public readonly name: string;
    public readonly events: Event<GroupEvents> = new Event();

    private addHost(monitor: HostMonitor) {
        this.hostMonitors.push(monitor);
        monitor.events.addListener("connected", () => this.hostConnected());
        monitor.events.addListener("disconnected", () => this.hostDisconnected());
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

        // If only one host is online, then the first host of the group has connected and we can fire the "anyOn" tasks
        if (this.anyOn != null && online.length === 1) {
            this.fireTasks(this.anyOn);
        }
        // If all are online, then the final host of the group has connected and we can fire the "allOn" tasks
        if (this.allOn != null && online.length === this.hostMonitors.length) {
            this.fireTasks(this.allOn);
        }
    }

    private hostDisconnected() {
        const online = this.hostMonitors.filter((x) => x.isOnline === true);

        // If all but one are offline, one host has disconnected and we can fire the "anyOff" tasks
        if (this.anyOff != null && online.length === this.hostMonitors.length - 1) {
            this.fireTasks(this.anyOff);
        }
        // If none are offline, the last host in the group has disconnected and we can fire the "allOff" tasks
        if (this.allOff != null && online.length === 0) {
            this.fireTasks(this.allOff);
        }
    }
}
