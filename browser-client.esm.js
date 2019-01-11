import { DOMEventEmitter as EventEmitter } from './dom-event-emitter.esm.js';
const WS_READY_STATES = { CONNECTING:0, OPEN:1, CLOSING:2, CLOSED:3 };

export function WSPack (URI, protocol=null) {
	const HANDLER = new EventEmitter();
	const CONN_INFO = [URI];
	if (protocol !== null) CONN_INFO.push(protocol);
	const WS = new WebSocket(...CONN_INFO);
	
	HANDLER._serializer = __DEFAULT_SERIALIZER;
	HANDLER._deserializer = __DEFAULT_DESERIALIZER;
	
	// region [ Handle WS core events ]
	WS.onopen=__FUNC_TRIGGER_DOM_EVENT.bind(null, HANDLER);
	WS.onclose=__FUNC_TRIGGER_DOM_EVENT.bind(null, HANDLER);
	WS.onerror=__FUNC_TRIGGER_DOM_EVENT.bind(null, HANDLER);
	WS.onmessage=async (eMsg)=>{
		let msg = (eMsg.data instanceof Blob) ? (await (new Response(eMsg.data).arrayBuffer())) : eMsg.data;
		let eventInfo = {
			event:'message',
			sender:HANDLER,
			__event__:eMsg
		};
		
		try{
			msg=HANDLER._deserializer(msg);
			if ( Object(msg) === msg && msg.type === "--wspackage-event" ) {
				eventInfo.event = msg.event;
				HANDLER.__emit(eventInfo, ...msg.eventArgs);
				return;
			}
		} catch(e) {}
		
		
		
		HANDLER.__emit(eventInfo, msg);
	};
	// endregion
	
	// region [ Add or overwrite properties ]
	Object.defineProperties(HANDLER, {
		__emit:{
			value: HANDLER.emit.bind(HANDLER),
			configurable:false, writable:false, enumerable:false
		},
		readyState:{
			get:()=>{return WS.readyState;},
			configurable:false, enumerable:true
		},
		protocol: {
			get:()=>{return WS.protocol;},
			configurable:false, enumerable:true
		},
		url: {
			get:()=>{return WS.url;},
			configurable:false, enumerable:true
		},
		bufferedAmount: {
			get:()=>{return WS.bufferedAmount;},
			configurable:false, enumerable:true
		}
	});
	
	HANDLER.emit = (event, ...args)=>{
		HANDLER.__emit(event, ...args);
	
		if ( WS.readyState === WS_READY_STATES.OPEN ) {
			WS.send(HANDLER._serializer({
				type:'--wspackage-event',
				event, eventArgs:args
			}));
		}
	};
	HANDLER.close = ()=>{
		return WS.readyState >= WS_READY_STATES.CLOSING ? undefined: WS.close();
	};
	// endregion
	
	
	
	return HANDLER;
};




function __FUNC_TRIGGER_DOM_EVENT(sender, e, ...args) {
	let evtInfo = {
		type:e.type,
		sender,
		timestamp: (new Date()).getTime(),
		__event__:e
	};
	
	sender.__emit(e.type, evtInfo, ...args);
}

function __DEFAULT_SERIALIZER(input) {
	return JSON.stringify(input);
}

function __DEFAULT_DESERIALIZER(input) {
	return JSON.parse(input);
}
