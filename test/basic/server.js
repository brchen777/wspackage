(() => {
    'use strict';

    const { wsServer } = require('../../index');

    // acceptedProtocol can not use upper-case ('*' means all)
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: 'protocolB'
    });
    ws.listen();

    ws
    // default event1
    .on('listen', (eventInfo) => {
        // trigger say_hello
        ws.emit('say_hello', 'brchen777', 'hello world');
    })
    // default event2
    .on('open', (eventInfo) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);
    })
    // default event3
    .on('close', (eventInfo, code, reason) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on close: ${code}`);
    })
    // default event4
    .on('error', (eventInfo, error) => {
        const { sender: socket } = eventInfo;
        console.error(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on error: ${error}`);
    })
    // user register event
    .on('say_hello', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer on say_hello: ${name} say ${msg}`);
        ws.emit('server_say_good_bye');
    });
})();
