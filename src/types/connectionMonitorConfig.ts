export interface ConnectionMonitorConfig {
    gatewayAddress: string;
    pingRate?: number;
    pingRetries?: number;
    logConnectivityChanges?: boolean;
    playSoundOnDisconnect?: boolean;
    enabled?: boolean;
}
