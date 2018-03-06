/*jslint node: true, esversion: 6 */
"use strict";

const assert = require('assert');
const Async = require('async');
const Path = require('path');

const debug = require('debug')('upnpserver:repositories:Playlist');
const logger = require('../logger');

const Repository = require('./repository');
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
    return "playlist";
  }

  /**
   * 
   */
  browse(list, node, options, callback) {
    assert(node instanceof Node, "Invalid node parameter");
    assert.equal(typeof (callback), "function", "Invalid callback parameter");

    debug("browse", "Browse of #", node.id, "path=", node.path, "mountPath=", this.mountPath);

    if (node.path.indexOf(this.mountPath) !== 0) {
      return callback();
    }

    var _this = this;
    var registry = node.service.nodeRegistry;
    if (node.hasChildren && !registry.getItemContentChanged(node.guid)) {
      callback(null);
    } else {
      node.removeChildren(()=> {
        registry.getPlaylists(node.guid, (error, playlists, tracks) => {
          _this._addPlaylists(node, playlists, () => {
            _this._addTracks(node, tracks, callback);
          });
        });
      });
    }
    
  }

  _addPlaylists(node, playlists, callback) {

    var _this = this;
    var list = playlists || [];
    var _processItem = function (idx) {
      if (idx >= list.length)
        callback();
      else {
        var element = list[idx];
        var guid = element.guid;
        _this.newVirtualContainer(node, element.name, "object.container.playlistContainer", (error, newNode) => {
          newNode.guid = guid;
          _processItem(idx + 1);
        });
      }
    }
    _processItem(0);
  }

  _addTracks(node, tracks, callback) {

    var _this = this;
    var list = tracks || [];
    var _processItem = function (idx) {
      if (idx >= list.length)
        callback();
      else {
        var id = node.service.nodeRegistry._getNodeIdForFile( list[idx]);
        node.service.getNodeById(id, (err, trackNode) => {
          if (!err && trackNode)
            _this.newNodeRef(node, trackNode, () => { _processItem(idx + 1); });
          else
            _processItem(idx + 1);
        });
      }
    }
    _processItem(0);
  }

}

module.exports = PlaylistRepository;
