import { EventEmitter } from "./eventEmitter";
import { DateRange, TimeRange } from "./types/dateRange";
import { Details } from "./types/details";
import { TaskDefinition } from "./types/taskDefinition";

export class Task<T extends Details> {
    private readonly delay?: number;
    private readonly dateRanges?: DateRange[];
    private readonly shouldLog?: boolean;
    private readonly parameter?: any;

    constructor(definition: TaskDefinition, shouldLog?: boolean) {
        this.name = definition.name;
        this.delay = definition.delay;
        this.dateRanges = definition.dateRanges;
        this.shouldLog = shouldLog;
        this.parameter = definition.param;
    }

    public readonly name: string;

    private meetsDayCriteria(dayOfWeek: number, range: DateRange): boolean {
        // If a list of days is configured, return whether the day is in that list or not
        if (range.days != null) {
            return range.days.find((x) => x === dayOfWeek) != null;
        }

        // If a start day is configured, return whether the day is >= the start day
        if (range.dayStart != null) {
            // If an end day is also configured, only return true if the day is <= the end day too
            if (range.dayEnd != null) {
                return dayOfWeek >= range.dayStart && dayOfWeek <= range.dayEnd;
            }

            return dayOfWeek >= range.dayStart;
        }

        // If an end day is configured (start day must not be otherwise it would've been caught by above logic) return whether the day is <= the end day
        if (range.dayEnd != null) {
            return dayOfWeek <= range.dayEnd;
        }

        // If there is no day restriction, simply return true
        return true;
    }

    private meetsTimeCriteria(totalMinutes: number, timeRange: TimeRange): boolean {
        // If a start time is configured, return whether the number of minutes is >= the start time
        if (timeRange.timeStart != null) {
            // If an end time is also configured, only return true if the number of minutes is <= the end time too
            if (timeRange.timeEnd != null) {
                return totalMinutes >= timeRange.timeStart && totalMinutes <= timeRange.timeEnd;
            }

            return totalMinutes >= timeRange.timeStart;
        }

        // If an end time is configured (start time must not be otherwise it would've been caught by above logic) return whether the number of minutes is <= the end time
        if (timeRange.timeEnd != null) {
            return totalMinutes <= timeRange.timeEnd;
        }

        // If there is no time restriction, simply return true
        return true;
    }

    public canTrigger(date: Date): boolean {
        if (this.dateRanges == null) {
            return true;
        }

        const dayOfWeek = date.getDay();
        const totalMinutes = date.getHours() * 60 + date.getMinutes();

        // Check each date range
        for (const dateRange of this.dateRanges) {
            if (this.meetsDayCriteria(dayOfWeek, dateRange)) {
                if (dateRange.timeRanges == null) {
                    return true;
                }

                for (const timeRange of dateRange.timeRanges) {
                    if (this.meetsTimeCriteria(totalMinutes, timeRange)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    public trigger(emitter: EventEmitter<Record<string, any>>, details?: T): void {
        // Schedule the task with a delay if required
        if (this.delay != null && this.delay > 0) {
            if (this.shouldLog === true) {
                console.log(`${new Date().toLocaleString()} - Triggering task "${this.name}" with delay ${this.delay}ms.`);
            }
            setTimeout(() => emitter.emit(this.name, details, this.parameter), this.delay);
        } else {
            if (this.shouldLog === true) {
                console.log(`${new Date().toLocaleString()} - Triggering task "${this.name}" without delay.`);
            }
            emitter.emit(this.name, details, this.parameter);
        }
    }
}
