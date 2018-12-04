class sysUI {
	static setServerURL(URL) {
		serverURL = URL;
	}

	static installTrayIcon() {
		if (process.platform == 'win32') {
			// Windows specific code to install the tray icon
			const WindowsTrayicon = require('windows-trayicon');
			const path = require('path');
			const opn = require('opn');

			const mmsTray = new WindowsTrayicon({
				title: 'MediaMonkey Server',
				icon: path.resolve(__dirname, '../icon/mm.ico'),
				menu: [
					{
						id: 'openMMS',
						caption: 'Open MediaMonkey Server'
					},
					{
						id: 'exit',
						caption: 'Exit'
					}
				]
			});

			mmsTray.item((id) => {
				switch (id) {
					case 'openMMS': {
						opn(serverURL);
						break;
					}
					// case 'item-2-id': {
					// 	mmsTray.balloon('Hello There!', 'This is my message to you').then(() => {
					// 	});
					// 	break;
					// }
					case 'exit': {
						mmsTray.exit();								
						//process.kill(process.pid, 'SIGINT'); // to be the same message as Ctrl+C in cmd, to stop the server before closing the process (#18)						 
						//break;

						// for some reason the process.kill() above does not emit the 'SIGINT' to be catched by process.on('SIGINT') in server.js
						// so we throw the 'SIGINT' exception here -- that is catched by process.on('uncaughtException') in server.js a handled
						throw 'SIGINT'; 						
					}
				}

			});
		}
	}
}

var serverURL = 'http://localhost:3000';


module.exports = sysUI;