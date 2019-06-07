import { EventEmitter } from "events";

import { MoloTcpBodyData } from "./molo_tcp_pack";
import { genUniqueId, remoteID2LocalSess, breakSessionPair } from "./molo_client_app";
import { LocalSession } from "./local_session";
import { MoloSocket } from "./lib/molo_socket";

export class RemoteSession extends EventEmitter {
    private clientid:string;
    private rhost: string;
    private rport: number;
    private lhost: string;
    private lport: number;
    private _id: string = genUniqueId();
    /** Socket connect to remote */
    private client?: MoloSocket;

    public constructor(clientid: string, rhost: string, rport: number, lhost: string, lport: number) {
        super();

        this.clientid = clientid;
        this.rhost = rhost;
        this.rport = rport;
        this.lhost = lhost;
        this.lport = lport;
    }

    public sendRaw(rawData: Buffer) {
        if (this.client) this.client.sendRaw(rawData);
    }

    public sockConnect() {
        this.client = new MoloSocket(this.rhost, this.rport, "RemoteSession");
        this.client.connect()
        this.client.on("connect", () => {
            const bodyData: Record<string, any> = {}
            bodyData['Type'] = 'RegProxy';
            bodyData['Payload'] = {};
            bodyData['Payload']['ClientId'] = this.clientid;
            if (this.client) this.client.send(bodyData);
        });
        this.client.on("data", (data: MoloTcpBodyData|undefined, rawData: Buffer) => {
            if (data) {
                this.processJsonPack(data, rawData);
            } else {
                this.processTransparencyPack(rawData);
            }
        });
        this.client.on("end", () => {
            const localSession = remoteID2LocalSess(this._id);
            if (localSession) {
                localSession.sockClose();
                breakSessionPair(this._id);
            }
        });
    }

    public sockClose() {
        if (this.client) {
            this.client.destroy();
            this.client = undefined;
        }
    }

    private processJsonPack(jdata: MoloTcpBodyData, leftData: Buffer) {
        console.log('remote session processJsonPack: ' + JSON.stringify(jdata));

        const protocolType = jdata['Type'];
        if (protocolType == 'StartProxy')
            this.onStartProxy(leftData);
    }

    private onStartProxy(rawData: Buffer) {
        const local = new LocalSession(this.lhost, this.lport);
        local.on("connect", (localID: string, localSess: LocalSession) => {
            if (this.client) {
                this.client.setTransparency(true);
            }
            this.emit("add", localID, localSess, this._id, this);
            this.processTransparencyPack(rawData);
        });
        local.sockConnect();
    }

    private processTransparencyPack(buf: Buffer) {
        const localSession = remoteID2LocalSess(this._id);
        if (!localSession) {
            console.log('processTransparencyPack() localsession session not found');
            this.sockClose();
            return;
        }
        localSession.sendRaw(buf);
    }

    public dumpInfo() {
        if (this.client)
            return `RemoteSession(${this._id}): TransMode(${this.client.getTransparency()})`;
    }

    public get id() {
        return this._id;
    }
}
