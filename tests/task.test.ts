import { EventEmitter } from "../src/eventEmitter";
import { Task } from "../src/task";
import { TaskDefinition } from "../src/types/taskDefinition";

describe("@adam-chalmers/network-monitor @unit task.ts", () => {
    it("Should return true if the day is within the configured day range", () => {
        // Days: Sunday = 0, Monday = 1, ..., Saturday = 6
        const definition: TaskDefinition = { name: "a", dateRanges: [{ dayStart: 2, dayEnd: 4 }] }; // Tuesday through Thursday
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1))).toEqual(true); // Wednesday, Jan 1st, 2020
        expect(task.canTrigger(new Date(2020, 0, 2))).toEqual(true); // Thursday, Jan 2nd, 2020
        expect(task.canTrigger(new Date(2020, 0, 3))).toEqual(false); // Friday, Jan 3rd, 2020
        expect(task.canTrigger(new Date(2020, 0, 4))).toEqual(false); // Saturday, Jan 4th, 2020
        expect(task.canTrigger(new Date(2020, 0, 5))).toEqual(false); // Sunday, Jan 5th, 2020
        expect(task.canTrigger(new Date(2020, 0, 6))).toEqual(false); // Monday, Jan 6th, 2020
        expect(task.canTrigger(new Date(2020, 0, 7))).toEqual(true); // Tuesday, Jan 7th, 2020
    });

    it("Should return true if the day is equal to or after the configured start day in an open-ended range", () => {
        // Days: Sunday = 0, Monday = 1, ..., Saturday = 6
        const definition: TaskDefinition = { name: "a", dateRanges: [{ dayStart: 4 }] }; // Thursday onwards (Thursday through Saturday)
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1))).toEqual(false); // Wednesday, Jan 1st, 2020
        expect(task.canTrigger(new Date(2020, 0, 2))).toEqual(true); // Thursday, Jan 2nd, 2020
        expect(task.canTrigger(new Date(2020, 0, 3))).toEqual(true); // Friday, Jan 3rd, 2020
        expect(task.canTrigger(new Date(2020, 0, 4))).toEqual(true); // Saturday, Jan 4th, 2020
        expect(task.canTrigger(new Date(2020, 0, 5))).toEqual(false); // Sunday, Jan 5th, 2020
        expect(task.canTrigger(new Date(2020, 0, 6))).toEqual(false); // Monday, Jan 6th, 2020
        expect(task.canTrigger(new Date(2020, 0, 7))).toEqual(false); // Tuesday, Jan 7th, 2020
    });

    it("Should return true if the day is equal to or before the configured end day in an open-ended range", () => {
        // Days: Sunday = 0, Monday = 1, ..., Saturday = 6
        const definition: TaskDefinition = { name: "a", dateRanges: [{ dayEnd: 4 }] }; // Thursday and before (Sunday through Thursday)
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1))).toEqual(true); // Wednesday, Jan 1st, 2020
        expect(task.canTrigger(new Date(2020, 0, 2))).toEqual(true); // Thursday, Jan 2nd, 2020
        expect(task.canTrigger(new Date(2020, 0, 3))).toEqual(false); // Friday, Jan 3rd, 2020
        expect(task.canTrigger(new Date(2020, 0, 4))).toEqual(false); // Saturday, Jan 4th, 2020
        expect(task.canTrigger(new Date(2020, 0, 5))).toEqual(true); // Sunday, Jan 5th, 2020
        expect(task.canTrigger(new Date(2020, 0, 6))).toEqual(true); // Monday, Jan 6th, 2020
        expect(task.canTrigger(new Date(2020, 0, 7))).toEqual(true); // Tuesday, Jan 7th, 2020
    });

    it("Should return true if the date is within the configured set of days", () => {
        // Days: Sunday = 0, Monday = 1, ..., Saturday = 6
        const definition: TaskDefinition = { name: "a", dateRanges: [{ days: [5, 0] }] }; // Sunday and Friday
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1))).toEqual(false); // Wednesday, Jan 1st, 2020
        expect(task.canTrigger(new Date(2020, 0, 2))).toEqual(false); // Thursday, Jan 2nd, 2020
        expect(task.canTrigger(new Date(2020, 0, 3))).toEqual(true); // Friday, Jan 3rd, 2020
        expect(task.canTrigger(new Date(2020, 0, 4))).toEqual(false); // Saturday, Jan 4th, 2020
        expect(task.canTrigger(new Date(2020, 0, 5))).toEqual(true); // Sunday, Jan 5th, 2020
        expect(task.canTrigger(new Date(2020, 0, 6))).toEqual(false); // Monday, Jan 6th, 2020
        expect(task.canTrigger(new Date(2020, 0, 7))).toEqual(false); // Tuesday, Jan 7th, 2020
    });

    it("Should return true if the time is within the configured time range", () => {
        const definition: TaskDefinition = { name: "a", dateRanges: [{ timeRanges: [{ timeStart: 120, timeEnd: 300 }] }] }; // 2am through 5am
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1, 0, 0))).toEqual(false); // 00:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 1, 0))).toEqual(false); // 01:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 2, 0))).toEqual(true); // 02:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 3, 0))).toEqual(true); // 03:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 4, 0))).toEqual(true); // 04:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 5, 0))).toEqual(true); // 05:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 6, 0))).toEqual(false); // 06:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 14, 0))).toEqual(false); // 14:00:00 (2pm)
    });

    it("Should return true if both the date and time are within the configured date and time range", () => {
        // Tuesday through Thursday, 2am through 5am
        const definition: TaskDefinition = { name: "a", dateRanges: [{ dayStart: 2, dayEnd: 4, timeRanges: [{ timeStart: 120, timeEnd: 300 }] }] };
        const task = new Task(definition);

        // Check allowed times on allowed days
        expect(task.canTrigger(new Date(2020, 0, 7, 2, 0))).toEqual(true); // Tuesday, Jan 7th, 2020 at 02:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 2, 0))).toEqual(true); // Tuesday, Jan 7th, 2020 at 05:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 5, 0))).toEqual(true); // Wednesday, Jan 1st, 2020 at 02:00:00
        expect(task.canTrigger(new Date(2020, 0, 2, 2, 0))).toEqual(true); // Thursday, Jan 2nd, 2020 at 02:00:00

        // Check disallowed times on an allowed day
        expect(task.canTrigger(new Date(2020, 0, 1, 1, 0))).toEqual(false); // Wednesday, Jan 1st, 2020 at 01:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 6, 0))).toEqual(false); // Wednesday, Jan 1st, 2020 at 06:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 14, 0))).toEqual(false); // Wednesday, Jan 1st, 2020 at 14:00:00 (2pm)

        // Check allowed time on a disallowed day
        expect(task.canTrigger(new Date(2020, 0, 3, 2, 0))).toEqual(false); // Friday, Jan 3rd, 2020 at 02:00:00

        // Check disallowed time on a disallowed day
        expect(task.canTrigger(new Date(2020, 0, 3, 1, 0))).toEqual(false); // Friday, Jand 3rd, 2020 at 01:00:00
    });

    it("Should return true if the time is equal to or after the configured start time in an open-ended range", () => {
        const definition: TaskDefinition = { name: "a", dateRanges: [{ timeRanges: [{ timeStart: 120 }] }] };
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1, 0))).toEqual(false); // 00:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 1))).toEqual(false); // 01:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 1, 59))).toEqual(false); // 01:59:00
        expect(task.canTrigger(new Date(2020, 0, 1, 2))).toEqual(true); // 02:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 3))).toEqual(true); // 03:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 23, 59))).toEqual(true); // 25:59:00
    });

    it("Should return true if the time is equal to or before the configured end time in an open-ended range", () => {
        const definition: TaskDefinition = { name: "a", dateRanges: [{ timeRanges: [{ timeEnd: 120 }] }] };
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1, 0))).toEqual(true); // 00:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 1))).toEqual(true); // 01:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 2))).toEqual(true); // 02:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 2, 1))).toEqual(false); // 02:01:00
        expect(task.canTrigger(new Date(2020, 0, 1, 3))).toEqual(false); // 03:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 23, 59))).toEqual(false); // 25:59:00
    });

    it("Should return true regardless of time if the timeRange is empty", () => {
        const definition: TaskDefinition = { name: "a", dateRanges: [{ timeRanges: [{}] }] };
        const task = new Task(definition);

        expect(task.canTrigger(new Date(2020, 0, 1, 0))).toEqual(true); // 00:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 1))).toEqual(true); // 01:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 2))).toEqual(true); // 02:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 2, 1))).toEqual(true); // 02:01:00
        expect(task.canTrigger(new Date(2020, 0, 1, 3))).toEqual(true); // 03:00:00
        expect(task.canTrigger(new Date(2020, 0, 1, 23, 59))).toEqual(true); // 25:59:00
    });

    it("Should emit an event", () => {
        const definition: TaskDefinition = { name: "a" };
        const task = new Task(definition);

        // Attach a mock handler to the task's event name
        const func = jest.fn();
        const emitter = new EventEmitter<any>();
        emitter.addListener(definition.name, func);

        // Trigger the task and ensure that the mock handler has been called once
        task.trigger(emitter);
        expect(func).toBeCalledTimes(1);
    });
});
