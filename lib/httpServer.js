//@ts-check
'use strict';

const logger = require('./logger');
const debug = require('debug')('httpserver');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
const os = require('os');
const restRouter = require('./api/rest');
const clients = require('./clients');
const config = require('./configuration');
const fs = require('fs');

const selfsigned = require('selfsigned');

// @ts-ignore
const pjson = require('../package.json');

class HTTPServer {
	start(upnpServer, ssdpServer, callback) {
		this.upnpServer = upnpServer;
		this.ssdpServer = ssdpServer;

		var app = express();

		var httpServer = http.createServer(app);
		const cfg = config.getBasicConfig();
		const srvOptions = {};

		if (cfg.certPemFile && cfg.keyPemFile) {
			// Use user-provided certificate
			srvOptions.key = fs.readFileSync(cfg.keyPemFile, 'utf8');
			srvOptions.cert = fs.readFileSync(cfg.certPemFile, 'utf8');

		} else {
			// Generate our own self-signed certificate
			const attrs = [{ name: 'commonName', value: 'MediaMonkey Server' }];
			const pems = selfsigned.generate(attrs, { days: 365 });
			// @ts-ignore
			srvOptions.key = pems.private;
			// @ts-ignore			
			srvOptions.cert = pems.cert;
		}

		const httpsServer = https.createServer(srvOptions, app);

		clients.initialize(httpServer);

		this.httpServer = httpServer;
		this.httpsServer = httpsServer;

		app.use('/api', bodyParser.urlencoded({ extended: true }));
		app.use('/api', bodyParser.json());
		app.use('/', (req, res, next) => {
			logger.verbose('HTTP ' + req.method + ' ' + req.url + ', headers: ' + JSON.stringify(req.headers));
			next();
		});
		app.use('/api', restRouter);

		app.use((req, res) => {
			this._processRequest(req, res);
			// Don't call next(), as we don't expect any further processing
			// TODO: Rewrite our _processRequest() to be fully handled by express server?
		});

		httpServer.on('error', (err) => {
			// @ts-ignore
			if (err.code == 'EADDRINUSE') {
				// @ts-ignore
				logger.error('Could not start http server, port ' + err.port + ' is already in use !!!');
				logger.error('Probably another instance of this server is already running?');
			} else
				logger.error('httpServer error: ' + err);
		});

		httpsServer.on('error', (err) => {
			// @ts-ignore
			if (err.code == 'EADDRINUSE') {
				// @ts-ignore
				logger.error('Could not start https server, port ' + err.port + ' is already in use !!!');
				logger.error('Probably another instance of this server is already running?');
			} else
				logger.error('httpsServer error: ' + err);
		});		

		httpServer.listen(upnpServer.port, (error) => {
			if (error) {
				return callback(error);
			}

			this.ssdpServer.start();

			// this.emit('waiting');

			const address = httpServer.address();

			debug('_upnpServerStarted', 'Http server is listening on address=', address);

			logger.info('==================================================');
			// @ts-ignore (address.port not known)
			logger.info(`MMS v${pjson.version} running at http://${this.getLocalIP()}:${address.port} (or http://localhost:${address.port})`);
			logger.info('Connect using a web browser or using MediaMonkey 5.');
			logger.info('==================================================');

			callback();
		});

		httpsServer.listen(10223, () => {
			const address = httpsServer.address();

			debug('_upnpServerStarted', 'Https server is listening on address=', address);
		});
	}

	stop() {
		var httpServer = this.httpServer;
		if (httpServer) {
			this.httpServer = undefined;
			try {
				debug('stop', 'Stop http server ...');

				httpServer.close();

			} catch (error) {
				logger.error(error);
			}
		}

		var httpsServer = this.httpsServer;
		if (httpsServer) {
			this.httpsServer = undefined;
			try {
				debug('stop', 'Stop https server ...');

				httpsServer.close();

			} catch (error) {
				logger.error(error);
			}
		}
	}

	getLocalIP() {
		var ifaces = os.networkInterfaces();
		var res = null;
		var priority1;
		var priority2;
		var priority3;

		Object.keys(ifaces).forEach(function (ifname) {
			ifaces[ifname].forEach(function (iface) {
				if ('IPv4' !== iface.family || iface.internal !== false) {
					// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
					return;
				}

				if (iface.address.startsWith('192.168.0') || iface.address.startsWith('192.168.1'))
					priority1 = iface.address;
				else {
					if (iface.address.startsWith('10.0.0.'))
						priority2 = iface.address;
					else
						priority3 = iface.address;
				}
			});
		});

		if (priority1)
			res = priority1;
		else {
			if (priority2)
				res = priority2;
			else {
				if (priority3)
					res = priority3;
				else
					res = '127.0.0.1';
			}
		}

		return res;
	}

	/**
 * Process request
 *
 * @param {object} request
 * @param {object} response
 */
	_processRequest(request, response) {

		var path = url.parse(request.url).pathname;

		// logger.debug("Uri=" + request.url);

		// var now = Date.now();
		try {
			this.upnpServer.processRequest(request, response, path, (error, processed) => {

				// var stats = {
				// 	request: request,
				// 	response: response,
				// 	path: path,
				// 	processTime: Date.now() - now,
				// };

				if (error) {
					response.writeHead(500, 'Server error: ' + error);
					response.end();

					// this.emit('code:500', error, stats);
					return;
				}

				if (!processed) {
					response.writeHead(404, 'Resource not found: ' + path);
					response.end();

					// this.emit('code:404', stats);
					return;
				}

				// this.emit('code:200', stats);
			});

		} catch (error) {
			logger.error('Process request exception', error);
			// this.emit('error', error);
		}
	}
}

module.exports = new HTTPServer();