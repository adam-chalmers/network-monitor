import { EventEmitter as Emitter } from "events";
import { GroupDetails } from "./types/groupDetails";
import { HostDetails } from "./types/hostDetails";

export class EventEmitter<T extends Record<string, HostDetails | GroupDetails>> {
    private emitter: Emitter = new Emitter();

    public addListener<K extends keyof T>(eventName: K, handler: (details: T[K], param?: any) => void): void {
        this.emitter.addListener(eventName as string, handler);
    }

    public removeListener<K extends keyof T>(eventName: K, handler: (details: T[K], param?: any) => void): void {
        this.emitter.removeListener(eventName as string, handler);
    }

    public emit<K extends keyof T>(eventName: K, details: T[K], param?: any): void {
        this.emitter.emit(eventName as string, details, param);
    }
}
