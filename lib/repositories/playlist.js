/*jslint node: true, esversion: 6 */
'use strict';

const assert = require('assert');
const Async = require('async');
//const Path = require('path');

const debug = require('debug')('upnpserver:repositories:Playlist');
//const logger = require('../logger');

//const Repository = require('./repository');
const PathRepository = require('./path');
const Node = require('../node');


class PlaylistRepository extends PathRepository {

	/**
	 * 
	 */
	constructor(mountPath, configuration) {

		super(mountPath, configuration);
	}

	get type() {
		return 'playlist';
	}

	/**
	 * 
	 */
	browse(list, node, options, callback) {
		assert(node instanceof Node, 'Invalid node parameter');
		assert.equal(typeof (callback), 'function', 'Invalid callback parameter');

		debug('browse', 'Browse of #', node.id, 'path=', node.path, 'mountPath=', this.mountPath);

		if (node.path.indexOf(this.mountPath) !== 0) {
			return callback();
		}

		var _this = this;
		var registry = node.service.nodeRegistry;
		if (node.hasChildren && !registry.getItemContentChanged(node.guid)) {
			callback(null);
		} else {
			node.removeChildren(() => {
				registry.getPlaylistContent(node.guid, (error, playlists, tracks) => {
					_this._addPlaylists(node, playlists, () => {
						_this._addTracks(node, tracks, callback);
					});
				});
			});
		}

	}

	_addPlaylists(node, playlists, callback) {
		var list = playlists || [];
		Async.eachSeries(list,
			(item, cbk) => {
				var guid = item.guid;
				this.newVirtualContainer(node, item.name, 'object.container.playlistContainer', (error, newNode) => {
					newNode.guid = guid;
					cbk();
				});
			}, callback);
	}

	_addTracks(node, tracks, callback) {
		var list = tracks || [];
		Async.eachSeries(list,
			(item, cbk) => {
				var id = node.service.nodeRegistry._getNodeIdForFile(item);
				node.service.getNodeById(id, (err, trackNode) => {
					if (!err && trackNode)
						this.newNodeRef(node, trackNode, () => {
							cbk();
						});
					else
						cbk();
				});
			}, callback);
	}

}

module.exports = PlaylistRepository;