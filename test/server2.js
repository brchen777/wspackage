(() => {
    'use strict';

    const { wsServer } = require('../index.js');

    // acceptedProtocol can not use upper-case
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: ['protocol-1', 'protocol-2'],

        serverConfig: {
            autoAcceptConnections: false
        }
    });

    // user register event
    ws.on('say_hello', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer on say_hello: ws_${name} say ${msg}`);
    });

    const pro1 = ws.protocol('protocol-1');
    pro1.on('say_hello', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer on say_hello: pro1_${name} say ${msg}`);
    });

    const pro2 = ws.protocol('protocol-2');
    pro2.on('say_hello', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer on say_hello: pro2_${name} say ${msg}`);
    });
})();
