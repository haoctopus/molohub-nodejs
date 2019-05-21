var net = require('net');
var MoloTcpPack = require("./molo_tcp_pack")
var MolohubClient = require("./molo_hub_client")

var HOST = '150.109.43.36';
// var HOST = '127.0.0.1';
var PORT = 4443;

var client = new MolohubClient(HOST, PORT);
client.sockConnect();
 
/*
var client = new net.Socket();
client.connect(PORT, HOST, function() {
 
    console.log('CONNECTED TO: ' + HOST + ':' + PORT);


    // buf.writeUInt32LE(Molo.MoloTcpPack.HEADER_PREFIX_EN, 0);
    // buf.writeUInt32LE(0x123456, 0);
    var moloTcpPack = new MoloTcpPack()
    var bodyData = {}
    bodyData['Type'] = 'Auth';
    bodyData['Payload'] = {};
    bodyData['Payload']['OS'] = 'testOS';
    bodyData['Payload']['PyVersion'] = 'testPyVersion';
    bodyData['Payload']['App'] = 'MolohubNodeJs';
    bodyData['Payload']['MacAddr'] = 'testMac';
    bodyData['Payload']['LocalSeed'] = '123456';

    var tcpBuffer = moloTcpPack.generatorTcpBuffer(bodyData);

    console.log('before send DATA: ' + tcpBuffer.toString('hex'));

    client.write(tcpBuffer);
 
});
 
function onData(data) {
    console.log('DATA123: ' + data.toString('hex'));
    var moloTcpPack = new MoloTcpPack()
    moloTcpPack.recvBuffer(data);
}

// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
client.on('data', onData);
 
// 为客户端添加“close”事件处理函数
client.on('close', function() {
    console.log('Connection closed');
});*/