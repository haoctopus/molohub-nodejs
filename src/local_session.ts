import { EventEmitter } from "events";

import { genUniqueId, localID2RemoteSess, breakSessionPair } from "./molo_client_app";
import { MoloSocket } from "./lib/molo_socket";

export class LocalSession extends EventEmitter {
    private _id: string = genUniqueId();
    private host: string;
    private port: number;
    private client?: MoloSocket;

    public constructor(host: string, port: number) {
        super();

        this.host = host;
        this.port = port;
    }

    public sendRaw(rawData: Buffer) {
        if (this.client) this.client.sendRaw(rawData);
    }

    public onDisconnect() {
        const remoteSession = localID2RemoteSess(this._id);
            if (remoteSession) {
                remoteSession.sockClose();
                breakSessionPair(this._id);
            }
    }
    public sockConnect() {
        this.client = new MoloSocket(this.host, this.port, "LocolSession");
        this.client.setTransparency(true);
        this.client.on("data", (_, rawData: Buffer|undefined) => {
            if (rawData) {
                this.processTransparencyPack(rawData);
            }
        });
        this.client.on("end", this.onDisconnect.bind(this));

        this.client.on("error", () => {
            console.log('local sesion sock error!!');
            this.onDisconnect();
        });

        this.client.on("connect", () => {
            this.emit("connect", this._id, this);
        });
        this.client.connect();
    }

    public sockClose() {
        if (this.client)
            this.client.destroy();
    }

    private processTransparencyPack(buf: Buffer) {
        const remoteSession = localID2RemoteSess(this._id);
        if (!remoteSession) {
            console.log('processTransparencyPack() remoteSession session not found');
            this.sockClose();
            return;
        }
        remoteSession.sendRaw(buf);
    }

    public dumpInfo() {
        if (this.client)
            return `LocalSession(${this._id}):  TransMode(${this.client.getTransparency()})`;
    }

    public get id() {
        return this._id;
    }
}
