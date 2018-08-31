(() => {
    'use strict';

    const { wsServer } = require('../../index.js');

    // acceptedProtocol can not use upper-case
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: ['protocol1', 'protocol2'],

        serverConfig: {
            autoAcceptConnections: false
        }
    });

    const conn1 = ws.protocol('protocol1');
    conn1.on('open', (eventInfo) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);

        conn1.emit('say_hello', 'brchen777', 'Hi', 'conn1');
    });

    const conn2 = ws.protocol('protocol2');
    conn2.on('open', (eventInfo) => {
        const socket = eventInfo.sender;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);

        conn2.emit('say_hello', 'JCloudYu', 'Hi' ,'conn2');
    });
})();
