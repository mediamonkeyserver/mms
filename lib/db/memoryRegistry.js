/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

const assert = require('assert');

const logger = require.main.require('./lib/logger');
const AbstractRegistry = require('./abstractRegistry');
const Node = require('../node');
const PathNormalizer = require('../util/pathNormalizer');
const TrackSorters = require('../util/trackSorters');


class MemoryRegistry extends AbstractRegistry {

	/**
	 *
	 */
	initialize(service, callback) {
		this._dbMap = {};
		this._uid_Map = {};
		this._count = 0;
		this._repositoryById = {};
		this._repositoryCount = 0;
		this._cache = {};

		super.initialize(service, callback);
	}

	/**
	 *
	 */
	clear(callback) {
		this._dbMap = {};
		this._uid_Map = {};
		this._count = 0;

		callback(null);
	}

	/**
	 *
	 */
	saveNode(node, modifiedProperties, callback) {
		this._dbMap[node.id] = node;
		if (node.attributes && node.attributes.uid)
			this._uid_Map[node.attributes.uid] = node;

		callback(null, node);
	}

	/**
	 *
	 */
	getNodeById(id, callback) {
		var node = this._dbMap[id];

		setImmediate(() => {
			callback(null, node);
		});
	}

	/**
	 *
	 */
	getNodeByUid(uid, callback) {
		var node = this._uid_Map[uid];

		setImmediate(() => {
			callback(null, node);
		});
	}

	_getTrackEntryFromNode(node, filter_fields) {
		var track = {};
		var attr = node.attributes;
		var contentPath = node.service.contentPath;
		track.streamURL = contentPath + node.id;
		for (var key in attr) {
			var addField = (key != 'ratings' /* already as rating there */);
			if (filter_fields)
				addField = (filter_fields.indexOf(key) >= 0);
			if (key == 'albumArts') {
				if (attr.albumArts.length) {
					var first = attr.albumArts[0];
					track.artworkURL = contentPath + node.id + '/' + first.contentHandlerKey + '/0';
				}
			} else {
				if (addField) {
					var at = attr[key];
					if (at && at != '' && at != [] && at != -1 /* like unrated*/)
						track[key] = attr[key];
				}
			}
		}
		return track;
	}

	_getCacheFor(key) {
		if (!this._cache[key])
			this._cache[key] = {};
		return this._cache[key];
	}

	_cleanCacheFor(keys) {	
		for (var key of keys)	
			this._cache[key] = {};		
	}

	getTracklist(params, callback) {
		
		var cache = this._getCacheFor('getTracklist');
		if (cache.params && JSON.stringify(cache.params) == JSON.stringify(params)) {			
			callback(cache.result);
			return;
		}

		var res = [];
		params = params || {};
		logger.verbose('Retrieving tracklist for collection id '+params.collectionID);		

		var dt = Date.now();
		var _log_point = function(name) {
			var s = Math.floor((Date.now() - dt));
			logger.verbose(name+ ' of ' + res.length + ' tracks took ' + s + ' milliseconds');
			dt = Date.now();
		}

		for (var id in this._dbMap) {
			var node = this._dbMap[id];
			if (node.isUpnpContainer == false) {
				var add = true;
				if (params.collectionID)
					if (node.attributes.collectionID != params.collectionID)
						add = false;
				if (add) {
					var filter_fields;
					if (params.filter && params.filter.fields)
						filter_fields = params.filter.fields;
					var track = this._getTrackEntryFromNode(node, filter_fields);
					res.push(track);
				}
			}
		}

		_log_point('Fetching');

		if (params.filters) {
			res = TrackSorters.filterTracks(res, params.filters);
		}

		_log_point('Filtering');

		logger.debug('Sorting by '+params.sort);
		var sortfn = TrackSorters.getSortFunc(params.sort || 'title');
		if (sortfn)
			res.sort(sortfn);
		else
			logger.warn('Undefined sorting');

		_log_point('Sorting');		

		cache.result = res;
		cache.params = params;
		callback(res);
	}

	/**
	 *
	 * @param {Node} node
	 * @param {Function} callback
	 */
	unregisterNode(node, callback) {
		assert(node instanceof Node, 'Invalid node parameter');
		assert(typeof(callback) === 'function', 'Invalid callback parameter');

		var id = node.id;
		if (!this._dbMap[id]) {
			return callback('Node not found');
		}

		delete this._dbMap[id];
		if (node.attributes && node.attributes.uid)
			delete this._uid_Map[node.attributes.uid];
		this._count--;

		callback();
	}

	/**
	 *
	 */
	allocateNodeId(node, callback) {
		var new_id;
		if (!node.isUpnpContainer) {
			var path = node.attributes.path;
			var pathHash = PathNormalizer.createHash(path); // create id based on path so that it is _persistent_ also after server restart
			var ext = PathNormalizer.getFileExt(path);
			new_id = pathHash + '.' + ext; // included file extension may speed up playback in some apps (no need to check MIME type)
			while (this._dbMap[new_id]) {
				// node with same id already exists, create unique
				pathHash = pathHash + 'X';
				new_id = pathHash + '.' + ext;
			}
			node._id = new_id;
		} else {
			var _hash = PathNormalizer.createHash;
			new_id = _hash(node.parentId + node.name);
			while (this._dbMap[new_id]) {
				// node with same id already exists, create unique
				new_id = _hash(new_id + 'X');
			}
			node._id = new_id;
			// note that for "root" the id is forced to 0 later in ContentDirectoryService._installRoot()  (UPNP ROOT must have id 0)
		}
		this._count++;

		callback();
	}

	registerRepository(repository, repositoryHashKey, callback) {
		repository._id = this._repositoryCount++;
		this._repositoryById[repository._id] = repository;

		callback(null, repository);
	}
}

module.exports = MemoryRegistry;
