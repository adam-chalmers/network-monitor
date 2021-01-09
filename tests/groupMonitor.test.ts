import { GroupMonitor } from "../src/groupMonitor";
import { HostMonitor } from "../src/hostMonitor";
import { Defaults } from "../src/types/defaults";
import { Group } from "../src/types/group";
import { Host } from "../src/types/host";
import { TaskDefinition } from "../src/types/taskDefinition";

describe("@adam-chalmers/network-monitor @unit groupMonitor.ts", () => {
    const defaults: Defaults = {
        hostPingRate: 1,
        hostPingRetries: 0,
        networkPingRate: 1,
        networkPingRetries: 0,
        logTasks: true,
        logHostConnectivityChanges: true
    };

    const hosts: Host[] = [
        {
            name: "a",
            address: ""
        },
        {
            name: "b",
            address: ""
        }
    ];
    const group: Group = {
        name: "group",
        hosts: hosts.map((h) => h.name)
    };
    let hostMonitors = hosts.map((h) => new HostMonitor(h, defaults));
    let monitor = new GroupMonitor(group, hostMonitors, defaults);

    function setup(group: Group, hosts: Host[] = []): void {
        hostMonitors = hosts.map((h) => new HostMonitor(h, defaults));
        monitor = new GroupMonitor(group, hostMonitors, defaults);
    }

    beforeEach(() => {
        jest.useFakeTimers();
        // Stop console logging
        jest.spyOn(console, "log").mockImplementation(() => undefined);
        jest.spyOn(console, "error").mockImplementation(() => undefined);

        setup(group, hosts);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it("Should use the details given in the config", () => {
        expect(monitor.name).toEqual(group.name);
    });

    it("Should use the values given in the defaults if none are provided in the host config", () => {
        expect(monitor["logTasks"]).toEqual(defaults.logTasks);
    });

    it("Should override the values given in the defaults if they're provided in the host config", () => {
        const custom: Group = { ...group, logTasks: false };
        setup(custom);
        expect(monitor["logTasks"]).toEqual(custom.logTasks);
    });

    interface Args {
        allConnected?: TaskDefinition;
        anyConnected?: TaskDefinition;
        allDisconnected?: TaskDefinition;
        anyDisconnected?: TaskDefinition;
    }
    function setupTwoHostMonitor({ allConnected, anyConnected, allDisconnected, anyDisconnected }: Args): [Host, Host] {
        const first: Host = {
            name: "first",
            address: ""
        };
        const second: Host = {
            name: "second",
            address: ""
        };
        const custom: Group = {
            ...group,
            hosts: [first, second].map((h) => h.name),
            onAllConnected: allConnected ? [allConnected] : undefined,
            onAnyConnected: anyConnected ? [anyConnected] : undefined,
            onAllDisconnected: allDisconnected ? [allDisconnected] : undefined,
            onAnyDisconnected: anyDisconnected ? [anyDisconnected] : undefined
        };
        setup(custom, [first, second]);
        return [first, second];
    }

    it("Should fire onAllConnected events when all members of the group are connected", () => {
        const func = jest.fn();
        const allConnected: TaskDefinition = { name: "a" };
        const [first, second] = setupTwoHostMonitor({ allConnected });

        monitor.eventEmitter.addListener(allConnected.name, func);
        const firstMonitor = monitor.hostMonitors[0];
        const secondMonitor = monitor.hostMonitors[1];

        // Mock one host to show as online and the other to show as offline
        jest.spyOn(firstMonitor, "isOnline", "get").mockImplementation(() => true);
        jest.spyOn(firstMonitor, "getDetails").mockImplementation(() => ({ name: first.name, address: first.address, isOnline: true }));
        const secondOnlineSpy = jest.spyOn(secondMonitor, "isOnline", "get").mockImplementation(() => false);
        const secondDetailsSpy = jest
            .spyOn(secondMonitor, "getDetails")
            .mockImplementation(() => ({ name: second.name, address: second.address, isOnline: false }));

        // Tell the monitor that a host has connected and ensure that the allConnected event isn't emitted since not all are online
        monitor["hostConnected"]();
        expect(func).toBeCalledTimes(0);

        // Mock the second host to show as online now
        secondOnlineSpy.mockImplementation(() => true);
        secondDetailsSpy.mockImplementation(() => ({ name: second.name, address: second.address, isOnline: true }));

        // Now that a second host monitor reports as being online, all hosts in the group are online and the allConnected event should be emitted
        monitor["hostConnected"]();
        expect(func).toBeCalledTimes(1);
    });

    it("Should fire onAnyConnected events when the any member of a group comes online", () => {
        const func = jest.fn();
        const anyConnected: TaskDefinition = { name: "a" };
        setupTwoHostMonitor({ anyConnected });

        monitor.eventEmitter.addListener(anyConnected.name, func);

        // Tell the group monitor that a host has connected, and ensure that the anyConnected event is emitted
        monitor["hostConnected"]();
        expect(func).toBeCalledTimes(1);
    });

    it("Should fire onAllDisconnected events when the last member of a group goes offline", () => {
        const func = jest.fn();
        const allDisconnected: TaskDefinition = { name: "a" };
        const [first, second] = setupTwoHostMonitor({ allDisconnected });

        monitor.eventEmitter.addListener(allDisconnected.name, func);
        const firstMonitor = monitor.hostMonitors[0];
        const secondMonitor = monitor.hostMonitors[1];

        // Mock one host to show as offline and the other to show as online
        jest.spyOn(firstMonitor, "isOnline", "get").mockImplementation(() => false);
        jest.spyOn(firstMonitor, "getDetails").mockImplementation(() => ({ name: first.name, address: first.address, isOnline: false }));
        const secondOnlineSpy = jest.spyOn(secondMonitor, "isOnline", "get").mockImplementation(() => true);
        const secondDetailsSpy = jest
            .spyOn(secondMonitor, "getDetails")
            .mockImplementation(() => ({ name: second.name, address: second.address, isOnline: true }));

        // Tell the monitor that a host has disconnected and ensure that the allDisconnected event isn't emitted since not all are offline
        monitor["hostDisconnected"]();
        expect(func).toBeCalledTimes(0);

        // Mock the second host to show as offline now
        secondOnlineSpy.mockImplementation(() => false);
        secondDetailsSpy.mockImplementation(() => ({ name: second.name, address: second.address, isOnline: false }));

        // Now that a second host monitor reports as being online, all hosts in the group are online and the allConnected event should be emitted
        monitor["hostDisconnected"]();
        expect(func).toBeCalledTimes(1);
    });

    it("Should fire onAnyDisconnected events when any member of a group goes offline", () => {
        const func = jest.fn();
        const anyDisconnected: TaskDefinition = { name: "a" };
        setupTwoHostMonitor({ anyDisconnected });

        monitor.eventEmitter.addListener(anyDisconnected.name, func);

        // Tell the group monitor that a host has disconnected, and ensure that the anyDisconnected event is emitted
        monitor["hostDisconnected"]();
        expect(func).toBeCalledTimes(1);
    });

    it("Should remove all event listeners when being disposed", () => {
        const spy = jest.spyOn(monitor.eventEmitter, "removeAllListeners");
        monitor.dispose();
        expect(spy).toBeCalled();
    });
});
