(() => {
    'use strict';

    const { wsServer } = require('./index.js');

    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0'
    });

    ws.on('listen', (eventInfo) => {
        // trigger say_hello
        ws.emit('say_hello', 'brchen777', 'hello world');
    });

    ws.on('open', (eventInfo) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onopen`);
    });

    ws.on('message', (eventInfo, data) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onmessage: ${data}`);
    });

    ws.on('close', (eventInfo, reasonCode, description) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onclose`);
    });

    ws.on('error', (eventInfo, error) => {
        const socket = eventInfo.sender;
        console.error(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onerror: ${error}`);
    });

    ws.on('say_hello', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer onsay_hello: ${name} say ${msg}`);
    });
})();
