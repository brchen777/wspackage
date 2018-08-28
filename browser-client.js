((window)=>{
	"use strict";
	
	const WS_READT_STATE_OPEN = 1;
	const {EventEmitter} = (a=>{function b(){}function c(a,b){for(let c=a.length;c--;)if(a[c].listener===b)return c;return-1}function d(a){return function(){return this[a].apply(this,arguments)}}function e(a){return!!("function"==typeof a||a instanceof RegExp)||!!(a&&"object"==typeof a)&&e(a.listener)}const f=b.prototype,g=a.EventEmitter;f.getListeners=function(a){let b,c,d=this._getEvents();if(a instanceof RegExp)for(c in b={},d)d.hasOwnProperty(c)&&a.test(c)&&(b[c]=d[c]);else b=d[a]||(d[a]=[]);return b},f.flattenListeners=function(a){let b,c=[];for(b=0;b<a.length;b+=1)c.push(a[b].listener);return c},f.getListenersAsObject=function(a){let b,c=this.getListeners(a);return c instanceof Array&&(b={},b[a]=c),b||c},f.addListener=function(a,b){if(!e(b))throw new TypeError("listener must be a function");let d,f=this.getListenersAsObject(a);for(d in f)f.hasOwnProperty(d)&&-1===c(f[d],b)&&f[d].push("object"==typeof b?b:{listener:b,once:!1});return this},f.on=d("addListener"),f.addOnceListener=function(a,b){return this.addListener(a,{listener:b,once:!0})},f.once=d("addOnceListener"),f.defineEvent=function(a){return this.getListeners(a),this},f.defineEvents=function(a){for(let b=0;b<a.length;b+=1)this.defineEvent(a[b]);return this},f.removeListener=function(a,b){let d,e,f=this.getListenersAsObject(a);for(e in f)f.hasOwnProperty(e)&&(d=c(f[e],b),-1!==d&&f[e].splice(d,1));return this},f.off=d("removeListener"),f.addListeners=function(a,b){return this.manipulateListeners(!1,a,b)},f.removeListeners=function(a,b){return this.manipulateListeners(!0,a,b)},f.manipulateListeners=function(a,b,c){let d,e,f=a?this.removeListener:this.addListener,g=a?this.removeListeners:this.addListeners;if("object"==typeof b&&!(b instanceof RegExp))for(d in b)b.hasOwnProperty(d)&&(e=b[d])&&("function"==typeof e?f.call(this,d,e):g.call(this,d,e));else for(d=c.length;d--;)f.call(this,b,c[d]);return this},f.removeEvent=function(a){let b,c=this._getEvents();if("string"==typeof a)delete c[a];else if(a instanceof RegExp)for(b in c)c.hasOwnProperty(b)&&a.test(b)&&delete c[b];else delete this._events;return this},f.removeAllListeners=d("removeEvent"),f.emitEvent=async function(a,b){let c,d,e,f,g=this.getListenersAsObject(a);for(f in g)if(g.hasOwnProperty(f))for(c=g[f].slice(0),e=0;e<c.length;e++)d=c[e],!0===d.once&&this.removeListener(a,d.listener),await d.listener.apply(this,b||[])},f.trigger=d("emitEvent"),f.emit=function(a){let b=Array.prototype.slice.call(arguments,1);return this.emitEvent(a,b)},f._getEvents=function(){return this._events||(this._events={})},b.noConflict=function(){return a.EventEmitter=g,b},"function"==typeof define&&define.amd?define(function(){return b}):"object"==typeof module&&module.exports?module.exports=b:a.EventEmitter=b; return a;})({});
	
	window.WSPack=(URI, protocols=[])=>{
		const HANDLER = new EventEmitter();
		Object.defineProperty(HANDLER, '__emit', {
			value: HANDLER.emit.bind(HANDLER),
			configurable:false, writable:false, enumerable:false
		});
		
		
		
		const WS = new WebSocket(URI, ((!protocols || protocols.length === 0) ? [] : protocols));
		WS.onopen=__FUNC_TRIGGER_DOM_EVENT.bind(null, HANDLER);
		WS.onclose=__FUNC_TRIGGER_DOM_EVENT.bind(null, HANDLER);
		WS.onerror=__FUNC_TRIGGER_DOM_EVENT.bind(null, HANDLER);
		WS.onmessage=(eMsg)=>{
			let msg = eMsg.data;
			let eventInfo = {
				type:'message',
				sender:HANDLER,
				timestamp: (new Date()).getTime(),
				
				__event__:eMsg
			};
			
			try{
				msg=JSON.parse(eMsg.data);
				if ( Object(msg) === msg && msg.type === "wspackage-event" ) {
					eventInfo.type = msg.event;
					HANDLER.__emit(msg.event, eventInfo, ...msg.eventArgs);
				}
			} catch(e) {}
			
			
			
			HANDLER.__emit('message', eventInfo, eMsg.data);
		};
		
		HANDLER.emit = (event, ...args)=>{
			HANDLER.__emit(event, ...args);
		
			if ( WS.readyState === WS_READT_STATE_OPEN ) {
				WS.send(JSON.stringify({
					type:'wspackage-event',
					event, eventArgs:args
				}));
			}
		};
		
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
})(window);
