(() => {
    'use strict';

    const { wsServer } = require('../../index');

    // acceptedProtocol can not use upper-case
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: ['protocol1', 'protocol2']
    });
    ws.listen();

    const conn1 = ws.protocol('protocol1');
    conn1.on('open', (eventInfo) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);

        conn1.emit('say_hello', 'brchen777', 'Hi', 'conn1');
    });

    const conn2 = ws.protocol('protocol2');
    conn2.on('open', (eventInfo) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);

        conn2.emit('say_hello', 'JCloudYu', 'Hi' ,'conn2');
    });
})();
