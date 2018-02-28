/*jslint node: true, esversion: 6 */
'use strict';

const crypto = require('crypto');

const mm = require('music-metadata');
const Mime = require('mime');

const debug = require('debug')('upnpserver:contentHandlers:Musicmetadata');

const logger = require('../logger');
const ContentHandler = require('./contentHandler');

class Audio_MusicMetadata extends ContentHandler {

	/**
	 *
	 */
	get name() {
		return 'musicMetadata';
	}

	/**
	 *
	 */
	prepareMetas(contentInfos, context, callback) {

		debug('Prepare', contentInfos);

		var contentURL = contentInfos.contentURL;

		logger.verbose('Reading metadata of ' + contentURL.path);

		var parsing = true;

		try {
			debug('Start musicMetadata contentURL=', contentURL);
			// mm(stream, {
			// 	duration: true
			// 	// fileSize : stats.size

			// }, (error, tags) => {
			mm.parseFile(contentURL.path, { duration: true }).then((metadata) => {
				var tags = metadata.common;

				parsing = false;

				debug('Parsed musicMetadata contentURL=', contentURL, 'tags=', tags);

				if (!tags) {
					logger.error('MM does not support: ' + contentURL);
					return callback();
				}

				var metas = {};

				metas['duration'] = metadata.format.duration;

				['title', 'album'].forEach((n) => {
					if (tags[n]) {
						metas[n] = tags[n];
					}
				});

				metas.albumArtists = [tags.albumartist];
				metas.artists = normalize(tags.artists);
				metas.genres = normalize(tags.genre);

				if (tags.year) {
					metas.year = tags.year && parseInt(tags.year, 10);
				}

				var track = tags.track;
				if (track) {
					if (typeof (track.no) === 'number' && track.no) {
						metas.originalTrackNumber = track.no;

						if (typeof (track.of) === 'number' && track.of) {
							metas.trackOf = track.of;
						}
					}
				}

				var disk = tags.disk;
				if (disk) {
					if (typeof (disk.no) === 'number' && disk.no) {
						metas.originalDiscNumber = disk.no;

						if (typeof (disk.of) === 'number' && disk.of) {
							metas.diskOf = disk.of;
						}
					}
				}

				if (tags.picture) {
					var as = [];
					var res = [{}];

					var index = 0;
					tags.picture.forEach((picture) => {
						var mimeType = Mime.lookup(picture.format);

						var key = index++;

						if (!mimeType) {
							return;
						}

						if (!mimeType.indexOf('image/')) {

							var hash = computeHash(picture.data);

							as.push({
								contentHandlerKey: this.name,
								mimeType: mimeType,
								size: picture.data.length,
								hash: hash,
								key: key
							});
							return;
						}

						res.push({
							contentHandlerKey: this.name,
							mimeType: mimeType,
							size: picture.data.length,
							key: key
						});

					});

					if (as.length) {
						metas.albumArts = as;
					}
					if (res.length > 1) {
						metas.res = res;
					}
				}

				callback(null, metas);
			}).catch((error) => {
				logger.error('Music metadata parsing error: ' + error + ' (' + contentURL.path + ')');
				callback();
			});
		} catch (x) {
			if (parsing) {
				logger.error('Catch ', x, x.stack);

				logger.error('MM: Parsing exception contentURL=' + contentURL, x);
				return callback();
			}
			logger.error('Catch ', x, x.stack);

			throw x;
		}
	}

	/**
	 *
	 */
	processRequest(node, request, response, path, parameters, callback) {

		var albumArtKey = parseInt(parameters[0], 10);
		if (isNaN(albumArtKey) || albumArtKey < 0) {
			let error = new Error('Invalid albumArtKey parameter (' + parameters + ')');
			error.node = node;
			error.request = request;

			return callback(error, false);
		}

		var contentURL = node.contentURL;
		// console.log("Get stream of " + node, node.attributes);

		this._getPicture(node, contentURL, albumArtKey, (error, picture) => {

			if (!picture.format || !picture.data) {
				let error = new Error('Invalid picture for node #' + node.id + ' key=' + albumArtKey);
				error.node = node;
				error.request = request;

				return callback(error, false);
			}

			response.setHeader('Content-Type', picture.format);
			response.setHeader('Content-Size', picture.data.length);

			response.end(picture.data, () => callback(null, true));
		});
	}

	_getPicture(node, contentURL, pictureIndex, callback) {

		logger.verbose('Getting picture for ' + contentURL.path);

		mm.parseFile(contentURL.path, { duration: true }).then((metadata) => {
			if (metadata.common.picture && metadata.common.picture.length > pictureIndex)
				callback(null, metadata.common.picture[pictureIndex]);
			else
				logger.error('Cannot find picture index ' + pictureIndex);
		}).catch((err) => {
			logger.error('Reading picture: ' + err);
		});
	}
}

function normalize(strs) {
	var r = [];
	if (!strs || !strs.length) {
		return undefined;
	}
	strs.forEach((str) => str.split(',').forEach(
		(tok) =>
			r.push(tok.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()).trim())
	));
	return r;
}

function computeHash(buffer) {
	var shasum = crypto.createHash('sha1');
	shasum.update(buffer);

	return shasum.digest('hex');
}

module.exports = Audio_MusicMetadata;
