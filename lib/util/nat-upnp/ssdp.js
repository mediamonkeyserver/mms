const dgram = require('dgram');
const util = require('util');
const os = require('os');
const { EventEmitter } = require('events');

module.exports = class Ssdp extends EventEmitter {
	get defaults() {
		return {
			sourcePort: 0
		}
	}
	constructor(opts = {}) {
		super();

		this._opts = Object.assign(this.defaults, opts);
		this._sourcePort = this._opts.sourcePort || 0;
		this._multicast = '239.255.255.250';
		this._port = 1900;
		this._bound = false;
		this._boundCount = 0;
		this._closed = false;
		this._queue = [];

		// Create sockets on all external ifaces
		this.createSockets();
	}
	static create() {
		return new Ssdp();
	}
	static parseMimeHeader(headerStr) {
		const lines = headerStr.split(/\r\n/g);

		// Parse headers from lines to hashmap
		return lines.reduce((headers, line) => {
			line.replace(/^([^:]*)\s*:\s*(.*)$/, (a, key, value) => {
				headers[key.toLowerCase()] = value;
			});
			return headers;
		}, {});
	}
	createSockets() {
		const ifaces = os.networkInterfaces();

		this.sockets = Object.keys(ifaces)
			.reduce((a, key) => {
				return a.concat(ifaces[key]
					.filter((item) => !item.internal)
					.map((item) => this.createSocket(item))
				);
			}, []);
	}
	search(device, promise) {
		if (!promise) {
			promise = new EventEmitter();
			promise._ended = false;
			promise.once('end', () => {
				promise._ended = true;
			});
		}

		if (!this._bound) {
			this._queue.push({ action: 'search', device: device, promise: promise });
			return promise;
		}

		// If promise was ended before binding - do not send queries
		if (promise._ended) return;

		const query = new Buffer('M-SEARCH * HTTP/1.1\r\n' +
			'HOST: ' + this._multicast + ':' + this._port + '\r\n' +
			'MAN: "ssdp:discover"\r\n' +
			'MX: 1\r\n' +
			'ST: ' + device + '\r\n' +
			'\r\n');

		// Send query on each socket
		this.sockets.forEach((socket) => {
			socket.send(query, 0, query.length, this._port, this._multicast);
		}, this);

		const ondevice = (info, address) => {
			if (promise._ended) return;
			if (info.st !== device) return;

			promise.emit('device', info, address);
		}
		this.on('_device', ondevice);

		// Detach listener after receiving 'end' event
		promise.once('end', () => this.removeListener('_device', ondevice));

		return promise;
	}
	createSocket(iface) {
		const socket = dgram.createSocket({
			type: iface.family === 'IPv4' ?
				'udp4' : 'udp6', reuseAddr: true
		})

		socket.on('message', (message, info) => {
			// Ignore messages after closing sockets
			if (this._closed) return;

			// Parse response
			this.parseResponse(message.toString(), socket.address, info);
		});

		// Bind in next tick (sockets should be me in this.sockets array)
		process.nextTick(() => {
			// Unqueue this._queue once all sockets are ready
			const onready = () => {
				if (this._boundCount < this.sockets.length) return;

				this._bound = true;
				this._queue.forEach((item) => {
					return this[item.action](item.device, item.promise);
				});
			}

			socket.on('listening', () => {
				this._boundCount += 1;
				onready();
			});

			// On error - remove socket from list and execute items from queue
			socket.once('error', () => {
				this.sockets.splice(this.sockets.indexOf(socket), 1);
				onready();
			});

			socket.address = iface.address;
			socket.bind(this._sourcePort, iface.address);
		});

		return socket;
	}
	// TODO create separate logic for parsing unsolicited upnp broadcasts,
	// if and when that need arises
	parseResponse(response, addr, remote) {
		// Ignore incorrect packets
		if (!/^(HTTP|NOTIFY)/m.test(response)) return;
		const headers = Ssdp.parseMimeHeader(response);

		// We are only interested in messages that can be matched against the original
		// search target
		if (!headers.st) return;

		this.emit('_device', headers, addr);
	}
	close() {
		this.sockets.forEach((socket) => {
			socket.close();
		});
		this._closed = true;
	}
}
