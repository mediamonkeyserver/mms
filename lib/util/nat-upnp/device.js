const nat = require('../nat-upnp');
const needle = require('needle');
const url = require('url');
const fastXmlParser = require('fast-xml-parser');
const { Buffer } = require('buffer');

module.exports = class Device {
	constructor(url) {
		this._description = url;
		this._services = [
			'urn:schemas-upnp-org:service:WANIPConnection:1',
			'urn:schemas-upnp-org:service:WANPPPConnection:1'
		];
	}
	static create(url) {
		return new Device(url);
	}
	_getXml(url, callback) {
		let once = false;
		const respond = (err, body) => {
			if (once) return;
			once = true;

			callback(err, body);
		}

		needle.get(url, { parse: false }, (err, res, body) => {
			if (err) return callback(err);

			if (res.statusCode !== 200) {
				return respond(Error('Failed to lookup device description'));
			}

			try {
				if (fastXmlParser.validate(body) === true) {
					respond(null, fastXmlParser.parse(body).root);
				} else {
					return respond(new Error('XML Parse error'));
				}
			} catch (err) {
				return respond(err);
			}
		});
	}
	getService(types, callback) {
		this._getXml(this._description, (err, info) => {
			if (err) return callback(err);

			const s = this.parseDescription(info).services
				.filter((service) => types.includes(service.serviceType));

			if (s.length === 0 || !s[0].controlURL || !s[0].SCPDURL) {
				return callback(Error('Service not found'));
			}

			const base = url.parse(info.baseURL || this._description);
			const prefix = (u) => {
				const uri = url.parse(u);

				uri.host = uri.host || base.host;
				uri.protocol = uri.protocol || base.protocol;

				return url.format(uri);
			}

			callback(null, {
				service: s[0].serviceType,
				SCPDURL: prefix(s[0].SCPDURL),
				controlURL: prefix(s[0].controlURL)
			});
		});
	}
	parseDescription(info) {
		const services = [];
		const devices = [];

		const toArray = (item) => {
			return Array.isArray(item) ? item : [item];
		};

		const traverseServices = (service) => {
			if (!service) return;
			services.push(service);
		}

		const traverseDevices = (device) => {
			if (!device) return;
			devices.push(device);

			if (device.deviceList && device.deviceList.device) {
				toArray(device.deviceList.device).forEach(traverseDevices);
			}

			if (device.serviceList && device.serviceList.service) {
				toArray(device.serviceList.service).forEach(traverseServices);
			}
		}

		traverseDevices(info.device);

		return {
			services: services,
			devices: devices
		};
	}
	run(action, args, callback) {
		this.getService(this._services, (err, info) => {
			if (err) return callback(err);

			const body = '<?xml version="1.0"?>' +
				'<s:Envelope ' +
				'xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
				's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
				'<s:Body>' +
				'<u:' + action + ' xmlns:u=' +
				JSON.stringify(info.service) + '>' +
				args.map((args) => {
					return '<' + args[0] + '>' +
						(args[1] === undefined ? '' : args[1]) +
						'</' + args[0] + '>';
				}).join('') +
				'</u:' + action + '>' +
				'</s:Body>' +
				'</s:Envelope>';

			const needleOptions = {
				parse: false,
				headers: {
					'Content-Type': 'text/xml; charset="utf-8"',
					'Content-Length': Buffer.byteLength(body),
					'Connection': 'close',
					'SOAPAction': JSON.stringify(info.service + '#' + action)
				}
			};

			needle.post(info.controlURL, body, needleOptions, (err, res, body) => {
				if (err) return callback(err);

				if (res.statusCode !== 200) {
					return callback(Error('Request failed: ' + res.statusCode));
				}

				try {
					if (fastXmlParser.validate(body) === true) {
						const result = fastXmlParser.parse(body);
						if (result && result['s:Envelope'] && result['s:Envelope']['s:Body']) {
							callback(null, result['s:Envelope']['s:Body']);
						} else {
							return callback(Error('SOAP Parse error'));
						}
					} else {
						return callback(Error('SOAP Parse error'));
					}
				} catch (err) {
					return callback(err);
				}
			});
		});
	}
}
