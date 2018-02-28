'use strict';

const logger = require('./logger');

var io;
var clients = [];

class Clients {
	static initialize(httpServer) {
		logger.verbose('Initializing clients connections.');

		io = require('socket.io')(httpServer);
		io.on('connect', function (socket) {
			logger.info('A new client connected ('+socket.client.request.headers['user-agent']+')');

			// client.on('event', function(data){});
			// client.on('disconnect', function(){});
			// socket.emit('test');
			clients.push(socket);

			socket.on('disconnect', (reason) => {
				logger.info('A client was disconnected ('+reason+')');

				// Remove this client
				clients = clients.filter(e => e !== socket);
			});
		});

		logger.getEvents().addListener('NEW_LOG_ITEM', () => {
			Clients.notifyNewLogItem();
		});
	}

	static notifyNewLogItem() {
		for (var client of clients) {
			client.emit('new_log_item');
		}
	}
}

module.exports = Clients;