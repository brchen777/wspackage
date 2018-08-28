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

        requestListener: () => {},
        listenCallback: () => {},

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

    module.exports = (arg = defaultOptions) => {
        const options = Object.assign({}, defaultOptions, arg);
        const {
            port, host, acceptedProtocol,
            requestListener, listenCallback,
            serverConfig
        } = options;
        let { httpServer } = options;

        if (!httpServer) {
            httpServer = http.createServer(requestListener).listen(port, host, listenCallback);
        }

        const wsServer = new WebSocketServer(Object.assign({}, serverConfig, { httpServer }));
        const service = new events.EventEmitter();
        const oriEmitter = service.emit.bind(service);
        service.httpServer = httpServer;
        service.wsServer = wsServer;

        const sockets = {};
        wsServer.on('request', (req) => {
            const socket = req.accept(acceptedProtocol, req.origin);
            socket.id = getRandomId();
            sockets[socket.id] = socket;

            socket.on('message', (message) => {
                let data = message.utf8Data;

                // check message structure is
                // {
                //     type:'wspackage-event',
                //     event: 'tasks-ready',
                //     eventArgs: []
                // };
                if (isJson(data)) {
                    data = JSON.parse(data);
                    if (data.type === 'wspackage-event') {
                        service.emit(data.event, socket, ...data.eventArgs);
                        return;
                    }
                }

                // others
                service.emit('message', socket, data);
            });

            socket.on('close', (reasonCode, description) => {
                // remove socket in sockets
                delete sockets[socket.id];

                service.emit('close', socket, reasonCode, description);
            });

            socket.on('error', (error) => {
                service.emit('error', socket, error);
            });

            // service trigger open event
            service.emit('open', socket);
        });

        service.emit = (event, ...args) => {
            oriEmitter(event, ...args);
            service.send(null, event, ...args);
        };

        service.send = (target, event, ...args) => {
            if (target === null) {
                // sockets for each trigger event
                Object.entries(sockets).forEach(([id, socket]) => {
                    const dataUTF = JSON.stringify(Object.assign({ 0: event }, args));
                    socket.sendUTF(dataUTF);
                });
                return;
            }

            const socket = sockets[target];
            const dataUTF = JSON.stringify(Object.assign({ 0: event }, args));
            socket.sendUTF(dataUTF);
        };

        return service;
    };
})();
