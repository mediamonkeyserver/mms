import PubSub from 'pubsub-js';

var serverInfo, serverInfoPromise;

class Server {
	static fetchJson = (path, options) => {
		return new Promise((res, rej) => {
			fetch('/api' + path, options).then((result) => {
				return result.json();
			}).then((json) => {
				res(json);
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
		return fetch('/api'+path, options);
	}

	static deleteJson = (path, json, options) => {
		options = options || {};
		options.method = options.method || 'DELETE';
		return Server.postJson(path, json, options);
	}

	static getInfo = () => {
		return new Promise((res, rej) => {
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
}

export default Server;