import { EventEmitter as Emitter } from "events";
import { Details } from "./types/details";

export class EventEmitter<T extends Record<string, Details>> {
    private readonly _emitter: Emitter = new Emitter();
    public get emitter(): Emitter {
        return this._emitter;
    }

    public addListener<K extends keyof T>(eventName: K, handler: (details: T[K], param?: Record<string, any>) => any): void {
        this._emitter.addListener(eventName as string, handler);
    }

    public removeListener<K extends keyof T>(eventName: K, handler: (details: T[K], param?: Record<string, any>) => any): void {
        this._emitter.removeListener(eventName as string, handler);
    }

    public emit<K extends keyof T>(eventName: K, details: T[K], param?: Record<string, any>): any {
        this._emitter.emit(eventName as string, details, param);
    }

    public removeAllListeners(): void {
        this._emitter.removeAllListeners();
    }
}
