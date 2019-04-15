//@ts-check
'use strict';

const logger = require('./logger');
const Configuration = require('./configuration');

// JH: We have our own copy of the 'nat-upnp-2' npm, since some source code tweaks were needed
const { createClient } = require('./util/nat-upnp');
const natClient = createClient();

class natUPnP {
	async initialize() {
		const cfg = Configuration.getBasicConfig();

		if (cfg.performNAT) {
			this._publicHttpsPort = cfg.extHttpsPort;

			await new Promise((resolve) => {
				natClient.portMapping({
					public: cfg.extHttpsPort,
					private: cfg.httpsPort,
					// ttl: 10, // JH: Any value entered here results in 500 error on my router
				}, (err) => {
					if (err)
						logger.warn('NAT setup doesn\'t work: ' + err);
					else
						logger.info('NAT setup successful');
					resolve();
				});
			});
		}
	}

	async finish() {
		if (this._publicHttpsPort) {
			await new Promise((resolve) => {
				natClient.portUnmapping({
					public: this._publicHttpsPort,
				}, (err) => {
					if (err)
						logger.warn('NAT termination doesn\'t work: ' + err);
					else
						logger.info('NAT termination successful');
					resolve();
				});
			});

			delete this._publicHttpsPort;
		}
	}

	listStatus() { // We don't need this, just for testing
		natClient.getMappings((err, results) => {
			if (err) {
				logger.error('Error getting NAT status: ' + err);
				return;
			}

			logger.info('NAT status: ' + results);
		});
	}

}

module.exports = new natUPnP();