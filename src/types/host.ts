import { TaskDefinition } from "./taskDefinition";

export interface Host {
    name: string;
    address: string;
    pingRate?: number;
    pingRetries?: number;
    onConnected?: TaskDefinition[];
    onDisconnected?: TaskDefinition[];
    logConnectivityChanges?: boolean;
    logTasks?: boolean;
    enabled?: boolean;
    [key: string]: any;
}
