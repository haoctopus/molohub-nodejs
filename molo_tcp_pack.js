class MoloTcpPack {
    constructor() {
        this.clear();

    }

    clear() {
        this.headerJData = null;
        this.headerLen = 0;
        this.magic = "";
        this.tmpBuff = null;
        this.errCode = MoloTcpPack.ERR_OK;
        this.bodyLen = 0;
        this.bodyJData = null;
    }

    generatorTcpBuffer(bodyJData) {
        var headerJData = {};
        headerJData["ver"] = MoloTcpPack.PACK_VERSION;
        var headerJdataBuffer= Buffer.from(JSON.stringify(headerJData), "utf8");
        var headerJdataBufferLen = Buffer.alloc(MoloTcpPack.PACK_LEN_SIZE);
        headerJdataBufferLen.writeUInt32LE(headerJdataBuffer.length);
        var headerBuff = Buffer.concat([Buffer.from(MoloTcpPack.MOLO_TCP_MAGIC, "utf8"), headerJdataBufferLen, headerJdataBuffer]);

        var bodyJdataBuffer = Buffer.from(JSON.stringify(bodyJData), "utf8");
        var bodyJdataBufferLen = Buffer.alloc(MoloTcpPack.PACK_LEN_SIZE);
    
        bodyJdataBufferLen.writeUInt32LE(bodyJdataBuffer.length);
        var tcpBufer = Buffer.concat([headerBuff, bodyJdataBufferLen, bodyJdataBuffer]);
        return tcpBufer;
    }

    recvHeaderPrefix() {
        if(!this.tmpBuff || this.tmpBuff.length<MoloTcpPack.HEADER_PREFIX_EN)
            return false;
        this.magic = this.tmpBuff.slice(0, MoloTcpPack.MAGIC_LEN).toString()

        if(this.magic != MoloTcpPack.MOLO_TCP_MAGIC) {
            this.errCode = MoloTcpPack.ERR_MALFORMED;
            console.log("wrong tcp header magic " +self.magic);
            return false;
        }
        this.headerLen = this.tmpBuff.readUInt32LE(MoloTcpPack.MAGIC_LEN);
        this.tmpBuff = this.tmpBuff.slice(MoloTcpPack.HEADER_PREFIX_EN, this.tmpBuff.length);
        return true;

    }

    recvHeader() {
        if (!this.tmpBuff || this.tmpBuff.length < this.headerLen)
            return false;
        try {
            this.headerJData = JSON.parse(this.tmpBuff.slice(0, this.headerLen).toString());
        }
        catch(e) {
            this.errCode = MoloTcpPack.ERR_MALFORMED;
            console.log("MoloTcpPack recv header error" + this.tmpBuff.slice(0, this.headerLen).toString('hex'));
            return false;
        }
        this.tmpBuff = this.tmpBuff.slice(this.headerLen, this.tmpBuff.length);
        return true;
    }

    recvBodyLen() {
        if (!this.tmpBuff || this.tmpBuff.length < MoloTcpPack.PACK_LEN_SIZE)
            return false;
        this.bodyLen = this.tmpBuff.readUInt32LE(0);
        this.tmpBuff = this.tmpBuff.slice(MoloTcpPack.PACK_LEN_SIZE, this.tmpBuff.length);
        return true;
    }

    recvBody() {
        if(!this.tmpBuff || this.tmpBuff.length<this.bodyLen)
            return false;
        
        try {
            this.bodyJData = JSON.parse(this.tmpBuff.slice(0, this.bodyLen).toString()); 
        }
        catch(e) {
            this.errCode = MoloTcpPack.ERR_MALFORMED;
            console.log("MoloTcpPack recv body error" + this.tmpBuff.slice(0, this.bodyLen).toString('hex'));
            return false;
        }
        this.tmpBuff = this.tmpBuff.slice(this.bodyLen, this.tmpBuff.length);
        return true;
    }

    hasRecvedHeaderPrefix() {
        return this.headerLen!=0 && this.magic.length>0;
    }

    hasRecvedHeader() {
        return this.headerJData;
    }

    hasRecvedBodyLen() {
        return this.bodyLen!=0;
    }

    hasRecvedBody() {
        return this.bodyJData;
    }

    recvBuffer(buffer) {
        if (!buffer)
            return false;
        var ret = false;

        //first time, clear context
        if (this.errCode == MoloTcpPack.ERR_OK)
            this.clear();
        this.tmpBuff = buffer;
        if (!this.hasRecvedHeaderPrefix()) {
            ret = this.recvHeaderPrefix();
            if (!ret) return ret;
        }

        if (!this.hasRecvedHeader()) {
            ret = this.recvHeader();
            if (!ret) return ret;
        }

        if (!this.hasRecvedBodyLen()) {
            ret = this.recvBodyLen();
            if (!ret) return ret;
        }

        if (!this.hasRecvedBody()) {
            ret = this.recvBody();
            if (!ret) return ret;
        }
        this.errCode = MoloTcpPack.ERR_OK;
        return true;
        
    }

}

MoloTcpPack.HEADER_PREFIX_EN = 34;
MoloTcpPack.MAGIC_LEN = 2;
MoloTcpPack.MOLO_TCP_MAGIC = "MP";
MoloTcpPack.PACK_VERSION = 1;
MoloTcpPack.PACK_LEN_SIZE = 32;
MoloTcpPack.ERR_OK = 0;
MoloTcpPack.ERR_INSUFFICIENT_BUFFER = 1;
MoloTcpPack.ERR_MALFORMED = 2;

module.exports = MoloTcpPack;