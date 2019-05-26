const PACK_VERSION = 1;
const PACK_LEN_SIZE = 32;
const MOLO_TCP_MAGIC = "MP";
const MAGIC_LEN = 2;
const HEADER_PREFIX_EN = 34;

export interface MoloTcpBodyData {
    Type?: "AuthResp"|"NewTunnel"|"TokenExpired"|"BindStatus"|"ReqProxy"|"StartProxy";
    Payload?: any;
    OnlineConfig?: string;
};

export function recvBuffer(buf: Buffer, callback: (err: string|null, data?: MoloTcpBodyData) => void) {
    let headerLen: number = 0;
    let magic: string = "";
    let headerJData: Record<string,any> = {};
    let bodyLen: number = 0;
    let bodyJData: MoloTcpBodyData = {};

    function hasRecvedHeaderPrefix() {
        return headerLen != 0 && magic.length > 0;
    }

    function recvHeaderPrefix(buf: Buffer) {
        if (!buf || buf.length < HEADER_PREFIX_EN)
            return false;
        magic = buf.slice(0, MAGIC_LEN).toString()

        if (magic != MOLO_TCP_MAGIC) {
            console.log("wrong tcp header magic " + magic);
            return false;
        }
        headerLen = buf.readUInt32LE(MAGIC_LEN);
        return true;
    }

    function hasRecvedHeader() {
        return JSON.stringify(headerJData) !== "{}";
    }

    function recvHeader(buf: Buffer) {
        if (!buf || buf.length < headerLen)
            return false;
        try {
            headerJData = JSON.parse(buf.slice(0, headerLen).toString());
        } catch (e) {
            console.log("MoloTcpPack recv header error");
            return false;
        }
        return true;
    }

    function hasRecvedBodyLen() {
        return bodyLen != 0;
    }

    function recvBodyLen(buf: Buffer) {
        if (!buf || buf.length < PACK_LEN_SIZE)
            return false;
        bodyLen = buf.readUInt32LE(0);
        return true;
    }

    function hasRecvedBody() {
        return JSON.stringify(bodyJData) !== "{}";
    }

    function recvBody(buf: Buffer) {
        if (!buf || buf.length < bodyLen)
            return false;

        try {
            bodyJData = JSON.parse(buf.slice(0, bodyLen).toString());
        } catch (e) {
            console.log("MoloTcpPack recv body error");
            return false;
        }
        return true;
    }

    if (!buf) {
        callback("Empty Buffer");
        return false;
    }
    let ret = false;

    if (!hasRecvedHeaderPrefix()) {
        ret = recvHeaderPrefix(buf);
        if (!ret) {
            callback("Invalid Header Prefix");
            return ret;
        }
        buf = buf.slice(HEADER_PREFIX_EN, buf.length);
    }

    if (!hasRecvedHeader()) {
        ret = recvHeader(buf);
        if (!ret) {
            callback("Invalid Header");
            return ret;
        }
        buf = buf.slice(headerLen, buf.length);
    }

    if (!hasRecvedBodyLen()) {
        ret = recvBodyLen(buf);
        if (!ret) {
            callback("Invalid Body Length");
            return ret;
        }
        buf = buf.slice(PACK_LEN_SIZE, buf.length);
    }

    if (!hasRecvedBody()) {
        ret = recvBody(buf);
        if (!ret) {
            callback("Invalid Body");
            return ret;
        }
    }
    callback(null, bodyJData);
    return true;
}

export function generatorTcpBuffer(bodyJData: Record<string, any>) {
    var headerJData: Record<string, any> = {};
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