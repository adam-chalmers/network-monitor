import { NetworkConnectionMonitor } from "./networkConnectionMonitor";
import { GroupMonitor } from "./groupMonitor";
import { HostMonitor } from "./hostMonitor";
import { Config } from "./types/config";
import { Host } from "./types/host";
import { Group } from "./types/group";

export class NetworkMonitor {
    constructor(config: Config) {
        this.addHosts(config.hosts);
        if (config.groups != null) {
            this.addGroups(config.groups);
        }
        this.networkMonitor = new NetworkConnectionMonitor(config.connectionMonitor);
    }

    public readonly networkMonitor: NetworkConnectionMonitor;

    private _hostMonitors: HostMonitor[] = [];
    public get hostMonitors(): readonly HostMonitor[] {
        return this._hostMonitors;
    }

    private _groupMonitors: GroupMonitor[] = [];
    public get groupMonitors(): readonly GroupMonitor[] {
        return this._groupMonitors;
    }

    private addHosts(hosts: Host[]) {
        for (const host of hosts) {
            if (host.enabled === false) {
                continue;
            }

            this._hostMonitors.push(new HostMonitor(host));
        }
    }

    private addGroups(groups: Group[]) {
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
}
