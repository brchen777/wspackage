(() => {
    'use strict';

    const { wsServer } = require('../../index');

    // acceptedProtocol can not use upper-case
    const config = {
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: ['protocol1', 'protocol2']
    };

    const ws1 = wsServer(config);
    ws1.listen();
    const conn1 = ws1.protocol('protocol1');
    conn1.on('open', async (eventInfo) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on conn1 open`);
        conn1.emit('say_hello', 'server conn1');

        // close ws1 server
        await ws1.close();

        // init ws2 server
        const ws2 = wsServer(config);
        ws2.listen();
        const conn2 = ws2.protocol('protocol1');
        conn2.on('open', (eventInfo) => {
            const { sender: socket } = eventInfo;
            console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on conn2 open`);
            conn2.emit('say_hello', 'server conn2');
        })
        .on('close', (eventInfo, code, reason) => {
            console.log(`[${new Date()}]: Server conn2 on close: ${code}`);
        });
    })
    .on('close', (eventInfo, code, reason) => {
        console.log(`[${new Date()}]: Server conn1 on close: ${code}`);
    });
})();
