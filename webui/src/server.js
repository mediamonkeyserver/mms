import PubSub from 'pubsub-js';
import io from 'socket.io-client';
import { forceLogRefresh } from 'actions';

var serverInfo;
// var serverInfoPromise;

// Connect to the server
const socket = io();
socket.on('new_log_item', () => {
	forceLogRefresh();
});

var this_client_id;
socket.on('id_assigned', (id) => {
	this_client_id = id;
});

class Server {
	static fetchJson = (path, options) => {
		return new Promise((res, rej) => {
			fetch('/api' + path, options).then((result) => {
				return result.json();
			}).then((json) => {
				res(json);
			}).catch(err => {
				rej(err);
			});
		});
	}

	static postJson = (path, json, options) => {
		options = options || {};
		options.method = options.method || 'POST';
		options.headers = new Headers({
			'Content-Type': 'application/json'
		});
		options.body = JSON.stringify(json);
		return fetch('/api' + path, options);
	}

	static deleteJson = (path, json, options) => {
		options = options || {};
		options.method = options.method || 'DELETE';
		return Server.postJson(path, json, options);
	}

	static getInfo = () => {
		return new Promise((res) => {
			if (serverInfo)
				res(serverInfo);

			Server.fetchJson('/').then(json => {
				serverInfo = json;
				res(serverInfo);
			});
		});
	}

	static saveCongif = (cfg) => {
		Server.postJson('/', cfg).then(() => {
			serverInfo = undefined;
			PubSub.publish('CONFIG_CHANGE');
			PubSub.publish('SHOW_SNACKBAR', {
				message: 'Server configuration updated',
				autoHide: 5000,
			});
		});
	}

	static getFolderList = (path) => {
		return Server.fetchJson('/folders?path=' + path);
	}

	static getCollections = () => {
		return Server.fetchJson('/collections');
	}

	static saveCollection = (collection) => {
		Server.postJson('/collections', collection).then(() => {
			serverInfo = undefined;
			PubSub.publish('COLLECTIONS_CHANGE');
		});
	}

	static deleteCollection = (collection) => {
		Server.deleteJson('/collections', collection).then(() => {
			serverInfo = undefined;
			PubSub.publish('COLLECTIONS_CHANGE');
		});
	}

	static getLog = (logType) => {
		return Server.fetchJson('/log/' + (logType ? logType : 'messages'));
	}

	static getTracklist = (collection, sort, filters) => {
		var path = '/tracks/' + collection.id;
		var params = '';
		if (sort)
			params += 'sort=' + sort;
		if (filters && filters.length > 0) {
			if (params.length > 0)
				params += '&';
			params += 'filter=' + JSON.stringify(filters);
		}
		if (params.length > 0)
			path += '?' + params;
		return Server.fetchJson(path);
	}

	static getPlayers = () => {
		return new Promise((res) => {
			Server.fetchJson('/players/').then((players) => {
				// Return all players, except this one
				res(players.filter(player => player.id !== this_client_id));
			});
		});
	}

	static getMediaStreamURL = (mediaItem) => {
		return `/api/stream/${mediaItem.db_id}`;
	}

	static getMediaStreamInfo = (mediaItem) => {
		return Server.fetchJson(`/stream/${mediaItem.db_id}/info`);
	}

	static playItem = (playerID, mediaItem) => {
		Server.postJson('/players/' + playerID + '/play_item', mediaItem).then(() => {
		});
	}

	static playPause = (playerID) => {
		Server.postJson('/players/' + playerID + '/play_pause').then(() => {
		});
	}

	static stop = (playerID) => {
		Server.postJson('/players/' + playerID + '/stop').then(() => {
		});
	}

	static seek = (playerID, newTime) => {
		Server.postJson(`/players/${playerID}/seek/${newTime}`).then(() => {
		});
	}

	static updatePlaybackState = (action, mediaItem, currentTime) => {
		socket.emit('playback', {
			action: action,
			mediaItem: mediaItem,
			currentTime: currentTime,
		});
	}

	static addEventHandler = (event, handler) => {
		socket.on(event, function (...args) {
			handler(...args);
		});
	}
}

export default Server;