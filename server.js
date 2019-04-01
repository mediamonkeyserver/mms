// @ts-check
/* eslint-disable no-console */
'use strict';

var util = require('util');
var commander = require('commander');
const http = require('http');
const pubsub = require('pubsub-js');
const configuration = require('./lib/configuration');
const mediaProvider = require('./lib/mediaProvider');
const daemonizeProcess = require('daemonize-process');
// @ts-ignore
const pjson = require('./package.json');

var Server = require('./api');
const sysUI = require('./lib/sysUI');

var directories = [];

commander.version(pjson.version, '-v, --version');

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
commander.option('--datafolder', 'Sets data directory (where database and config files are stored)');

commander.option('-p, --httpPort <port>', 'Http port', function (v) {
	return parseInt(v, 10);
});

commander.dlna = !!commander.dlna;

try {
	commander.parse(process.argv);
} catch (x) {
	console.error('Exception while parsing', x);
}

//commander.garbageItems = true;

function getStatus() {
	return new Promise((resolve) => {
		http.request({
			port: configuration.getBasicConfig().httpPort,
			path: '/api',
			method: 'GET',
		}, (res) => {
			if (res.statusCode === 200)
				resolve('running');
			else
				resolve('error');
		}).on('error', () => {
			resolve('stopped');
		}).end();
	});
}

function initDB() {
	return new Promise((resolve) => {		
		var RegistryClass = require('./lib/db/sqlRegistry');
		var db = new RegistryClass();
		db.initialize((error) => {
			if (error) {
				console.error('Unable to load database: ' + error);
				resolve();
			} else
				configuration.setRegistry(db, () => {
					mediaProvider.setRegistry(db);		
					resolve(db);							
				});
		});
	});
}

function loadConfig() {
	return new Promise((resolve) => {		
		configuration.loadConfig((err, config)=>{
			if (err) {
				console.error('Unable to load configuration: ' + err);
				resolve();
			} else {
				resolve(config);
			}
		});
	});
}

async function start() {

	if (commander.datafolder) {
		var dir = process.argv.pop();
		if (dir == '--datafolder') {
			console.error('--datafolder requires one parameter (folder path)');
			return;
		}
		console.log('Setting custom data directory: ' + dir);
		configuration.setDataDir(dir);
	}

	var config = await loadConfig();
	if (!config)
		return;

	if (commander.start) {
		if (await getStatus() !== 'stopped') {
			console.error('MediaMonkey Server is already running.');
			return;
		}
		console.log('MediaMonkey Server was started as a service.');
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
				console.warn('Server stop failed.');
		}).on('error', () => {
			console.error('Server not found.');
		}).end();
		return;
	}

	if (commander.status) {
		switch (await getStatus()) {
			case 'running': console.log('1: Server is running.'); break;
			case 'stopped': console.log('0: Server is not running.'); break;
			case 'error': console.log('99: Server failure.'); break;
		}
		return;
	}

	var db = await initDB();
	if (!db)
		return;	

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

		server.stop(() => {});

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
