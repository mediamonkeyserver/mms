// @ts-check
'use strict';

const os = require('os');
const events = require('events');
const assert = require('assert');
const Path = require('path');
const PathNormalizer = require('./util/pathNormalizer');
const fs = require('fs');
const Uuid = require('uuid');

function normPath(path) {
	return path.replace(/\\/g, '/'); // convert '\' -> '/'
}

var config = {
	serverName: 'MediaMonkey Server',
	httpPort: 10222,
	httpsPort: 10223,
	extHttpsPort: 10223,
	extAccess: false,
	performNAT: true,
	keyPemFile: '',
	certPemFile: '',
	serverUdn: Uuid.v4(),
	collections: [{
		id: 1,
		name: 'Music',
		type: 'music',
		folders: [
			normPath(os.homedir()) + '/Music'
		]
	},
	{
		id: 2,
		name: 'Video',
		type: 'movies',
		folders: [
			normPath(os.homedir()) + '/Videos'
		]
	}
	],
};

//Quick memory cache of userById to save from constantly pestering database
var userCache = {};

var configObserver = new events.EventEmitter;
var _registry;
var _registryInitialized = false;
var _configDataDirectory = os.homedir() + '/MediaMonkeyServer';

class Configuration {

	getBasicConfig() {
		return config;
	}

	getPublicConfig() {
		var res = {};
		for (var key in config) {
			if (key != 'private')
				res[key] = config[key];
		}
		return res;
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
							this.saveConfig();
						} else
							callback(err, config);
					} else {
						if (!data.length) {
							callback(null, config); // config file is empty
						} else {
							var _config = JSON.parse(data);
							for (var key in _config)
								config[key] = _config[key];

							if (!_config.serverUdn) {
								// server udn was not present previously, make it persistent
								this.saveConfig();
							}
							callback(null, config);
						}
					}
				});
			}
		});
	}
	
	/**
	 * @returns {import('./db/sqlRegistry')} registry
	 */
	getRegistry() {
		// @ts-ignore
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
	
	/**
	 * Save configuration to database.
	 * @param {Configuration|Object} [cfg] Modified configuration object to save.
	 * @param {boolean} [skipPrivate] Whether to skip cfg.private when saving.
	 */
	saveConfig(cfg, skipPrivate) {

		if (cfg) {
			if (skipPrivate)
				cfg.private = undefined;
			for (var key in config) {
				if (cfg[key] !== undefined)
					config[key] = cfg[key];
			}
		}

		this._saveToJSON(config, () => {
			this._saveToRegistry(config, () => {
				configObserver.emit('change');
			});
		});
	}
	
	/**
	 * 
	 * @param {import('./DataStructures').Collection} collection collection
	 * @returns {Boolean} success
	 */
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
	
	/**
	 * Rescans a collection of specified id.
	 * @param {Number} idCollection Collection id
	 */
	rescanCollection(idCollection) {
		const collection = config.collections.find(col => col.id === idCollection);
		if (!collection)
			return false;

		configObserver.emit('collectionchange', 'changed', collection, config.collections);
	}
	
	/**
	 * Deletes collection of specified id.
	 * @param {import('./DataStructures').Collection} collection Object that contains collection id
	 */
	deleteCollection(collection) {
		config.collections = config.collections.filter(col => col.id !== collection.id);
		this._saveToRegistry(config, () => {
			configObserver.emit('change');
			configObserver.emit('collectionchange', 'removed', collection, config.collections);
		});
		return true;
	}
	
	/**
	 * Gets path of program temp folder.
	 * @returns {string} temp folder path
	 */
	getTempFolder() {
		return Path.join(os.tmpdir(), 'mms');
	}
	
	/**
	 * Gets user info from given username
	 * @param {String} username Username
	 * @returns {import('./DataStructures').User} User object
	 */
	getUserByName(username){
		
		if (typeof username == 'string') {
			return this.getRegistry().getUserByName(username);
		}
		else {
			return null;
		}
	}
	
	/**
	 * Gets user info from given ID
	 * @param {String} userId ID of user
	 * @returns {import('./DataStructures').User} User object
	 */
	getUserById(userId){
		
		if (typeof userId == 'string') {
			
			if (userCache[userId]) return userCache[userId];
			else {
				var user = this.getRegistry().getUserById(userId);
				//Add user's role to user object, for ease in other functions
				if (user) user.role = this.getRole(user.role_key);
				//Add user to memory cache
				userCache[userId] = user;
				
				return user;
			}
		}
		else {
			return null;
		}
	}
	
	/**
	 * Update properties of a user with given ID
	 * @param {String} userId ID of user
	 * @param {Object} update Items of the user that should be updated
	 * @returns {import('./DataStructures').RunResult}
	 */
	updateUser(userId, update) {
		
		if (typeof userId == 'string' && typeof update == 'object') {
			
			var info = this.getRegistry().updateUser(userId, update);
			//Wipe userCache
			userCache = {};
			
			return info;
		}
		else {
			return null;
		}
	}
	
	/**
	 * @param {String} key Role key
	 * @returns {import('./DataStructures').Role} Role object
	 */
	getRole(key) {
		
		if (typeof key == 'string') {
			return this.getRegistry().getRole(key);
		}
		else {
			return null;
		}
	}
	
	/**
	 * Gets all roles in db, in order.
	 * @returns {Array<import('./DataStructures').Role>} Roles 
	 */
	getRoles() {
		
		return this.getRegistry().getRoles();
	}
}

module.exports = new Configuration();