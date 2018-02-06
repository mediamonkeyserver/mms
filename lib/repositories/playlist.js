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

    if (node.hasChildren) {
      callback(null); // TODO: refresh
    } else {
      //node.childrenIds = [];
      node.service.getPlaylists(node.guid, (error, playlists) => {
        if (playlists && playlists.length) {
          var todo_count = playlists.length;
          playlists.forEach(element => {
            var guid = element.guid;
            this.newVirtualContainer(node, element.name, "object.container.playlistContainer", (error, playlistNode) => {
              playlistNode.guid = guid;
              list.push(playlistNode);
              todo_count--;
              if (todo_count == 0)
                callback(null/*, list*/);
            });
          });
        } else
          callback(null);
      });
    }
  }

}

module.exports = PlaylistRepository;
