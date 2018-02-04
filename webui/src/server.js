var serverInfo, serverInfoPromise;

class Server {
    static fetchJson = (path) => {
        return new Promise((res, rej) => {
            fetch(path).then((result) => {
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

            Server.fetchJson('/api').then( json => {
                serverInfo = json;
                res(serverInfo);
            });
        });
    }

    static getFolderList = (path) => {
        return Server.fetchJson('/api/folders?path='+path);
    }

}

export default Server;