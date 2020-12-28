import ping from "ping";

export function pingAddress(address: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        ping.sys.probe(address, (isAlive, err) => {
            if (err != null) {
                return reject(err);
            }
            return resolve(isAlive);
        });
    });
}
