"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** remoteID to local session */
var localSessionDict = {};
/** localID to remote session */
var remoteSessionDict = {};
function dumpPairs() {
    console.log("Current Session Pairs:");
    console.log("LocalSession number: " + Object.keys(localSessionDict).length + " RemoteSession number: " + Object.keys(remoteSessionDict).length);
    var i = 1;
    for (var remoteID in localSessionDict) {
        var localSession = localSessionDict[remoteID];
        var localID = localSession.id;
        var remoteSession = remoteSessionDict[localID];
        console.log(i + ": " + localSession.dumpInfo() + " " + remoteSession.dumpInfo());
        i++;
    }
}
var MoloClientApp = /** @class */ (function () {
    function MoloClientApp(client) {
        this.client = client;
    }
    MoloClientApp.prototype.runReverseProxy = function () {
        this.client.sockConnect();
    };
    return MoloClientApp;
}());
exports.MoloClientApp = MoloClientApp;
function genUniqueId() {
    var id = Math.random().toString(36).substr(2);
    while (localSessionDict[id] || remoteSessionDict[id])
        id = Math.random().toString(36).substr(2);
    return id;
}
exports.genUniqueId = genUniqueId;
function newSessionPair(localID, localSess, remoteID, remoteSess) {
    console.log("New session pair: Local=" + localID + ", Remote=" + remoteID);
    localSessionDict[remoteID] = localSess;
    remoteSessionDict[localID] = remoteSess;
    dumpPairs();
}
exports.newSessionPair = newSessionPair;
function remoteID2LocalSess(remoteID) {
    return localSessionDict[remoteID];
}
exports.remoteID2LocalSess = remoteID2LocalSess;
function localID2RemoteSess(localID) {
    return remoteSessionDict[localID];
}
exports.localID2RemoteSess = localID2RemoteSess;
function breakSessionPair(ID) {
    if (localSessionDict[ID]) {
        console.log("Del session pair triggered from Remote");
        var localID = localSessionDict[ID].id;
        if (remoteSessionDict[localID]) {
            delete remoteSessionDict[localID];
            delete localSessionDict[ID];
        }
        else {
            console.log("Can not find localSession.");
        }
    }
    if (remoteSessionDict[ID]) {
        console.log("Del session pair triggered from Local");
        var remoteID = remoteSessionDict[ID].id;
        if (localSessionDict[remoteID]) {
            delete localSessionDict[remoteID];
            delete remoteSessionDict[ID];
        }
        else {
            console.log("Can not find remoteSession.");
        }
    }
    dumpPairs();
}
exports.breakSessionPair = breakSessionPair;
