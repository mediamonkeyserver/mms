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
			var id = IDBase++;

			clients.push({
				id: id,
				name: friendlyName,
				socket: socket,
			});

			// Notify this client about its assigned ID
			socket.emit('id_assigned', id);

			socket.on('disconnect', (reason) => {
				logger.info('A client was disconnected (' + reason + ')');

				// Remove this client
				clients = clients.filter(e => e.socket !== socket);
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

	static getClients() {
		return clients.map(x => ({id: x.id, name: x.name}));
	}
}

module.exports = Clients;