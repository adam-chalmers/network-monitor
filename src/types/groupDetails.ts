import { HostDetails } from "./hostDetails";

export interface GroupDetails {
    hosts: HostDetails[];
    hostCount: number;
    aliveCount: number;
}
