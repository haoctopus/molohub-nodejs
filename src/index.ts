import { MolohubClient } from "./molo_hub_client";
import { MoloClientApp } from "./molo_client_app";
import config from "./config.json";

const client = new MolohubClient(config.rhost, config.rport, config.lhost, config.lport);
const app = new MoloClientApp(client);

app.runReverseProxy();
