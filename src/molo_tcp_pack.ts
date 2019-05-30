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

export function recvBuffer(buf: Buffer, callback: (err: string|null, data?: MoloTcpBodyData, leftBuf?: Buffer) => void) {
    let headerLen: number = 0;
    let magic: string = "";
    let headerJData: Record<string,any> = {};
    let bodyLen: number = 0;
    let bodyJData: MoloTcpBodyData = {};

    function recvHeaderPrefix(buf: Buffer) {
        if (!buf || buf.length < HEADER_PREFIX_EN) return "Incomplete";
        magic = buf.slice(0, MAGIC_LEN).toString()
        if (magic != MOLO_TCP_MAGIC) return "wrong tcp header magic " + magic;
        headerLen = buf.readUInt32LE(MAGIC_LEN);
        return null;
    }

    function recvHeader(buf: Buffer) {
        if (!buf || buf.length < headerLen) return "Incomplete";
        try {
            headerJData = JSON.parse(buf.slice(0, headerLen).toString());
        } catch (e) {
            return "MoloTcpPack recv header error" + e.message;
        }
        return null;
    }

    function recvBodyLen(buf: Buffer) {
        if (!buf || buf.length < PACK_LEN_SIZE) return "Incomplete";
        bodyLen = buf.readUInt32LE(0);
        return null;
    }

    function recvBody(buf: Buffer) {
        if (!buf || buf.length < bodyLen) return "Incomplete";
        try {
            bodyJData = JSON.parse(buf.slice(0, bodyLen).toString());
        } catch (e) {
            return "MoloTcpPack recv body error" + e.message;
        }
        return null;
    }

    if (!buf) {
        callback("Empty Buffer");
    }
    let ret: string|null;

    ret = recvHeaderPrefix(buf);
    if (ret) {
        callback(ret);
        return
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

export function generatorTcpBuffer(bodyJData: Record<string, any>) {
    const headerJData: Record<string, any> = {};
    headerJData["ver"] = PACK_VERSION;
    const headerJdataBuffer = Buffer.from(JSON.stringify(headerJData), "utf8");
    const headerJdataBufferLen = Buffer.alloc(PACK_LEN_SIZE);
    headerJdataBufferLen.writeUInt32LE(headerJdataBuffer.length, 0);
    const headerBuff = Buffer.concat([Buffer.from(MOLO_TCP_MAGIC, "utf8"), headerJdataBufferLen, headerJdataBuffer]);

    const bodyJdataBuffer = Buffer.from(JSON.stringify(bodyJData), "utf8");
    const bodyJdataBufferLen = Buffer.alloc(PACK_LEN_SIZE);

    bodyJdataBufferLen.writeUInt32LE(bodyJdataBuffer.length, 0);
    const tcpBufer = Buffer.concat([headerBuff, bodyJdataBufferLen, bodyJdataBuffer]);
    return tcpBufer;
}