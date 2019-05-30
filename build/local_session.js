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
var molo_socket_1 = require("./lib/molo_socket");
var LocalSession = /** @class */ (function (_super) {
    __extends(LocalSession, _super);
    function LocalSession(host, port) {
        var _this = _super.call(this) || this;
        _this.id = molo_client_app_1.genUniqueId();
        _this.host = host;
        _this.port = port;
        return _this;
    }
    LocalSession.prototype.sendRaw = function (rawData) {
        console.log("local send raw");
        if (this.client)
            this.client.sendRaw(rawData);
    };
    LocalSession.prototype.sockConnect = function () {
        var _this = this;
        this.client = new molo_socket_1.MoloSocket(this.host, this.port);
        this.client.connect();
        this.client.on("connect", function () {
            if (_this.client)
                _this.client.setTransparency(true);
        });
        this.client.on("data", function (_, rawData) {
            if (rawData) {
                console.log("locol send raw");
                _this.processTransparencyPack(rawData);
            }
        });
        this.client.on("end", function () {
            console.log("LocalSession onDisconnect");
            var remoteSession = molo_client_app_1.localID2RemoteSess(_this.id);
            if (remoteSession) {
                remoteSession.sockClose();
                molo_client_app_1.breakSessionPair(_this.id);
            }
        });
        this.emit("add", this.id, this);
    };
    LocalSession.prototype.sockClose = function () {
        if (this.client)
            this.client.destroy();
    };
    LocalSession.prototype.processTransparencyPack = function (buf) {
        var remoteSession = molo_client_app_1.localID2RemoteSess(this.id);
        if (!remoteSession) {
            console.log('processTransparencyPack() remoteSession session not found');
            this.sockClose();
            return;
        }
        remoteSession.sendRaw(buf);
    };
    return LocalSession;
}(events_1.EventEmitter));
exports.LocalSession = LocalSession;
