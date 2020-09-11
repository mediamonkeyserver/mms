//@ts-check

const debug = require('debug')('upnpserver:auth');
const bcrypt = require('bcryptjs');
const config = require('./configuration');
const Logger = require('./logger');
const crypto = require('crypto');
const ipaddr = require('ipaddr.js');

// Local IP ranges
const localIPs = [
	ipaddr.parseCIDR('10.0.0.0/8'),
	ipaddr.parseCIDR('172.16.0.0/12'),
	ipaddr.parseCIDR('192.168.0.0/16'),
	ipaddr.parseCIDR('127.0.0.1/32'),
];

const ACCESS_VIEWER = 0;
const ACCESS_ADMIN = 2;
const numSaltRounds = 10;

/*
user = {
	id: '3498grjdskljdklgo49045655dfd'
	name: 'username12',
	displayname: 'Joe Schmoe',
	role_key: 'admin',
	password: '34984389gfsjidsjkldfkjaldsf',
	preferences: {}
}
role = {
	key: 'admin',
	label: 'Admin',
	access_level: 3
}
Role access levels: 0 (Viewer), 1 (Editor), 2 (Admin)
*/


class Auth {
	/**
	 * 
	 * @param {String|Number} userId Id of user
	 */
	getUsersToken(userId) {
		const cfg = config.getPrivateConfig();		
		var grant = cfg.grants.find(i => i.userId === userId);
		
		if (!grant) {
			grant = {
				userId: userId,
				token: crypto.randomBytes(12).toString('base64'),
				timeIssued: Date.now(), //note: this is time in milliseconds; must divide difference by 1000
				//expiration: expiration
			};
			
			cfg.grants.push(grant);
			config.saveConfig(cfg, true);
		}
		
		
		return grant.token;
	}

	getGrantFromToken(token) {
		const cfg = config.getPrivateConfig();
		return cfg.grants.find(i => i.token === token);
	}

	async login(username, password) {
		Logger.verbose(`User ${username} has attempted to log in`);
		
		var user = await config.getUserByName(username);
		
		if (!user) { 
			Logger.vebose(`User ${username} could not be found`);
			return null;
		}
		
		const comparison = await bcrypt.compare(password, user.password);
		
		if (comparison == true) {
			Logger.info(`User ${username} has logged in`);
			
			return user;
			//return this.getUsersToken(user._id);
		}
		else {
			Logger.info(`Failed login for ${username}`);
			return null;
		}
		
		/*
		if (user == 'admin') {
			var comparison = await bcrypt.compare(pass, defaultHash);
			debug(comparison);
		}
		/*
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
		*/
	}
	
	async updateProfile(user, newProfile) {
		
		if (newProfile.password) {
			newProfile.password = await bcrypt.hash(newProfile.password, numSaltRounds);
		}
		
		var result = await config.updateUser(user._id, newProfile);
		
		debug(JSON.stringify(result));
	}
	
	/**
	 * Gets user info from database.
	 * @param {String} _id ID of user.
	 * @returns {Object} User data.
	 */
	async getUserInfo(_id) {
		
		Logger.trace(`auth.getUserInfo: ${_id}`);
		
		var userInfo = await config.getUserById(_id);
		
		return userInfo;
		
		/*
		if (idUser === -1) {
			const cfg = config.getPrivateConfig();
			return {
				name: cfg.adminName || 'Admin',
				isAdmin: true,
			};
		}
		else
			return {}; // TODO: Support generic users
		*/
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
		debug('No token found');
		return null;
	}

	isLocalIP(ip) {
		if (ip === '::1')
			return true; // Localhost
			
		const parsed_ip = ipaddr.process(ip);
		for (const ipRange of localIPs) {
			// @ts-ignore (this .match() call should be perfectly valid)
			if (parsed_ip.match(ipRange))
				return true;
		}
		return false;
	}

	isLocalRequest(req) {
		return this.isLocalIP(req.ip);
	}

	isRequestAllowed(req, res) {
		const cfg = config.getBasicConfig();

		if (cfg.extAccess || this.isLocalIP(req.ip)) {
			Logger.trace('isRequestAllowed: true');
			return true;
		}
		else {
			Logger.trace('isRequestAllowed: false');
			res.status(401).end();
			return false;
		}
	}

	// Doesn't perform authentication, only add user to the request and make sure we comply to private/public rules
	noAuthorize(req, res, next) {
		if (!this.isRequestAllowed(req, res))
			return;

		const token = this.getReqToken(req);
		
		debug(`token=${token}`);
		
		if (token) {
			const grant = this.getGrantFromToken(token);
			if (!grant) return;
			config.getUserById(grant.userId)
				.then((user) => {
					debug(`user=${JSON.stringify(user)}`);
					req.user = user;
					next();
				});
		}

	}

	// Authenticates the request
	authorize(req, res, next) {
		
		this.authenticate(ACCESS_VIEWER, req, res, next);
	}

	// Authenticates an Admin request
	authorizeAdmin(req, res, next) {
		
		this.authenticate(ACCESS_ADMIN, req, res, next);
	}
	
	// New generic authenticate request
	async authenticate(accessLevel, req, res, next) {
		
		debug(`accessLevel=${accessLevel}`);
		
		if (!this.isRequestAllowed(req, res)) return res.sendStatus(401);
		
		const token = this.getReqToken(req);
		debug(`token=${token}`);
		
		if (token) {
			let grant = this.getGrantFromToken(token);
			
			debug(`grant=${JSON.stringify(grant)}`);
			if (!grant) return res.sendStatus(401);
			
			let user = await config.getUserById(grant.userId);
			req.user = user;
			//debug(user);
		}
		
		var isAuthenticated = false;
		
		//Parse number from accessLevel
		accessLevel = parseInt( accessLevel );
		
		//Throw if access level is not a valid number (Programming error)
		if( isNaN(accessLevel) ) throw new Error('req.authenticate: Access level is not a number (Check naming of process.env.ACCESS_X)');
		
		let user = req.user;
		
		if (user) {
			
			var userRole = await config.getRole(user.role_key);
			Logger.debug(`auth.authenticate: User ${user.name} (${userRole.access_level}) has requested access to '${req.originalUrl}' (${accessLevel})`);
			
			//If user has the correct access level, then set isAuthenticated to true
			if( userRole.access_level >= accessLevel ){
				
				isAuthenticated = true;
			}
			// If user does not have the correct access level, then give forbidden error
			else{
				res.status(403).end();
			}
		}
		// If user is undefined, then send them unauthorized error
		else {
			res.status(401).end();
		}
		
		if (isAuthenticated) {
			debug('next()');
			next();
		}
	}
}

const auth = new Auth();

module.exports = auth;