"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var molo_hub_client_1 = require("./molo_hub_client");
var molo_client_app_1 = require("./molo_client_app");
var config_json_1 = __importDefault(require("./config.json"));
var client = new molo_hub_client_1.MolohubClient(config_json_1.default.rhost, config_json_1.default.rport, config_json_1.default.lhost, config_json_1.default.lport);
var app = new molo_client_app_1.MoloClientApp(client);
app.runReverseProxy();
