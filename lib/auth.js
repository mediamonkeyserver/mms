//@ts-check

const pwd = require('pwd');
const config = require('./configuration');
const crypto = require('crypto');
const ipaddr = require('ipaddr.js');

// Local IP ranges
const localIPs = [
	ipaddr.parseCIDR('10.0.0.0/8'),
	ipaddr.parseCIDR('172.16.0.0/12'),
	ipaddr.parseCIDR('192.168.0.0/16'),
	ipaddr.parseCIDR('127.0.0.1/32'),
];

pwd.digest('sha512');

const defaultAdminPass = 'admin';

class Auth {
	getUsersToken(idUser) {
		const cfg = config.getPrivateConfig();		
		var grant = cfg.grants.find(i => i.idUser === idUser);

		if (!grant) {
			grant = {
				idUser: idUser,
				token: crypto.randomBytes(12).toString('base64'),
			};

			cfg.grants.push(grant);
			config.saveConfig();
		}

		return grant.token;
	}

	getGrantFromToken(token) {
		const cfg = config.getPrivateConfig();
		return cfg.grants.find(i => i.token === token);
	}

	async login(user, pass) {
		const cfg = config.getPrivateConfig();
		if (!cfg.adminHash || !cfg.adminSalt) {
			// No admin exists yet
			if (pass !== defaultAdminPass)
				return null;
		} else {
			// @ts-ignore We can send just 2 arguments to get Promise as as result
			const result = await pwd.hash(pass, cfg.adminSalt);
			if (result.hash !== cfg.adminHash)
				return null;
		}

		const idUser = -1; // ID = -1 for 'admin', we'll use 1, 2, ... for other users

		// TODO: add expiration to tokens
		return this.getUsersToken(idUser);
	}

	async updateProfile(user, newProfile) {
		if (user.id === -1) {  // TODO: handle generic users as well, not just the hardcoded 'admin'
			const cfg = config.getPrivateConfig();
			if (newProfile.password) {
				// @ts-ignore We can send just 1 argument to get Promise as as result
				const result = await pwd.hash(newProfile.password);
				cfg.adminHash = result.hash;
				cfg.adminSalt = result.salt;
			}

			if (newProfile.name) {
				cfg.adminName = newProfile.name;
			}

			config.saveConfig();
		}
	}

	getUserID(username) {
		if (username === 'admin')
			return -1;
		else
			return -1; // TODO: look up username and return real id
	}

	getUserInfo(idUser) {
		if (idUser === -1) {
			const cfg = config.getPrivateConfig();
			return {
				name: cfg.adminName || 'Admin',
				isAdmin: true,
			};
		}
		else
			return {}; // TODO: Support generic users
	}

	getReqToken(req) {
		if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') { // Authorization: Bearer g1jipjgi1ifjioj
			// Handle token presented as a Bearer token in the Authorization header
			return req.headers.authorization.split(' ')[1];
		} else if (req.query && req.query.token) {
			// Handle token presented as URI param
			return req.query.token;
		} else if (req.cookies && req.cookies.token) {
			// Handle token presented as a cookie parameter
			return req.cookies.token;
		}
		// If we return null, we couldn't find a token.
		// In this case, the JWT middleware will return a 401 (unauthorized) to the client for this request
		return null;
	}

	isLocalIP(ip) {
		const parsed_ip = ipaddr.process(ip);
		for (const ipRange of localIPs) {
			// @ts-ignore (this .match() call should be perfectly valid)
			if (parsed_ip.match(ipRange))
				return true;
		}
		return false;
	}

	isRequestAllowed(req, res) {
		const cfg = config.getBasicConfig();

		if (cfg.extAccess || this.isLocalIP(req.ip))
			return true;
		else {
			res.status(401).end();
			return false;
		}
	}

	// Doesn't perform authentication, only add user to the request and make sure we comply to private/public rules
	noAuthorize(req, res, next) {
		if (!this.isRequestAllowed(req, res))
			return;

		const token = this.getReqToken(req);

		if (token) {
			const grant = this.getGrantFromToken(token);
			if (grant)
				req.user = { id: grant.idUser };
		}

		next();
	}

	// Authenticates the request
	authorize(req, res, next) {
		if (!this.isRequestAllowed(req, res))
			return;

		const token = this.getReqToken(req);

		if (token) {
			const grant = this.getGrantFromToken(token);
			if (grant)
				req.user = { id: grant.idUser };
		}

		if (req.user) {
			next();
		} else
			res.status(401).end();
	}

	// Authenticates an Admin request
	authorizeAdmin(req, res, next) {
		if (!this.isRequestAllowed(req, res))
			return;

		const token = this.getReqToken(req);

		if (token) {
			const grant = this.getGrantFromToken(token);
			if (grant && grant.idUser === -1) // TODO: Currently only 'admin' user is admin, in future, we could assign admin rights to more users
				req.user = { id: grant.idUser };
		}

		if (req.user) {
			next();
		} else
			res.status(401).end();
	}
}

const auth = new Auth();

module.exports = auth;