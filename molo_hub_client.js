var net = require('net');
var MoloTcpPack = require("./molo_tcp_pack")

var MOLO_APP = require("./molo_client_app")
var RemoteSession = require("./remote_session")

var config = require("./config.json")

var os = require('os');
const process = require('process');

var CLIENT_STATUS_UNBINDED = "unbinded"
var CLIENT_STATUS_BINDED = "binded"

class MolohubClient {
    constructor(rhost, rport, lhost, lport) {
        this.rhost = rhost;
        this.rport = rport;
        this.client = null;
        this.clientid = "";
        this.lhost = lhost;
        this.lport = lport;
        this.moloTcpPack = new MoloTcpPack();
    }

    clear() {
        this.moloTcpPack.clear();
        this.appendRecvBuffer = null;
        this.appendSendBuffer = null;
        this.appendConnect = true;
        this.clientStatus = CLIENT_STATUS_UNBINDED;
    }
    
   
    sendRawPack(rawData) {
        if (this.appendConnect)
            return;
        this.client.write(rawData);
    }
    
    sendDickPack(dictData) {
        console.log('sendDickPack ' + JSON.stringify(dictData));
        if (this.appendConnect)
            return;
        var body = this.moloTcpPack.generatorTcpBuffer(dictData);
        this.sendRawPack(body);
    }

    onConnected() {
        var bodyData = {}
        this.appendConnect = false;
        bodyData['Type'] = 'Auth';
        bodyData['Payload'] = {};
        bodyData['Payload']['OS'] = os.platform() + "_" + os.arch() + "_" + os.release();
        bodyData['Payload']['PyVersion'] = process.version; //TODO: node version
        bodyData['Payload']['App'] = 'MolohubNodeJs';
        bodyData['Payload']['MacAddr'] = 'testMac'; //TODO:

        //TODO: fisrt time generate random id, then save it, after that, use saved localseed
        bodyData['Payload']['LocalSeed'] =  Math.random().toString(36).substr(2);
       this.sendDickPack(bodyData);
    }

    onDisconnect(hadError) {
        console.log('onDisconnect ' + String(hadError));
        this.clear();
    }

    onRecvData(data) {
        try {
            if(this.appendRecvBuffer && this.appendRecvBuffer.length>0)
                this.appendRecvBuffer = Buffer.concat(this.appendRecvBuffer, data);
            else 
                this.appendRecvBuffer = data;

            this.processMoloTcpPack();
        }
        catch(e) {
            console.log('recv error!!');
            console.log(e);
        }
    }


    sockConnect() {
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.rport, this.rhost, this.onConnected.bind(this));
        this.client.on('data', this.onRecvData.bind(this));
        this.client.on('end', this.onDisconnect.bind(this));
    }
    
    processMoloTcpPack() {
        var ret = true;

        while(ret) {
            ret = this.moloTcpPack.recvBuffer(this.appendRecvBuffer);
            if (ret && this.moloTcpPack.errCode == MoloTcpPack.ERR_OK)
                this.processJsonPack(this.moloTcpPack.bodyJData);
            this.appendRecvBuffer = this.moloTcpPack.tmpBuff;
            if (this.moloTcpPack.errCode == MoloTcpPack.ERR_MALFORMED) {
                console.log("tcp pack malformed!!");
                this.client.close();
            }
        }
    }

    processJsonPack(jdata) {
        console.log('processJsonPack: ' + JSON.stringify(jdata));

        var protocolType = jdata['Type'];
        if (protocolType == 'AuthResp')
            this.onAuthResp(jdata);
        else if (protocolType == 'NewTunnel')
            this.onNewTunnel(jdata);
        else if(protocolType == 'TokenExpired')
            this.onTokenExpired(jdata);
        else if(protocolType == 'BindStatus')
            this.onBindStatus(jdata);
        else if(protocolType == 'ReqProxy')
            this.onReqProxy(jdata);
    }


    sendPing() {
        var payload = {};
        payload['Token'] = this.token;
        payload['Status'] = this.clientStatus;
        var bodyData = {}
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'Ping';
        this.sendDickPack(bodyData);
    }

    onAuthResp(jdata) {
        this.clientid = jdata['Payload']['ClientId'];
        var payload = {};
        payload['ReqId'] = 1;
        payload['MacAddr'] = 'testMacAddr';
        payload['ClientId'] = this.clientid;
        payload['Protocol'] = 'tcp';
        var bodyData = {}
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'ReqTunnel';
        console.log('clienid: ' + this.clientid);
        console.log('payload: ' + JSON.stringify(payload));
        this.sendDickPack(bodyData);
    }

    onNewTunnel(jdata) {
        this.token = jdata['Payload']['token'];
        console.log('!!!login succeed clientid:' + this.clientid + " token:" + this.token);

         //online config, such as markdown template
         var onlineConfig = jdata['OnlineConfig'];
         //TODO: process markdown template stuff

        this.onBindStatus(jdata);
    }

    onBindStatus(jdata) {
        var payload = jdata['Payload']
        this.clientStatus = payload['Status'];
        payload['token'] = this.token;
        //TODO update client status to ui by markdown
    }

    onUnBindAuth(jdata) {
        //TODO update to ui by markdown
    }

    /*
    onPong(jdata) {
        //console.log("onPong " + jdata.toString());
    }*/
    
    onTokenExpired(jdata) {
        // token expired, update a new one.
        this.token = jdata['Payload']['token'];
    }

    onReqProxy(jdata) {
        //TODO new remote session to build new tunnel
        var remoteSession = new RemoteSession(this.clientid,this.rhost, this.rport, this.lhost, this.lport);
        remoteSession.sockConnect();
    }
}

module.exports = MolohubClient;