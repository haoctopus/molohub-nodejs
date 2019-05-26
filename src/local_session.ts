import * as net from "net";
import { EventEmitter } from "events";

import { genUniqueId, localID2RemoteSess, breakSessionPair } from "./molo_client_app";

export class LocalSession extends EventEmitter {
    public id: string;
    private host: string;
    private port: number;
    private appendConnect: boolean = true;
    private chunks: Buffer[] = [];
    private chunksSize: number = 0;
    private client?: net.Socket;

    constructor(host: string, port: number) {
        super();

        this.id = genUniqueId();
        this.host = host;
        this.port = port;
    }

    clear() {
        this.appendConnect = true;
        this.chunks = [];
        this.chunksSize = 0;
    }


    sendRawPack(rawData: Buffer) {
        if (this.client) {
            this.client.write(rawData);
        }
    }

    sockConnect() {
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.port, this.host, () => {
            this.appendConnect = false;
        });
        this.client.on('data', (data: Buffer) => {
            this.chunks.push(data);
            this.chunksSize += data.length;
        });
        this.client.on('end', () => {
            const buf = Buffer.concat(this.chunks, this.chunksSize);
            var remoteSession = localID2RemoteSess(this.id);
            if (!remoteSession) {
                console.log("LocalSession remote session not found");
                this.sockClose();
                return;
            }
            remoteSession.sendRawPack(buf);
            this.clear();
            var remoteSession = localID2RemoteSess(this.id);
            if (remoteSession) {
                remoteSession.sockClose();
                breakSessionPair(this.id);
            }
        });
        this.emit("add", this.id, this);
    }

    sockClose() {
        if (this.client)
            this.client.destroy();
    }
}
