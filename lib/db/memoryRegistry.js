/*jslint node: true, nomen: true, esversion: 6 */
"use strict";

const assert = require('assert');

const AbstractRegistry = require('./abstractRegistry');
const Node = require('../node');

//IT MUST START AT 0 because UPNP ROOT must have id 0
var nodeIndex = 10;

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

		super.initialize(service, callback);
	}

	/**
	 *
	 */
	keyFromString(key) {
		return parseInt(key, 10);
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

	getTracklist(params, callback) {
		var res = [];
		for (var key in this._uid_Map) {
			var node = this._uid_Map[key];
			if (node.isUpnpContainer == false) {
				var attr = node.attributes;
				var add = true;
				if (params && params.filter && params.filter.collectionID)
					if (attr.collectionID != params.filter.collectionID)
						add = false;
				if (add) {
					var track = {};
					var contentPath = node.service.contentPath;
					track.streamURL = contentPath + node.id;
					for (var key in attr) {
						var addField = (key != 'ratings' /* already as rating there */);
						if (params && params.filter && params.filter.fields)
							addField = (params.filter.fields.indexOf(key) >= 0);
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
					res.push(track);
				}
			}
		}
		callback(res);
	}

	/**
	 *
	 * @param {Node} node
	 * @param {Function} callback
	 */
	unregisterNode(node, callback) {
		assert(node instanceof Node, "Invalid node parameter");
		assert(typeof(callback) === "function", "Invalid callback parameter");

		var id = node.id;
		if (!this._dbMap[id]) {
			return callback("Node not found");
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
		node._id = nodeIndex++;
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
