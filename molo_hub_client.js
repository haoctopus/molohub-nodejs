var net = require('net');
var MoloTcpPack = require("./molo_tcp_pack")

class MolohubClient {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.client = null;
        this.clientid = "";
        this.lhost = "127.0.0.1";
        this.lport = 8123;
        this.moloTcpPack = new MoloTcpPack();
    }

    clear() {
        this.moloTcpPack.clear();
        this.appendRecvBuffer = null;
        this.appendSendBuffer = null;
        this.appendConnect = true;
        this.clientStatus = null;
    }
    
   
    sendRawPack(rawData) {
        if (this.appendConnect)
            return;

        this.client.write(rawData);
    }
    
    sendDickPack(dictData) {
        console.log('sendDickPack ' + dictData.toString());
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
        bodyData['Payload']['OS'] = 'testOS';
        bodyData['Payload']['PyVersion'] = 'testPyVersion';
        bodyData['Payload']['App'] = 'MolohubNodeJs';
        bodyData['Payload']['MacAddr'] = 'testMac';
        bodyData['Payload']['LocalSeed'] = '123456';

        //var tcpBuffer = moloTcpPack.generatorTcpBuffer(bodyData);

        //console.log('onConnected, send authdata ' + tcpBuffer.toString('hex'));
       this.sendDickPack(bodyData);
    }

    onDisconnect(hadError) {
        console.log('onDisconnect ' + hadError.toString());
        this.clear();
    }

    onRecvData(data) {
        try {
            this.appendRecvBuffer = Buffer.concat(this.appendRecvBuffer, data);
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
        this.client.connect(this.port, this.host, this.onConnected.bind(this));
        this.client.on('data', this.onRecvData.bind(this));
        this.client.on('end', this.onDisconnect.bind(this));
    }
    
    processMoloTcpPack() {
        var ret = true;

        while(ret) {
            ret = this.moloTcpPack.recvBuffer(self.appendRecvBuffer);
            if (ret && this.moloTcpPack.errCode == MoloTcpPack.ERR_OK)
                this.processJsonPack(this.moloTcpPack.bodyJData);
            self.appendRecvBuffer = this.moloTcpPack.tmpBuff;
            if (this.moloTcpPack.errCode == MoloTcpPack.ERR_MALFORMED) {
                console.log("tcp pack malformed!!");
                this.client.close();
            }
        }
    }

    processJsonPack(jdata) {
        var protocolType = jdata['Type'];
        if (protocolType == 'AuthResp')
            this.onAuthResp(jdata);
        else if (protocolType == 'Pong')
            this.onPong(jdata);
    }


    onAuthResp(jdata) {
        this.clientid = jdata['ClientId'];
        var payload = {};
        payload['ReqId'] = 1;
        payload['MacAddr'] = 'testMacAddr';
        payload['ClientId'] = this.clientid;
        payload['Protocol'] = 'tcp';
        var bodyData = {}
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'ReqTunnel';
        this.sendDickPack(bodyData);

    }

    onPong(jdata) {
        console.log("onPong " + jdata.toString());
    }


    
}
module.exports = MolohubClient;