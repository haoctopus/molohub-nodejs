import * as os from "os";
import * as process from "process";
import { MoloTcpBodyData } from "./molo_tcp_pack";
import { newSessionPair } from "./molo_client_app"
import { RemoteSession } from "./remote_session";
import { LocalSession } from "./local_session";
import { MoloSocket } from "./lib/molo_socket";

const CLIENT_STATUS_UNBINDED = "unbinded"
const CLIENT_STATUS_BINDED = "binded"

type ClientStatusType = "unbinded" | "binded";

const CONNECTE_STATUS_DISCONNECT = 100
const CONNECTE_STATUS_CONNECTING = 101
const CONNECTE_STATUS_CONNECTED = 102

export class MolohubClient {
    private rhost: string;
    private rport: number;
    private lhost: string;
    private lport: number;
    /** Socket connect to remote */
    private client?: MoloSocket;
    private clientid: string = "";
    private clientStatus: ClientStatusType = CLIENT_STATUS_BINDED;
    private token: string = "";
    private connectStatus: number = CONNECTE_STATUS_DISCONNECT;

    public constructor(rhost: string, rport: number, lhost: string, lport: number) {
        this.rhost = rhost;
        this.rport = rport;
        this.lhost = lhost;
        this.lport = lport;
    }

    private clear() {
        this.clientStatus = CLIENT_STATUS_UNBINDED;
        this.connectStatus = CONNECTE_STATUS_DISCONNECT;
    }

    public sockConnect() {
        this.clear();
        this.client = new MoloSocket(this.rhost, this.rport, "Client");
        this.client.connect()
        this.connectStatus = CONNECTE_STATUS_CONNECTING;
        this.client.on("connect", () => {
            console.log("on client connect");
            this.connectStatus = CONNECTE_STATUS_CONNECTED;
            const bodyData: Record<string, any> = {}
            bodyData['Type'] = 'Auth';
            bodyData['Payload'] = {};
            bodyData['Payload']['OS'] = os.platform() + "_" + os.arch() + "_" + os.release();
            bodyData['Payload']['PyVersion'] = process.version; //TODO: node version
            bodyData['Payload']['App'] = 'MolohubNodeJs';
            bodyData['Payload']['MacAddr'] = 'testMac'; //TODO:
    
            //TODO: fisrt time generate random id, then save it, after that, use saved localseed
            bodyData['Payload']['LocalSeed'] = Math.random().toString(36).substr(2);
            if (this.client) this.client.send(bodyData);
        });

        this.client.on("data", (data: MoloTcpBodyData) => {
            this.processJsonPack(data);
        });
        this.client.on("end", () => {
            console.log('onDisconnect');
            this.clear();
        });

        this.client.on('error', () => {
            console.log("sock Error:!!!");
            this.clear();
        });
        
        setInterval(() => {
            this.sendPing();
            //reconnect server when disconnected.
            if (this.connectStatus == CONNECTE_STATUS_DISCONNECT) {
                console.log(`reconnecting...`);
                this.sockConnect();
            }   
        }, 5000);
    }

    private processJsonPack(jdata: MoloTcpBodyData) {
        console.log('processJsonPack: ' + JSON.stringify(jdata));

        const protocolType = jdata['Type'];
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
        
        if (this.connectStatus != CONNECTE_STATUS_CONNECTED)
            return;

        const payload: Record<string, any> = {};
        payload['Token'] = this.token;
        payload['Status'] = this.clientStatus;
        const bodyData: Record<string, any> = {}
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'Ping';
        if (this.client) this.client.send(bodyData);
    }

    private onAuthResp(jdata: MoloTcpBodyData) {
        this.clientid = jdata['Payload']['ClientId'];
        const payload: Record<string, any> = {};
        payload['ReqId'] = 1;
        payload['MacAddr'] = 'testMacAddr';
        payload['ClientId'] = this.clientid;
        payload['Protocol'] = 'tcp';
        const bodyData: Record<string, any> = {}
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'ReqTunnel';
        console.log('clienid: ' + this.clientid);
        console.log('payload: ' + JSON.stringify(payload));
        if (this.client) this.client.send(bodyData);
    }

    private onNewTunnel(jdata: MoloTcpBodyData) {
        this.token = jdata['Payload']['token'];
        console.log('!!!login succeed clientid:' + this.clientid + " token:" + this.token);

        //online config, such as markdown template
        const onlineConfig = jdata['OnlineConfig'];
        //TODO: process markdown template stuff

        this.onBindStatus(jdata);
    }

    private onBindStatus(jdata: MoloTcpBodyData) {
        const payload = jdata['Payload']
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