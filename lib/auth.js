//@ts-check
'use strict';
// 2020-09-10 JL: Added passport-config
// Configures passport module for Express server.

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const logger = require('./logger');
const debug = require('debug')('httpserver:auth');
const config = require('./configuration');

const ipaddr = require('ipaddr.js');

// Local IP ranges
const localIPs = [
	ipaddr.parseCIDR('10.0.0.0/8'),
	ipaddr.parseCIDR('172.16.0.0/12'),
	ipaddr.parseCIDR('192.168.0.0/16'),
	ipaddr.parseCIDR('127.0.0.1/32'),
];

process.env.ACCESS_VIEWER = '0';
process.env.ACCESS_EDITOR = '1';
process.env.ACCESS_ADMIN = '2';

const numSaltRounds = 10;

// Creates the data necessary to store in the session cookie
passport.serializeUser(function(user, done) {
	// @ts-ignore
	debug('serializeUser: ' + user._id);
	// @ts-ignore
	done(null, user._id);
});

// Reads the session cookie to determine the user from a user ID
passport.deserializeUser(async function(id, done) {
	
	debug('deserializeUser: ' + id);
	
	var user = config.getUserById(id);
	
	if(!user){
		logger.error('User not found in db: deserializeUser ' + id);
		done('User not found in db: deserializeUser ' + id, null);
	}
	else
		done(null, user);
});

// Configures passport's authenticate (log-in) function.
passport.use(new LocalStrategy(
	{
		usernameField: 'user',
		passwordField: 'pass',
	},
	async (username, password, done) => {
		
		debug(`Login attempt for user ${username}`);
		
		try {
			var user = config.getUserByName(username);
				
			if (!user) return done('User could not be found');
			//Check password
			var comparison = await bcrypt.compare(password, user.password);
			//debug(comparison);
			if (comparison !== true) return done('Incorrect password.');
	
			if (comparison === true) {
				//var sessionToken = crypto.randomBytes(12).toString('base64');
			
				logger.info(`User ${username} has logged in`);
				//Return user object
				done(null, user);
			}
		}
		catch (err) {
			debug(err);
			return done(err);
		}
	}
));

class Auth {
	
	/**
	 * Authentication middleware function. Determines whether a user is logged in and if they have an adequate access level to the given page or service.
	 * @param {Number|String} accessLevel Numeric access level of a given page or service. USE PROCESS.ENV VARIABLES, SUCH AS process.env.ACCESS_VIEWER.
	 */
	static authorize(accessLevel) {
		
		//Parse number from accessLevel
		// @ts-ignore
		let thisAccessLevel = parseInt( accessLevel );
		
		//Throw if access level is not a valid number (Programming error)
		if( isNaN(thisAccessLevel) ) throw new Error('Auth.authenticate: Access level is not a number (Check naming of process.env.ACCESS_X)');
		
		function authorizeFunction (req, res, next) {
			
			if (req.user) {
				
				var user = req.user;
				var userRole = user.role;
				logger.verbose(`User ${user.name} (${userRole.access_level}) has requested access to '${req.originalUrl}' (${thisAccessLevel})`);
			
				//If user has the correct access level, then they can proceed
				if( userRole.access_level >= thisAccessLevel ){
				
					next();
				}
				//If user does not have the correct access level, then send them 403 error
				else {
					
					res.status(403).send('You do not have access to this page.');
				}
			}
			else {
				return res.status(401).send('Not logged in.');
			}
		}
		
		return authorizeFunction;
	}
	
	/**
	 * Determines whether any given request is allowed by configuration.
	 * @param {object} req Express/HTTP request object
	 * @param {object} res Express/HTTP response object
	 */
	static isRequestAllowed(req, res) {
		
		const cfg = config.getBasicConfig();

		if (cfg.extAccess || Auth.isLocalIP(req.ip)) {
			debug('isRequestAllowed: true');
			return true;
		}
		else {
			debug('isRequestAllowed: false');
			res.status(401).end();
			return false;
		}
	}
	
	/**
	 * Determines whether any given IP is a local IP address.
	 * @param {String} ip IP address.
	 */
	static isLocalIP(ip) {
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
	
	/**
	 * Determines whether a request is coming from a local IP address.
	 * @param {object} req Express/HTTP request object
	 */
	static isLocalRequest(req) {
		return Auth.isLocalIP(req.ip);
	}
	
	/**
	 * Updates the profile (name, password, etc.) of a given user.
	 * @param {object} user User object
	 * @param {object} newProfile New object properties to set.
	 */
	static async updateProfile(user, newProfile) {
		
		logger.info(`User ${user.name} is updating their profile`);
		
		//Filter newProfile request so they can't enter a new role_key
		var newProfileFiltered = {};
		
		for (var key in newProfile) {
			switch (key) {
				case 'name': newProfileFiltered.name = newProfile.name; break;
				case 'display_name': newProfileFiltered.display_name = newProfile.display_name; break;
				case 'password': newProfileFiltered.password = await bcrypt.hash(newProfile.password, numSaltRounds); break;
			}
		}
		
		//TODO: implement roles
		newProfileFiltered.role_key = 'admin';
		
		debug(`newProfile: ${JSON.stringify(newProfileFiltered)}`);
		
		var result = config.updateUser(user._id, newProfileFiltered);
		
		debug(JSON.stringify(result));
	}
}

module.exports = Auth;