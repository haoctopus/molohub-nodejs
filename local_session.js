var net = require('net');
var MoloTcpPack = require("./molo_tcp_pack")

var MOLO_APP = require("./molo_client_app")


var CLIENT_STATUS_UNBINDED = "unbinded"
var CLIENT_STATUS_BINDED = "binded"

class LocalSession {
    constructor(host, port) {
        this.id = MOLO_APP.instance().genUniqueId();
        this.host = host;
        this.port = port;
        this.moloTcpPack = new MoloTcpPack();
        this.appendSendBuffer = null;
        
    }

    clear() {
        this.appendConnect = true;
        this.appendSendBuffer = null;
    }
    
   
    sendRawPack(rawData) {
       
        if(this.appendSendBuffer &&  this.appendSendBuffer.length>0)
            this.appendSendBuffer = Buffer.concat(this.appendSendBuffer, rawData);
        else
            this.appendSendBuffer = rawData;

        if (!this.appendConnect) {
            this.client.write(this.appendSendBuffer);
            this.appendSendBuffer = null;
        }
    }
    
    onConnected() {
        this.appendConnect = false;

        if(this.appendSendBuffer &&  this.appendSendBuffer.length>0) 
        {
            this.client.write(this.appendSendBuffer);
            this.appendSendBuffer = null;
        }
    }

    onDisconnect(hadError) {
        console.log('LocalSession onDisconnect ' + String(hadError));
        this.clear();
        var remoteSession = MOLO_APP.instance().remoteSessionDict[this.id];
        if (remoteSession) {
            remoteSession.sockClose();
            delete MOLO_APP.instance().remoteSessionDict[this.id];
        }
    }

    onRecvData(data) {
        var remoteSession = MOLO_APP.instance().remoteSessionDict[this.id];
        if (!remoteSession) {
            console.log("LocalSession remote session not found");
            this.sockClose();
            return;
        }
        console.log('LocalSession onRecvData ' + data.toString());
        remoteSession.sendRawPack(data);
    }

    sockConnect() {
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.port, this.host, this.onConnected.bind(this));
        this.client.on('data', this.onRecvData.bind(this));
        this.client.on('end', this.onDisconnect.bind(this));
    }

    sockClose() {
        if(this.client)
            this.client.destroy();
    }
    
}


module.exports = LocalSession;