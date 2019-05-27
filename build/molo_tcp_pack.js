"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PACK_VERSION = 1;
var PACK_LEN_SIZE = 32;
var MOLO_TCP_MAGIC = "MP";
var MAGIC_LEN = 2;
var HEADER_PREFIX_EN = 34;
;
function recvBuffer(buf, callback) {
    var headerLen = 0;
    var magic = "";
    var headerJData = {};
    var bodyLen = 0;
    var bodyJData = {};
    function recvHeaderPrefix(buf) {
        if (!buf || buf.length < HEADER_PREFIX_EN)
            return "Incomplete";
        magic = buf.slice(0, MAGIC_LEN).toString();
        if (magic != MOLO_TCP_MAGIC)
            return "wrong tcp header magic " + magic;
        headerLen = buf.readUInt32LE(MAGIC_LEN);
        return null;
    }
    function recvHeader(buf) {
        if (!buf || buf.length < headerLen)
            return "Incomplete";
        try {
            headerJData = JSON.parse(buf.slice(0, headerLen).toString());
        }
        catch (e) {
            return "MoloTcpPack recv header error" + e.message;
        }
        return null;
    }
    function recvBodyLen(buf) {
        if (!buf || buf.length < PACK_LEN_SIZE)
            return "Incomplete";
        bodyLen = buf.readUInt32LE(0);
        return null;
    }
    function recvBody(buf) {
        if (!buf || buf.length < bodyLen)
            return "Incomplete";
        try {
            bodyJData = JSON.parse(buf.slice(0, bodyLen).toString());
        }
        catch (e) {
            return "MoloTcpPack recv body error" + e.message;
        }
        return null;
    }
    if (!buf) {
        callback("Empty Buffer");
    }
    var ret;
    ret = recvHeaderPrefix(buf);
    if (ret) {
        callback(ret);
        return;
    }
    buf = buf.slice(HEADER_PREFIX_EN, buf.length);
    ret = recvHeader(buf);
    if (ret) {
        callback(ret);
        return;
    }
    buf = buf.slice(headerLen, buf.length);
    ret = recvBodyLen(buf);
    if (ret) {
        callback(ret);
        return;
    }
    buf = buf.slice(PACK_LEN_SIZE, buf.length);
    ret = recvBody(buf);
    if (ret) {
        callback(ret);
        return;
    }
    buf = buf.slice(bodyLen, buf.length);
    callback(null, bodyJData, buf);
}
exports.recvBuffer = recvBuffer;
function generatorTcpBuffer(bodyJData) {
    var headerJData = {};
    headerJData["ver"] = PACK_VERSION;
    var headerJdataBuffer = Buffer.from(JSON.stringify(headerJData), "utf8");
    var headerJdataBufferLen = Buffer.alloc(PACK_LEN_SIZE);
    headerJdataBufferLen.writeUInt32LE(headerJdataBuffer.length, 0);
    var headerBuff = Buffer.concat([Buffer.from(MOLO_TCP_MAGIC, "utf8"), headerJdataBufferLen, headerJdataBuffer]);
    var bodyJdataBuffer = Buffer.from(JSON.stringify(bodyJData), "utf8");
    var bodyJdataBufferLen = Buffer.alloc(PACK_LEN_SIZE);
    bodyJdataBufferLen.writeUInt32LE(bodyJdataBuffer.length, 0);
    var tcpBufer = Buffer.concat([headerBuff, bodyJdataBufferLen, bodyJdataBuffer]);
    return tcpBufer;
}
exports.generatorTcpBuffer = generatorTcpBuffer;
