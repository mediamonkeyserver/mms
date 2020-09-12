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
	 * @param {Collection} collection collection
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
	 * @param {Object} collection Object that contains collection id
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
	 * @returns {String} temp folder path
	 */
	getTempFolder() {
		return Path.join(os.tmpdir(), 'mms');
	}
	
	/**
	 * Gets user info from given username
	 * @param {String} username Username
	 * @returns {Promise<User>} User object
	 */
	getUserByName(username){
		let that = this;
		//Return promise to allow async/await
		return new Promise((resolve, reject) => {
			that.getRegistry().getUserByName(username, async (err, user) => {
				if (err) return reject(err);
				//Add user's role to user object, for ease in other functions
				if (user && user.role_key) user.role = await that.getRole(user.role_key);
				resolve(user);
			});
		});
	}
	
	/**
	 * Gets user info from given ID
	 * @param {String} userId ID of user
	 * @returns {Promise<User>} User object
	 */
	getUserById(userId){
		let that = this;
		//Return promise to allow async/await
		return new Promise((resolve, reject) => {
			//If user exists in the cache, resolve with that instead of bothering database
			if (userCache[userId]) resolve(userCache[userId]);
			else {
				that.getRegistry().getUserById(userId, async (err, user) => {
					if (err) return reject(err);
					//Add user's role to user object, for ease in other functions
					if (user) user.role = await that.getRole(user.role_key);
					//Add user to memory cache
					userCache[userId] = user;
					resolve(user);
				});
			}
		});
	}
	
	/**
	 * Update properties of a user with given ID
	 * @param {String} userId ID of user
	 * @param {Object} update Items of the user that should be updated
	 */
	updateUser(userId, update) {
		let that = this;
		//Return promise to allow async/await
		return new Promise((resolve, reject) => {
			that.getRegistry().updateUser(userId, update, (err, data) => {
				if (err) return reject(err);
				//Wipe userCache
				userCache = {};
				resolve(data);
			});
		});
	}
	
	/**
	 * @param {String} key Role key
	 * @returns {Promise<Role>} promise to return Role object
	 */
	getRole(key) {
		let that = this;
		//Return promise to allow async/await
		return new Promise((resolve, reject) => {
			that.getRegistry().getRole(key, (err, data) => {
				if (err) reject(err);
				else if(data) resolve(data);
			});
		});
	}
}

module.exports = new Configuration();

// eslint-disable-next-line no-unused-vars
class User{
	/**
	 * User object.
	 * @param {String} _id id
	 * @param {String} name name
	 * @param {String} display_name display name
	 * @param {String} password password
	 * @param {String} role_key role key
	 * @param {Role} role role
	 */
	constructor(_id,name,display_name,password,role_key,role) {
		this._id=_id;
		this.name=name;
		this.display_name=display_name;
		this.password=password;
		this.role_key=role_key;
		this.role=role;
	}
}

// eslint-disable-next-line no-unused-vars
class Role{
	/**
	 * Role object.
	 * @param {String} key role key
	 * @param {String} label label
	 * @param {Number} access_level access level
	 */
	constructor(key,label,access_level){
		this.key=key;
		this.label=label;
		this.access_level=access_level;
	}
}

// eslint-disable-next-line no-unused-vars
class Collection{
	/**
	 * Collection object.
	 * @param {Number} id id
	 * @param {String} name name
	 * @param {Array<String>} folders Folders in collection
	 * @param {String} type collection type
	 */
	constructor(id, name, folders, type) {
		this.id = id;
		this.name = name;
		this.folders = folders;
		this.type = type;
	}
}