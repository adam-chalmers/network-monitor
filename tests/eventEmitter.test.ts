import { EventEmitter } from "../src/eventEmitter";

describe("@adam-chalmers/network-monitor @unit eventEmitter.ts", () => {
    let emitter: EventEmitter<any> = new EventEmitter();
    beforeEach(() => {
        emitter = new EventEmitter();
    });

    it("Should add a listener to the underlying emitter", () => {
        const name = "a";
        const func = jest.fn();
        // Add the listener and test to make sure it was actually added to the underlying emitter
        emitter.addListener(name, func);
        expect(emitter.emitter.listeners(name).length).toEqual(1);
    });

    it("Should remover a listener from the underlying emitter", () => {
        const name = "a";
        const func = jest.fn();
        // Add the listener and test to make sure it was actually added to verify that it's then removed
        emitter.addListener(name, func);
        expect(emitter.emitter.listeners(name).length).toEqual(1);

        // Remove the listener and test to make sure that it was removed from the underlying emitter
        emitter.removeListener(name, func);
        expect(emitter.emitter.listeners(name).length).toEqual(0);
    });

    it("Should emit events on the underlying emitter", () => {
        const name = "a";
        const func = jest.fn();
        emitter.addListener(name, func);

        const details: any = { name: "test" };
        emitter.emit(name, details);
        expect(func).toBeCalledWith(details, undefined); // second argument is undefined as no optional param argument was given
    });

    it("Should remove all listeners from the underlying emitter", () => {
        const firstName = "a";
        const secondName = "b";
        const firstFunc = jest.fn();
        const secondFunc = jest.fn();

        // Add the handlers to multiple events
        emitter.addListener(firstName, firstFunc);
        emitter.addListener(firstName, secondFunc);
        emitter.addListener(secondName, firstFunc);
        emitter.addListener(secondName, secondFunc);

        // Test to ensure that the listeners were actually attached to verify that they're then removed
        expect(emitter.emitter.listenerCount(firstName)).toEqual(2);
        expect(emitter.emitter.listenerCount(secondName)).toEqual(2);

        emitter.removeAllListeners();
        expect(emitter.emitter.listenerCount(firstName)).toEqual(0);
        expect(emitter.emitter.listenerCount(secondName)).toEqual(0);
    });
});
