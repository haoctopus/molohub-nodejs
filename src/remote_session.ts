import * as net from "net";
import { EventEmitter } from "events";

import { recvBuffer, MoloTcpBodyData, generatorTcpBuffer } from "./molo_tcp_pack";
import { genUniqueId, remoteID2LocalSess, breakSessionPair } from "./molo_client_app";
import { LocalSession } from "./local_session";

export class RemoteSession extends EventEmitter {
    private clientid:string;
    private rhost: string;
    private rport: number;
    private lhost: string;
    private lport: number;
    private id: string;
    private token: string = "";
    /** Socket connect to remote */
    private client?: net.Socket;
    private chunks: Buffer[] = [];
    private chunksSize: number = 0;
    private transparency: boolean = false;

    constructor(clientid: string, rhost: string, rport: number, lhost: string, lport: number) {
        super();

        this.id = genUniqueId();
        this.clientid = clientid;
        this.rhost = rhost;
        this.rport = rport;
        this.lhost = lhost;
        this.lport = lport;
    }

    clear() {
        this.chunks = [];
        this.chunksSize = 0;
        this.transparency = false;
    }


    sendRawPack(rawData: Buffer) {
        if (this.client) {
            this.client.write(rawData);
        }
    }

    sendDickPack(dictData: Record<string, any>) {
        console.log('sendDickPack ' + JSON.stringify(dictData));
        var body = generatorTcpBuffer(dictData);
        this.sendRawPack(body);
    }

    sockConnect() {
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.rport, this.rhost, () => {
            var bodyData: Record<string, any> = {}
            bodyData['Type'] = 'RegProxy';
            bodyData['Payload'] = {};
            bodyData['Payload']['ClientId'] = this.clientid;
    
            //var tcpBuffer = generatorTcpBuffer(bodyData);
    
            //console.log('onConnected, send authdata ' + tcpBuffer.toString('hex'));
            this.sendDickPack(bodyData);
        });
        this.client.on('data', (data: Buffer) => {
            this.chunks.push(data);
            this.chunksSize += data.length;
        });
        this.client.on('end', () => {
            const buf = Buffer.concat(this.chunks, this.chunksSize);
            if (this.transparency) {
                this.processTransparencyPack(buf);
            } else {
                this.processMoloTcpPack(buf);
            }
            console.log('RemoteSession onDisconnect');
            this.clear();
            var localSession = remoteID2LocalSess(this.id);
            if (localSession) {
                localSession.sockClose();
                breakSessionPair(this.id);
            }
        });
    }

    sockClose() {
        if (this.client)
            this.client.destroy();
    }

    private processMoloTcpPack(buf: Buffer) {
        recvBuffer(buf, (err, bodyJData) => {
            if (err) {
                console.log(`tcp pack error: ${err}`);
                if (this.client) {
                    this.client.destroy();
                }
            } else if (bodyJData) {
                this.processJsonPack(bodyJData);
            }
        });
    }

    private processJsonPack(jdata: MoloTcpBodyData) {
        console.log('remote session processJsonPack: ' + JSON.stringify(jdata));

        var protocolType = jdata['Type'];
        if (protocolType == 'StartProxy')
            this.onStartProxy();
    }

    private onStartProxy() {
        const local = new LocalSession(this.lhost, this.lport);
        local.on("add", (localID: string, localSess: LocalSession) => {
            this.emit("add", localID, localSess, this.id, this);
        })
        local.sockConnect();
        this.transparency = true;
        this.processTransparencyPack();
    }

    processTransparencyPack(buf?: Buffer) {
        var localSession = remoteID2LocalSess(this.id);
        if (!localSession) {
            console.log('processTransparencyPack() localsession session not found');
            this.sockClose();
            return;
        }
        if (buf) {
            localSession.sendRawPack(buf);
        }
    }
}
