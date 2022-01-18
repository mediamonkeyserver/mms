import PubSub from 'pubsub-js';
import io from 'socket.io-client';
import {
	forceLogRefresh,
	subscribeOfflineStateChange,
	notifyOffline,
	notifyOnline,
	subscribeLoginStateChange,
	notifyLoginStateChange,
	showSnackbarMessage,
} from './actions';
import cookie from 'js-cookie';

//eslint-disable-next-line
var isOffline;
var serverInfo;
var auth;
var user;
var this_client_id;

// Connect to the server's websocket/socket.io
const socket = io();

socket.on('new_log_item', forceLogRefresh);
socket.on('id_assigned', (id) => { this_client_id = id; });

socket.on('connect_error', handleConnectError);
socket.on('reconnect', attemptNum => {
	console.log(`Reconnected after attempt ${attemptNum}`);
	showSnackbarMessage('Reconnected!', { ttl: 1000 });
});

//socket.on('connect_timeout', err => console.log('Connect timeout'));
//socket.on('reconnect_error', err => console.log('Reconnect error'));
//socket.on('reconnect_failed', err => console.log('Reconnect failed'));
//socket.on('disconnect', () => console.log('Disconnected'));
//socket.on('reconnect_attempt', () => console.log('Attempting to reconnect'));

function handleConnectError(err) {
	// When we're not logged in, the error will say: Error: 401: Unauthorized
	if (typeof err === 'string' && err.includes('401')) {

		Server.setAuth(null);
		cookie.remove('token');

		notifyLoginStateChange({ user: null });
		console.log('Got an unauthorized error; Setting state to logged-out');
	}
	showSnackbarMessage('Could not connect to server.');
	notifyOffline();
}

subscribeOfflineStateChange(data => { isOffline = data.offline; });

subscribeLoginStateChange(data => { user = data.user; });


class Server {
	/**
	 * Send a request to server.
	 * @param {String} path URL path (excluding /web/api)
	 * @param {Object} [options] Options
	 * @param {String} [options.method] HTTP method
	 * @param {String} [options.headers] Headers
	 * @returns {Promise<any>} JSON-decoded response from server
	 */
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

	/**
	 * Send a request to server with JSON attached.
	 * @param {String} path URL path (excluding /web/api)
	 * @param {Object} json JSON to send.
	 * @param {Object} [options] Options
	 * @param {String} [options.method='POST'] HTTP method
	 * @param {String} [options.headers] Headers
	 * @returns {Promise<any>} JSON-decoded response from server
	 */
	static postJson = (path, json, options) => {
		options = options || {};
		options.method = options.method || 'POST';
		options.headers = new Headers({
			'Content-Type': 'application/json'
		});
		options.body = JSON.stringify(json);
		return Server.fetchJson(path, options);
	}

	/**
	 * Send a DELETE request to server with JSON attached.
	 * @param {String} path URL path (excluding /web/api)
	 * @param {Object} json JSON to send.
	 * @param {Object} [options] Options
	 * @param {String} [options.method='DELETE'] HTTP method
	 * @param {String} [options.headers] Headers
	 * @returns {Promise<any>} JSON-decoded response from server
	 */
	static deleteJson = (path, json, options) => {
		options = options || {};
		options.method = options.method || 'DELETE';
		return Server.postJson(path, json, options);
	}

	/**
	 * Periodically ping server to make sure we have a connection.
	 */
	static phoneHome() {
		Server.fetchJson('/ping')
			.then(res => {
				if (res.loggedIn === false) {
					//Only show login prompt if we aren't already aware that user is not logged in
					if (user) {
						Server.setAuth(null);
						cookie.remove('token');

						notifyLoginStateChange({ user: null });
					}
					else {
						//In the future we can delete this console.log, but for the time being
						//	we should keep it, in case DialogLogin inexplicably doesn't show up
						console.log('Would show login prompt, but we already know that we are not logged in, so we will not.');
					}
				}
				notifyOnline();
			})
			.catch(err => {
				handleConnectError(err);
			});
	}

	/**
	 * Log in to server.
	 * @param {String} username username
	 * @param {String} password password
	 */
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

			notifyLoginStateChange({ user: res.user });
		}

		return res;
	}

	/**
	 * Log out from server.
	 */
	static async logout() {

		fetch('/api/user/logout')
			.then(res => {

				if (res.ok === true) {
					Server.setAuth(null);
					cookie.remove('token');

					notifyLoginStateChange({ user: null });
				}
				else {
					console.log('Unable to log out');
					console.log(res);
				}
			})
			.catch(err => {
				console.error(err);
			});
	}
	/*
				case 'name': query += `name = "${userData.name}", `; break;
				case 'display_name': query += `display_name = "${userData.display_name}", `; break;
				case 'role_key': query += `role_key = "${userData.role_key}", `; break;
				case 'password': query += `password = "${userData.password}", `; break;
				*/
	/**
	 * 
	 * @param {Object} profile Profile info.
	 * @param {String} [profile.name] Name
	 * @param {String} [profile.display_name] Display name
	 * @param {String} [profile.password] Password
	 */
	static async saveProfile(profile) {
		const res = await Server.postJson('/user/profile', profile);
		if (res.user) {
			notifyLoginStateChange({ user: res.user });
		}
		return res.user;
	}

	static setAuth = (newAuth) => {
		auth = newAuth;
	}

	/**
	 * @returns {Promise<Object>} user info
	 */
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

	static saveConfig = (cfg) => {
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

		return `/api/stream/${mediaItem.db_id}?clientId=${this_client_id}${forceHLS}&token=${auth}`;
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