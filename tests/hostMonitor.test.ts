import { HostMonitor } from "../src/hostMonitor";
import * as ping from "../src/pingAddress";
import { Defaults } from "../src/types/defaults";
import { Host } from "../src/types/host";
import { HostDetails } from "../src/types/hostDetails";
import { TaskDefinition } from "../src/types/taskDefinition";

describe("@adam-chalmers/network-monitor @unit hostMonitor.ts", () => {
    const defaults: Defaults = {
        hostPingRate: 1,
        hostPingRetries: 0,
        networkPingRate: 1,
        networkPingRetries: 0,
        logTasks: true,
        logHostConnectivityChanges: true
    };

    const host: Host = {
        name: "A",
        address: ""
    };
    let monitor = new HostMonitor(host, defaults);

    let pingSpy: jest.SpyInstance<Promise<boolean>, [address: string]>;
    let logSpy: jest.SpyInstance<void, Parameters<typeof console.log>>;

    function setup(host: Host, customDefaults?: Defaults): void {
        monitor = new HostMonitor(host, customDefaults ?? defaults);
    }

    beforeEach(() => {
        jest.useFakeTimers();
        pingSpy = jest.spyOn(ping, "pingAddress");

        // Stop console logging
        logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
        jest.spyOn(console, "error").mockImplementation(() => undefined);

        setup(host);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it("Should use the details given in the config", () => {
        expect(monitor.name).toEqual(host.name);
        expect(monitor["address"]).toEqual(host.address);
    });

    it("Should use the values given in the defaults if none are provided in the host config", () => {
        expect(monitor["pingRate"]).toEqual(defaults.hostPingRate);
        expect(monitor["pingRetries"]).toEqual(defaults.hostPingRetries);
        expect(monitor["logTasks"]).toEqual(defaults.logTasks);
        expect(monitor["logConnectivityChanges"]).toEqual(defaults.logHostConnectivityChanges);
    });

    it("Should use defaults.logGroupTasks over defaults.logTasks", () => {
        const customDefaults: Defaults = { ...defaults, logHostTasks: false };
        setup(host, customDefaults);
        expect(monitor["logTasks"]).toEqual(customDefaults.logHostTasks);
    });

    it("Should override the values given in the defaults if they're provided in the host config", () => {
        const custom: Host = { ...host, logTasks: false, logConnectivityChanges: false, pingRate: 2, pingRetries: 2 };
        setup(custom);
        expect(monitor["pingRate"]).toEqual(custom.pingRate);
        expect(monitor["pingRetries"]).toEqual(custom.pingRetries);
        expect(monitor["logTasks"]).toEqual(custom.logTasks);
        expect(monitor["logConnectivityChanges"]).toEqual(custom.logConnectivityChanges);
    });

    it("Should update the monitoring property to match whether the monitor is currently monitoring the host", async () => {
        jest.spyOn(monitor as any, "checkStatus").mockImplementation(() => Promise.resolve(true));
        jest.spyOn(monitor as any, "getStatus").mockImplementation(() => Promise.resolve(true));

        expect(monitor.monitoring).toEqual(false);
        await monitor.startMonitoring();
        expect(monitor.monitoring).toEqual(true);
        monitor.stopMonitoring();
        expect(monitor.monitoring).toEqual(false);
    });

    it("Should be able to get the connectivity status of a host", async () => {
        pingSpy.mockImplementation(() => Promise.resolve(true));
        await expect(monitor["getStatus"]()).resolves.toEqual(true);

        pingSpy.mockImplementation(() => Promise.resolve(false));
        await expect(monitor["getStatus"]()).resolves.toEqual(false);
    });

    it("Should treat an error in getting the connectivity status of a host as that host not being connected to the network", async () => {
        pingSpy.mockImplementation(() => Promise.reject(new Error("Test error")));
        await expect(monitor["getStatus"]()).resolves.toEqual(false);
    });

    it("Should update the isOnline property with the current state of the host", () => {
        expect(monitor.isOnline).toEqual(false);

        monitor["connected"]();
        expect(monitor.isOnline).toEqual(true);

        monitor["disconnected"]();
        expect(monitor.isOnline).toEqual(false);
    });

    it("Should get the initial connectivity state of the host when monitoring begins", async () => {
        pingSpy.mockImplementation(() => Promise.resolve(true));
        await monitor.startMonitoring();
        expect(monitor.isOnline).toEqual(true);
    });

    it("Should not fire tasks when initial connectivity checks are made as part of monitoring startup", async () => {
        pingSpy.mockImplementation(() => Promise.resolve(true));
        const func = jest.fn();
        monitor.eventEmitter.addListener("connected", func);
        monitor.eventEmitter.addListener("disconnected", func);
        await monitor.startMonitoring();
        expect(func).not.toBeCalled();
    });

    it("Should ping the host once per each time period as given by the config/defaults", async () => {
        const pingRate = 50;
        const custom: Host = { ...host, pingRate };
        setup(custom);
        pingSpy.mockImplementation(() => Promise.resolve(true));
        await monitor.startMonitoring();
        expect(pingSpy).toBeCalledTimes(1);
        jest.advanceTimersByTime(pingRate);
        expect(pingSpy).toBeCalledTimes(2);
        jest.advanceTimersByTime(pingRate);
        expect(pingSpy).toBeCalledTimes(3);
    });

    it("Should stop pinging the host once monitoring has stopped", async () => {
        const pingRate = 50;
        const custom: Host = { ...host, pingRate };
        setup(custom);
        pingSpy.mockImplementation(() => Promise.resolve(false));
        await monitor.startMonitoring();
        expect(pingSpy).toBeCalledTimes(1);
        jest.advanceTimersByTime(pingRate);
        expect(pingSpy).toBeCalledTimes(2);
        monitor.stopMonitoring();
        jest.advanceTimersByTime(pingRate);
        expect(pingSpy).toBeCalledTimes(2);
    });

    it("Should call the connected/disconnected functions as expected when status changes", async () => {
        setup({ ...host, pingRetries: 0 });
        const connectedSpy = jest.spyOn(monitor as any, "connected");
        const disconnectedSpy = jest.spyOn(monitor as any, "disconnected");

        pingSpy.mockImplementation(() => Promise.resolve(true));
        await monitor["checkStatus"]();
        expect(connectedSpy).toBeCalledTimes(1);
        expect(disconnectedSpy).toBeCalledTimes(0);

        pingSpy.mockImplementation(() => Promise.resolve(false));
        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(1);
        expect(connectedSpy).toBeCalledTimes(1);
    });

    it("Should be able to swap between connected and disconnected multiple times", async () => {
        setup({ ...host, pingRetries: 0 });
        const connectedSpy = jest.spyOn(monitor as any, "connected");
        const disconnectedSpy = jest.spyOn(monitor as any, "disconnected");

        pingSpy.mockImplementation(() => Promise.resolve(true));
        await monitor["checkStatus"]();
        expect(connectedSpy).toBeCalledTimes(1);
        expect(disconnectedSpy).toBeCalledTimes(0);

        pingSpy.mockImplementation(() => Promise.resolve(false));
        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(1);
        expect(connectedSpy).toBeCalledTimes(1);

        pingSpy.mockImplementation(() => Promise.resolve(true));
        await monitor["checkStatus"]();
        expect(connectedSpy).toBeCalledTimes(2);
        expect(disconnectedSpy).toBeCalledTimes(1);

        pingSpy.mockImplementation(() => Promise.resolve(false));
        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(2);
        expect(connectedSpy).toBeCalledTimes(2);
    });

    it("Should only mark a host as disconnected once the configured number of retries have been done", async () => {
        setup({ ...host, pingRetries: 2 });
        const disconnectedSpy = jest.spyOn(monitor as any, "disconnected");

        // Mock the pingSpy to resolve true to mark the host as being online
        pingSpy.mockImplementation(() => Promise.resolve(true));
        await monitor["checkStatus"]();

        // Mock the pingSpy to resolve false to mark the host as being offline
        pingSpy.mockImplementation(() => Promise.resolve(false));

        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(0); // Should not have called the disconnected function yet since we have retries to do

        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(0); // 1 retry - should not be disconnected yet

        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(1); // 2 retries as configured - should now be disconnected
    });

    it("Should not call the connected/disconnected functions multiple times with repeated checkStatus calls if the status doesn't change", async () => {
        const connectedSpy = jest.spyOn(monitor as any, "connected");
        const disconnectedSpy = jest.spyOn(monitor as any, "disconnected");

        pingSpy.mockImplementation(() => Promise.resolve(true));

        await monitor["checkStatus"]();
        expect(connectedSpy).toBeCalledTimes(1);
        await monitor["checkStatus"]();
        expect(connectedSpy).toBeCalledTimes(1);

        pingSpy.mockImplementation(() => Promise.resolve(false));

        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(1);
        await monitor["checkStatus"]();
        expect(disconnectedSpy).toBeCalledTimes(1);
    });

    it("Should log connectivity changes if configured to do so", () => {
        setup({ ...host, logConnectivityChanges: true, logTasks: false });

        monitor["connected"]();
        expect(logSpy).toBeCalledTimes(1);
        monitor["disconnected"]();
        expect(logSpy).toBeCalledTimes(2);
    });

    it("Should not log connectivity changes if configured to not do so", () => {
        setup({ ...host, logConnectivityChanges: false, logTasks: false });

        monitor["connected"]();
        expect(logSpy).toBeCalledTimes(0);
        monitor["disconnected"]();
        expect(logSpy).toBeCalledTimes(0);
    });

    it("Should log the firing of tasks if configured to do so", () => {
        monitor = new HostMonitor(
            {
                ...host,
                logTasks: true,
                logConnectivityChanges: false,
                onConnected: [{ name: "a" }],
                onDisconnected: [{ name: "b" }]
            },
            defaults
        );

        monitor["connected"]();
        expect(logSpy).toBeCalledTimes(1);
        monitor["disconnected"]();
        expect(logSpy).toBeCalledTimes(2);
    });

    it("Should not log the firing of tasks if configured to not do so", () => {
        monitor = new HostMonitor(
            {
                ...host,
                logTasks: false,
                logConnectivityChanges: false,
                onConnected: [{ name: "a" }],
                onDisconnected: [{ name: "b" }]
            },
            defaults
        );

        monitor["connected"]();
        expect(logSpy).toBeCalledTimes(0);
        monitor["disconnected"]();
        expect(logSpy).toBeCalledTimes(0);
    });

    it("Should accurately report the state of the host in the object returned by the getDetails function", () => {
        expect(monitor.getDetails()).toEqual<HostDetails>({ name: host.name, address: host.address, isOnline: false });
        monitor["connected"]();
        expect(monitor.getDetails()).toEqual<HostDetails>({ name: host.name, address: host.address, isOnline: true });
        monitor["disconnected"]();
        expect(monitor.getDetails()).toEqual<HostDetails>({ name: host.name, address: host.address, isOnline: false });
    });

    it("Should add extra properties from the host definition into the object returned by the getDetails function", () => {
        const custom: Host = { ...host, customNum: 1, customString: "Test" };
        setup(custom);
        expect(monitor.getDetails()).toEqual({
            name: host.name,
            address: host.address,
            isOnline: false,
            customNum: custom.customNum,
            customString: custom.customString
        });
    });

    it("Should fire the connected event once when the host connects", () => {
        const func = jest.fn();
        monitor.eventEmitter.addListener("connected", (details, params) => func(details, params));
        monitor["connected"]();
        expect(func).toBeCalledTimes(1);
        expect(func).toBeCalledWith(monitor.getDetails(), undefined);
    });

    it("Should fire the disconnected event once when the host disconnects", () => {
        // Mark the host as connected
        monitor["connected"]();

        const func = jest.fn();
        monitor.eventEmitter.addListener("disconnected", (details, params) => func(details, params));
        monitor["disconnected"]();
        expect(func).toBeCalledTimes(1);
        expect(func).toBeCalledWith(monitor.getDetails(), undefined);
    });

    it("Should fire the configured onConnected tasks when the host connects", () => {
        const onConnected: TaskDefinition[] = [{ name: "a" }, { name: "b" }];
        const custom: Host = { ...host, onConnected };
        setup(custom);

        const func = jest.fn();
        monitor.eventEmitter.addListener(onConnected[0].name, (details, params) => func(details, params));
        monitor.eventEmitter.addListener(onConnected[1].name, (details, params) => func(details, params));
        monitor["connected"]();
        expect(func).toBeCalledTimes(2);
        expect(func).toBeCalledWith(monitor.getDetails(), undefined);
    });

    it("Should fire the configured onDisconnected tasks when the host disconnects", () => {
        const onDisconnected: TaskDefinition[] = [{ name: "a" }, { name: "b" }];
        const custom: Host = { ...host, onDisconnected };
        setup(custom);
        monitor["connected"](); // Mark the host as connected

        const func = jest.fn();
        monitor.eventEmitter.addListener(onDisconnected[0].name, (details, params) => func(details, params));
        monitor.eventEmitter.addListener(onDisconnected[1].name, (details, params) => func(details, params));
        monitor["disconnected"]();
        expect(func).toBeCalledTimes(2);
        expect(func).toBeCalledWith(monitor.getDetails(), undefined);
    });

    it("Should fire tasks with a delay if the tasks are configured to do so", () => {
        const task: TaskDefinition = { name: "a", delay: 2000 };
        const custom: Host = { ...host, onConnected: [task] };
        setup(custom);

        const func = jest.fn();
        monitor.eventEmitter.addListener(task.name, (details, params) => func(details, params));
        monitor["connected"]();
        expect(func).toBeCalledTimes(0);
        jest.advanceTimersByTime(4000);
        expect(func).toBeCalledTimes(1);
    });

    it("Should only fire tasks if the task reports that it can be triggered", () => {
        const task: TaskDefinition = { name: "a" };
        const custom: Host = { ...host, onConnected: [task] };
        setup(custom);

        // Mock the canTrigger function to return true, meaning that the task can be triggered
        jest.spyOn(monitor["onConnectTasks"][0], "canTrigger").mockImplementation(() => true);
        const func = jest.fn();
        monitor.eventEmitter.addListener(task.name, func);

        // Call the fireTasks function and ensure that the task was fired, since it now reports that it can be triggered
        monitor["fireTasks"](monitor["onConnectTasks"], monitor.getDetails());
        expect(func).toBeCalledTimes(1);
    });

    it("Should not fire tasks that report that they can't be triggered", () => {
        const task: TaskDefinition = { name: "a" };
        const custom: Host = { ...host, onConnected: [task] };
        setup(custom);

        // Mock the canTrigger function to return true, meaning that the task can be triggered
        jest.spyOn(monitor["onConnectTasks"][0], "canTrigger").mockImplementation(() => false);
        const func = jest.fn();
        monitor.eventEmitter.addListener(task.name, func);

        // Call the fireTasks function and ensure that the task was fired, since it now reports that it can be triggered
        monitor["fireTasks"](monitor["onConnectTasks"], monitor.getDetails());
        expect(func).toBeCalledTimes(0);
    });

    it("Should remove all event listeners and stop monitoring when disposed of", () => {
        const custom: Host = { ...host, pingRate: 500 };
        pingSpy.mockImplementation(() => Promise.resolve(true));
        setup(custom);

        const stopMonitoringSpy = jest.spyOn(monitor, "stopMonitoring");
        const removeAllListenersSpy = jest.spyOn(monitor.eventEmitter, "removeAllListeners");
        monitor.eventEmitter.addListener("test", () => true);
        monitor.startMonitoring();
        monitor.dispose();
        expect(stopMonitoringSpy).toBeCalled();
        expect(removeAllListenersSpy).toBeCalled();
    });
});
