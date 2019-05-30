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
    private id: string = genUniqueId();
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
        console.log("remote send raw");
        if (this.client) this.client.sendRaw(rawData);
    }

    public sockConnect() {
        this.client = new MoloSocket(this.rhost, this.rport);
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
                this.processJsonPack(data);
            } else {
                console.log("remote rece raw");
                this.processTransparencyPack(rawData);
            }
        });
        this.client.on("end", () => {
            console.log("RemoteSession onDisconnect");
            const localSession = remoteID2LocalSess(this.id);
            if (localSession) {
                localSession.sockClose();
                breakSessionPair(this.id);
            }
        });
    }

    public sockClose() {
        if (this.client) {
            this.client.destroy();
            this.client = undefined;
        }
    }

    private processJsonPack(jdata: MoloTcpBodyData) {
        console.log('remote session processJsonPack: ' + JSON.stringify(jdata));

        const protocolType = jdata['Type'];
        if (protocolType == 'StartProxy')
            this.onStartProxy();
    }

    private onStartProxy() {
        const local = new LocalSession(this.lhost, this.lport);
        local.on("add", (localID: string, localSess: LocalSession) => {
            this.emit("add", localID, localSess, this.id, this);
        })
        local.sockConnect();
        if (this.client) this.client.setTransparency(true);
        //this.processTransparencyPack();
    }

    private processTransparencyPack(buf: Buffer) {
        const localSession = remoteID2LocalSess(this.id);
        if (!localSession) {
            console.log('processTransparencyPack() localsession session not found');
            this.sockClose();
            return;
        }
        localSession.sendRaw(buf);
    }
}
