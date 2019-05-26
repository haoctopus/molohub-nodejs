"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var net = __importStar(require("net"));
var events_1 = require("events");
var molo_tcp_pack_1 = require("./molo_tcp_pack");
var molo_client_app_1 = require("./molo_client_app");
var local_session_1 = require("./local_session");
var RemoteSession = /** @class */ (function (_super) {
    __extends(RemoteSession, _super);
    function RemoteSession(clientid, rhost, rport, lhost, lport) {
        var _this = _super.call(this) || this;
        _this.token = "";
        _this.chunks = [];
        _this.chunksSize = 0;
        _this.transparency = false;
        _this.id = molo_client_app_1.genUniqueId();
        _this.clientid = clientid;
        _this.rhost = rhost;
        _this.rport = rport;
        _this.lhost = lhost;
        _this.lport = lport;
        return _this;
    }
    RemoteSession.prototype.clear = function () {
        this.chunks = [];
        this.chunksSize = 0;
        this.transparency = false;
    };
    RemoteSession.prototype.sendRawPack = function (rawData) {
        if (this.client) {
            this.client.write(rawData);
        }
    };
    RemoteSession.prototype.sendDickPack = function (dictData) {
        console.log('sendDickPack ' + JSON.stringify(dictData));
        var body = molo_tcp_pack_1.generatorTcpBuffer(dictData);
        this.sendRawPack(body);
    };
    RemoteSession.prototype.sockConnect = function () {
        var _this = this;
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.rport, this.rhost, function () {
            var bodyData = {};
            bodyData['Type'] = 'RegProxy';
            bodyData['Payload'] = {};
            bodyData['Payload']['ClientId'] = _this.clientid;
            //var tcpBuffer = generatorTcpBuffer(bodyData);
            //console.log('onConnected, send authdata ' + tcpBuffer.toString('hex'));
            _this.sendDickPack(bodyData);
        });
        this.client.on('data', function (data) {
            _this.chunks.push(data);
            _this.chunksSize += data.length;
        });
        this.client.on('end', function () {
            var buf = Buffer.concat(_this.chunks, _this.chunksSize);
            if (_this.transparency) {
                _this.processTransparencyPack(buf);
            }
            else {
                _this.processMoloTcpPack(buf);
            }
            console.log('RemoteSession onDisconnect');
            _this.clear();
            var localSession = molo_client_app_1.remoteID2LocalSess(_this.id);
            if (localSession) {
                localSession.sockClose();
                molo_client_app_1.breakSessionPair(_this.id);
            }
        });
    };
    RemoteSession.prototype.sockClose = function () {
        if (this.client)
            this.client.destroy();
    };
    RemoteSession.prototype.processMoloTcpPack = function (buf) {
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
    RemoteSession.prototype.processJsonPack = function (jdata) {
        console.log('remote session processJsonPack: ' + JSON.stringify(jdata));
        var protocolType = jdata['Type'];
        if (protocolType == 'StartProxy')
            this.onStartProxy();
    };
    RemoteSession.prototype.onStartProxy = function () {
        var _this = this;
        var local = new local_session_1.LocalSession(this.lhost, this.lport);
        local.on("add", function (localID, localSess) {
            _this.emit("add", localID, localSess, _this.id, _this);
        });
        local.sockConnect();
        this.transparency = true;
        this.processTransparencyPack();
    };
    RemoteSession.prototype.processTransparencyPack = function (buf) {
        var localSession = molo_client_app_1.remoteID2LocalSess(this.id);
        if (!localSession) {
            console.log('processTransparencyPack() localsession session not found');
            this.sockClose();
            return;
        }
        if (buf) {
            localSession.sendRawPack(buf);
        }
    };
    return RemoteSession;
}(events_1.EventEmitter));
exports.RemoteSession = RemoteSession;
