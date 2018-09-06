(async () => {
    'use strict';

    const WebSocketServer = require('websocket').server;
    const http = require('http');
    const events = require('events');
    const crypto = require('crypto');

    const __stringType = 'base64';
    const __mainProtocol = '--wspackage-mainProtocol';

    const defaultOptions = {
        httpServer: null,

        port: 80,
        host: 'localhost',
        acceptedProtocol: null,

        serverConfig: {
            autoAcceptConnections: false
        }
    };

    const __getRandomId = (length = 16, stringType = __stringType) => {
        const buffer = crypto.randomBytes(length);
        return buffer.toString(stringType);
    };

    const __isJson = (string) => {
        try {
            JSON.parse(string);
        }
        catch (e) {
            return false;
        }
        return true;
    };

    const __socketSendUTF = (socket, event, ...args) => {
        if (socket === null) {
            return;
        }

        const dataUTF = JSON.stringify({
            type: '--wspackage-event',
            event,
            eventArgs: args
        });
        socket.sendUTF(dataUTF);
    };

    module.exports = (option = defaultOptions) => {
        const config = Object.assign({}, defaultOptions, option);
        const { port, host, serverConfig } = config;
        let { httpServer, acceptedProtocol } = config;
        const wsStructures = {};

        const callOriEmitter = (event, protocol = __mainProtocol, socket = null, ...args) => {
            const eventInfo = {
                type: event,
                protocol: protocol,
                sender: socket,
                timestamp: new Date().getTime()
            };

            wsStructures[protocol].oriEmitter(event, eventInfo, ...args);

            // trigger protocol will trigger main protocol
            if (protocol !== __mainProtocol) {
                wsStructures[__mainProtocol].oriEmitter(event, eventInfo, ...args);
            }
        };

        // init event emitter from main service
        const mainService = new events.EventEmitter();
        wsStructures[__mainProtocol] = {
            service: mainService,
            sockets: {},
            oriEmitter: mainService.emit.bind(mainService)
        };

        mainService.emit = (event, ...args) => {
            mainService.send(null, event, ...args);
        };

        mainService.send = (target, event, ...args) => {
            callOriEmitter(event, __mainProtocol, null, ...args);

            // broadcast
            if (target === null) {
                Object.values(wsStructures).forEach((wsStructure) => {
                    const { sockets } = wsStructure;
                    Object.values(sockets).forEach((socket) => {
                        __socketSendUTF(socket, event, ...args);
                    });
                });
                return;
            }

            // send to target
            Object.values(wsStructures).forEach((wsStructure) => {
                const { sockets } = wsStructure;
                if (Object.keys(sockets).indexOf(target) === -1) {
                    return;
                }

                __socketSendUTF(sockets[target], event, ...args);
            });
        };

        mainService.close = async () => {            
            let ended;
            const promise = new Promise((resolve)=>{ ended = resolve; });
            httpServer.once('close', ended);

            wsServer.shutDown();
            httpServer.close();

            return promise;
        };

        // init event emitter from other accepted protocols service
        if (!Array.isArray(acceptedProtocol)) {
            acceptedProtocol = ((acceptedProtocol) ? [acceptedProtocol] : []);
        }

        acceptedProtocol.forEach((protocol) => {
            const service = new events.EventEmitter();
            wsStructures[protocol] = {
                service: service,
                sockets: {},
                oriEmitter: service.emit.bind(service)
            };

            service.emit = (event, ...args) => {
                service.send(null, event, ...args);
            };

            service.send = (target, event, ...args) => {
                callOriEmitter(event, protocol, null, ...args);

                const { sockets: protocolSockets } = wsStructures[protocol];
                // broadcast
                if (target === null) {
                    Object.values(protocolSockets).forEach((socket) => {
                        __socketSendUTF(socket, event, ...args);
                    });
                    return;
                }

                // send to target
                __socketSendUTF(protocolSockets[target], event, ...args);
            };
        });

        // create http server
        if (!httpServer) {
            httpServer = http.createServer((req, res) => {
                res.writeHead(404);
                res.end();
            });
        }

        // http server trigger listen event
        httpServer.listen(port, host, () => {
            callOriEmitter('listen');
        });

        // create websocket server
        const wsServer = new WebSocketServer(Object.assign({}, serverConfig, { httpServer }));
        wsServer.on('request', (req) => {
            const protocols = req.requestedProtocols.slice(0);

            // reject no match protocol
            let protocol = null;
            protocols.forEach((pro) => {
                if (Object.prototype.hasOwnProperty.call(wsStructures, pro)) {
                    protocol = pro;
                }
            });

            if (!protocol) {
                req.reject();
                return;
            }

            const socket = req.accept(protocol, req.origin);
            socket.id = __getRandomId();

            // add socket
            const { sockets: protocolSockets } = wsStructures[protocol];
            protocolSockets[socket.id] = socket;

            socket.on('message', (message) => {
                let data = message.utf8Data;

                /*
                    check message structure is
                    {
                        type:'--wspackage-event',
                        event: 'tasks-ready',
                        eventArgs: []
                    };
                */
                if (__isJson(data)) {
                    data = JSON.parse(data);
                    if (data.type === '--wspackage-event') {
                        callOriEmitter(data.event, protocol, socket, ...data.eventArgs);
                        return;
                    }
                }

                // others
                callOriEmitter('message', protocol, socket, ...data.eventArgs);
            })
            .on('close', callOriEmitter.bind(null, 'close', protocol, socket))
            .on('close', () => {
                // remove socket in sockets 
                delete protocolSockets[socket.id];
            })
            .on('error', callOriEmitter.bind(null, 'error', protocol, socket));

            // service trigger open event
            callOriEmitter('open', protocol, socket);
        });

        mainService.protocol = (protocol) => {
            if (!wsStructures[protocol]) {
                const service = new events.EventEmitter();
                wsStructures[protocol] = {
                    service: service,
                    sockets: {},
                    oriEmitter: service.emit.bind(service)
                };
            }

            return wsStructures[protocol].service;
        };

        return mainService;
    };
})();
