import { MolohubClient } from "./molo_hub_client";
import { RemoteSession } from "./remote_session";
import { LocalSession } from "./local_session";

/** remoteID to local session */
const localSessionDict: Record<string, LocalSession> = {};
/** localID to remote session */
const remoteSessionDict: Record<string, RemoteSession> = {};

export class MoloClientApp {
    private client: MolohubClient;

    public constructor(client: MolohubClient) {
        this.client = client;
    }

    public runReverseProxy() {
        this.client.sockConnect();
    }
}

export function genUniqueId() {
    let id = Math.random().toString(36).substr(2);
    while (localSessionDict[id] || remoteSessionDict[id])
        id = Math.random().toString(36).substr(2);
    return id;
}

export function newSessionPair(localID: string, localSess: LocalSession, remoteID: string, remoteSess: RemoteSession) {
    console.log(`New session pair: Local=${localID}, Remote=${remoteID}`);
    localSessionDict[remoteID] = localSess;
    remoteSessionDict[localID] = remoteSess;
}

export function remoteID2LocalSess(remoteID: string) {
    return localSessionDict[remoteID];
}

export function localID2RemoteSess(localID: string) {
    return remoteSessionDict[localID];
}

export function breakSessionPair(ID: string) {
    if (localSessionDict[ID]) {
        delete localSessionDict[ID];
    }
    if (remoteSessionDict[ID]) {
        delete remoteSessionDict[ID]
    }
}