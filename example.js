(() => {
    'use strict';

    const { wsServer } = require('./index.js');

    const ws = wsServer({
        port: 8080,
        host: '127.0.0.1',

        requestListener: (req, res) => {
            console.log(`[${new Date()}}]: Received request for ${req.url}`);
            res.writeHead(404);
            res.end();
        },
        listenCallback: () => {
            console.log(`[${new Date()}]: Server is listening on port 8080`);
        }
    });

    ws.on('open', (socket) => {
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onopen`);
    });

    ws.on('message', (socket, data) => {
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onmessage: ${data}`);
    });

    ws.on('close', (socket, reasonCode, description) => {
        console.log(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onclose`);
    });

    ws.on('error', (socket, error) => {
        console.error(`[${new Date()}]: Peer ${socket.remoteAddress} (${socket.id}) onerror: ${error}`);
    });

    ws.on('say_hello', () => {
        console.log('hello world!');
    });
    ws.emit('say_hello');
})();
