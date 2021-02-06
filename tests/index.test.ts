import { NetworkMonitor } from "../src/index";
import { Config } from "../src/types/config";
import { Defaults } from "../src/types/defaults";
import { Host } from "../src/types/host";
import { Group } from "../src/types/group";

type MakeRequired<T, R extends keyof T> = T & Required<Pick<T, R>>;

describe("@adam-chalmers/network-monitor @unit index.ts", () => {
    const defaults: Defaults = {
        hostPingRate: 1,
        hostPingRetries: 0,
        networkPingRate: 1,
        networkPingRetries: 0
    };
    // Make each property of config required for ease of use
    const config: Required<Config> = {
        defaults,
        connectionMonitor: {
            gatewayAddress: ""
        },
        hosts: [],
        groups: []
    };
    let monitor: NetworkMonitor = new NetworkMonitor(config);

    function setup(config: Config): void {
        monitor = new NetworkMonitor(config);
    }

    beforeEach(() => {
        jest.useFakeTimers();

        // Stop console logging
        jest.spyOn(console, "log").mockImplementation(() => undefined);
        jest.spyOn(console, "error").mockImplementation(() => undefined);

        setup(config);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it("Should create a network connection monitor if not disabled", () => {
        expect(monitor.connectionMonitor).not.toEqual(undefined);
    });

    it("Should not create a network connection monitor if disabled", () => {
        const custom: Config = { ...config, connectionMonitor: { ...config.connectionMonitor, enabled: false } };
        setup(custom);
        expect(monitor.connectionMonitor).toEqual(undefined);
    });

    it("Should create a host monitor for each defined host", () => {
        // Make hosts required for ease of use
        const custom: MakeRequired<Config, "hosts"> = {
            ...config,
            hosts: [
                { name: "a", address: "" },
                { name: "b", address: "" }
            ]
        };
        const addHostsSpy = jest.spyOn(NetworkMonitor.prototype as any, "addHosts");
        setup(custom);
        expect(addHostsSpy).toBeCalledWith(custom.hosts, custom.defaults);
        expect(monitor.hostMonitors.length).toEqual(2);
        expect(monitor.hostMonitors[0].name).toEqual(custom.hosts[0].name);
        expect(monitor.hostMonitors[1].name).toEqual(custom.hosts[1].name);
    });

    it("Should not create host monitors for hosts that are disabled", () => {
        // Make hosts required for ease of use
        const custom: MakeRequired<Config, "hosts"> = {
            ...config,
            hosts: [
                { name: "a", address: "", enabled: false },
                { name: "b", address: "" }
            ]
        };
        setup(custom);
        expect(monitor.hostMonitors.length).toEqual(1);
        expect(monitor.hostMonitors[0].name).toEqual(custom.hosts[1].name);
    });

    it("Should create a group monitor for each defined group", () => {
        // Use Required<T> so we can easily access custom.groups later on without having to deal with the fact that it's optional
        const custom: Required<Config> = { ...config, hosts: [{ name: "a", address: "" }], groups: [{ name: "b", hosts: ["a"] }] };
        const addGroupsSpy = jest.spyOn(NetworkMonitor.prototype as any, "addGroups");
        setup(custom);
        expect(addGroupsSpy).toBeCalledWith(custom.groups, custom.defaults);
        expect(monitor.groupMonitors.length).toEqual(1);
        expect(monitor.groupMonitors[0].name).toEqual(custom.groups[0].name);
    });

    it("Should not create group monitors for groups that are disabled", () => {
        // Use Required<T> so we can easily access custom.groups later on without having to deal with the fact that it's optional
        const custom: Required<Config> = {
            ...config,
            hosts: [{ name: "a", address: "" }],
            groups: [
                { name: "b", hosts: ["a"], enabled: false },
                { name: "c", hosts: ["a"] }
            ]
        };
        setup(custom);
        expect(monitor.groupMonitors.length).toEqual(1);
        expect(monitor.groupMonitors[0].name).toEqual(custom.groups[1].name);
    });

    it("Should forward host connectivity change events to the main monitor's emitter", () => {
        const custom: Config = { ...config, hosts: [{ name: "a", address: "" }] };
        setup(custom);

        // Attach a handler to the events that the host monitor will forward to
        const func = jest.fn();
        monitor.eventEmitter.addListener("hostConnected", func);
        monitor.eventEmitter.addListener("hostDisconnected", func);

        // Make the host monitor fire the "connected" and "disconnected" events and ensure that each one calls the handler
        const hostMonitor = monitor.hostMonitors[0];
        hostMonitor["connected"]();
        expect(func).toBeCalledTimes(1);
        hostMonitor["disconnected"]();
        expect(func).toBeCalledTimes(2);
    });

    it("Should forward host task events to the main monitor's emitter", () => {
        // Make hosts and onConnected/onDisconnected required for ease of use
        const custom: Config & { hosts: MakeRequired<Host, "onConnected" | "onDisconnected">[] } = {
            ...config,
            hosts: [{ name: "a", address: "", onConnected: [{ name: "b" }], onDisconnected: [{ name: "c" }] }]
        };
        setup(custom);

        // Attach a handler to the events that the host monitor will forward to
        const func = jest.fn();
        monitor.eventEmitter.addListener(custom.hosts[0].onConnected[0].name, func);
        monitor.eventEmitter.addListener(custom.hosts[0].onDisconnected[0].name, func);

        // Make the host monitor fire the onConnected/onDisconnected tasks and ensure that the handler is called
        const hostMonitor = monitor.hostMonitors[0];
        hostMonitor["connected"]();
        expect(func).toBeCalledTimes(1);
        hostMonitor["disconnected"]();
        expect(func).toBeCalledTimes(2);
    });

    it("Should forward group task events to the main monitor's emitter", () => {
        // Make hosts, groups and group task lists required for ease of use
        const custom: MakeRequired<Config, "hosts" | "groups"> & {
            groups: MakeRequired<Group, "onAllConnected" | "onAnyConnected" | "onAllDisconnected" | "onAnyDisconnected">[];
        } = {
            ...config,
            hosts: [
                { name: "a", address: "" },
                { name: "b", address: "" }
            ],
            groups: [
                {
                    name: "c",
                    hosts: ["a", "b"],
                    onAllConnected: [{ name: "d" }],
                    onAnyConnected: [{ name: "e" }],
                    onAllDisconnected: [{ name: "f" }],
                    onAnyDisconnected: [{ name: "g" }]
                }
            ]
        };
        setup(custom);

        // Attach a handler to the events that the host monitor will forward to
        const func = jest.fn();
        const group = custom.groups[0];
        monitor.eventEmitter.addListener(group.onAllConnected[0].name, func);
        monitor.eventEmitter.addListener(group.onAnyConnected[0].name, func);
        monitor.eventEmitter.addListener(group.onAllDisconnected[0].name, func);
        monitor.eventEmitter.addListener(group.onAnyDisconnected[0].name, func);

        // Make the host monitor fire the onConnected/onDisconnected tasks and ensure that the handler is called
        const firstHost = monitor.hostMonitors[0];
        const secondHost = monitor.hostMonitors[1];

        firstHost["connected"]();
        expect(func).toBeCalledTimes(1); // Fired once for the onAnyConnected event
        secondHost["connected"]();
        expect(func).toBeCalledTimes(3); // Fired once for the onAnyConnected event, and again for the onAllConnected event

        firstHost["disconnected"]();
        expect(func).toBeCalledTimes(4); // Fired once for the onAnyDisconnected event
        secondHost["disconnected"]();
        expect(func).toBeCalledTimes(6); // Fired once for the onAnyDisconnected event, and again for the onAllDisconnected event
    });

    it("Should not add listeners for disabled tasks", () => {
        // Make hosts and host task lists required for ease of use
        const custom: Config & { hosts: MakeRequired<Host, "onConnected" | "onDisconnected">[] } = {
            ...config,
            hosts: [
                {
                    name: "a",
                    address: "",
                    onConnected: [{ name: "b", enabled: false }, { name: "c" }],
                    onDisconnected: [{ name: "d", enabled: false }, { name: "e" }]
                }
            ]
        };
        setup(custom);

        // Attach a handler to the events that the host monitor will forward to
        const enabledFunc = jest.fn();
        const disabledFunc = jest.fn();
        monitor.eventEmitter.addListener(custom.hosts[0].onConnected[0].name, disabledFunc);
        monitor.eventEmitter.addListener(custom.hosts[0].onConnected[1].name, enabledFunc);
        monitor.eventEmitter.addListener(custom.hosts[0].onDisconnected[0].name, disabledFunc);
        monitor.eventEmitter.addListener(custom.hosts[0].onDisconnected[1].name, enabledFunc);

        // Make the host monitor fire the onConnected/onDisconnected tasks and ensure that the handler is called for enabled tasks but not disabled tasks
        const hostMonitor = monitor.hostMonitors[0];
        hostMonitor["connected"]();
        expect(disabledFunc).toBeCalledTimes(0);
        expect(enabledFunc).toBeCalledTimes(1);
        hostMonitor["disconnected"]();
        expect(disabledFunc).toBeCalledTimes(0);
        expect(enabledFunc).toBeCalledTimes(2);
    });

    it("Should throw errors for groups that include hosts that don't exist", () => {
        // Make hosts and groups required for ease of use
        const custom: MakeRequired<Config, "hosts" | "groups"> = { ...config, hosts: [{ name: "a", address: "" }], groups: [{ name: "b", hosts: ["c"] }] };
        const group = custom.groups[0];
        expect(() => new NetworkMonitor(custom)).toThrowError(Error(`Host ${group.hosts[0]} was configured to be in group ${group.name} but does not exist.`));
    });

    it("Should create group monitors with the relevant host monitors", () => {
        const hosts: Host[] = [
            { name: "a", address: "" },
            { name: "b", address: "" }
        ];
        const custom: Config = { ...config, hosts: hosts, groups: [{ name: "c", hosts: [hosts[0].name] }] };
        setup(custom);
        expect(monitor.groupMonitors[0].hostMonitors.length).toEqual(1);
        expect(monitor.groupMonitors[0].hostMonitors[0].name).toEqual(hosts[0].name);
    });

    it("Should dispose the network connection monitor when disposing monitors", () => {
        const spy = jest.spyOn(monitor.connectionMonitor!, "dispose");
        monitor["disposeMonitors"]();
        expect(spy).toBeCalledTimes(1);
        expect(monitor.connectionMonitor).toBeUndefined();
    });

    it("Should not throw errors if there is no connection monitor when disposing monitors", () => {
        const custom: Config = { ...config, connectionMonitor: undefined };
        setup(custom);

        expect(() => monitor["disposeMonitors"]).not.toThrow();
    });

    it("Should dispose all host monitors when disposing monitors", () => {
        const custom: Config = {
            ...config,
            hosts: [
                { name: "a", address: "" },
                { name: "b", address: "" }
            ]
        };
        setup(custom);
        const firstDispose = jest.spyOn(monitor.hostMonitors[0], "dispose");
        const secondDispose = jest.spyOn(monitor.hostMonitors[1], "dispose");

        monitor["disposeMonitors"]();
        expect(firstDispose).toBeCalledTimes(1);
        expect(secondDispose).toBeCalledTimes(1);
    });

    it("Should dispose all group monitors when disposing monitors", () => {
        const custom: Config = {
            ...config,
            hosts: [{ name: "a", address: "" }],
            groups: [
                { name: "b", hosts: ["a"] },
                { name: "c", hosts: ["a"] }
            ]
        };
        setup(custom);
        const firstDispose = jest.spyOn(monitor.groupMonitors[0], "dispose");
        const secondDispose = jest.spyOn(monitor.groupMonitors[1], "dispose");

        monitor["disposeMonitors"]();
        expect(firstDispose).toBeCalledTimes(1);
        expect(secondDispose).toBeCalledTimes(1);
    });

    it("Should clear all host monitors when disposing monitors", () => {
        const custom: Config = {
            ...config,
            hosts: [
                { name: "a", address: "" },
                { name: "b", address: "" }
            ]
        };
        setup(custom);

        // Ensure that there are currently some host monitors to verify that calling disposeMonitors clears the array
        expect(monitor.hostMonitors.length).toEqual(2);
        monitor["disposeMonitors"]();
        expect(monitor.hostMonitors.length).toEqual(0);
    });

    it("Should clear all group monitors when disposing monitors", () => {
        const custom: Config = {
            ...config,
            hosts: [{ name: "a", address: "" }],
            groups: [
                { name: "b", hosts: ["a"] },
                { name: "c", hosts: ["a"] }
            ]
        };
        setup(custom);

        // Ensure that there are currently some group monitors to verify that calling disposeMonitors clears the array
        expect(monitor.groupMonitors.length).toEqual(2);
        monitor["disposeMonitors"]();
        expect(monitor.groupMonitors.length).toEqual(0);
    });

    it("Should clear all event listeners when disposing monitors", () => {
        // Make properties used required for ease of use
        const custom: Config & { hosts: MakeRequired<Host, "onConnected">[]; groups: MakeRequired<Group, "onAllConnected">[] } = {
            ...config,
            hosts: [{ name: "a", address: "", onConnected: [{ name: "b" }] }],
            groups: [{ name: "c", hosts: ["a"], onAllConnected: [{ name: "d" }] }]
        };
        setup(custom);

        // Attach a handler to the main monitor's event emitter
        monitor.eventEmitter.addListener("a", jest.fn());

        // Spy on removal functions
        const hostEventSpy = jest.spyOn(monitor.hostMonitors[0].eventEmitter, "removeAllListeners");
        const groupEventSpy = jest.spyOn(monitor.groupMonitors[0].eventEmitter, "removeAllListeners");
        const mainEventSpy = jest.spyOn(monitor.eventEmitter, "removeAllListeners");

        monitor["disposeMonitors"]();
        expect(hostEventSpy).toBeCalledTimes(1);
        expect(groupEventSpy).toBeCalledTimes(1);
        expect(mainEventSpy).toBeCalledTimes(1);
    });

    it("Should start monitoring all hosts when the main monitor starts monitoring", async () => {
        const custom: Config = {
            ...config,
            hosts: [
                { name: "a", address: "" },
                { name: "b", address: "" }
            ]
        };
        setup(custom);

        const firstHost = monitor.hostMonitors[0];
        const secondHost = monitor.hostMonitors[1];

        const firstSpy = jest.spyOn(firstHost, "startMonitoring").mockImplementation(() => Promise.resolve());
        const secondSpy = jest.spyOn(secondHost, "startMonitoring").mockImplementation(() => Promise.resolve());

        await monitor.startMonitoring();
        expect(firstSpy).toBeCalledTimes(1);
        expect(secondSpy).toBeCalledTimes(1);
    });

    it("Should start monitoring network connection when the main monitor starts monitoring", async () => {
        const spy = jest.spyOn(monitor.connectionMonitor!, "startMonitoring");
        await monitor.startMonitoring();
        expect(spy).toBeCalledTimes(1);
    });

    it("Should not throw an error if there is no connection monitor when the main monitor starts monitoring", async () => {
        const custom: Config = { ...config, connectionMonitor: undefined };
        setup(custom);

        await expect(monitor.startMonitoring()).resolves.not.toThrow();
    });

    it("Should stop monitoring all hosts when the main monitor stops monitoring", () => {
        const custom: Config = {
            ...config,
            hosts: [
                { name: "a", address: "" },
                { name: "b", address: "" }
            ]
        };
        setup(custom);

        const firstHost = monitor.hostMonitors[0];
        const secondHost = monitor.hostMonitors[1];

        const firstSpy = jest.spyOn(firstHost, "stopMonitoring");
        const secondSpy = jest.spyOn(secondHost, "stopMonitoring");
        monitor.stopMonitoring();
        expect(firstSpy).toBeCalledTimes(1);
        expect(secondSpy).toBeCalledTimes(1);
    });

    it("Should stop monitoring network connection when the main monitor stops monitoring", () => {
        const spy = jest.spyOn(monitor.connectionMonitor!, "stopMonitoring");
        monitor.stopMonitoring();
        expect(spy).toBeCalledTimes(1);
    });

    it("Should not throw an error if there is no connection monitor when the main monitor stops monitoring", () => {
        const custom: Config = { ...config, connectionMonitor: undefined };
        setup(custom);

        expect(() => monitor.stopMonitoring()).not.toThrow();
    });

    it("Should dispose of all monitors when loading a new config", () => {
        const custom: Config = { ...config, connectionMonitor: { gatewayAddress: "" }, hosts: [{ address: "", name: "" }], groups: [{ hosts: [], name: "" }] };
        setup(custom);
        const hostDisposeSpy = jest.spyOn(monitor.hostMonitors[0], "dispose");
        const groupDisposeSpy = jest.spyOn(monitor.groupMonitors[0], "dispose");
        const connectionDisposeSpy = jest.spyOn(monitor.connectionMonitor!, "dispose");

        monitor.loadConfig(config);
        expect(hostDisposeSpy).toBeCalledTimes(1);
        expect(groupDisposeSpy).toBeCalledTimes(1);
        expect(connectionDisposeSpy).toBeCalledTimes(1);
    });

    it("Should clear existing references to monitors when loading a new config", () => {
        const custom: Config = { ...config, connectionMonitor: { gatewayAddress: "" }, hosts: [{ address: "", name: "" }], groups: [{ hosts: [], name: "" }] };
        setup(custom);
        expect(monitor.hostMonitors.length).toEqual(1);
        expect(monitor.groupMonitors.length).toEqual(1);
        expect(monitor.connectionMonitor).toBeDefined();

        // Load a config with no host, group and connection monitors defined to ensure that any existing references are gone
        monitor.loadConfig({ ...config, connectionMonitor: undefined });
        expect(monitor.hostMonitors.length).toEqual(0);
        expect(monitor.groupMonitors.length).toEqual(0);
        expect(monitor.connectionMonitor).toBeUndefined();
    });
});
