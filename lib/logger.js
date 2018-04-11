// @ts-check
/* eslint-disable no-debugger, no-console */

'use strict';

const debug = require('debug')('upnpserver');
const EventEmitter = require('events');

const logEvents = new EventEmitter();

class LogStorage {
	constructor(maxItems) {
		this.maxItems = maxItems;
		this.logData = [maxItems];
		this.head = 0;
		this.crossed = false;
	}

	storeItem(item) {
		this.logData[this.head++] = item;
		if (this.head >= this.maxItems) {
			this.head = 0;
			this.crossed = true;
		}
	}

	getItems() {
		var res = this.logData.slice(0, this.head);
		if (this.crossed) {
			res = this.logData.slice(this.head, this.maxItems).concat(res);
		}
		return res;
	}
}

var messagesLog = new LogStorage(100);
var verboseLog = new LogStorage(1000);
var debugLog = new LogStorage(10000);

function storeDebug(type, message, verbose) {
	var item = {
		type: type,
		message: message,
		timestamp: Date.now(),
	};

	if (verbose)
		verboseLog.storeItem(item);
	debugLog.storeItem(item);
}

function storeMessage(type, message) {
	var item = {
		type: type,
		message: message,
		timestamp: Date.now(),
	};

	messagesLog.storeItem(item);
	verboseLog.storeItem(item);
	debugLog.storeItem(item);

	switch (type) {
		case 'info': console.info(message); break;
		case 'warning': console.warn(message); break;
		case 'error': console.error(message); break;
	}

	logEvents.emit('NEW_LOG_ITEM');
}

var Logger = {
	log: function () {
		debugger;
		throw 'Do not use Logger.log function';
	},

	trace: function (...args) { storeDebug('trace', args.join(' ')); },
	debug: function (...args) { storeDebug('debug', args.join(' ')); },
	verbose: function (...args) { storeDebug('verbose', args.join(' '), true); },
	info: function (...args) { storeMessage('info', args.join(' ')); },
	warn: function (...args) { storeMessage('warning', args.join(' ')); },
	error: function (...args) { storeMessage('error', args.join(' ')); },

	getLog: function (logType) {
		switch (logType) {
			case 'verbose': return verboseLog.getItems();
			case 'debug': return debugLog.getItems();
			case 'messages':
			default: return messagesLog.getItems();
		}
	},

	getEvents: () => logEvents,
};

if (debug.enabled) {
	Logger.debug = debug;
	Logger.verbose = debug;
	Logger.info = debug;
	Logger.warn = debug;
	Logger.error = debug;
}

module.exports = Logger;
