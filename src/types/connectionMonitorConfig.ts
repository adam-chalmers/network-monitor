import { TaskDefinition } from "./taskDefinition";

export interface ConnectionMonitorConfig {
    gatewayAddress: string;
    pingRate?: number;
    pingRetries?: number;
    onConnected?: TaskDefinition[];
    onDisconnected?: TaskDefinition[];
    logConnectivityChanges?: boolean;
    logTasks?: boolean;
    playSoundOnDisconnect?: boolean;
    enabled?: boolean;
    [key: string]: any;
}
