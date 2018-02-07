var serverInfo, serverInfoPromise;

class Server {
	static fetchJson = (path) => {
		return new Promise((res, rej) => {
			fetch('/api' + path).then((result) => {
				return result.json();
			}).then((json) => {
				res(json);
			});
		});
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

	static getFolderList = (path) => {
		return Server.fetchJson('/folders?path=' + path);
	}

	static getCollections = () => {
		return Server.fetchJson('/collections');
	}

}

export default Server;