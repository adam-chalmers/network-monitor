import { NetworkConnectionMonitor } from "./networkConnectionMonitor";
import { GroupMonitor } from "./groupMonitor";
import { HostMonitor } from "./hostMonitor";
import { Config } from "./types/config";
import { Host } from "./types/host";
import { Group } from "./types/group";
import { Defaults } from "./types/defaults";

class NetworkMonitor {
    constructor(config: Config) {
        this.loadConfig(config);
    }

    private _networkMonitor: NetworkConnectionMonitor | undefined;
    public get networkMonitor(): NetworkConnectionMonitor {
        return this._networkMonitor!;
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

            this._hostMonitors.push(new HostMonitor(host, defaults));
        }
    }

    private addGroups(groups: Group[]): void {
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
            }
            this._groupMonitors.push(new GroupMonitor(group, hostMonitors));
        }
    }

    public loadConfig(config: Config): void {
        this.addHosts(config.hosts, config.defaults);
        if (config.groups != null) {
            this.addGroups(config.groups);
        }
        this._networkMonitor = new NetworkConnectionMonitor(config.connectionMonitor, config.defaults);
    }

    public async startMonitoring(): Promise<void> {
        await this._networkMonitor?.startMonitoring();
        await Promise.all(this._hostMonitors.map((x) => x.startMonitoring()));
    }

    public stopMonitoring(): void {
        for (const monitor of this._hostMonitors) {
            monitor.stopMonitoring();
        }
        this._networkMonitor?.stopMonitoring();
    }
}

export { NetworkMonitor, Config };
