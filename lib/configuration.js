/*jslint node: true, sub:true, esversion: 6 */
'use strict';

const os = require('os');
const events = require('events');
const assert = require('assert');
const path = require('path');

function normPath(path) {
	return path.replace(/\\/g, '/'); // convert '\' -> '/'
}

var config = {
	serverName: 'MediaMonkey Server',
	collections: [{
		id: '1',
		name: 'Music',
		type: 'music',
		folders: [
			normPath(os.homedir()) + '/Music'
		]
	},
	{
		id: '2',
		name: 'Video',
		type: 'movies',
		folders: [
			normPath(os.homedir()) + '/Video'
		]
	}
	]
};

var configObserver = new events.EventEmitter;
var _registry;
var _registryInitialized = false;

class Configuration {

	getBasicConfig() {
		return config;
	}

	getConfigObserver() {
		return configObserver;
	}

	getRegistry() {
		assert(_registryInitialized, 'Registry not initialized! , setRegistry() not called?');
		return _registry;
	}

	setRegistry(registry, callback) {
		_registry = registry;
		_registry.getConfig(config, (err, _config) => {
			if (!err) {
				_registryInitialized = true;
				config = _config;
			}
			if (callback)
				callback(err);
		});
	}

	_saveToRegistry(config, callback) {
		this.getRegistry().putConfig(config, callback);
	}

	saveConfig(cfg) {
		// TODO: Process all incoming structures
		config.serverName = cfg.serverName || config.serverName;
		this._saveToRegistry(config, () => {
			configObserver.emit('change');
		});
	}

	saveCollection(collection) {
		var orig = config.collections.find(col => col.id === collection.id);
		var operation;
		if (orig) {
			// type isn't editable
			orig.name = collection.name;
			orig.folders = collection.folders;
			operation = 'changed';
		} else {
			var last_id = 0;
			config.collections.forEach((x) => {
				if (x.id > last_id)
					last_id = x.id;
			});
			collection.id = String(++last_id);
			config.collections.push(collection);
			operation = 'added';
		}
		this._saveToRegistry(config, () => {
			configObserver.emit('change');
			configObserver.emit('collectionchange', operation, collection, config.collections);
		});
		return true;
	}

	deleteCollection(collection) {
		config.collections = config.collections.filter(col => col.id !== collection.id);
		this._saveToRegistry(config, () => {
			configObserver.emit('change');
			configObserver.emit('collectionchange', 'removed', collection, config.collections);
		});
		return true;
	}

	getTempFolder() {
		return path.join(os.tmpdir(), 'mms');
	}
}

module.exports = new Configuration();