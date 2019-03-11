/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

const assert = require('assert');

const AbstractRegistry = require('./abstractRegistry');
const Node = require('../node');
const PathNormalizer = require('../util/pathNormalizer');

class MemoryRegistry extends AbstractRegistry {

	/**
	 *
	 */
	initialize(callback) {
		this._dbMap = {};		
		this._count = 0;
		this._repositoryById = {};
		this._repositoryCount = 0;		

		super.initialize(callback);
	}

	/**
	 *
	 */
	clear(callback) {
		this._dbMap = {};		
		this._count = 0;

		callback(null);
	}

	/**
	 *
	 */
	saveNode(node, modifiedProperties, callback) {		
		this._dbMap[node.id] = node;
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
	
	_fileIsInFolders(f, folders) {
		if (!folders)
			return true;
		for (var fld of folders)
			if (f.path.startsWith(fld))
				return true;
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
