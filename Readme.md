# WebSocket Package #

## For user ##

### Use script in html ###

```html
<script src="./browser-client.js"></script>
```

### Install package ###

> npm i wspackage

### How to use ###

1. Write script file  
    Server Example (NodeJS):
    ```javascript
    // ./server.js
    const { wsServer } = require('wspackage');

    // acceptedProtocol can not use upper-case
    const ws = wsServer({
        port: 1234,
        host: '0.0.0.0',
        acceptedProtocol: 'test-protocol',

        serverConfig: {
            autoAcceptConnections: false
        }
    });

    const callback = (e, ...args) => {
        console.log(e.type);                // event name
        console.log(e.sender);              // sender info (socket connection)
        console.log(e.timestamp);           // new Date()
        console.log(args);
    };

    // event handler
    ws.on('register_event_name', callback);                               // register event
    ws.once('register_once_event_name', callback);                        // register event once
    ws.off('remove_event_name', callback);                                // remove event
    ws.emit('trigger_event_name', [arg1], [arg2], [...]);                 // trigger event (broadcast)
    ws.send('target_id', 'trigger_event_name', [arg1], [arg2], [...]);    // trigger event (target socket connection)

    // wspackage default event
    ws.on('listen', callback);
    ws.on('open', callback);
    ws.on('message', callback);
    ws.on('close', callback);
    ws.on('error', callback);
    ```

    Client Example (JavaScript):
    ```javascript
    (()=>{
        'use strict';

        let callback = (e, ...args) => {
            console.log(e);
            console.log(args);
        };

        let conn = WSPack('ws://127.0.0.1:1234', 'test-protocol')
        // user define event name
        .on('trigger_event_name', callback)
        // wspackage default event
        .on('open', callback)
        .on('close', callback)
        .on('error', callback)
        .on('message', callback);
    })();
    ```

    * Please refer to [Client Config Options](https://github.com/theturtle32/WebSocket-Node/blob/0b3d4a5eb253132b2219f6f22a420bfe4680e26a/docs/WebSocketClient.md#client-config-options) for serverConfig.
    * Please refer to [Event Emitter](https://nodejs.org/api/events.html) for other event handler usages.
    * Callback parameter in Server side is based on [WebSocketConnection](https://github.com/theturtle32/WebSocket-Node/blob/0b3d4a5eb253132b2219f6f22a420bfe4680e26a/docs/WebSocketConnection.md).
    * Callback parameter in Client side is based on [EventListener](https://developer.mozilla.org/zh-TW/docs/Web/API/EventListener).

2. Run command line:
    > node server.js

3. Run client page

---

## For maintainer ##

### Install project ###

* Clone project:
    > git clone \<project-url\>

* Install dependency package:
    > npm install

### Build and Run ###

* Run test server (use node):
    > node ./test/server.js

* Run test server (use npm):
    > npm run test
