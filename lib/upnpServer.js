// @ts-check
'use strict';

// @ts-ignore
var jstoxml = require('jstoxml');
var Async = require('async');
var events = require('events');
const { v4: uuidv4 } = require('uuid');
var Path = require('path');
var send = require('send');
var debugFactory = require('debug');
var debug = debugFactory('upnpserver:server');
var debugProfiling = debugFactory('upnpserver:profiling');
var debugRequest = debugFactory('upnpserver:request');
const fs = require('fs');
const Auth = require('./auth');

var logger = require('./logger');
var xmlFilters = require('./util/xmlFilters');
var Xmlns = require('./xmlns');

var ContentDirectoryService = require('./contentDirectoryService');
var ConnectionManagerService = require('./connectionManagerService');
var MediaReceiverRegistrarService = require('./mediaReceiverRegistrarService');

var DEFAULT_LANGUAGE = 'en';

class UpnpServer extends events.EventEmitter {
	constructor(port, _configuration, callback) {
		super();

		var configuration = Object.assign({}, _configuration);
		this.configuration = configuration;

		var lang = configuration.lang || process.env.LANG || DEFAULT_LANGUAGE;

		var langPart = /^([a-z][a-z])/i.exec(lang);
		try {
			configuration.i18n = require('./i18n/' + langPart[1].toLowerCase());

		} catch (e) {
			// if localization is not supported, trying to use english by default
			configuration.i18n = require('./i18n/' + DEFAULT_LANGUAGE);
		}

		if (configuration.logActivity) {
			var logDate = Date.now();
			var ws = ' '.repeat(80);
			var stdout = process.stdout;

			this.logActivity = (message) => {
				var now = Date.now();
				if (logDate + 250 > now) {
					return;
				}

				logDate = now;
				message = message.slice(0, 80);
				stdout.write(message);
				stdout.write(ws.substring(message.length));
				stdout.write('\r');
			};
		}

		this.dlnaSupport = (configuration.dlnaSupport !== false);
		this.microsoftSupport = (configuration.microsoftSupport !== false);

		// @ts-ignore
		this.packageDescription = require('../package.json');

		this.name = configuration.name || 'Node UPNP Server';
		this.uuid = configuration.uuid || uuidv4();
		if (this.uuid.indexOf('uuid:') !== 0) {
			this.uuid = 'uuid:' + this.uuid;
		}

		this.serverName = configuration.serverName;

		if (!this.serverName) {
			var ns = [
				'Node/' + process.versions.node, 'UPnP/1.0',
				'UPnPServer/' + this.packageDescription.version
			];

			if (this.dlnaSupport) {
				ns.push('DLNADOC/1.50');
			}

			this.serverName = ns.join(' ');
		}

		this.port = port;
		// this.externalIp = this.GetIp(); // The machine can have multiple IPs ! (IPv4/IPv6/ ...)
		this.services = {};
		this.type = 'urn:schemas-upnp-org:device:MediaServer:1';

		if (!configuration.services) {
			configuration.services = [
				new ConnectionManagerService(),
				new ContentDirectoryService(configuration)
			];

			if (this.microsoftSupport && this.dlnaSupport) {
				configuration.services.push(new MediaReceiverRegistrarService());
			}
		}

		Async.each(configuration.services, (service, callback) => {
			this.addService(service, callback);

		}, (error) => {
			if (error) {
				return callback(error);
			}
			callback(null, this);
		});
	}

	/**
	 *
	 * @param {Object[]}
	 *            repositories
	 * @param {Function}
	 *            callback
	 * @deprecated
	 */
	setRepositories(repositories, callback) {
		this.addRepositories(repositories, callback);
	}

	addRepositories(repositories, callback) {
		this.services['cds'].addRepositories(repositories, callback);
	}

	addService(service, callback) {

		service.initialize(this, (error) => {
			if (error) {
				return callback(error);
			}

			this.services[service.route] = service;

			this.emit('newService', service);

			callback(null, service);
		});

	}

	toJXML(request, callback) {
		var localhost = request.myHostname;
		var localport = request.socket.localPort;

		var serviceList = [];

		for (var route in this.services) {
			var service = this.services[route];

			serviceList.push(service.serviceToJXml());
		}

		var xml = {
			_name: 'root',
			_attrs: {
				xmlns: Xmlns.UPNP_DEVICE,
				// attempt to make windows media player to "recognise this device"
			},
			_content: {
				specVersion: {
					major: 1,
					minor: 0
				},
				device: {
					deviceType: 'urn:schemas-upnp-org:device:MediaServer:1',
					friendlyName: this.name,
					manufacturer: 'Ventis Media, Inc.', //this.packageDescription.author, // LS: author contained HTML tag <name> which caused that this server was not seen by WMP
					manufacturerURL: 'https://mediamonkey.com/',
					modelDescription: 'MediaMonkey Server for all your audio/video needs',
					modelName: 'MediaMonkey sync capable server', // LS: modelName is used for detecting "sync capability" in MM5
					modelURL: 'https://mediamonkey.com/syncserver',
					modelNumber: this.packageDescription.version,
					serialNumber: '1.0',
					UDN: this.uuid,
					presentationURL: 'http://' + localhost + ':' + localport + '/index.html',

					iconList: [{
						_name: 'icon',
						_content: {
							mimetype: 'image/png',
							width: 48,
							height: 48,
							depth: 24,
							url: '/icons/icon_48.png'
						}
					}, {
						_name: 'icon',
						_content: {
							mimetype: 'image/png',
							width: 120,
							height: 120,
							depth: 24,
							url: '/icons/icon_120.png'
						}
					}],

					serviceList: serviceList
				}
			}
		};

		if (this.microsoftSupport) {
			// attempt to make windows media player to "recognise this device"
			/* // LS: commented out, not needed for the WMP support, the reason for not recognizing was that <manufacturer> had <name> as subnode
			xml._attrs["xmlns:pnpx"] = Xmlns.MICROSOFT_WINDOWS_PNPX;
			xml._attrs["xmlns:df"] = Xmlns.MICROSFT_DEVICE_FOUNDATION;
			xml._content.device["pnpx:X_deviceCategory"] = "MediaDevices";
			xml._content.device["df:X_deviceCategory"] = "Multimedia";
			xml._content.device.modelName = "Windows Media Connect compatible (" + xml._content.device.modelName + ")";
            */
		}

		if (this.dlnaSupport) {
			xml._attrs['xmlns:dlna'] = Xmlns.DLNA_DEVICE;
			xml._content.device['dlna:X_DLNACAP'] = '';
			xml._content.device['dlna:X_DLNADOC'] = 'DMS-1.50';
			// ??? xml._content.device["dlna:X_DLNADOC"] = "M-DMS-1.50";
		}

		// @ts-ignore  // TODO: Is this correct? To be investigated, why 'secDlnaSupport' is here.
		if (this.secDlnaSupport) {
			// see https://github.com/nmaier/simpleDLNA/blob/master/server/Resources/description.xml
			xml._attrs['xmlns:sec'] = Xmlns.SEC_DLNA;
			xml._content.device['sec:ProductCap'] = 'smi,DCM10,getMediaInfo.sec,getCaptionInfo.sec';
			xml._content.device['sec:X_ProductCap'] = 'smi,DCM10,getMediaInfo.sec,getCaptionInfo.sec';
		}

		return callback(null, xml);
	}

	processRequest(request, response, path, callback) {

		if (!Auth.isRequestAllowed(request, response))
			return;

		var now;
		if (debugProfiling.enabled) {
			now = Date.now();
		}

		var localhost = request.socket.localAddress;
		if (localhost === '::1') {
			// We transform IPv6 local host to IPv4 local host
			localhost = '127.0.0.1';

		} else {
			var ip6 = /::ffff:(.*)+/.exec(localhost);
			if (ip6) {
				localhost = ip6[1];

				// Transform IPv6 IP address to IPv4
			}
		}

		request.myHostname = localhost;

		response.setHeader('Server', this.serverName);

		// Replace any // by /, split and remove first empty segment
		var reg = /\/?([^/]+)?(\/.*)?/.exec(path);
		if (!reg) {
			return callback('Invalid path (' + path + ')');
		}
		var segment = reg[1];
		var action = reg[2] && reg[2].slice(1);

		if (debugRequest.enabled) {
			debugRequest('Request=', path, 'from=', request.connection.remoteAddress, 'segment=', segment, 'action=',
				action);
		}

		if (!segment)
			segment = '';

		var fileName;

		switch (segment) {
			case '':
				response.redirect('/web');
				return;

			case 'index.html':
				debugRequest('Index request');

				response.writeHead(200, {
					'Content-Type': 'text/html'
				});
				var body = '<html><head><title>' + this.name + '</title></head><body><h1>' + this.name + '</h1></body></html>';
				response.end(body, 'utf-8', (error) => {
					if (error) {
						logger.error(error);
					}
				});
				return;

			// Server Web UI
			case 'web':
				if (!action)
					action = 'index.html';
				fileName = Path.join(__dirname, '..', 'build-webui', action);
				fs.access(fileName, (err) => {
					if (err)
						response.sendFile(Path.join(__dirname, '..', 'build-webui', 'index.html')); // Send index.html so that client side rendering can take of the url
					else
						response.sendFile(fileName);
				});
				return;

			case 'description.xml':
			case 'devicedescription.xml':
				debugRequest('Description request');

				this.toJXML(request, (error, xmlObject) => {
					if (error) {
						logger.error(error);
						return callback(error);
					}

					var xml = jstoxml.toXML(xmlObject, {
						header: true,
						indent: ' ',
						filter: xmlFilters
					});

					debug('Descript Path request: returns:', xml);

					// logger.verbose("Request description path: " + xml);
					response.writeHead(200, {
						'Content-Type': 'text/xml; charset="utf-8"'
					});

					response.end(xml, 'UTF-8');
					callback(null, true);
				});
				return;

			case 'icons':
				var iconPath = action.replace(/\.\./g, '').replace(/\\/g, '').replace(
					/\//g, '');

				debugRequest('Icons request path=', iconPath);

				var dir = __dirname;
				dir = dir.substring(0, dir.lastIndexOf(Path.sep));

				iconPath = dir + ('/icon/' + iconPath).replace(/\//g, Path.sep);

				debug('Send icon', iconPath);

				send(request, iconPath).pipe(response);
				return callback(null, true);
		}

		if (this.dlnaSupport) {
			// Thanks to smolleyes for theses lines
			response.setHeader('transferMode.dlna.org', 'Streaming');
			response.setHeader('contentFeatures.dlna.org',
				'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000');
		}

		var service = this.services[segment];

		if (service) {
			//auth.noAuthorize(request, response, () => {});
			if (!Auth.isLocalRequest(request) && !request.user) {
				// We allow only LAN UPnP, or loged-in remote requests
				logger.trace('upnpServer: Not local request');
				response.status(401).end();
				return callback(null, false);
			}

			service.processRequest(request, response, action, (error, found) => {
				if (error) {
					return callback(error);
				}

				if (debugProfiling.enabled) {
					debugProfiling('Profiling ' + (Date.now() - now) + 'ms');
				}

				callback(null, found);
			});
			return;
		}

		callback(null, false);
	}
}

module.exports = UpnpServer;

