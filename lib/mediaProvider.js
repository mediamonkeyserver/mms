/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

const logger = require('./logger');
const Cacher = require('./cacher');
const TrackSorters = require('./util/trackSorters');
const PathNormalizer = require('./util/pathNormalizer');
const Async = require('async');


class MediaProvider extends Cacher {

	constructor(registry) {
		super();
		this.registry = registry;
	}

	_getFilePresentationEntry(file, filter_fields) {
		// this creates filtered UI file presentation entry:
		// 1) with specified fields (in filter_fields param like ['title','album'])
		// 2) filters unknown fields (empty string, empty array, null values)
		// 3) including valid streamURL and artworkURL

		var cache = this._getCacheFor('filteredFileEntry');
		if (cache.entries && cache.entries[file.db_id] && (cache.filter_fields == JSON.stringify(filter_fields)))
			return cache.entries[file.db_id];
		else {
			var entry = {};
			var node_id = this.registry._getNodeIdForFile(file);
			var contentPath = this.registry._service.contentPath;
			entry.streamURL = contentPath + node_id;
			//entry.streamURL = '/api/stream/' + file.db_id;
			if (file.albumArts && file.albumArts.length)
				entry.artworkURL = contentPath + node_id + '/' + file.albumArts[0].contentHandlerKey + '/0';

			for (var key in file) {
				var addField = (key != 'ratings' /* already as rating there */ && key != 'albumArts' /* already as artworkURL*/ );
				if (filter_fields)
					addField = (filter_fields.indexOf(key) >= 0);
				if (addField) {
					var at = file[key];
					if (at && at != '' && at != [] && at != -1 /* like unrated*/ )
						entry[key] = file[key];
				}
			}
			cache.entries = cache.entries || {};
			cache.entries[file.db_id] = entry;
			cache.filter_fields = JSON.stringify(filter_fields);
			return entry;
		}
	}

	_fileIsInFolders(f, folders) {
		if (!folders)
			return true;
		for (var fld of folders)
			if (f.path.startsWith(fld))
				return true;
	}

	getTracklist(params, callback) {

		params = params || {};
		var dt = Date.now();
		var _log_point = function (name, item_count) {
			var s = Math.floor((Date.now() - dt));
			logger.verbose(name + ' of ' + item_count + ' files took ' + s + ' milliseconds');
			dt = Date.now();
		};

		var filter_fields;
		if (params.filter && params.filter.fields)
			filter_fields = params.filter.fields;

		var _getFinalEntries = function (files) {
			var res = [];
			for (var i = 0; i < files.length; i++) {
				var f = files[i];
				if (!params.starting_index || (params.starting_index <= i))
					if (!params.requested_count || (params.starting_index + params.requested_count > i)) {
						var ff = this._getFilePresentationEntry(f, filter_fields);
						res.push(ff);
					}
			}
			_log_point('Final entries', res.length);
			callback(res);
		}.bind(this);

		var cache = this._getCacheFor('getTracklist');
		if (cache.params && JSON.stringify(cache.params) == JSON.stringify(params)) {
			_getFinalEntries(cache.prepared_list);
			return;
		}

		this.registry.getFiles((err, files) => {

			_log_point('Fetching', files.length);

			var res = [];
			for (var f of files) {
				if (this._fileIsInFolders(f, params.folders))
					res.push(f);
			}

			_log_point('Filtering by folders', res.length);

			if (params.filters) {
				res = TrackSorters.filterTracks(res, params.filters);
			}

			_log_point('Filtering', res.length);

			logger.debug('Sorting by ' + params.sort);
			var sortfn = TrackSorters.getSortFunc(params.sort || 'title');
			if (sortfn)
				res.sort(sortfn);
			else
				logger.warn('Undefined sorting');

			_log_point('Sorting', res.length);

			cache.prepared_list = res;
			cache.params = params;
			_getFinalEntries(res);
		});
	}

	createUploadSession(request, response) {

		var content = request.body;

		var path = PathNormalizer.normalize(content.path);
		logger.info('createUploadSession: ' + path);

		var sessionID = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 6);

		this._uploadSessions = this._uploadSessions || {};
		this._uploadSessions[sessionID] = {
			path: path,
			metas: content.metas
		};

		response.writeHead(200, 'OK');
		response.end(sessionID);
	}

	processUpload(upload_id, request, response) {

		var _failure = function (error_description) {
			logger.error(error_description);
			response.writeHead(400, 'Bad Request');
			response.end(error_description);
		};

		var session = this._uploadSessions[upload_id];
		if (!session)
			_failure('Upload id ' + upload_id + ' not found');

		var path = session.path;
		var service = this.registry._service;
		path = PathNormalizer.removeLastSlash(this.registry.getDefaultSyncLocation()) + path;
		var range = request.headers['content-range'];
		logger.info('File upload: ' + path + ', range: ' + range);

		var startBytes = 0;
		var endBytes = 0;
		var totalBytes = 0;
		var val = range && range.match(/^(?:bytes )?(\d+)-(\d+)\/(\d+|\*)$/);
		if (val) {
			startBytes = +val[1];
			endBytes = +val[2];
			totalBytes = val[3] === '*' ? Infinity : +val[3];
			//logger.info(startBytes + '-' + endBytes + '/' + totalBytes);
		}

		var uploaded_len = 0;
		var create_flags = 'w';
		if (startBytes > 0)
			create_flags = 'r+';
		var file = service.newURL(path);
		file.createWriteStream({
			flags: create_flags,
			start: startBytes
		}, (error, stream) => {
			if (error) {
				_failure('Stream creation error: ' + path + ', error: ' + error);
			} else {
				request.on('data', (data) => {
					uploaded_len += data.length;
					stream.write(data);
				});
				request.on('end', () => {
					stream.end(); // LS: to close handle to the file
					response.writeHead(200, 'OK');
					var s = 'Uploaded: ' + uploaded_len + ' bytes, upload_id: ' + upload_id;
					logger.info(s);
					response.end(s);
					if (endBytes == totalBytes || endBytes == totalBytes - 1) { // LS: this is the last upload part, re-scan the directory:
						var dir = path.substring(0, path.lastIndexOf('/'));
						var repository = service.getRepositoryForPath(session.path);
						service.rescanPath(dir, repository, (error) => {
							if (!error && session.metas) {
								service.updateMetas(path, session.metas, null, (error) => {
									if (error)
										logger.error(error);
									else
										logger.info('Successfuly updated metas for ' + path);
								});
							}
						});
					}
				});
			}
		});
	}

	processPlaylistUpload(request, response) {

		var _failure = function (error_description) {
			logger.error(error_description);
			response.writeHead(400, 'Bad Request');
			response.end(error_description);			
		};

		try {
			var content = request.body;
		} catch (e) {
			return _failure('Failure to parse JSON: ' + e);
		}

		var missingIds = [];
		var trackDBIds = [];
		Async.eachSeries(content.track_ids, (track_id, cbk) => {
			this.registry.getFile({
				sync_id: track_id
			}, (err, file) => {
				if (err)
					missingIds.push(track_id);
				else
					trackDBIds.push(file.db_id);
				cbk();
			});
		}, () => {
			if (missingIds.length == 0) {
				content.track_ids = trackDBIds;
				this.registry.putPlaylist(content, this.registry._service, (err) => {
					if (err) {
						_failure(err);
					} else {
						response.writeHead(200, 'OK');
						response.end();
					}
				});
			} else {
				_failure('Some tracks are missing: [' + missingIds.join(', ') + ']');
			}
		});
	}

	getFileStream(file_id, request, response) {
		var service = this.registry._service;
		this.registry.getFile({
			id: file_id
		}, (err, file) => {
			service.sendContentURL({
				contentURL: service.newURL(file.path),
				size: file.size,
				mimeType: file.mimeType
			}, request, response, () => {});
		});
	}

}

module.exports = MediaProvider;