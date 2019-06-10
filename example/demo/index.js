var molo_hub_client_1 = require("../../build/molo_hub_client");
var molo_client_app_1 = require("../../build/molo_client_app");
var config_json_1 = require("./config.json");
var client = new molo_hub_client_1.MolohubClient(config_json_1.rhost, config_json_1.rport, config_json_1.lhost, config_json_1.lport);
var app = new molo_client_app_1.MoloClientApp(client);

client.on("newSeed", (seed) => {
    console.log("new seed got " + seed);
})
app.runReverseProxy();
