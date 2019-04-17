'use strict';

const logger = require('./logger');

var io;
var clients = [];

function userAgent2FriendlyName(userAgent) {
	// TODO: A better parser, like 'useragent' NPM?
	var Browser = userAgent.match(/.*(Edge|Chrome|Firefox|OPR)/i);
	if (Browser) {
		Browser = Browser[1];
		if (Browser === 'OPR')
			Browser = 'Opera';
	}

	var OS = userAgent.match(/.*(Windows|Macintosh|Linux|Android)/i);
	if (OS)
		OS = OS[1];
	else
		OS = 'Safari';

	var res = '';
	if (Browser)
		res = Browser;
	if (OS)
		res += (res ? ' on ' : '') + OS;
	if (!res)
		res = userAgent;
	return res;
}

function updatePlaybackState(client, data) {
	const title = (data.mediaItem || {}).title;

	logger.verbose(`Playback notification from ${client.id}: ${data.action} "${title}" (at ${data.currentTime})`);

	if (data.action === 'playing' && client.status !== 'playing') {
		logger.info(`Playing "${title}" at ${client.name}`);
	}

	client.status = data.action;
	client.mediaItem = data.mediaItem;
	client.currentTime = data.currentTime;
	client.lastUpdateTime = Date.now();
	Clients.notifyPlaybackStateChange(client.id);
}

// Updates the current playback time of all the clients
function updatePlaybackPositions() {
	var newNow = Date.now();
	for (var client of clients) {
		if (client.status === 'playing') {
			client.currentTime += (newNow - client.lastUpdateTime) / 1000;
			client.lastUpdateTime = newNow;
		}
	}
}

var IDBase = 1;

class Clients {
	static initialize(httpServer, httpsServer) {
		logger.verbose('Initializing clients connections.');

		io = require('socket.io')(httpServer);
		io.attach(httpsServer);
		io.on('connect', function (socket) {
			var userAgent = socket.client.request.headers['user-agent'];
			var friendlyName = userAgent2FriendlyName(userAgent);
			logger.info('A new client connected (' + friendlyName + ')');
			logger.verbose('User-agent: ' + userAgent);
			var client = {
				id: String(IDBase++),
				name: friendlyName,
				socket: socket,
				status: null,
				mediaItem: null,
			};

			clients.push(client);

			// Notify this client about its assigned ID
			socket.emit('id_assigned', client.id);

			socket.on('disconnect', (reason) => {
				logger.info('A client was disconnected (' + reason + ')');

				// Remove this client
				clients = clients.filter(e => e.socket !== socket);
			});

			socket.on('playback', (data) => {
				updatePlaybackState(client, data);
			});
		});

		logger.getEvents().addListener('NEW_LOG_ITEM', () => {
			Clients.notifyNewLogItem();
		});
	}

	static notifyNewLogItem() {
		for (var client of clients) {
			client.socket.emit('new_log_item');
		}
	}

	static notifyPlaybackStateChange(clientID) {
		for (var client of clients) {
			if (client.id !== clientID)
				client.socket.emit('playback_state', clientID);
		}
	}

	static getClients() {
		updatePlaybackPositions();

		return clients.map(x => ({
			id: x.id,
			name: x.name,
			status: x.status,
			mediaItem: x.mediaItem,
			currentTime: x.currentTime,
		}));
	}

	static getById(id) {
		return clients.find(item => item.id === id);
	}

	static sendCommand(clientID, command, params) {
		var client = Clients.getById(clientID);
		if (client) {
			client.socket.emit(command, params);
		}
	}
}

module.exports = Clients;