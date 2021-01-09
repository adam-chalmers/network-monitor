import { BaseMonitor } from "../src/baseMonitor";
import { ConnectivityDetails } from "../src/types/connectivityDetails";
import { TaskDefinition } from "../src/types/taskDefinition";

class BaseMock extends BaseMonitor<ConnectivityDetails> {
    public getDetails(): ConnectivityDetails {
        return {
            isOnline: false
        };
    }
}

describe("@adam-chalmers/network-monitor @unit baseMonitor.ts", () => {
    const name = "Base";
    const logTasks = false;
    let monitor = new BaseMock(name, logTasks);

    beforeEach(() => {
        monitor = new BaseMock(name, logTasks);
    });

    it("Should set values from the constructor", () => {
        expect(monitor.name).toEqual(name);
        expect(monitor["logTasks"]).toEqual(logTasks);
    });

    it("Should create an array of tasks from an array of task definitions", () => {
        const definition: TaskDefinition = {
            name: "a",
            dateRanges: [
                {
                    dayStart: 3,
                    dayEnd: 5
                }
            ],
            delay: 1000,
            param: {
                testProp: "Test"
            }
        };
        const [task] = monitor["makeTasks"]([definition]);
        expect(task.name).toEqual(definition.name);
        expect(task["dateRanges"]).toEqual(definition.dateRanges);
        expect(task["delay"]).toEqual(definition.delay);
        expect(task["parameter"]).toEqual(definition.param);
    });

    it("Should not create tasks from disabled task definitions", () => {
        const definitions: TaskDefinition[] = [{ name: "a", enabled: false }, { name: "b" }];
        const tasks = monitor["makeTasks"](definitions);
        expect(tasks.length).toEqual(1);
        expect(tasks[0].name).toEqual("b");
    });

    it("Should only fire tasks that can be triggered", () => {
        // Create tasks
        const definitions: TaskDefinition[] = [{ name: "a" }, { name: "b" }];
        const [a, b] = monitor["makeTasks"](definitions);

        // Mock tasks canTrigger functions so that only one reports as being triggerable
        jest.spyOn(a, "canTrigger").mockImplementation(() => false);
        jest.spyOn(b, "canTrigger").mockImplementation(() => true);

        // Attach the handler to events that are raised from both tasks
        const func = jest.fn();
        monitor.eventEmitter.addListener(a.name, func);
        monitor.eventEmitter.addListener(b.name, func);

        // Fire all triggerable tasks, and ensure that the handler is only called once since only one task is triggerable
        monitor["fireTasks"]([a, b], { isOnline: false });
        expect(func).toBeCalledTimes(1);
    });

    it("Should remove all listeners when being disposed", () => {
        const first = "a";
        const second = "b";

        // Attach event listeners and make sure that the event emitter reports that there are attached listeners to verify that they're then removed
        monitor.eventEmitter.addListener(first, () => true);
        monitor.eventEmitter.addListener(second, () => true);
        expect(monitor.eventEmitter.emitter.listenerCount(first)).toEqual(1);
        expect(monitor.eventEmitter.emitter.listenerCount(second)).toEqual(1);

        // Call the disposal function and then test that there are no listeners attached to the events that previously had listeners
        monitor.dispose();
        expect(monitor.eventEmitter.emitter.listenerCount(first)).toEqual(0);
        expect(monitor.eventEmitter.emitter.listenerCount(second)).toEqual(0);
    });
});
