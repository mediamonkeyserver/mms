/*jslint node: true, esversion: 6 */
'use strict';

const debug = require('debug')('upnpserver:contentHandlers.Lyrics');
//const logger = require('../logger');

const ContentHandler = require('./contentHandler');

class Lyrics extends ContentHandler {

	get name() {
		return 'lyrics';
	}

	processRequest(node, request, response, path, parameters, callback) {

		var contentURL = node.contentURL;
		debug('processRequest', 'contentURL=', contentURL);

		response.status(200).end(node.attributes.lyrics, () => {
			callback(null, true);
		});

	}
}

module.exports = Lyrics;