import { MolohubClient } from "./molo_hub_client";
import { RemoteSession } from "./remote_session";
import { LocalSession } from "./local_session";

/** remoteID to local session */
const localSessionDict: Record<string, LocalSession> = {};
/** localID to remote session */
const remoteSessionDict: Record<string, RemoteSession> = {};

function dumpPairs() {
    console.log(`Current Session Pairs:`);
    console.log(`LocalSession number: ${Object.keys(localSessionDict).length} RemoteSession number: ${Object.keys(remoteSessionDict).length}`);
    let i = 1;
    for (let remoteID in localSessionDict) {
        const localSession = localSessionDict[remoteID];
        const localID = localSession.id;
        const remoteSession = remoteSessionDict[localID];
        console.log(`${i}: ${localSession.dumpInfo()} ${remoteSession.dumpInfo()}`);
        i++;
    }
}

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
    dumpPairs();
}

export function remoteID2LocalSess(remoteID: string) {
    return localSessionDict[remoteID];
}

export function localID2RemoteSess(localID: string) {
    return remoteSessionDict[localID];
}

export function breakSessionPair(ID: string) {
    if (localSessionDict[ID]) {
        console.log(`Del session pair triggered from Remote`);
        let localID = localSessionDict[ID].id;

        if (remoteSessionDict[localID]) {
            delete remoteSessionDict[localID];
            delete localSessionDict[ID];
        } else {
            console.log(`Can not find localSession.`);
        }
    }
    if (remoteSessionDict[ID]) {
        console.log(`Del session pair triggered from Local`);
        let remoteID = remoteSessionDict[ID].id;

        if (localSessionDict[remoteID]) {
            delete localSessionDict[remoteID];
            delete remoteSessionDict[ID];
        } else {
            console.log(`Can not find remoteSession.`);
        }
    }
    dumpPairs();
}