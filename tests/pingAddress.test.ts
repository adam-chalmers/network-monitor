import ping from "ping";
import { pingAddress } from "../src/pingAddress";

describe("@adam-chalmers/network-monitor @unit pingAddress.ts", () => {
    const address = "";

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    it("Should respond with true when the host at the given address is online", async () => {
        // Make the ping respond with isAlive = true
        jest.spyOn(ping.sys, "probe").mockImplementation((address, callback) => {
            callback(true, undefined);
        });
        await expect(pingAddress(address)).resolves.toEqual(true);
    });

    it("Should respond with false when the host at the given address is offline", async () => {
        // Make the ping respond with isAlive = true
        jest.spyOn(ping.sys, "probe").mockImplementation((address, callback) => {
            callback(false, undefined);
        });
        await expect(pingAddress(address)).resolves.toEqual(false);
    });

    it("Should throw an error when the ping callback has a non-undefined error", async () => {
        // Make the ping respond with isAlive = true
        jest.spyOn(ping.sys, "probe").mockImplementation((address, callback) => {
            callback(false, new Error("Test error"));
        });
        await expect(pingAddress(address)).rejects.toThrow();
    });
});
