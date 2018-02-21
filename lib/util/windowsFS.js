'use strict';

const Logger = require('../logger');
const childProcess = require('child_process');
const tableParser = require('table-parser');

const WMICcommand = 'wmic logicaldisk get caption';

class windowsFS {
	static getDriveLetters() {
		return new Promise((resolve, reject) => {
			childProcess.exec(WMICcommand, (err, stdout) => {
				if (err) {
					return reject(err);
				}
	
				const letters = tableParser.parse(stdout).map((caption) => {
					return caption.Caption[0].replace(':', '');
				});
	
				Logger.debug('Found drive letters: '+letters);
				resolve(letters);
			});
		});
	}
}

module.exports = windowsFS;