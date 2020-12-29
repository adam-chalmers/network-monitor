import { TaskDefinition } from "./taskDefinition";

export interface Host {
    name: string;
    address: string;
    pingRate?: number;
    pingRetries?: number;
    onConnected?: TaskDefinition[];
    onDisconnected?: TaskDefinition[];
    logStatusChanges?: boolean;
    logTasks?: boolean;
    enabled?: boolean;
    [key: string]: any;
}
