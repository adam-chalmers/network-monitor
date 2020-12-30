import { NetworkConnectionMonitor } from "./networkConnectionMonitor";
import { GroupMonitor } from "./groupMonitor";
import { HostMonitor } from "./hostMonitor";
import { Config } from "./types/config";
import { Host } from "./types/host";
import { Group } from "./types/group";
import { Defaults } from "./types/defaults";
import { EventEmitter as EventEmitter } from "./eventEmitter";
import { GroupDetails } from "./types/groupDetails";
import { HostDetails } from "./types/hostDetails";
import { TaskDefinition } from "./types/taskDefinition";

class NetworkMonitor {
    constructor(config: Config) {
        this.loadConfig(config);
    }

    public readonly eventEmitter: EventEmitter<Record<string, HostDetails | GroupDetails>> = new EventEmitter();

    private _connectionMonitor: NetworkConnectionMonitor | undefined;
    public get connectionMonitor(): NetworkConnectionMonitor | undefined {
        return this._connectionMonitor;
    }

    private _hostMonitors: HostMonitor[] = [];
    public get hostMonitors(): readonly HostMonitor[] {
        return this._hostMonitors;
    }

    private _groupMonitors: GroupMonitor[] = [];
    public get groupMonitors(): readonly GroupMonitor[] {
        return this._groupMonitors;
    }

    private addHosts(hosts: Host[], defaults: Defaults): void {
        for (const host of hosts) {
            if (host.enabled === false) {
                continue;
            }

            const monitor = new HostMonitor(host, defaults);
            this._hostMonitors.push(monitor);
            this.attachEvents(monitor.eventEmitter, host.onConnected, host.onDisconnected);
            monitor.eventEmitter.addListener("connected", (details, param) => this.eventEmitter.emit("connected", details, param));
            monitor.eventEmitter.addListener("disconnected", (details, param) => this.eventEmitter.emit("disconnected", details, param));
        }
    }

    private addGroups(groups: Group[], defaults: Defaults): void {
        for (const group of groups) {
            if (group.enabled === false) {
                continue;
            }

            const hostMonitors: HostMonitor[] = [];
            for (const hostName of group.hosts) {
                const monitor = this._hostMonitors.find((x) => x.name === hostName);
                if (monitor == null) {
                    throw new Error(`Host ${hostName} was configured to be in group ${group.name} but does not exist.`);
                }
                hostMonitors.push(monitor);
                this.attachEvents(monitor.eventEmitter, group.onAnyConnected, group.onAllConnected, group.onAnyDisconnected, group.onAllDisconnected);
            }
            this._groupMonitors.push(new GroupMonitor(group, hostMonitors, defaults));
        }
    }

    private attachEvents(emitter: EventEmitter<any>, ...taskLists: (TaskDefinition[] | undefined)[]): void {
        for (const taskList of taskLists) {
            if (taskList == null) {
                continue;
            }

            for (const task of taskList) {
                if (task.enabled === false) {
                    continue;
                }

                emitter.addListener(task.name, (details, param) => this.eventEmitter.emit(task.name, details, param));
            }
        }
    }

    private disposeMonitors(): void {
        // Dispose of monitors and remove all event listeners to prevent potential memory leaks from repeatedly reloading config
        if (this._connectionMonitor != null) {
            this._connectionMonitor.dispose();
        }

        for (const monitor of this.hostMonitors) {
            monitor.dispose();
        }
        // Clear array
        this._hostMonitors.splice(0, this._hostMonitors.length);

        for (const monitor of this._groupMonitors) {
            monitor.dispose();
        }
        // Clear array
        this._groupMonitors.splice(0, this._groupMonitors.length);

        this.eventEmitter.removeAllListeners();
    }

    public loadConfig(config: Config): void {
        this.disposeMonitors();

        this.addHosts(config.hosts, config.defaults);
        if (config.groups != null) {
            this.addGroups(config.groups, config.defaults);
        }
        if (config.connectionMonitor.enabled !== false) {
            this._connectionMonitor = new NetworkConnectionMonitor(config.connectionMonitor, config.defaults);
        }
    }

    public async startMonitoring(): Promise<void> {
        await this._connectionMonitor?.startMonitoring();
        await Promise.all(this._hostMonitors.map((x) => x.startMonitoring()));
    }

    public stopMonitoring(): void {
        for (const monitor of this._hostMonitors) {
            monitor.stopMonitoring();
        }
        this._connectionMonitor?.stopMonitoring();
    }
}

export { NetworkMonitor, Config, Host, Group, HostDetails, GroupDetails, HostMonitor, GroupMonitor };
