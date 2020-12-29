import { TaskDefinition } from "./taskDefinition";

export interface Group {
    name: string;
    hosts: string[];
    onAllDisconnected?: TaskDefinition[];
    onAllConnected?: TaskDefinition[];
    onAnyDisconnected?: TaskDefinition[];
    onAnyConnected?: TaskDefinition[];
    enabled?: boolean;
    logTasks?: boolean;
    [key: string]: any;
}
