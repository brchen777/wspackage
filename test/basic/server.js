(() => {
    'use strict';

    const { wsServer } = require('../../index.js');

    // acceptedProtocol can not use upper-case
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: 'protocol',

        serverConfig: {
            autoAcceptConnections: false
        }
    });

    // default event1
    ws.on('listen', (eventInfo) => {
        // trigger say_hello
        ws.emit('say_hello', 'brchen777', 'hello world');
    });

    // default event2
    ws.on('open', (eventInfo) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);
    });

    // default event3
    ws.on('message', (eventInfo, data) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on message: ${data}`);
    });

    // default event4
    ws.on('close', (eventInfo, reasonCode, description) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on close`);
    });

    // default event5
    ws.on('error', (eventInfo, error) => {
        const socket = eventInfo.sender;
        console.error(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on error: ${error}`);
    });

    // user register event
    ws.on('say_hello', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer on say_hello: ${name} say ${msg}`);
    });
})();
