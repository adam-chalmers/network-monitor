import { EventEmitter as Emitter } from "events";
import { Details } from "./types/details";

type EventHandler<T, K extends keyof T> = (details: T[K], param?: Record<string, any>) => any;

export class EventEmitter<T extends Record<string, Details>> {
    private readonly _emitter: Emitter = new Emitter();
    public get emitter(): Emitter {
        return this._emitter;
    }

    // Maps given handlers to their "safe" versions so that they can then be removed by removeListener
    private readonly handlers: Map<EventHandler<T, any>, EventHandler<T, any>> = new Map();

    public addListener<K extends keyof T>(eventName: K, handler: EventHandler<T, K>): void {
        const safeHandler: EventHandler<T, K> = (details, param): void => {
            try {
                handler(details, param);
            } catch (err) {
                this._emitter.emit("error", err);
            }
        };
        this.handlers.set(handler, safeHandler);
        this._emitter.addListener(eventName as string, safeHandler);
    }

    public removeListener<K extends keyof T>(eventName: K, handler: EventHandler<T, K>): void {
        const safeHandler = this.handlers.get(handler);
        if (safeHandler != null) {
            this._emitter.removeListener(eventName as string, safeHandler);
        }
    }

    public emit<K extends keyof T>(eventName: K, details: T[K], param?: Record<string, any>): any {
        this._emitter.emit(eventName as string, details, param);
    }

    public removeAllListeners(): void {
        this._emitter.removeAllListeners();
    }
}
