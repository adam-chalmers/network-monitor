import { GroupDetails, HostDetails } from ".";
import { EventEmitter } from "./eventEmitter";
import { Task } from "./task";
import { ConnectivityDetails } from "./types/connectivityDetails";
import { TaskDefinition } from "./types/taskDefinition";

export abstract class BaseMonitor<T extends HostDetails | GroupDetails | ConnectivityDetails> {
    protected readonly logTasks: boolean;

    constructor(name: string, logTasks: boolean) {
        this.name = name;
        this.eventEmitter = new EventEmitter();
        this.logTasks = logTasks;
    }

    public readonly name: string;
    public readonly eventEmitter: EventEmitter<Record<string, T>>;

    protected makeTasks(definitions: TaskDefinition[] | undefined): Task<T>[] {
        if (definitions === undefined) {
            return [];
        }

        const tasks: Task<T>[] = [];
        for (const definition of definitions) {
            if (definition.enabled === false) {
                continue;
            }

            tasks.push(new Task(definition, this.logTasks));
        }
        return tasks;
    }

    protected fireTasks(tasks: Task<T>[], details: T): void {
        const now = new Date();
        for (const task of tasks) {
            if (task.canTrigger(now)) {
                task.trigger(this.eventEmitter, details);
            }
        }
    }

    public abstract getDetails(): T;

    public dispose(): void {
        this.eventEmitter.removeAllListeners();
    }
}
