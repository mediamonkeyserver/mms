var serverInfo, serverInfoPromise;

class Server {
    static getInfo = () => {
        return new Promise((res, rej) => {
            if (serverInfo)
                res(serverInfo);

            fetch('/api').then((res) => {
                return res.json();
            }).then((json) => {
                serverInfo = json;
                res(serverInfo);
            });
        });
    }

}

export default Server;