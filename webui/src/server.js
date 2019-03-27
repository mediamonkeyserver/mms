import PubSub from 'pubsub-js';
import io from 'socket.io-client';
import { forceLogRefresh } from 'actions';
import cookie from 'js-cookie';

var serverInfo;
var auth;
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
		return new Promise((res, reject) => {
			options = options || {};
			if (auth) { // Send authenticated requests
				options.headers = options.headers || new Headers({});
				options.headers.append('Authorization', 'Bearer ' + auth);
			}

			fetch('/api' + path, options).then((result) => {
				try {
					if (!result.ok)
						reject(`Error: ${result.status}: ${result.statusText}`);
					else
						return result.json();
				} catch (e) {
					reject(e);
				}
			}).then((json) => {
				res(json);
			}).catch(err => {
				reject(err);
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
		return Server.fetchJson(path, options);
	}

	static deleteJson = (path, json, options) => {
		options = options || {};
		options.method = options.method || 'DELETE';
		return Server.postJson(path, json, options);
	}

	static async login(username, password) {
		var res;
		try {
			res = await Server.postJson('/user/login', {
				user: username,
				pass: password,
			});
		} catch (e) {
			return null;
		}

		if (res) {
			Server.setAuth(res.token);
			cookie.set('token', res.token);			
			PubSub.publish('UPDATE_GLOBAL', {
				user: res.user,
			});
		}

		return res;
	}

	static logout() {
		Server.setAuth(null);
		cookie.remove('token');
		PubSub.publish('UPDATE_GLOBAL', {
			user: null,
		});
	}

	static setAuth = (newAuth) => {
		auth = newAuth;
	}

	static getUserInfo = () => {
		return Server.fetchJson('/user');
	}

	static getInfo = () => {
		return new Promise((res, rej) => {
			if (serverInfo)
				res(serverInfo);

			Server.fetchJson('/').then(json => {
				serverInfo = json;
				res(serverInfo);
			}).catch(err => {
				rej(err);
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

	static rescanCollection = (collection) => {
		Server.postJson(`/collections/${collection.id}/rescan`);
		PubSub.publish('SHOW_SNACKBAR', {
			message: `Collection ${collection.name} rescan started.`,
			autoHide: 5000,
		});
	}

	static getLog = (logType) => {
		return Server.fetchJson('/log/' + (logType ? logType : 'messages'));
	}

	static getTracklist = (collectionID, sort, filters, search) => {
		var path = '/tracks/' + collectionID;
		var params = '';
		if (sort)
			params += 'sort=' + sort;
		if (filters && filters.length > 0) {
			if (params.length > 0)
				params += '&';
			params += 'filter=' + JSON.stringify(filters);
		}
		if (search) {
			if (params.length > 0)
				params += '&';
			params += `search=${search}`;
		}
		if (params.length > 0)
			path += '?' + params;
		return Server.fetchJson(path);
	}

	static search = (term, sort, filters) => {
		return Server.getTracklist(0, sort, filters, term);
	}

	static getPlayers = () => {
		return new Promise((res) => {
			Server.fetchJson('/players/').then((players) => {
				// Return all players, except this one
				res(players.filter(player => player.id !== this_client_id));
			});
		});
	}

	static getMediaStreamURL = (mediaItem, params) => {
		var forceHLS = '';
		if (params && params.forceHLS)
			forceHLS = '&forceHLS=true';

		return `/api/stream/${mediaItem.db_id}?clientId=${this_client_id}${forceHLS}`;
	}

	static getMediaStreamInfo = (mediaItem, params) => {
		var forceHLS = '';
		if (params && params.forceHLS)
			forceHLS = '?forceHLS=true';
		return Server.fetchJson(`/stream/${mediaItem.db_id}/info${forceHLS}`);
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