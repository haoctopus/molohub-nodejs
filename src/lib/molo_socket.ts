import * as net from "net";
import { EventEmitter } from "events";
import { recvBuffer, generatorTcpBuffer } from "../molo_tcp_pack";

export class MoloSocket extends EventEmitter {
    private host: string;
    private port: number;
    private name: string = "";
    /** Socket connect to remote */
    private chunks: Buffer[] = [];
    private chunksSize: number = 0;
    private client?: net.Socket;
    private transparency: boolean = false;

    public constructor(host: string, port: number, name?: string) {
        super();

        this.host = host;
        this.port = port;
        if (name)
            this.name = name;
    }

    private clearChunks() {
        this.chunks = [];
        this.chunksSize = 0;
    }
    private clear() {
        this.clearChunks();
        this.transparency = false;
        this.emit("clear");
    }

    public sendRaw(rawData: Buffer) {
        if (this.client) {
            this.client.write(rawData);
            this.emit("send", rawData);
        }
    }

    public send(dictData: Record<string, any>) {
        console.log(this.name + ' sendDickPack body: ' + JSON.stringify(dictData));
        const body = generatorTcpBuffer(dictData);
        this.sendRaw(body);
    }

    public connect() {
        this.clearChunks();
        this.client = new net.Socket();
        this.client.on('connect', () => {
            this.emit("connect");
        })
        this.client.on('data', (data: Buffer) => {
            if (this.transparency) {
                // In transparency mode, don't handle rawData.
                this.emit("data", undefined, data);
                return;
            }

            this.chunks.push(data);
            this.chunksSize += data.length;

            try {
                // TODO: Make more efficient.
                const buf = Buffer.concat(this.chunks, this.chunksSize);
                recvBuffer(buf, (err, bodyJData, leftBuf) => {
                    if (err === "Incomplete") {
                        // Do nothing, just wait message complete.
                        return;
                    } else if (err) {
                        console.log(`${this.name} receiveData: Invalid message: ${err}`);
                        console.log(`${this.name} RawData: ${buf.toString()}`);
                        this.clearChunks();
                    } else {
                        if (bodyJData) {
                            // Molo command is processed. transmit left buffer to callback.
                            this.emit("data", bodyJData, leftBuf);
                        }
                        if (leftBuf) {
                            this.clearChunks();
                            this.chunks.push(leftBuf);
                            this.chunksSize += leftBuf.length;
                        }
                    }
                });
            } catch (e) {
                // Error while process message, drop all chunks.
                console.log(`${this.name} receiveData: Process crash: ${e.message}`);
                this.clearChunks();
            }
        });
        this.client.on('end', () => {
            console.log(`${this.name} onDisconnect`);
            this.clear();
            this.emit("end");
        });
        this.client.on('error', (err) => {
            console.log(`${this.name} Error: ${err.message}`);
        });
        this.client.connect(this.port, this.host);
    }

    public destroy() {
        this.clear();
        if (this.client) {
            this.client.destroy();
            this.client = undefined;
        }
    }

    public setTransparency(enable: boolean) {
        this.transparency = enable;
    }
}