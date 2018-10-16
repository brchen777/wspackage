(() => {
    'use strict';

    const { wsServer } = require('../../index');

    // acceptedProtocol can not use upper-case
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: 'protocol'
    });

    // default event1
    ws.on('listen', (eventInfo) => {
        // trigger say_hello
        ws.emit('say_hello', 'brchen777', 'hello world');
    });

    // default event2
    ws.on('open', (eventInfo) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);
    });

    // default event3
    ws.on('close', (eventInfo, code, reason) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on close: ${code}`);
    });

    // default event4
    ws.on('error', (eventInfo, error) => {
        const { sender: socket } = eventInfo;
        console.error(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on error: ${error}`);
    });

    // user register event
    ws.on('say_hello', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer on say_hello: ${name} say ${msg}`);
        ws.emit('server_say_good_bye');
    });
})();
