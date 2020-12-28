import { EventEmitter } from "events";

export class Event<T extends Record<string, any>> {
    private emitter: EventEmitter = new EventEmitter();

    public addListener<K extends keyof T>(eventName: K, handler: (arg: T[K]) => void): void {
        this.emitter.addListener(eventName as string, handler);
    }

    public removeListener<K extends keyof T>(eventName: K, handler: (arg: T[K]) => void): void {
        this.emitter.removeListener(eventName as string, handler);
    }

    public emit<K extends keyof T>(eventName: K, arg: T[K]): void {
        this.emitter.emit(eventName as string, arg);
    }
}
