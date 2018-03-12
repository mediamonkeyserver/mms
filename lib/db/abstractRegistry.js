/*jslint node: true, esversion: 6 */
"use strict";

const debug = require('debug')('upnpserver:db:abstractRegistry');
const Cacher = require('../cacher');

class AbstractRegistry extends Cacher {

  /**
   * 
   */
  keyFromString(key) {
    return key;
  }

  /**
   * 
   */
  initialize(service, callback) {
    this._service = service;
    return callback(null);
  }

  /**
   * 
   */
  registerNode(node, callback) {
    this.saveNode(node, null, callback);
  }

  getMetas(path, topic, callback) {
    callback(null);
  }
  
  putMetas(path, topic, metas, callback) {
    callback(null);
  }

  getPlaylists(parent_guid, callback) {
    callback(null);
  }

  getConfig(config, callback) {
    callback('not implemented in used registry class', config);
  }
  
  putConfig(config, callback) {
    if (callback)
      callback('not implemented in used registry class');
  }

}

module.exports = AbstractRegistry;
