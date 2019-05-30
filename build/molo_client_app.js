"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** remoteID to local session */
var localSessionDict = {};
/** localID to remote session */
var remoteSessionDict = {};
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
        delete localSessionDict[ID];
    }
    if (remoteSessionDict[ID]) {
        delete remoteSessionDict[ID];
    }
}
exports.breakSessionPair = breakSessionPair;
