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
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var molo_client_app_1 = require("./molo_client_app");
var local_session_1 = require("./local_session");
var molo_socket_1 = require("./lib/molo_socket");
var RemoteSession = /** @class */ (function (_super) {
    __extends(RemoteSession, _super);
    function RemoteSession(clientid, rhost, rport, lhost, lport) {
        var _this = _super.call(this) || this;
        _this.id = molo_client_app_1.genUniqueId();
        _this.clientid = clientid;
        _this.rhost = rhost;
        _this.rport = rport;
        _this.lhost = lhost;
        _this.lport = lport;
        return _this;
    }
    RemoteSession.prototype.sendRaw = function (rawData) {
        console.log("remote send raw");
        if (this.client)
            this.client.sendRaw(rawData);
    };
    RemoteSession.prototype.sockConnect = function () {
        var _this = this;
        this.client = new molo_socket_1.MoloSocket(this.rhost, this.rport);
        this.client.connect();
        this.client.on("connect", function () {
            var bodyData = {};
            bodyData['Type'] = 'RegProxy';
            bodyData['Payload'] = {};
            bodyData['Payload']['ClientId'] = _this.clientid;
            if (_this.client)
                _this.client.send(bodyData);
        });
        this.client.on("data", function (data, rawData) {
            if (data) {
                _this.processJsonPack(data);
            }
            else {
                console.log("remote rece raw");
                _this.processTransparencyPack(rawData);
            }
        });
        this.client.on("end", function () {
            console.log("RemoteSession onDisconnect");
            var localSession = molo_client_app_1.remoteID2LocalSess(_this.id);
            if (localSession) {
                localSession.sockClose();
                molo_client_app_1.breakSessionPair(_this.id);
            }
        });
    };
    RemoteSession.prototype.sockClose = function () {
        if (this.client) {
            this.client.destroy();
            this.client = undefined;
        }
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
        if (this.client)
            this.client.setTransparency(true);
        //this.processTransparencyPack();
    };
    RemoteSession.prototype.processTransparencyPack = function (buf) {
        var localSession = molo_client_app_1.remoteID2LocalSess(this.id);
        if (!localSession) {
            console.log('processTransparencyPack() localsession session not found');
            this.sockClose();
            return;
        }
        localSession.sendRaw(buf);
    };
    return RemoteSession;
}(events_1.EventEmitter));
exports.RemoteSession = RemoteSession;
