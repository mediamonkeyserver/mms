/* eslint-disable no-debugger, no-console */
'use strict';

var debug = require('debug')('upnpserver');

var storedLog = [];

function storeLog(type, message) {
	storedLog.push({
		type: type,
		message: message,
		timestamp: Date.now(),
	});

	switch (type) {
		case 'info': console.info(message); break;
		case 'warning': console.warn(message); break;
		case 'error': console.error(message); break;
	}
}

var Logger = {
	log: function () {
		debugger;
		throw 'Do not use Logger.log function';
	},

	trace: console.log.bind(console),
	debug: console.log.bind(console),
	verbose: console.log.bind(console),
	info: (msg) => storeLog('info', msg),
	warn: (msg) => storeLog('warning', msg),
	error: (msg) => storeLog('error', msg),

	getLog: function () {
		return storedLog;
	}
};

if (debug.enabled) {
	Logger.debug = debug;
	Logger.verbose = debug;
	Logger.info = debug;
	Logger.warn = debug;
	Logger.error = debug;
}

module.exports = Logger;