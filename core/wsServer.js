(async () => {
    'use strict';

    const WebSocket = require('ws');
    const http = require('http');
    const events = require('events');
    const crypto = require('crypto');

    const __stringType = 'base64url';
    const __mainProtocol = '--wspackage-mainProtocol';
    
    const defaultOptions = {
        httpServer: null,

        port: 80,
        host: 'localhost',
        acceptedProtocol: null
    };

    module.exports = (option = defaultOptions) => {
        const config = Object.assign({}, defaultOptions, option);
        const { port, host } = config;
        let { httpServer, acceptedProtocol } = config;
        const wsStructures = {};

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
            __callOriEmitter(event, __mainProtocol, null, ...args);

            // broadcast
            if (target === null) {
                Object.values(wsStructures).forEach((wsStructure) => {
                    const { sockets } = wsStructure;
                    Object.values(sockets).forEach((socket) => {
                        __socketSend.call(mainService, socket, event, ...args);
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

                __socketSend.call(mainService, sockets[target], event, ...args);
            });
        };

        mainService.close = async () => {            
            return new Promise((resolve) => {
                wss.close();
                httpServer.close();
                httpServer.once('close', resolve);
            });
        };

        mainService.listen = (...args) => {
            if (args.length > 0) {
                process.stderr.write('WARN: Note that the listen event will not be triggered if you want to handle port and ip yourself\n');
                httpServer.listen(...args);
            }
            else {
                httpServer.listen(port, host, () => {
                    __callOriEmitter('listen');
                });
            }
        };

        mainService.protocol = (protocol) => {
            // init event emitter if acceptedProtocol is empty
            if (!wsStructures[protocol]) {
                wsStructures[protocol] = __initService(protocol);
            }

            return wsStructures[protocol].service;
        };

        mainService._serializer = __defaultSerializer;
        mainService._deserializer = __defaultDeserializer;

        // init event emitter from other accepted protocols service
        if (!Array.isArray(acceptedProtocol)) {
            acceptedProtocol = ((acceptedProtocol) ? [acceptedProtocol] : []);
        }

        acceptedProtocol.forEach((protocol) => {
            wsStructures[protocol] = __initService(protocol);
        });

        // create http server
        if (!httpServer) {
            httpServer = http.createServer((req, res) => {
                res.writeHead(404);
                res.end();
            });
        }

        // create websocket server
        let wssConfig = { server: httpServer, handleProtocols: __handleProtocols };
        const wss = new WebSocket.Server(wssConfig);
        wss.on('connection', (ws, req) => {
            const protocol = ws.protocol;
            // if protocol is empty, close web socket
            if (protocol === '') {
                ws.close();
                return;
            }

            const socket = ws;
            socket.id = __getRandomId();
            socket.remoteAddress = req.connection.remoteAddress;

            // add socket
            const { sockets: protocolSockets } = wsStructures[protocol];
            protocolSockets[socket.id] = socket;

            socket.on('message', (data) => {
                /*
                    check data structure is
                    {
                        type:'--wspackage-event',
                        event: 'tasks-ready',
                        eventArgs: []
                    };
                */
                data = mainService._deserializer(data);
                if (Object(data) === data && data.type === '--wspackage-event') {
                    __callOriEmitter(data.event, protocol, socket, ...data.eventArgs);
                    return;
                }

                // others
                __callOriEmitter('message', protocol, socket, data);
            })
            .on('close', __callOriEmitter.bind(null, 'close', protocol, socket))
            .on('close', () => {
                // remove socket in sockets 
                delete protocolSockets[socket.id];
            })
            .on('error', __callOriEmitter.bind(null, 'error', protocol, socket));

            // service trigger open event
            __callOriEmitter('open', protocol, socket);
        });

        return mainService;

        function __callOriEmitter(event, protocol = __mainProtocol, socket = null, ...args) {
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
        }

        function __initService(protocol) {
            const service = new events.EventEmitter();
            const wsStructure = {
                service: service,
                sockets: {},
                oriEmitter: service.emit.bind(service)
            };
    
            service.emit = (event, ...args) => {
                service.send(null, event, ...args);
            };
    
            service.send = (target, event, ...args) => {
                __callOriEmitter(event, protocol, null, ...args);
    
                const { sockets: protocolSockets } = wsStructure;
                // broadcast
                if (target === null) {
                    Object.values(protocolSockets).forEach((socket) => {
                        __socketSend.call(mainService, socket, event, ...args);
                    });
                    return;
                }
    
                // send to target
                __socketSend.call(mainService, protocolSockets[target], event, ...args);
            };

            return wsStructure;
        }
    
        function __handleProtocols(protocols) {
            let protocol = false;
            protocols.forEach((pro) => {
                if (Object.prototype.hasOwnProperty.call(wsStructures, pro)) {
                    protocol = pro;
                }
            });

            return protocol;
        }
    };

    function __getRandomId(length = 16, stringType = __stringType) {
        const buffer = crypto.randomBytes(length);
        const string = (stringType === 'base64url')
            ? buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
            : buffer.toString(stringType);
        return string;
    }

    function __socketSend(socket, event, ...args) {
        if (socket === null) {
            return;
        }

        const dataStr = this._serializer({
            type: '--wspackage-event',
            event,
            eventArgs: args
        });
        socket.send(dataStr);
    }

    function __defaultSerializer(input) {
        return JSON.stringify(input);
    }

    function __defaultDeserializer(input) {
        return JSON.parse(input);
    }
})();
