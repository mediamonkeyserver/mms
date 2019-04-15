//@ts-check

'use strict';

const assert = require('assert');
const events = require('events');
const SSDP = require('node-ssdp');
const util = require('util');
const sysUI = require('./lib/sysUI');

const debug = require('debug')('upnpserver:api');
const logger = require('./lib/logger');

const UPNPServer = require('./lib/upnpServer');
const Repository = require('./lib/repositories/repository');
const Configuration = require('./lib/configuration');
const natUPnP = require('./lib/natUPnP');

const httpServer = require('./lib/httpServer');

class API extends events.EventEmitter {

	/**
	 * upnpserver API.
	 *
	 * @param {object} configuration
	 * @param {array} paths
	 *
	 * @constructor
	 */
	constructor(configuration, paths) {
		super();

		var config = Configuration.getBasicConfig();
		this.configuration = {
			'dlnaSupport': true,
			'httpPort': config.httpPort,
			'uuid': config.serverUdn,
			'name': config.serverName,
			// @ts-ignore
			'version': require('./package.json').version
		};
		this.configuration = Object.assign({}, this.configuration, configuration);

		this.repositories = [];
		this._upnpClasses = {};
		this._contentHandlers = [];
		this._contentProviders = {};
		this._contentHandlersKey = 0;

		sysUI.setServerURL(`http://localhost:${this.configuration.httpPort}`);

		if (typeof (paths) === 'string') {
			this.addDirectory('/', paths);

		} else if (util.isArray(paths)) {
			paths.forEach((path) => this.initPaths(path));
		}

		if (this.configuration.noDefaultConfig !== true) {
			// @ts-ignore
			this.loadConfiguration(require('./default-config.json'));
		}

		var cf = this.configuration.configurationFiles;
		if (typeof (cf) === 'string') {
			var toks = cf.split(',');
			toks.forEach((tok) => this.loadConfiguration(require(tok)));

		} else if (util.isArray(cf)) {
			cf.forEach((c) => this.loadConfiguration(require(c)));
		}
	}

	/**
	 * Initialize paths.
	 *
	 * @param {string|object} path
	 * @returns {Repository} the created repository
	 */
	initPaths(path) {
		if (typeof (path) === 'string') {
			return this.addDirectory('/', path);
		}
		if (typeof (path) === 'object') {
			if (path.type === 'video') {
				path.type = 'movie';
			}

			return this.declareRepository(path);
		}

		throw new Error('Invalid path \'' + util.inspect(path) + '\'');
	}

	/**
	 * Declare a repository
	 *
	 * @param {object} configuration
	 * @returns {Repository} the new repository
	 */
	declareRepository(configuration) {
		var config = Object.assign({}, configuration);

		var mountPath = config.mountPoint || config.mountPath || '/';

		var type = config.type;
		if (!type) {
			logger.error('Type is not specified, assume it is a \'directory\' type');
			type = 'directory';
		}

		var requirePath = configuration.require;
		if (!requirePath) {
			requirePath = './lib/repositories/' + type;
		}

		debug('declareRepository', 'requirePath=', requirePath, 'mountPath=', mountPath, 'config=', config);

		var clazz = require(requirePath);
		if (!clazz) {
			logger.error('Class of repository must be specified');
			return;
		}

		var repository = new clazz(mountPath, config);

		return this.addRepository(repository);
	}

	/**
	 * Add a repository.
	 *
	 * @param {Repository} repository
	 *
	 * @returns {Repository} a Repository object
	 */
	addRepository(repository) {
		assert(repository instanceof Repository, 'Invalid repository parameter \'' + repository + '\'');

		this.repositories.push(repository);

		return repository;
	}

	/**
	 * Add simple directory.
	 *
	 * @param {string} mountPath
	 * @param {string} path
	 * @param {Object} [configuration]
	 * @returns {Repository} a Repository object
	 */
	addDirectory(mountPath, path, configuration) {
		assert.equal(typeof (mountPath), 'string', 'Invalid mountPoint parameter \'' +
			mountPath + '\'');

		assert.equal(typeof (path), 'string', 'Invalid path parameter \'' + path + '\'');

		configuration = Object.assign({}, configuration, {
			mountPath,
			path,
			type: 'directory'
		});

		return this.declareRepository(configuration);
	}

	/**
	 * Add music directory.
	 *
	 * @param {string} mountPath
	 * @param {string} path
	 *
	 * @returns {Repository} a Repository object
	 */
	addMusicDirectory(mountPath, path, configuration) {
		assert.equal(typeof mountPath, 'string', 'Invalid mountPath parameter \'' +
			mountPath + '\'');
		assert.equal(typeof path, 'string', 'Invalid path parameter \'' + mountPath + '\'');

		configuration = Object.assign({}, configuration, {
			mountPath,
			path,
			type: 'music'
		});

		return this.declareRepository(configuration);
	}

	/**
	 * Add video directory.
	 *
	 * @param {string} mountPath
	 * @param {string} path
	 *
	 * @returns {Repository} a Repository object
	 */
	addVideoDirectory(mountPath, path, configuration) {
		assert.equal(typeof mountPath, 'string', 'Invalid mountPoint parameter \'' + mountPath + '\'');
		assert.equal(typeof path, 'string', 'Invalid path parameter \'' + path + '\'');

		configuration = Object.assign({}, configuration, {
			mountPath,
			path,
			type: 'movie'
		});

		return this.declareRepository(configuration);
	}

	/**
	 * Add history directory.
	 *
	 * @param {string} mountPath
	 *
	 * @returns {Repository} a Repository object
	 */
	addHistoryDirectory(mountPath, configuration) {
		assert.equal(typeof mountPath, 'string', 'Invalid mountPoint parameter \'' + mountPath + '\'');

		configuration = Object.assign({}, configuration, {
			mountPath,
			type: 'history'
		});

		return this.declareRepository(configuration);
	}

	/**
	 * Add iceCast.
	 *
	 * @param {string} mountPath
	 * @param {object} configuration
	 *
	 * @returns {Repository} a Repository object
	 */
	addIceCast(mountPath, configuration) {
		assert.equal(typeof mountPath, 'string', 'Invalid mountPoint parameter \'' +
			mountPath + '\'');

		configuration = Object.assign({}, configuration, {
			mountPath,
			type: 'iceCast'
		});

		return this.declareRepository(configuration);
	}

	/**
	 * Load a JSON configuration
	 *
	 * @param {object} config - JSON read from file
	 */
	loadConfiguration(config) {
		var upnpClasses = config.upnpClasses;
		if (upnpClasses) {
			for (var upnpClassName in upnpClasses) {
				// var p = upnpClasses[upnpClassName];

				// var clazz = require(p);
				var clazz = require(`./lib/class/${upnpClassName}`);

				this._upnpClasses[upnpClassName] = new clazz();
			}
		}

		var contentHandlers = config.contentHandlers;
		if (contentHandlers instanceof Array) {
			contentHandlers.forEach((contentHandler) => {

				var mimeTypes = contentHandler.mimeTypes || [];

				if (contentHandler.mimeType) {
					mimeTypes = mimeTypes.slice(0);
					mimeTypes.push(contentHandler.mimeType);
				}

				/*var requirePath = contentHandler.require;
				if (!requirePath) {
					requirePath = './lib/contentHandlers/' + contentHandler.type;
				}
				if (!requirePath) {
					logger.error('Require path is not defined !');
					return;
				}

				var clazz = require(requirePath);*/

				var clazz = require(`./lib/contentHandlers/${contentHandler.type}`);
				if (!clazz) {
					logger.error('Class of contentHandler must be specified');
					return;
				}

				var configuration = contentHandler.configuration || {};

				var ch = new clazz(configuration, mimeTypes);
				ch.priority = contentHandler.priority || 0;
				ch.mimeTypes = mimeTypes;

				this._contentHandlers.push(ch);
			});
		}

		var contentProviders = config.contentProviders;
		if (contentProviders instanceof Array) {
			contentProviders.forEach((contentProvider) => {
				var protocol = contentProvider.protocol;
				if (!protocol) {
					logger.error('Protocol property must be defined for contentProvider ' + contentProvider.id + '\'.');
					return;
				}
				if (protocol in this._contentProviders) {
					logger.error('Protocol \'' + protocol + '\' is already known');
					return;
				}

				var name = contentProvider.name || protocol;

				/*var requirePath = contentProvider.require;
				if (!requirePath) {
					var type = contentProvider.type || protocol;

					requirePath = './lib/contentProviders/' + type;
				}
				if (!requirePath) {
					logger.error('Require path is not defined !');
					return;
				}

				var clazz = require(requirePath);*/
				var clazz = require(`./lib/contentProviders/${contentProvider.type || protocol}`);
				if (!clazz) {
					logger.error('Class of contentHandler must be specified');
					return;
				}

				var configuration = Object.assign({}, contentProvider);

				var ch = new clazz(configuration, protocol);
				ch.protocol = protocol;
				ch.name = name;

				this._contentProviders[protocol] = ch;
			});
		}

		var repositories = config.repositories;
		if (repositories) {
			repositories.forEach((configuration) => this.declareRepository(configuration));
		}
	}

	/**
	 * Start server.
	 */
	start() {
		this.stop(() => {
			this.startServer();
		});
	}

	/**
	 * Start server callback.
	 *
	 * @return {UPNPServer}
	 */
	startServer(callback) {
		callback = callback || (() => { });

		debug('startServer', 'Start the server');

		var configuration = this.configuration;
		configuration.repositories = this.repositories;
		configuration.upnpClasses = this._upnpClasses;
		configuration.contentHandlers = this._contentHandlers;
		configuration.contentProviders = this._contentProviders;

		if (!callback) {
			callback = (error) => {
				if (error) {
					logger.error(error);
				}
			};
		}

		var upnpServer = new UPNPServer(configuration.httpPort, configuration, (error, upnpServer) => {
			if (error) {
				logger.error('Can not start UPNPServer', error);

				return callback(error);
			}

			debug('startServer', 'Server started ...');

			this._upnpServerStarted(upnpServer, callback);
		});

		return upnpServer;
	}

	/**
	 * After the server start.
	 *
	 * @param {object} upnpServer
	 */
	_upnpServerStarted(upnpServer, callback) {

		this.emit('starting');

		this.upnpServer = upnpServer;

		var config = {
			udn: this.upnpServer.uuid,
			location: {
				port: this.configuration.httpPort,
				path: '/DeviceDescription.xml'
			},
			sourcePort: 1900, // is needed for SSDP multicast to work correctly (issue #75 of node-ssdp)
			explicitSocketBind: true, // might be needed for multiple NICs (issue #34 of node-ssdp)
			ssdpSig: 'MediaMonkey UPnP/1.0 UPnPServer/' +
				// @ts-ignore
				require('./package.json').version
		};

		debug('_upnpServerStarted', 'New SSDP server config=', config);

		// @ts-ignore
		var ssdpServer = new SSDP.Server(config);
		this.ssdpServer = ssdpServer;

		ssdpServer.addUSN('upnp:rootdevice');
		ssdpServer.addUSN(upnpServer.type);

		var services = upnpServer.services;
		if (services) {
			for (var route in services) {
				ssdpServer.addUSN(services[route].type);
			}
		}

		natUPnP.initialize();

		httpServer.start(this.upnpServer, this.ssdpServer, () => {
			this._initUIConfigObserver(callback);
			callback();
		});
	}

	_initUIConfigObserver(callback) {
		var config = Configuration.getBasicConfig();
		this.upnpServer.name = config.serverName;
		var observer = Configuration.getConfigObserver();
		observer.on('change', () => {
			this.upnpServer.name = config.serverName;
		});
		callback();
	}

	/**
	 * Stop server.
	 *
	 * @param {function|undefined} callback
	 */
	async stop(callback) {
		debug('stop', 'Stopping ...');

		callback = callback || (() => {
			return false;
		});

		var ssdpServer = this.ssdpServer;

		if (this.ssdpServer) {
			this.ssdpServer = undefined;

			try {
				debug('stop', 'Stop ssdp server ...');

				ssdpServer.stop();

			} catch (error) {
				logger.error(error);
			}
		}

		await natUPnP.finish();

		httpServer.stop();

		debug('stop', 'Stopped');

		callback(null);
	}
}

module.exports = API;