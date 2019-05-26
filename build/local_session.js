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
var molo_client_app_1 = require("./molo_client_app");
var LocalSession = /** @class */ (function (_super) {
    __extends(LocalSession, _super);
    function LocalSession(host, port) {
        var _this = _super.call(this) || this;
        _this.appendConnect = true;
        _this.chunks = [];
        _this.chunksSize = 0;
        _this.id = molo_client_app_1.genUniqueId();
        _this.host = host;
        _this.port = port;
        return _this;
    }
    LocalSession.prototype.clear = function () {
        this.appendConnect = true;
        this.chunks = [];
        this.chunksSize = 0;
    };
    LocalSession.prototype.sendRawPack = function (rawData) {
        if (this.client) {
            this.client.write(rawData);
        }
    };
    LocalSession.prototype.sockConnect = function () {
        var _this = this;
        this.clear();
        this.client = new net.Socket();
        this.client.connect(this.port, this.host, function () {
            _this.appendConnect = false;
        });
        this.client.on('data', function (data) {
            _this.chunks.push(data);
            _this.chunksSize += data.length;
        });
        this.client.on('end', function () {
            var buf = Buffer.concat(_this.chunks, _this.chunksSize);
            var remoteSession = molo_client_app_1.localID2RemoteSess(_this.id);
            if (!remoteSession) {
                console.log("LocalSession remote session not found");
                _this.sockClose();
                return;
            }
            remoteSession.sendRawPack(buf);
            _this.clear();
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
    return LocalSession;
}(events_1.EventEmitter));
exports.LocalSession = LocalSession;
