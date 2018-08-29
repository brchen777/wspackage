(async () => {
    'use strict';

    const WebSocketServer = require('websocket').server;
    const http = require('http');
    const events = require('events');
    const crypto = require('crypto');
    const base32 = require('base32');

    const defaultOptions = {
        httpServer: null,

        port: 80,
        host: 'localhost',
        acceptedProtocol: null,

        serverConfig: {
            autoAcceptConnections: false
        }
    };

    const getRandomId = (length = 16) => {
        const buffer = crypto.randomBytes(length);
        return base32.encode(buffer);
    };

    const isJson = (string) => {
        try {
            JSON.parse(string);
        }
        catch (e) {
            return false;
        }
        return true;
    };

    const socketSendUTF = (socket, event, ...args) => {
        if (socket === null) {
            return;
        }

        const dataUTF = JSON.stringify({
            type: 'wspackage-event',
            event,
            eventArgs: args
        });
        socket.sendUTF(dataUTF);
    };

    module.exports = (arg = defaultOptions) => {
        const options = Object.assign({}, defaultOptions, arg);
        const {
            port, host, acceptedProtocol,
            serverConfig
        } = options;
        let { httpServer } = options;

        if (!httpServer) {
            httpServer = http.createServer((req, res) => {
                res.writeHead(404);
                res.end();
            });
        }

        const wsServer = new WebSocketServer(Object.assign({}, serverConfig, { httpServer }));
        const service = new events.EventEmitter();
        const oriEmitter = service.emit.bind(service);
        const callOriEmitter = (event, socket, ...args) => {
            oriEmitter(event, { type: event, sender: socket, timestamp: new Date().getTime() }, ...args);
        };

        service.httpServer = httpServer.listen(port, host, () => {
            callOriEmitter('listen', null);
        });
        service.wsServer = wsServer;

        const sockets = {};
        wsServer.on('request', (req) => {
            const socket = req.accept(acceptedProtocol, req.origin);
            socket.id = getRandomId();
            sockets[socket.id] = socket;

            socket.on('message', (message) => {
                let data = message.utf8Data;

                /*
                    check message structure is
                    {
                        type:'wspackage-event',
                        event: 'tasks-ready',
                        eventArgs: []
                    };
                */
                if (isJson(data)) {
                    data = JSON.parse(data);
                    if (data.type === 'wspackage-event') {
                        callOriEmitter(data.event, socket, ...data.eventArgs);
                        return;
                    }
                }

                // others
                callOriEmitter('message', socket, ...data.eventArgs);
            })
            .on('close', callOriEmitter.bind(null, 'close', socket))
            .on('close', () => {
                // remove socket in sockets 
                delete sockets[socket.id];
            })
            .on('error', callOriEmitter.bind(null, 'error', socket));

            // service trigger open event
            callOriEmitter('open', socket);
        });

        service.emit = (event, ...args) => {
            service.send(null, event, ...args);
        };

        service.send = (target, event, ...args) => {
            callOriEmitter(event, null, ...args);

            // broadcast
            if (target === null) {
                // sockets for each trigger event
                Object.entries(sockets).forEach(([id, socket]) => {
                    socketSendUTF(socket, event, ...args);
                });
                return;
            }

            socketSendUTF(sockets[target], event, ...args);
        };

        return service;
    };
})();
