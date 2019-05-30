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
var molo_tcp_pack_1 = require("../molo_tcp_pack");
var MoloSocket = /** @class */ (function (_super) {
    __extends(MoloSocket, _super);
    function MoloSocket(host, port) {
        var _this = _super.call(this) || this;
        /** Socket connect to remote */
        _this.chunks = [];
        _this.chunksSize = 0;
        _this.transparency = false;
        _this.host = host;
        _this.port = port;
        return _this;
    }
    MoloSocket.prototype.clearChunks = function () {
        this.chunks = [];
        this.chunksSize = 0;
    };
    MoloSocket.prototype.clear = function () {
        this.clearChunks();
        this.transparency = false;
        this.emit("clear");
    };
    MoloSocket.prototype.sendRaw = function (rawData) {
        if (this.client) {
            this.client.write(rawData);
            this.emit("send", rawData);
        }
    };
    MoloSocket.prototype.send = function (dictData) {
        console.log('sendDickPack body: ' + JSON.stringify(dictData));
        var body = molo_tcp_pack_1.generatorTcpBuffer(dictData);
        this.sendRaw(body);
    };
    MoloSocket.prototype.connect = function () {
        var _this = this;
        this.clear();
        this.client = new net.Socket();
        this.client.on('connect', function () {
            _this.emit("connect");
        });
        this.client.on('data', function (data) {
            if (_this.transparency) {
                _this.emit("data", undefined, data);
                return;
            }
            _this.chunks.push(data);
            _this.chunksSize += data.length;
            try {
                // TODO: Make more efficient.
                var buf = Buffer.concat(_this.chunks, _this.chunksSize);
                molo_tcp_pack_1.recvBuffer(buf, function (err, bodyJData, leftBuf) {
                    if (err === "Incomplete") {
                        // Do nothing, just wait message complete.
                        return;
                    }
                    else if (err) {
                        console.log("receiveData: Invalid message: " + err);
                        _this.clearChunks();
                    }
                    else {
                        if (bodyJData) {
                            _this.emit("data", bodyJData);
                        }
                        if (leftBuf) {
                            _this.clearChunks();
                            _this.chunks.push(leftBuf);
                            _this.chunksSize += leftBuf.length;
                        }
                    }
                });
            }
            catch (e) {
                // Error while process message, drop all chunks.
                console.log("receiveData: Process crash: " + e.message);
                _this.clearChunks();
            }
        });
        this.client.on('end', function () {
            console.log('onDisconnect');
            _this.clear();
            _this.emit("end");
        });
        this.client.on('error', function (err) {
            console.log(err.message);
        });
        this.client.connect(this.port, this.host);
    };
    MoloSocket.prototype.destroy = function () {
        this.clear();
        if (this.client) {
            this.client.destroy();
            this.client = undefined;
        }
    };
    MoloSocket.prototype.setTransparency = function (enable) {
        if (enable)
            console.log("socket set to transparent");
        else
            console.log("socket set to untransparent");
        this.transparency = enable;
    };
    return MoloSocket;
}(events_1.EventEmitter));
exports.MoloSocket = MoloSocket;
