var net = require('net');
var MoloTcpPack = require("./molo_tcp_pack")

var MOLO_APP = require("./molo_client_app")
var LocalSession = require("./local_session")

class RemoteSession {
    constructor(clientid, rhost, rport, lhost, lport) {
        this.id = MOLO_APP.instance().genUniqueId();

        this.clientid = clientid;
        this.rhost = rhost;
        this.rport = rport;
        this.lhost = lhost;
        this.lport = lport;
        this.moloTcpPack = new MoloTcpPack();
        this.transparency = false;
        this.token = "";
        this.clear();
    }

    clear() {
        this.moloTcpPack.clear();
        this.appendRecvBuffer = null;
        this.transparency = false;
        this.appendConnect = true;
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
        bodyData['Type'] = 'RegProxy';
        bodyData['Payload'] = {};
        bodyData['Payload']['ClientId'] = this.clientid;

        //var tcpBuffer = moloTcpPack.generatorTcpBuffer(bodyData);

        //console.log('onConnected, send authdata ' + tcpBuffer.toString('hex'));
       this.sendDickPack(bodyData);
    }

    onDisconnect(hadError) {
        console.log('RemoteSession onDisconnect ' + String(hadError));
        this.clear();
        var localSession = MOLO_APP.instance().localSessionDict[this.id];
        if (localSession) {
            localSession.sockClose();
            delete MOLO_APP.instance().localSessionDict[this.id];
        }
    }

    onRecvData(data) {
        try {
            if(this.appendRecvBuffer && this.appendRecvBuffer.length>0)
                this.appendRecvBuffer = Buffer.concat(this.appendRecvBuffer, data);
            else 
                this.appendRecvBuffer = data;

            if(this.transparency)
                this.processTransparencyPack();
            else
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

    sockClose() {
        if(this.client)
            this.client.destroy();
    }
    
    processMoloTcpPack() {
        var ret = this.moloTcpPack.recvBuffer(this.appendRecvBuffer);
        if (ret && this.moloTcpPack.errCode == MoloTcpPack.ERR_OK) {
            this.appendRecvBuffer = this.moloTcpPack.tmpBuff;
            this.processJsonPack(this.moloTcpPack.bodyJData);
        }
            
        if (!this.transparency && this.moloTcpPack.errCode == MoloTcpPack.ERR_MALFORMED) {
            console.log("tcp pack malformed!!");
            this.client.close();
        }
    }

    processJsonPack(jdata) {
        console.log('remote session processJsonPack: ' + JSON.stringify(jdata));

        var protocolType = jdata['Type'];
        if (protocolType == 'StartProxy')
            this.onStartProxy(jdata);
    }

    onStartProxy(jdata) {
        var localSession = new LocalSession(this.lhost, this.lport);
        MOLO_APP.instance().localSessionDict[this.id] = localSession;
        MOLO_APP.instance().remoteSessionDict[localSession.id] = this;
        localSession.sockConnect();
        this.transparency = true;
        this.processTransparencyPack();
    }

    processTransparencyPack() {
        var localSession = MOLO_APP.instance().localSessionDict[this.id];
        if (!localSession) {
            console.log('processTransparencyPack() localsession session not found');
            this.sockClose();
            return;
        }
        if (this.appendRecvBuffer) {
            localSession.sendRawPack(this.appendRecvBuffer);
            console.log('processTransparencyPack() buffer ' + this.appendRecvBuffer.toString());
            this.appendRecvBuffer = null;
        }
    }

}


module.exports = RemoteSession;