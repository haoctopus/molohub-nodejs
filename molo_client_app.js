
class MoloClientApp {
    constructor() {
        this.localSessionDict = {};
        this.remoteSessionDict = {};

    }

    runReverseProxy(moloClient) {
        this.moloClient = moloClient;

        this.moloClient.sockConnect();
    }

    pingServer() {
        this.moloClient.sendPing();
    }

    genUniqueId() {
        var id = Math.random().toString(36).substr(2);
        while(this.localSessionDict[id] ||  this.remoteSessionDict[id])
            id = Math.random().toString(36).substr(2);
        return id;
    }

}



MOLO_CLIENT_APP = new MoloClientApp();

function pingTimerCallback() {
    MOLO_CLIENT_APP.moloClient.sendPing();
}

setInterval(pingTimerCallback, 5000);
module.exports = {
instance: () => MOLO_CLIENT_APP
}
