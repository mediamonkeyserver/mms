/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

const logger = require('./logger');
const Cacher = require('./cacher');
const TrackSorters = require('./util/trackSorters');
const PathNormalizer = require('./util/pathNormalizer');
const Configuration = require('./configuration');
const Async = require('async');
const os = require('os');
const assert = require('assert');

const Transcoder = require('./transcoder');


class MediaProvider extends Cacher {

	constructor() {
		super();
		this.registry = undefined;
	}

	setRegistry(registry) {
		this.registry = registry;
	}

	_getFilePresentationEntry(file, filter_fields) {
		// this creates filtered UI file presentation entry:
		// 1) with specified fields (in filter_fields param like ['title','album'])
		// 2) filters unknown fields (empty string, empty array, null values)
		// 3) including valid streamURL and artworkURL

		var cache = this.registry._getCacheFor('filteredFileEntry');
		if (cache.entries && cache.entries[file.db_id] && (cache.filter_fields == JSON.stringify(filter_fields)))
			return cache.entries[file.db_id];
		else {
			var entry = {};
			var resources = this._getResources(file);
			entry.resources = resources;
			// LS: following entries for streamURL and artworkURL to be deprecated - as they are already in the resources
			entry.streamURL = resources.media[0].path;
			if (resources.images && resources.images.length)
				entry.artworkURL = resources.images[0].path;

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

		var cache = this.registry._getCacheFor('getTracklist');
		if (cache.params && JSON.stringify(cache.params) == JSON.stringify(params)) {
			_getFinalEntries(cache.prepared_list);
			return;
		}

		var searchPhrase;
		if (params.search && params.search.trim().length) {
			searchPhrase = this.registry.validateFTS(params.search);
			if (searchPhrase.length && searchPhrase[0] != '"' && searchPhrase[searchPhrase.length - 1] != '*')
				searchPhrase = searchPhrase + '*'; // to search prefixes
		}

		this.registry.getFilesBy({
			searchPhrase: searchPhrase
		}, (err, files) => {

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

	_cleanUpExpiredUploadSessions() {
		var keys = Object.keys(this._uploadSessions);
		for (var key of keys) {
			var age = (Date.now() - this._uploadSessions[key].lastActivity);
			var expired = (age > 60 * 60 * 1000); // 1 hour old session without any activity
			if (expired)
				delete this._uploadSessions[key];
		}
	}

	createUploadSession(request, response) {

		var content = request.body;

		var path = PathNormalizer.normalize(content.path);
		logger.info('createUploadSession: ' + path);

		var _proceed = () => {
			var sessionID = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 6);

			this._uploadSessions = this._uploadSessions || {};
			this._cleanUpExpiredUploadSessions();
			this._uploadSessions[sessionID] = {
				path: path,
				metas: content.metas, // optional
				lastActivity: Date.now()
			};

			response.writeHead(200, 'OK');
			response.end(sessionID);
		};

		var _checkConflict = () => {
			var sp = content.source_path;
			if (sp && PathNormalizer.compare(sp, path)) {
				var service = this.registry._service;
				var contentURL = service.newURL(content.source_path);
				contentURL.stat((error) => {
					if (error) {
						_proceed(); // source file is not accessible for us, we can proceed with upload
					} else {
						// we can access the source path (on the same PC or on the same network)
						// so we cannot proceed with upload (as it would result in copying file to itself!)
						logger.info('createUploadSession: source=dest conflict: ' + path);
						response.writeHead(409, 'Conflict');
						response.end('source_path accessible');
					}
				});
			} else {
				_proceed();
			}
		};

		if (content.sync_id) {
			this.registry.getFile({
				sync_id: content.sync_id
			}, (err, file) => {
				if (!err && file)
					path = file.path; // file already exists, ensure that the current path of the file is the upload location
				else
					path = this._getFullPath(path);
				_checkConflict();
			});
		} else {
			path = this._getFullPath(path);
			_checkConflict();
		}
	}

	_getFullPath(path) {
		var mt = PathNormalizer.getMime(path);
		return PathNormalizer.removeLastSlash(this.getDefaultFolderForMime(mt)) + path;
	}

	processUpload(upload_id, request, response) {

		var _failure = function (error_description) {
			logger.error(error_description);
			response.writeHead(400, 'Bad Request');
			response.end(error_description);
		};

		var _success = function (data) {
			response.writeHead(200, 'OK');
			var s = JSON.stringify(data);
			logger.info(s);
			response.end(s);
		};

		var session = this._uploadSessions[upload_id];
		if (!session)
			_failure('Upload id ' + upload_id + ' not found');
		session.lastActivity = Date.now();

		var path = session.path;
		var service = this.registry._service;
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

					if (endBytes == totalBytes || endBytes == totalBytes - 1) { // LS: this is the last upload part, scan the file:

						var mt = PathNormalizer.getMime(path);
						if (mt && (mt.startsWith('audio') || mt.startsWith('video'))) {
							var repository = service.getRepositoryForPath(session.path);
							service.insertFile(path, repository, session.metas, (err, attributes) => {
								if (err)
									_success({
										status: 'uploaded',
										error: 'scan error: ' + err,
										path: path
									});
								else {
									this._addPath2Collection(path);
									_success({
										status: 'uploaded',
										sync_id: attributes.sync_id,
										title: attributes.title,
										path: path
									});
								}
							});
						} else {
							_success({
								status: 'uploaded',
								error: 'scan error: ' + ' unsupported mime type: ' + mt,
								path: path
							});
						}
						delete this._uploadSessions[upload_id];
					} else {
						_success({
							status: 'uploaded partially',
							bytes: {
								uploaded: uploaded_len,
								start: startBytes,
								end: endBytes,
								total: totalBytes
							},
							upload_id: upload_id,
							path: path
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
			var playlist = request.body;
		} catch (e) {
			return _failure('Failure to parse JSON: ' + e);
		}

		var missingIds = [];
		var trackDBIds = [];
		Async.eachSeries(playlist.track_ids, (track_id, cbk) => {
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
				if (playlist.batch) {
					this._last_playlist_batch = this._last_playlist_batch || {};
					if (this._last_playlist_batch.guid == playlist.guid) {
						if ((this._last_playlist_batch.to + 1) == playlist.batch.from) {
							this._last_playlist_batch.trackDBIds = this._last_playlist_batch.trackDBIds.concat(trackDBIds);
							this._last_playlist_batch.from = playlist.batch.from;
							this._last_playlist_batch.to = playlist.batch.to;
						} else {
							return _failure('Batch mismatch: expected from: ' + (this._last_playlist_batch.to + 1) + ', was from: ' + playlist.batch.from + ', playlist name: ' + playlist.name + ' , guid: ' + playlist.guid);
						}
					} else {
						this._last_playlist_batch = {
							guid: playlist.guid,
							from: playlist.batch.from,
							to: playlist.batch.to,
							trackDBIds: trackDBIds
						};
					}

					if (playlist.batch.isFinal) {
						playlist.track_ids = this._last_playlist_batch.trackDBIds;
						this.registry.putPlaylist(playlist, this.registry._service, (err) => {
							if (err) {
								_failure(err);
							} else {
								response.writeHead(200, 'OK');
								response.end();
							}
						});
					} else {
						// batch accepted
						response.writeHead(200, 'OK');
						response.end();
					}
				} else {
					_failure('Batch info is missing');
				}
			} else {
				_failure('Not updated, some tracks are missing: [' + missingIds.join(', ') + '] ' + ', playlist name: ' + playlist.name + ' , guid: ' + playlist.guid);
			}
		});
	}

	_getResources(file) {
		var resources = {
			media: [],
			images: []
		};
		var node_id = this.registry._getNodeIdForFile(file);
		var contentPath = this.registry._service.contentPath;
		var _createRes = (path /*, mime, size*/ ) => {
			return {
				path: path
				// mime, size // TODO ?
			};
		};
		resources.media.push(_createRes('/api/stream/' + file.db_id + '.' + PathNormalizer.getFileExt(file.path)));
		resources.media.push(_createRes(contentPath + node_id));

		if (file.albumArts && file.albumArts.length) {
			for (var img of file.albumArts) {
				resources.images.push(_createRes(contentPath + node_id + '/' + img.contentHandlerKey + '/' + img.key));
			}
		}

		return resources;
	}

	getResources(params, callback) {
		if (!(params.db_id || params.sync_id))
			return callback('Either db_id or sync_id needs to be specified!');
		else {
			this.registry.getFile({
				id: params.db_id,
				sync_id: params.sync_id
			}, (err, file) => {
				if (err)
					callback(err);
				else {
					var resources = this._getResources(file);
					callback(null, resources);
				}
			});
		}
	}

	processImages(params, callback) {

		if (!(params.db_id || params.sync_id))
			return callback('Either db_id or sync_id needs to be specified!');
		else {
			this.registry.getFile({
				id: params.db_id,
				sync_id: params.sync_id
			}, (err, file) => {
				if (err)
					callback(err);
				else {
					
					var metas = {};
					if (file.albumArts)
						file.albumArts = file.albumArts.filter(img => img.contentHandlerKey != 'images');
					else
						file.albumArts = [];
					metas.albumArts = file.albumArts;
					
					for (var img of params.images) {
						var mt = img.mimeType || PathNormalizer.getMime(img.path);
						metas.albumArts.push({
							contentHandlerKey: 'images',
							path: PathNormalizer.normalize(img.path),
							mimeType: mt,
							key: metas.albumArts.length
						});
					}
					
					this.updateMetas(file, metas, (err) => {
						if (err)
							callback(err);
						else
							callback(null, {
								status: 'updated',
								sync_id: file.sync_id,
								title: file.title,
								db_id: file.db_id
							});
					});
				}
			});
		}
	}

	processUpdate(request, response) {

		var _failure = function (error_description) {
			logger.error('error: ' + error_description + ' body: ' + request.body);
			response.writeHead(400, 'Bad Request');
			response.end('error: ' + error_description);
		};

		var _success = function (data) {
			response.writeHead(200, 'OK');
			var s = JSON.stringify(data);
			logger.info(s);
			response.end(s);
		};

		try {
			var metas = request.body;
		} catch (e) {
			return _failure('Failure to parse JSON: ' + e);
		}

		if (!(metas.db_id || metas.sync_id))
			return _failure('Either db_id or sync_id needs to be specified!');
		else {
			this.registry.getFile({
				id: metas.db_id,
				sync_id: metas.sync_id
			}, (err, file) => {
				if (err)
					_failure(err);
				else {
					this.updateMetas(file, metas, (err) => {
						if (err)
							_failure(err);
						else
							_success({
								status: 'updated',
								sync_id: file.sync_id,
								title: file.title,
								db_id: file.db_id
							});
					});
				}
			});
		}
	}

	updateMetas(file, new_metas, callback) {
		this.registry.getMetas(file.path, null, (error, metas) => {
			if (error)
				callback('Old metadata fetch has failed:' + error);
			else {
				var node_id = this.registry._getNodeIdForFile(file);
				this.registry._service.getNodeById(node_id, (error, node) => {

					// merge the old metas with new metas:
					if (new_metas.rating)
						new_metas.ratings = [{
							rating: new_metas.rating,
							type: 'userRating'
						}];

					for (var key in new_metas) {
						if (metas)
							metas[key] = new_metas[key];
						if (node)
							node.attributes[key] = new_metas[key];
					}

					if (!metas)
						metas = new_metas;

					// update the new metas into database:
					this.registry.putMetas(file.path, null, metas, (error) => {
						if (error) {
							callback('Update failed, reason: ' + error);
						} else {
							callback(null);
						}
					});
				});
			}
		});
	}

	getStreamInfo(file_id, request, response) {
		this.registry.getFile({
			id: file_id
		}, (err, file) => {
			if (err) {
				response.status(400).json({
					error: err
				});
			}

			Transcoder.getStreamInfo(file, request).then(info => {
				response.json(info);
			}).catch(err => {
				response.status(400).json({
					error: err
				});
			});
		});
	}

	getFileStream(file_id, request, response, callback) {
		var service = this.registry._service;
		this.registry.getFile({
			id: file_id
		}, (err, file) => {

			if (err) {
				if (callback)
					callback(err);
				return;
			}

			var _success = () => {
				if (callback)
					callback(null /*no error*/ , true /* processed*/ ); // processed param needed for the _processRequest in api.js
			};

			var clientId = request.params.clientId || request.ip;
			Transcoder.cancelRunningForClient(clientId);

			Transcoder.convert(service.newURL(file.path), file, request).then((transcoder) => {
				if (transcoder) {

					transcoder.clientId = clientId;
					service.sendContentStream({
						stream: transcoder.outStream,
						size: transcoder.streamSize,
						duration: file.duration,
						mimeType: transcoder.mimeType,
					}, request, response, _success);

				} else {

					// No transcoding is necessary, just send the file directly
					service.sendContentURL({
						contentURL: service.newURL(file.path),
						size: file.size,
						mimeType: file.mimeType
					}, request, response, _success);
				}
			});

		});
	}

	_assignImages(metas, images) {
		metas.albumArts = [];
		for (var img of images) {
			var linked_images_index = 0;
			if (img.path) {
				// linked image file
				var mt = img.mimeType || PathNormalizer.getMime(img.path);
				metas.albumArts.push({
					contentHandlerKey: 'images',
					path: PathNormalizer.normalize(img.path),
					mimeType: mt,
					key: linked_images_index
				});
				linked_images_index++;
			} else
			if (img.tagIndex >= 0) {
				// image embedded in the file tag
				metas.albumArts.push({
					contentHandlerKey: 'musicMetadata',
					mimeType: img.mimeType,
					key: img.tagIndex
				});
			}
		}
	}

	_connectFile(item, callback) {

		var service = this.registry._service;
		var paths = [];
		var _path;
		var _stats;
		var _error;
		paths.push(item.path);
		if (item.path.startsWith('\\\\') && item.metas) { // it is UNC path, check alternate locations and compare based on file size
			var s = item.path.substr(2);
			s = s.substr(s.indexOf('\\') + 1);
			s = PathNormalizer.normalize(s);
			// try some common locations at first:
			paths.push('/volume1/' + s); // '\\NAS\music\...' mapped to '/volume1/music/...'  (on Synology, Linux)
			paths.push('/var/services/' + s); // '\\NAS\music\...' mapped to '/var/services/music/...'  (on Synology)
			paths.push('/mnt/' + s); // '\\NAS\share\...' mapped to '/mnt/share/...'  (mount points on Linux)
			for (var _idx of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
				paths.push('/HD' + _idx + '_DATA/' + s); // '\\NAS\music\...' mapped to '/HDC_DATA/music/...'  (on QNAP)	
			for (var _idx2 of ['0', '1', '2', '3'])
				paths.push('/MD' + _idx2 + '_DATA/' + s); // '\\NAS\music\...' mapped to '/MD0_DATA/music/...'  (MirrorDisk RAID1 -- on QNAP)
			for (var _idx3 of ['0', '1', '2', '3'])
				paths.push('/CACHEDEV' + _idx3 + '_DATA/' + s); // '\\NAS\music\...' mapped to '/CACHEDEV1_DATA/music/...'  (RAID5/6 array -- on QNAP)						

			var mt = PathNormalizer.getMime(item.path);
			if (mt) {
				// try user configured folders (when common locations failed):
				var fld = this.getDefaultFolderForMime(mt);
				paths.push(fld + s.substr(s.indexOf('/'))); // '\\NAS\music\...' mapped to user configured music collection folder
			}
		}

		Async.eachSeries(paths, (path, next) => {
			if (_path && !_error) {
				next(); // we have already succeded with the last path, skip the rest
			} else {
				var contentURL = service.newURL(path);
				contentURL.stat((error, stats) => {
					if (_path)
						logger.debug('MediaProvider._connectFile: mapping (' + item.path + ' --> ' + path + '), err: ' + error);

					if (!_path || (_error && !error && stats.size == item.metas.size)) { // take the original path (or the alternate if succeeded)
						_path = path;
						_stats = stats;
						_error = error;
					}
					next();
				});
			}
		}, () => {
			callback(_error, _stats, _path);
		});

	}

	scan(content, justCheckAccess, callback) {

		var service = this.registry._service;
		var results = [];
		Async.eachSeries(content, (item, next) => {
			this._connectFile(item, (error, stats, path) => {
				if (error) {
					logger.debug('MediaProvider.scan: File not found: ' + path); // don't report this as an error to log (MM5 is checking every file this way during sync to prevent from unnecessary upload)
					results.push({
						path: path,
						status: 'not_found',
						error: error
					});
					next();
				} else {
					if (justCheckAccess) {
						results.push({
							path: path,
							status: 'found',
							size: stats.size
						});
						next();
					} else {

						if (item.metas) { // optional, is read from file tag otherwise
							if (!item.metas.size)
								item.metas.size = stats.size;
							if (item.metas.images)
								this._assignImages(item.metas, item.metas.images);
						}

						this.registry.putMetas(path, null, item.metas, (err) => {
							if (err && item.metas) {
								results.push({
									path: path,
									status: 'failed_metadata_update',
									error: err,
									size: stats.size,
								});
								next();
							} else {
								var repository = service.getRepositoryForPath(path);
								service.insertFile(path, repository, item.metas, (err, attributes) => {
									if (err) {
										logger.debug('MediaProvider.scan: Failed scan: ' + path);
										results.push({ // a scan error occured
											path: path,
											status: 'failed_scan',
											error: err
										});
										next();
									} else {
										this._addPath2Collection(path);
										logger.debug('MediaProvider.scan: Added file: ' + path);
										results.push({
											path: path,
											status: 'success',
											sync_id: attributes.sync_id,
											size: stats.size,
										});
										next();
									}
								});
							}
						});
					}
				}
			});
		}, () => {
			callback(results);
		});
	}

	getDefaultFolderForMime(mt /*mime type*/ ) {
		var res;
		var col = this._getCollectionForMime(mt);
		if (col) {
			for (var fld of col.folders) {
				if (!fld.toLowerCase().endsWith('users')) { // users folder is not writeable, so we couldn't use it for uploading new files
					res = fld;
					break;
				}
			}
		}
		if (!res) {
			// when there is no collection (or no writeable folder in collection)
			if (mt.startsWith('audio'))
				res = PathNormalizer.normalize(os.homedir()) + '/Music';
			else
				res = PathNormalizer.normalize(os.homedir()) + '/Videos';
		}
		return res;
	}

	_getCollectionForMime(mt /*mime type*/ ) {
		var res;
		var config = Configuration.getBasicConfig();
		for (var col of config.collections) {
			if ((mt.startsWith('audio') && (col.type == 'music')) || (mt.startsWith('video') && (col.type == 'movies'))) {
				res = col;
				break;
			}
		}
		return res;
	}

	_addPath2Collection(path) {
		// check whether the path belongs to a configured folder in a collection
		var config = Configuration.getBasicConfig();
		var mt = PathNormalizer.getMime(path);
		var col = this._getCollectionForMime(mt);
		if (col) {
			var found = false;
			for (var i = 0; i < col.folders.length; i++) {
				var fld = col.folders[i];
				var common = PathNormalizer.getCommonPathsPart(path, fld);
				if (common.length > 3 /* to not take just 'C:\' as common */ ) {
					// there is a common path part with the already configured folder, use this common part
					found = true;
					var new_fld = PathNormalizer.removeLastSlash(common);
					if (new_fld != fld) {
						col.folders[i] = new_fld;
						Configuration._saveToRegistry(config);
					}
					break;
				}
			}
			if (!found) {
				// path is out of the configured folders, add the new folder to config
				var folder = PathNormalizer.getFileFolder(path);
				folder = PathNormalizer.removeLastSlash(folder);
				col.folders.push(folder);
				Configuration._saveToRegistry(config, () => {});
			}
		}
	}

	getContentChanges(token, callback) {
		this.registry.getContentChanges(token, (err, changes) => {
			if (err)
				callback(err);
			else
				this.registry.getFiles((err, files) => {

					var hashed_track_ids = {
						added: {},
						updated: {},
						deleted: []
					};
					var playlist_ids = {
						added: [],
						updated: [],
						deleted: []
					};
					for (var ch of changes) {
						if (ch.item_type == 'media')
							if (ch.item_oper == 'added' || ch.item_oper == 'updated') {
								assert(playlist_ids[ch.item_oper], 'structure not prepared for ' + ch.item_oper);
								hashed_track_ids[ch.item_oper][ch.item_sync_id] = true;
							} else
								hashed_track_ids.deleted.push(ch.item_sync_id);
						else {
							if (ch.item_type == 'playlist') {
								assert(playlist_ids[ch.item_oper], 'structure not prepared for ' + ch.item_oper);
								playlist_ids[ch.item_oper].push(ch.item_sync_id);
							}
						}
					}
					var tracks = {
						added: [],
						updated: [],
						deleted: []
					};
					for (var f of files) {
						if (hashed_track_ids.added[f.sync_id])
							tracks.added.push(this._getFilePresentationEntry(f));
						if (hashed_track_ids.updated[f.sync_id])
							tracks.updated.push(this._getFilePresentationEntry(f));
					}
					tracks.deleted = hashed_track_ids.deleted;

					// convert playlist ids to playlists:
					Async.eachSeries(['added', 'updated'], (oper, cbk) => {
						//2020-09-18 JL: getPlaylistsBy is now synchronous
						var playlists = this.registry.getPlaylistsBy({
							guidArray: playlist_ids[oper]
						});
						playlist_ids[oper] = playlists;
						cbk();
					}, (_err) => {
						callback(err || _err, {
							playlists: playlist_ids,
							tracks: tracks
						});
					});
				});
		});
	}

}

module.exports = new MediaProvider();