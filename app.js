var net = require('net');
var MoloTcpPack = require("./molo_tcp_pack")
var MolohubClient = require("./molo_hub_client")

var MOLO_APP = require("./molo_client_app")
var config = require("./config.json")


var client = new MolohubClient(config.rhost, config.rport, config.lhost, config.lport);
MOLO_APP.instance().runReverseProxy(client);
 
