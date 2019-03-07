// ts-check
/* eslint-disable no-console */
'use strict';

var util = require('util');
var commander = require('commander');
const http = require('http');
const pubsub = require('pubsub-js');
const configuration = require('./lib/configuration');
const daemonizeProcess = require('daemonize-process');

var Server = require('./api');
const sysUI = require('./lib/sysUI');

var directories = [];

commander.option('-d, --directory <path>', 'Mount directory', function (path) {
	var mountPoint = null;
	var idx = path.indexOf('=');
	if (idx > 0) {
		mountPoint = path.substring(0, idx);
		path = path.substring(idx + 1);
	}

	directories.push({
		path: path,
		mountPoint: mountPoint
	});
});
commander.option('-m, --music <path>', 'Mount music directory', function (path) {
	var mountPoint = null;
	var idx = path.indexOf('=');
	if (idx > 0) {
		mountPoint = path.substring(0, idx);
		path = path.substring(idx + 1);
	}

	directories.push({
		type: 'music',
		path: path,
		mountPoint: mountPoint
	});
});

commander.option('-n, --name <name>', 'Name of server');
commander.option('-u, --uuid <uuid>', 'UUID of server');
commander.option('--dlna', 'Enable dlna support');
commander.option('--lang <lang>', 'Specify language (en, fr)');
commander.option('--strict', 'Use strict specification');
commander.option('--ssdpLog', 'Enable log of SSDP engine');
commander.option('--ssdpLogLevel <level>', 'Log level of SSDP engine');

commander.option('--profiler', 'Enable memory profiler dump');
commander.option('--heapDump', 'Enable heap dump (require heapdump)');

commander.option('--stop', 'Stop already running local MediaMonkey Server');
commander.option('--start', 'Start the server as a service');
commander.option('--status', 'Shows whether there\'s a server running');

commander.option('-p, --httpPort <port>', 'Http port', function (v) {
	return parseInt(v, 10);
});

commander.dlna = !!commander.dlna;
if (!commander.uuid) {
	commander.uuid = '142f98b7-c28b-4b6f-8ca2-b55d9f0657e3';
}

try {
	commander.parse(process.argv);
} catch (x) {
	console.error('Exception while parsing', x);
}

//commander.garbageItems = true;

function start() {
	if (commander.start) {
		daemonizeProcess({
			arguments: process.argv.filter(arg => arg !== '--start'),
		});
		return;
	}

	if (commander.stop) {
		console.log('Stopping a running MediaMonkey Server...');
		http.request({
			port: configuration.getBasicConfig().httpPort,
			path: '/api/stop',
			method: 'POST',
		}, (res) => {
			if (res.statusCode === 200)
				console.log('Server successfully stopped.');
			else
				console.log('Server stop failed.');
		}).on('error', () => {
			console.log('Server not found.');
		}).end();
		return;
	}

	if (commander.status) {
		http.request({
			port: configuration.getBasicConfig().httpPort,
			path: '/api',
			method: 'GET',
		}, (res) => {
			if (res.statusCode === 200)
				console.log('1:Server is running.');
			else
				console.log('99:Server failure.');
		}).on('error', () => {
			console.log('0:Server is not running.');
		}).end();
		return;
	}

	// Create an UpnpServer with options

	var server = new Server(commander, directories);

	server.start();

	server.on('waiting',
		function () {

		}
	);

	// Catch nodejs problem or signals

	var stopped = false;

	var _stopAndExit = function () {
		console.log('disconnecting...');
		stopped = true;

		server.stop();

		setTimeout(function () {
			process.exit();
		}, 1000);
	};

	pubsub.subscribe('APP_END', () => {
		_stopAndExit();
	});

	process.on('SIGINT', () => {
		pubsub.publishSync('APP_END', null);
	});

	process.on('uncaughtException', function (err) {
		if (stopped) {
			process.exit(0);
			return;
		}
		if (err == 'SIGINT')
			pubsub.publishSync('APP_END');
		else
			console.error('Caught exception: ' + err);
	});

	// Try to profile upnpserver manually !

	if (commander.profiler) {
		setInterval(function () {
			console.log(util.inspect(process.memoryUsage()));
		}, 1000 * 30);
	}

	if (commander.headDump) {
		var heapdump = require('heapdump');
		console.log('***** HEAPDUMP enabled **************');
		var nextMBThreshold = 0;

		setInterval(function () {
			var memMB = process.memoryUsage().rss / 1048576;
			if (memMB > nextMBThreshold) {
				heapdump.writeSnapshot();
				nextMBThreshold += 100;
			}
		}, 1000 * 60 * 10);
	}

	sysUI.installTrayIcon();
}

start();