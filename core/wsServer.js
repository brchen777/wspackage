(async () => {
    'use strict';

    const WebSocket = require('ws');
    const http = require('http');
    const events = require('events');
    const crypto = require('crypto');

    const __stringType = 'base64url';
    const __defaultProtocol = '--wspackage-defaultProtocol';
    
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
        let __acceptEverything = false;

        // init default protocol structure
        const defaultStructure = __initDefaultStructure();
        const { service: defaultService } = defaultStructure
        wsStructures[__defaultProtocol] = defaultStructure;

        // init other accepted protocols structure
        if (!Array.isArray(acceptedProtocol)) {
            acceptedProtocol = ((acceptedProtocol) ? [acceptedProtocol] : [__defaultProtocol]);
        }
        acceptedProtocol
        .filter((protocol) => {
            __acceptEverything = (protocol === '*');
            return ((protocol !== __defaultProtocol) && (protocol !== '*'));
        })
        .forEach((protocol) => {
            wsStructures[protocol] = __initStructure(protocol);
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
            let protocol = __switchProtocol(ws.protocol);
            // close web socket if protocol is empty string
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

            socket
            .on('message', (data) => {
                /*
                    check data structure is
                    {
                        type:'--wspackage-event',
                        event: 'tasks-ready',
                        eventArgs: []
                    };
                */
                data = defaultService._deserializer(data);
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

        return defaultService;

        // update protocol to specified structure
        function __switchProtocol(protocol) {
            let result = '';
            const structureKeys = Object.keys(wsStructures);
            if (structureKeys.includes(protocol)) {
                result = protocol;
            }
            else if (__acceptEverything) {
                result = __defaultProtocol;
            }
            return result;
        }

        function __callOriEmitter(event, protocol = __defaultProtocol, socket = null, ...args) {
            const eventInfo = {
                type: event,
                protocol: protocol,
                sender: socket,
                timestamp: new Date().getTime()
            };

            wsStructures[protocol].oriEmitter(event, eventInfo, ...args);

            // trigger protocol will trigger default protocol
            if (protocol !== __defaultProtocol) {
                wsStructures[__defaultProtocol].oriEmitter(event, eventInfo, ...args);
            }
        }

        function __initDefaultStructure() {
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
                __callOriEmitter(event, __defaultProtocol, null, ...args);
    
                // broadcast
                if (target === null) {
                    Object.values(wsStructures).forEach((wsStructure) => {
                        const { sockets } = wsStructure;
                        Object.values(sockets).forEach((socket) => {
                            __socketSend.call(service, socket, event, ...args);
                        });
                    });
                    return;
                }
    
                // send to target
                Object.values(wsStructures).forEach((wsStructure) => {
                    const { sockets } = wsStructure;
                    if (!Object.keys(sockets).includes(target)) return;
                    
                    __socketSend.call(service, sockets[target], event, ...args);
                });
            };
    
            service.close = async () => {            
                return new Promise((resolve) => {
                    wss.close();
                    httpServer.close();
                    httpServer.once('close', resolve);
                });
            };
    
            service.listen = (...args) => {
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
    
            service.protocol = (protocol) => {
                if (protocol === '*') {
                    return wsStructures[__defaultProtocol].service;
                }

                // init structure if it is undefined
                let wsStructure = wsStructures[protocol] || __initStructure(protocol);
                wsStructures[protocol] = wsStructure;    
                return wsStructure.service;
            };
    
            service._serializer = __defaultSerializer;
            service._deserializer = __defaultDeserializer;
            return wsStructure;
        }

        function __initStructure(protocol) {
            const defaultService = wsStructures[__defaultProtocol].service;
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
                        __socketSend.call(defaultService, socket, event, ...args);
                    });
                    return;
                }
    
                // send to target
                __socketSend.call(defaultService, protocolSockets[target], event, ...args);
            };

            service._serializer = __defaultSerializer;
            service._deserializer = __defaultDeserializer;
            return wsStructure;
        }

        // set Sec-WebSocket-Protocol
        function __handleProtocols(protocols) {
            let result = false;
            const structureKeys = Object.keys(wsStructures);
            protocols.forEach((protocol) => {
                if (structureKeys.includes(protocol)) {
                    result = protocol;
                    return;
                }
            });

            if (!result && __acceptEverything) {
                result = Array.isArray(protocols) ? protocols[0] : protocols;
            }
            return result;
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
