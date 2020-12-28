import { ConnectionMonitorConfig } from "./connectionMonitorConfig";
import { Defaults } from "./defaults";
import { Group } from "./group";
import { Host } from "./host";

export interface Config {
    hosts: Host[];
    groups?: Group[];
    connectionMonitor: ConnectionMonitorConfig;
    defaults: Defaults;
}
