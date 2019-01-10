(() => {
    'use strict';

    const { wsServer } = require('../../index');

    // acceptedProtocol can not use upper-case ('*' means all)
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: ['*']
    });
    ws.listen();

    ws
    .on('listen', (eventInfo) => {
        // trigger say_hello
        ws.emit('say_hello', 'Server', 'hello world');
    })
    .on('say_hello1', (eventInfo, name, msg) => {
        console.log(`[${new Date()}]: Peer on say_hello: ${name} say ${msg}`);
    });

    const conn1 = ws.protocol('protocolA');
    conn1.on('open', (eventInfo) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);

        conn1.emit('say_hello1', 'brchen777', 'Hi1', 'conn1');
        ws.send(socket.id, 'say_hello2', 'brchen777', 'Hi2', 'conn1');
    });

    const conn2 = ws.protocol('protocolB');
    conn2.on('open', (eventInfo) => {
        const { sender: socket } = eventInfo;
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) on open`);

        conn2.emit('say_hello1', 'JCloudYu', 'Hi1' ,'conn2');
        ws.send(socket.id, 'say_hello2', 'JCloudYu', 'Hi2', 'conn2');
    });
})();
