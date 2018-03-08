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
	logger.verbose('Playback notification from ' + client.id + ': ' + data.action);
	client.mediaItem = data.mediaItem;
	switch (data.action) {
		case 'playing': client.status = 'playing'; break;
		case 'paused': client.status = 'paused'; break;
		case 'stopped': client.status = 'stopped'; break;
	}
	Clients.notifyPlaybackStateChange(client.id);
}

var IDBase = 1;

class Clients {
	static initialize(httpServer) {
		logger.verbose('Initializing clients connections.');

		io = require('socket.io')(httpServer);
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
		return clients.map(x => ({
			id: x.id,
			name: x.name,
			status: x.status,
			mediaItem: x.mediaItem,
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