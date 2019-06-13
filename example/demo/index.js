var molo = require("../../build/index");
var config = require("./config.json");
var client = new molo.Client(config.rhost, config.rport, config.lhost, config.lport);
var app = new molo.App(client);

client.on("newSeed", (seed) => {
    console.log("new seed got " + seed);
})
client.on("newTunnel", (onlineConfig) => {
    console.log(`OnlineConfig: ${JSON.stringify(onlineConfig)}`);
})
client.on("updateStatus", (status) => {
    console.log(`Update status: ${status}`);
});
app.runReverseProxy();
