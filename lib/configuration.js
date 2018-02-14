/*jslint node: true, sub:true, esversion: 6 */
"use strict";

const os = require('os');
const events = require('events');
const assert = require('assert');

function normPath(path) {
	return path.replace(/\\/g, '/'); // convert '\' -> '/'
}

var config = {
	serverName: 'MediaMonkey Server',
	collections: [
		{
			id: "1",
			name: "Music",
			type: "music",
			folders: [
				normPath(os.homedir()) + "/Music"
			]
		},
		{
			id: "2",
			name: "Video",
			type: 'movies',
			folders: [
				normPath(os.homedir()) + "/Video"
			]
		}
	]
}

var configObserver = new events.EventEmitter;
var configRegistry;
var _registryInitialized = false;

class Configuration {

	getBasicConfig() {
		return config;
	}

	getConfigObserver() {
		return configObserver;
	}

	setRegistry(registry, callback) {
		configRegistry = registry;
		configRegistry.getConfig(config, (err, _config) => {
			if (!err) {
				_registryInitialized = true;
				config = _config;
			}
			if (callback)
				callback(err);
		});
	}

	_saveToRegistry(config) {
		assert(_registryInitialized, "Registry not initialized! , setRegistry() not called?");
		configRegistry.putConfig(config);
	}

	saveConfig(cfg) {
		// TODO: Process all incoming structures
		config.serverName = cfg.serverName || config.serverName;
		configObserver.emit('change');
		this._saveToRegistry(config);
	}

	saveCollection(collection) {
		var orig = config.collections.find(col => col.id === collection.id);
		if (orig) {
			// type isn't editable
			orig.name = collection.name;
			orig.folders = collection.folders; // TODO: Scan these folders!
		} else {
			var last_id = 0;
			config.collections.forEach((x) => {
				if (x.id > last_id)
					last_id = x.id;
			});
			collection.id = String(++last_id);
			config.collections.push(collection);
		}
		configObserver.emit('change');
		configObserver.emit('collectionchange');
		this._saveToRegistry(config);
		return true;
	}

	deleteCollection(collection) {
		config.collections = config.collections.filter(col => col.id !== collection.id);
		configObserver.emit('change');
		configObserver.emit('collectionchange');
		this._saveToRegistry(config);
		return true;
	}
}

module.exports = new Configuration();