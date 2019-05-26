import * as net from "net";
import * as os from "os";
import * as process from "process";
import { recvBuffer, MoloTcpBodyData, generatorTcpBuffer } from "./molo_tcp_pack";
import { newSessionPair } from "./molo_client_app"
import { RemoteSession } from "./remote_session";
import { LocalSession } from "./local_session";

const CLIENT_STATUS_UNBINDED = "unbinded"
const CLIENT_STATUS_BINDED = "binded"

type ClientStatusType = "unbinded" | "binded";

export class MolohubClient {
    private rhost: string;
    private rport: number;
    private lhost: string;
    private lport: number;
    /** Socket connect to remote */
    private client?: net.Socket;
    private clientid: string = "";
    private clientStatus: ClientStatusType = CLIENT_STATUS_BINDED;
    private token: string = "";
    private chunks: Buffer[] = [];
    private chunksSize: number = 0;

    public constructor(rhost: string, rport: number, lhost: string, lport: number) {
        this.rhost = rhost;
        this.rport = rport;
        this.lhost = lhost;
        this.lport = lport;
    }

    clear() {
        this.chunks = [];
        this.chunksSize = 0;
        this.clientStatus = CLIENT_STATUS_UNBINDED;
    }

    private sendRawPack(rawData: Buffer) {
        if (this.client) {
            this.client.write(rawData);
        }
    }

    private sendDickPack(dictData: Record<string, any>) {
        console.log('sendDickPack ' + JSON.stringify(dictData));
        var body = generatorTcpBuffer(dictData);
        this.sendRawPack(body);
    }

    public sockConnect() {
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.rport, this.rhost, () => {
            var bodyData: Record<string, any> = {}
            bodyData['Type'] = 'Auth';
            bodyData['Payload'] = {};
            bodyData['Payload']['OS'] = os.platform() + "_" + os.arch() + "_" + os.release();
            bodyData['Payload']['PyVersion'] = process.version; //TODO: node version
            bodyData['Payload']['App'] = 'MolohubNodeJs';
            bodyData['Payload']['MacAddr'] = 'testMac'; //TODO:
    
            //TODO: fisrt time generate random id, then save it, after that, use saved localseed
            bodyData['Payload']['LocalSeed'] = Math.random().toString(36).substr(2);
            this.sendDickPack(bodyData);
        });
        this.client.on('data', (data: Buffer) => {
            this.chunks.push(data);
            this.chunksSize += data.length;
        });
        this.client.on('end', () => {
            const buf = Buffer.concat(this.chunks, this.chunksSize);
            this.processMoloTcpPack(buf);
            console.log('onDisconnect');
            this.clear();
        });
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
        console.log('processJsonPack: ' + JSON.stringify(jdata));

        var protocolType = jdata['Type'];
        if (protocolType == 'AuthResp')
            this.onAuthResp(jdata);
        else if (protocolType == 'NewTunnel')
            this.onNewTunnel(jdata);
        else if (protocolType == 'TokenExpired')
            this.onTokenExpired(jdata);
        else if (protocolType == 'BindStatus')
            this.onBindStatus(jdata);
        else if (protocolType == 'ReqProxy')
            this.onReqProxy();
    }

    public sendPing() {
        var payload: Record<string, any> = {};
        payload['Token'] = this.token;
        payload['Status'] = this.clientStatus;
        var bodyData: Record<string, any> = {}
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'Ping';
        this.sendDickPack(bodyData);
    }

    private onAuthResp(jdata: MoloTcpBodyData) {
        this.clientid = jdata['Payload']['ClientId'];
        var payload: Record<string, any> = {};
        payload['ReqId'] = 1;
        payload['MacAddr'] = 'testMacAddr';
        payload['ClientId'] = this.clientid;
        payload['Protocol'] = 'tcp';
        var bodyData: Record<string, any> = {}
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'ReqTunnel';
        console.log('clienid: ' + this.clientid);
        console.log('payload: ' + JSON.stringify(payload));
        this.sendDickPack(bodyData);
    }

    private onNewTunnel(jdata: MoloTcpBodyData) {
        this.token = jdata['Payload']['token'];
        console.log('!!!login succeed clientid:' + this.clientid + " token:" + this.token);

        //online config, such as markdown template
        var onlineConfig = jdata['OnlineConfig'];
        //TODO: process markdown template stuff

        this.onBindStatus(jdata);
    }

    private onBindStatus(jdata: MoloTcpBodyData) {
        var payload = jdata['Payload']
        this.clientStatus = payload['Status'];
        payload['token'] = this.token;
        //TODO update client status to ui by markdown
    }

    private onUnBindAuth() {
        //TODO update to ui by markdown
    }

    /*
    onPong(jdata) {
        //console.log("onPong " + jdata.toString());
    }*/

    private onTokenExpired(jdata: MoloTcpBodyData) {
        // token expired, update a new one.
        this.token = jdata['Payload']['token'];
    }

    private onReqProxy() {
        //TODO new remote session to build new tunnel
        const remote = new RemoteSession(this.clientid, this.rhost, this.rport, this.lhost, this.lport);
        remote.on("add", (localID: string, localSess: LocalSession, remoteID: string, remoteSess: RemoteSession) => {
            newSessionPair(localID, localSess, remoteID, remoteSess);
        })
        remote.sockConnect();
    }
}