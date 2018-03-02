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

	_getFilteredFileEntry(file, filter_fields) {
		var cache = this._getCacheFor('filteredFileEntry');
		if (cache.entries && cache.entries[file.db_id] && (cache.filter_fields == JSON.stringify(filter_fields)))
			return cache.entries[file.db_id];
		else {
			var entry = {};
			var node_id = this._getNodeIdForFile(file);
			var contentPath = this._service.contentPath;
			entry.streamURL = contentPath + node_id;
			if (file.albumArts && file.albumArts.length)
				entry.artworkURL = contentPath + node_id + '/' + file.albumArts[0].contentHandlerKey + '/0';

			for (var key in file) {
				var addField = (key != 'ratings' /* already as rating there */ && key != 'albumArts' /* already as artworkURL*/);
				if (filter_fields)
					addField = (filter_fields.indexOf(key) >= 0);
				if (addField) {
					var at = file[key];
					if (at && at != '' && at != [] && at != -1 /* like unrated*/)
						entry[key] = file[key];
				}
			}
			cache.entries = cache.entries || {};
			cache.entries[file.db_id] = entry;
			cache.filter_fields = JSON.stringify(filter_fields);
			return entry;
		}
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

	_fileIsInFolders(f, folders) {
		if (!folders)
			return true;
		for (var fld of folders)
			if (f.path.startsWith(fld))
				return true;
	}

	getTracklist(params, callback) {
		
		var cache = this._getCacheFor('getTracklist');
		if (cache.params && JSON.stringify(cache.params) == JSON.stringify(params)) {			
			callback(cache.result);
			return;
		}

		var res = [];
		params = params || {};			

		var dt = Date.now();
		var _log_point = function(name, item_count) {
			var s = Math.floor((Date.now() - dt));
			logger.verbose(name+ ' of ' + item_count + ' tracks took ' + s + ' milliseconds');
			dt = Date.now();
		};

		this.getFiles((err, files) => {

			_log_point('Fetching', files.length);
			
			for (var f of files) {				
				if (this._fileIsInFolders(f, params.folders)) {
					var filter_fields;
					if (params.filter && params.filter.fields)
						filter_fields = params.filter.fields;
					var track = this._getFilteredFileEntry(f, filter_fields);
					res.push(track);					
				}				
			}

			_log_point('Processing', res.length);

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

			cache.result = res;
			cache.params = params;
			callback(res);
		});
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

	_getNodeIdForFile(file, link_id) {
		var ext = PathNormalizer.getFileExt(file.path);
		assert(file.db_id, 'db_id missing for ' + file.path); // create id based on database id so that it is _persistent_ also after server restart
		if (!link_id)
			return file.db_id + '.' + ext; // included file extension may speed up playback in some apps (no need to check MIME type)
		else
			return file.db_id + '_link' + link_id + '.' + ext;
	}
	
	allocateNodeId(node, callback) {

		if (!node.isUpnpContainer) {			
			node._id = this._getNodeIdForFile(node.attributes);
			var link_id = 1;
			while (this._dbMap[node._id]) {
				// node with same id already exists, create unique
				// this can happed for "linked" nodes - i.e. another node instance of the same track created via Node.createRef()
				node._id = this._getNodeIdForFile(node.attributes, link_id);
				link_id++;
			}
		} else {
			// note that for "root" the id is forced to 0 later in ContentDirectoryService._installRoot()  (UPNP ROOT must have id 0)
			var _hash = PathNormalizer.createHash;
			node._id = _hash(node.parentId + node.name);
			while (this._dbMap[node._id]) {
				// node with same id already exists, create unique
				node._id = _hash(node._id + 'X');
			}			
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
