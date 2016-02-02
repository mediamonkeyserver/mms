/*jslint node: true, nomen: true, esversion: 6 */
"use strict";

const AbstractRegistry = require('./abstractRegistry');

//IT MUST START AT 0 because UPNP ROOT must have id 0
var nodeIndex = 0;

class MemoryRegistry extends AbstractRegistry {

  /**
   * 
   */
  initialize(service, callback) {
    this._dbMap = {};
    this._count = 0;
    this._repositoryById={};
    this._repositoryCount=0;

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

  /**
   * 
   */
  unregisterNode(node, callback) {
    var id = node.id;
    delete this._dbMap[id];
    this._count--;

    return callback(null);
  }

  /**
   * 
   */
  allocateNodeId(node, callback) {
    node._id=nodeIndex++;
    this._count++;
   
    callback();
  }

  registerRepository(repository, repositoryHashKey, callback) {
    repository._id=this._repositoryCount++;
    this._repositoryById[repository._id]=repository;
    
    callback(null, repository);
  }
}

module.exports = MemoryRegistry;