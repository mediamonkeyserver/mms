/*jslint node: true, esversion: 6 */
'use strict';

const PathNormalizer = require('../util/pathNormalizer');
//const debug = require('debug')('upnpserver:contentHandlers.Images');
//const logger = require('../logger');

const ContentHandler = require('./contentHandler');

class Images extends ContentHandler {

	get name() {
		return 'images';
	}

	processRequest(node, request, response, path, parameters, callback) {

		var key = parameters[0];

		var image;
		for (var art of node.attributes.albumArts)
			if (art.key == key)
				image = art;

		if (!image) {
			let error = new Error('Invalid image parameter (' + parameters + ')');
			error.request = request;
			return callback(error, false);
		}

		var trackPath = node.contentURL.path;

		var dir = PathNormalizer.getFileFolder(trackPath);
		var imagePath = dir + (image.path || 'folder.jpg');
		var service = node.service;

		service.sendContentURL({
			contentURL: service.newURL(imagePath),
			//size: image.size,
			//mimeType: image.mimeType
		}, request, response, callback);
	}
}

module.exports = Images;