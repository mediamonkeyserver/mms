const nat = require('../nat-upnp');
const async = require('async');

module.exports = class Client {
	get defaults() {
		return {
			timeout: 20 * 1000
		};
	}
	constructor(userOptions = {}) {
		this._options = Object.assign(this.defaults, userOptions);
		this._ssdp = nat.ssdp.create();
		this.timeout = this._options.timeout;
	}
	static create(userOptions = {}) {
		return new Client(userOptions);
	}
	normalizeOptions(options) {
		const toObject = (addr) => {
			if (typeof addr === 'number') return { port: addr };
			if (typeof addr === 'string' && !isNaN(addr)) return { port: Number(addr) };
			if (typeof addr === 'object') return addr;

			return {};
		};

		return {
			remote: toObject(options.public),
			internal: toObject(options.private)
		};
	}
	portMapping(options, callback = () => { }) {

		this.findGateway((err, gateway, address) => {
			if (err) return callback(err);

			const ports = this.normalizeOptions(options);

			var config = [
				['NewRemoteHost', ports.remote.host],
				['NewExternalPort', ports.remote.port],
				['NewProtocol', options.protocol ?
					options.protocol.toUpperCase() : 'TCP'],
				['NewInternalPort', ports.internal.port],
				['NewInternalClient', ports.internal.host || address],
				['NewEnabled', 1],
				['NewPortMappingDescription', options.description || 'node:nat:upnp'],
			];

			let ttl = 0;
			if (typeof options.ttl === 'number') { ttl = options.ttl; }
			if (typeof options.ttl === 'string' && !isNaN(options.ttl)) { ttl = Number(options.ttl); }
			if (ttl > 0)
				config.push([ 'NewLeaseDuration', ttl ]);

			gateway.run('AddPortMapping', config, callback);
		});
	}
	portUnmapping(options, callback = () => { }) {

		this.findGateway((err, gateway/*, address*/) => {
			if (err) return callback(err);

			const ports = this.normalizeOptions(options);

			gateway.run('DeletePortMapping', [
				['NewRemoteHost', ports.remote.host],
				['NewExternalPort', ports.remote.port],
				['NewProtocol', options.protocol ?
					options.protocol.toUpperCase() : 'TCP']
			], callback);
		});
	}
	getMappings(options = {}, callback = () => { }) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}
		this.findGateway((err, gateway, address) => {
			if (err) return callback(err);
			let i = 0;
			let end = false;
			let results = [];

			async.whilst(() => !end,
				(callback) => {
					gateway.run('GetGenericPortMappingEntry', [
						['NewPortMappingIndex', i++]
					], (err, data) => {
						if (err) {
							// If we got an error on index 0, ignore it in case this router starts indicies on 1
							if (i !== 1) {
								end = true;
							}
							return callback(null);
						}

						let key;
						Object.keys(data).some((k) => {
							if (!/:GetGenericPortMappingEntryResponse/.test(k)) return false;

							key = k;
							return true;
						});
						if (!key) {
							end = true;
							return callback(null);
						}
						data = data[key];

						var result = {
							public: {
								host: typeof data.NewRemoteHost === 'string' &&
									data.NewRemoteHost || '',
								port: parseInt(data.NewExternalPort, 10)
							},
							private: {
								host: data.NewInternalClient,
								port: parseInt(data.NewInternalPort, 10)
							},
							protocol: data.NewProtocol.toLowerCase(),
							enabled: data.NewEnabled === 1,
							description: data.NewPortMappingDescription,
							ttl: parseInt(data.NewLeaseDuration, 10)
						};
						result.local = result.private.host === address;

						results.push(result);

						callback(null);
					});
				}, (err) => {
					if (err) return callback(err);

					if (options.local) {
						results = results.filter((item) => item.local);
					}

					if (options.description) {
						results = results.filter((item) => {
							if (typeof item.description !== 'string')
								return;

							if (options.description instanceof RegExp) {
								return item.description.match(options.description) !== null;
							} else {
								return item.description.includes(options.description);
							}
						});
					}

					callback(null, results);
				});
		});
	}
	externalIp(callback) {
		this.findGateway((err, gateway/*, address*/) => {
			if (err) return callback(err);

			gateway.run('GetExternalIPAddress', [], (err, data) => {
				if (err) return callback(err);
				let key;

				Object.keys(data).some((k) => {
					if (!/:GetExternalIPAddressResponse$/.test(k)) return false;

					key = k;
					return true;
				});

				if (!key) return callback(Error('Incorrect response'));
				callback(null, data[key].NewExternalIPAddress);
			});
		});
	}
	findGateway(callback) {
		let timeout;
		let timeouted = false;
		const p = this._ssdp.search(
			'urn:schemas-upnp-org:device:InternetGatewayDevice:1'
		);

		timeout = setTimeout(() => {
			timeouted = true;
			p.emit('end');
			callback(new Error('timeout'));
		}, this._timeout);

		p.on('device', (info, address) => {
			if (timeouted) return;
			p.emit('end');
			clearTimeout(timeout);

			// Create gateway
			callback(null, nat.device.create(info.location), address);
		});
	}
	close() {
		this._ssdp.close();
	}
	set timeout(val) {
		this._timeout = val;
	}
	get timeout() {
		return this._timeout;
	}
};
