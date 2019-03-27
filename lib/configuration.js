// @ts-check

'use strict';

const os = require('os');
const events = require('events');
const assert = require('assert');
const Path = require('path');
const PathNormalizer = require('./util/pathNormalizer');
const fs = require('fs');

function normPath(path) {
	return path.replace(/\\/g, '/'); // convert '\' -> '/'
}

var config = {
	serverName: 'MediaMonkey Server',
	httpPort: 10222,
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
			normPath(os.homedir()) + '/Videos'
		]
	},
	]
};

var configObserver = new events.EventEmitter;
var _registry;
var _registryInitialized = false;
var _configDataDirectory = os.homedir() + '/MediaMonkeyServer';

class Configuration {

	getBasicConfig() {
		return config;
	}

	getConfigObserver() {
		return configObserver;
	}

	setDataDir(dir) {
		_configDataDirectory = dir;
	}

	getDataDir(callback) {
		var dir = _configDataDirectory;
		PathNormalizer.makedir(dir, (err) => callback(err, dir));
	}

	loadConfig(callback) {
		this.getDataDir((err, dir) => {
			if (err)
				callback(err);
			else {
				var path = Path.join(dir, 'mms.json');
				fs.readFile(path, 'utf8', (err, data) => {
					if (err) {
						if (err.code == 'ENOENT') {
							callback(null, config); // config file doesn't exist yet
							this.saveConfig(config);
						} else
							callback(err, config);
					} else {
						if (!data.length) {
							callback(null, config); // config file is empty
						} else {
							var _config = JSON.parse(data);
							for (var key in _config)
								config[key] = _config[key];
							callback(null, config);
						}
					}
				});
			}
		});
	}

	getRegistry() {
		assert(_registryInitialized, 'Registry not initialized! , setRegistry() not called?');
		return _registry;
	}

	setRegistry(registry, callback) {
		_registry = registry;
		_registry.getConfig(config, (err) => {
			if (!err) {
				_registryInitialized = true;
			}
			if (callback)
				callback(err);
		});
	}

	_saveToRegistry(config, callback) {
		if (_registryInitialized)
			this.getRegistry().putConfig(config, callback);
		else
			callback();
	}

	_saveToJSON(config, callback) {
		// put the config to JSON file:
		this.getDataDir((err, dir) => {
			if (err)
				callback(err);
			else {
				var path = Path.join(dir, 'mms.json');
				var _configCopy = JSON.parse(JSON.stringify(config)); // to deep copy the object (in order to remove collections)
				_configCopy.collections = undefined; // collections are stored into DB
				fs.writeFile(path, JSON.stringify(_configCopy), 'utf8', callback);
			}
		});
	}

	saveConfig(cfg) {
		if (cfg) {
			for (var key in config) {
				if (cfg[key])
					config[key] = cfg[key];
			}
		}

		this._saveToJSON(config, () => {
			this._saveToRegistry(config, () => {
				configObserver.emit('change');
			});
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
			config.collections.push(collection);
			operation = 'added';
		}
		this._saveToRegistry(config, () => {
			configObserver.emit('change');
			configObserver.emit('collectionchange', operation, collection, config.collections);
		});
		return true;
	}

	rescanCollection(idCollection) {
		const collection = config.collections.find(col => col.id === idCollection);
		if (!collection)
			return false;

		configObserver.emit('collectionchange', 'changed', collection, config.collections);
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
		return Path.join(os.tmpdir(), 'mms');
	}
}

module.exports = new Configuration();