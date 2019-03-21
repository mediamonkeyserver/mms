// @ts-check

class sysUI {
	static setServerURL(URL) {
		serverURL = URL;
	}

	static installTrayIcon() {
		if (process.platform == 'win32') {
			// Windows specific code to install the tray icon
			const WindowsTrayicon = require('windows-trayicon');
			const opn = require('opn');
			const pubsub = require('pubsub-js');

			pubsub.subscribe('APP_END', () => {
				mmsTray.exit();
			});

			const mmsTray = new WindowsTrayicon({
				title: 'MediaMonkey Server',
				icon: 'icon/mm.ico',
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
						pubsub.publishSync('APP_END', null);
					}
				}

			});
		}
	}
}

var serverURL = 'http://localhost:3000';


module.exports = sysUI;