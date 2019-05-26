"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var net = __importStar(require("net"));
var os = __importStar(require("os"));
var process = __importStar(require("process"));
var molo_tcp_pack_1 = require("./molo_tcp_pack");
var molo_client_app_1 = require("./molo_client_app");
var remote_session_1 = require("./remote_session");
var CLIENT_STATUS_UNBINDED = "unbinded";
var CLIENT_STATUS_BINDED = "binded";
var MolohubClient = /** @class */ (function () {
    function MolohubClient(rhost, rport, lhost, lport) {
        this.clientid = "";
        this.clientStatus = CLIENT_STATUS_BINDED;
        this.token = "";
        this.chunks = [];
        this.chunksSize = 0;
        this.rhost = rhost;
        this.rport = rport;
        this.lhost = lhost;
        this.lport = lport;
    }
    MolohubClient.prototype.clear = function () {
        this.chunks = [];
        this.chunksSize = 0;
        this.clientStatus = CLIENT_STATUS_UNBINDED;
    };
    MolohubClient.prototype.sendRawPack = function (rawData) {
        if (this.client) {
            this.client.write(rawData);
        }
    };
    MolohubClient.prototype.sendDickPack = function (dictData) {
        console.log('sendDickPack ' + JSON.stringify(dictData));
        var body = molo_tcp_pack_1.generatorTcpBuffer(dictData);
        this.sendRawPack(body);
    };
    MolohubClient.prototype.sockConnect = function () {
        var _this = this;
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.rport, this.rhost, function () {
            var bodyData = {};
            bodyData['Type'] = 'Auth';
            bodyData['Payload'] = {};
            bodyData['Payload']['OS'] = os.platform() + "_" + os.arch() + "_" + os.release();
            bodyData['Payload']['PyVersion'] = process.version; //TODO: node version
            bodyData['Payload']['App'] = 'MolohubNodeJs';
            bodyData['Payload']['MacAddr'] = 'testMac'; //TODO:
            //TODO: fisrt time generate random id, then save it, after that, use saved localseed
            bodyData['Payload']['LocalSeed'] = Math.random().toString(36).substr(2);
            _this.sendDickPack(bodyData);
        });
        this.client.on('data', function (data) {
            _this.chunks.push(data);
            _this.chunksSize += data.length;
        });
        this.client.on('end', function () {
            var buf = Buffer.concat(_this.chunks, _this.chunksSize);
            _this.processMoloTcpPack(buf);
            console.log('onDisconnect');
            _this.clear();
        });
    };
    MolohubClient.prototype.processMoloTcpPack = function (buf) {
        var _this = this;
        molo_tcp_pack_1.recvBuffer(buf, function (err, bodyJData) {
            if (err) {
                console.log("tcp pack error: " + err);
                if (_this.client) {
                    _this.client.destroy();
                }
            }
            else if (bodyJData) {
                _this.processJsonPack(bodyJData);
            }
        });
    };
    MolohubClient.prototype.processJsonPack = function (jdata) {
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
    };
    MolohubClient.prototype.sendPing = function () {
        var payload = {};
        payload['Token'] = this.token;
        payload['Status'] = this.clientStatus;
        var bodyData = {};
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'Ping';
        this.sendDickPack(bodyData);
    };
    MolohubClient.prototype.onAuthResp = function (jdata) {
        this.clientid = jdata['Payload']['ClientId'];
        var payload = {};
        payload['ReqId'] = 1;
        payload['MacAddr'] = 'testMacAddr';
        payload['ClientId'] = this.clientid;
        payload['Protocol'] = 'tcp';
        var bodyData = {};
        bodyData['Payload'] = payload;
        bodyData['Type'] = 'ReqTunnel';
        console.log('clienid: ' + this.clientid);
        console.log('payload: ' + JSON.stringify(payload));
        this.sendDickPack(bodyData);
    };
    MolohubClient.prototype.onNewTunnel = function (jdata) {
        this.token = jdata['Payload']['token'];
        console.log('!!!login succeed clientid:' + this.clientid + " token:" + this.token);
        //online config, such as markdown template
        var onlineConfig = jdata['OnlineConfig'];
        //TODO: process markdown template stuff
        this.onBindStatus(jdata);
    };
    MolohubClient.prototype.onBindStatus = function (jdata) {
        var payload = jdata['Payload'];
        this.clientStatus = payload['Status'];
        payload['token'] = this.token;
        //TODO update client status to ui by markdown
    };
    MolohubClient.prototype.onUnBindAuth = function () {
        //TODO update to ui by markdown
    };
    /*
    onPong(jdata) {
        //console.log("onPong " + jdata.toString());
    }*/
    MolohubClient.prototype.onTokenExpired = function (jdata) {
        // token expired, update a new one.
        this.token = jdata['Payload']['token'];
    };
    MolohubClient.prototype.onReqProxy = function () {
        //TODO new remote session to build new tunnel
        var remote = new remote_session_1.RemoteSession(this.clientid, this.rhost, this.rport, this.lhost, this.lport);
        remote.on("add", function (localID, localSess, remoteID, remoteSess) {
            molo_client_app_1.newSessionPair(localID, localSess, remoteID, remoteSess);
        });
        remote.sockConnect();
    };
    return MolohubClient;
}());
exports.MolohubClient = MolohubClient;
