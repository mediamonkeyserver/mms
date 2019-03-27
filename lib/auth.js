//@ts-check

const pwd = require('pwd');
const config = require('./configuration');
const crypto = require('crypto');

pwd.digest('sha512');

const defaultAdminPass = 'admin';

// TODO: Store grants, so that they persist server restart
const grants = [];

class Auth {
	getUsersToken(idUser) {
		var grant = grants.find(i => i.idUser === idUser);

		if (!grant) {
			grant = {
				idUser: idUser,
				token: crypto.randomBytes(12).toString('base64'),
			};

			grants.push(grant);
		}

		return grant.token;
	}

	getGrantFromToken(token) {
		return grants.find(i => i.token === token);
	}

	async login(user, pass) {
		const cfg = config.getBasicConfig();
		if (!cfg.adminHash || !cfg.adminSalt) {
			// No admin exists yet
			if (pass !== defaultAdminPass)
				return null;
		} else {
			// @ts-ignore We can send just 2 arguments to get Promise as as result
			const hash = await pwd.hash(pass, cfg.adminSalt);
			if (hash !== cfg.adminHash)
				return null;
		}

		const idUser = -1; // ID = -1 for 'admin', we'll use 1, 2, ... for other users

		// TODO: async?
		// TODO: add expiration to tokens
		return this.getUsersToken(idUser);
		// return jwt.sign({ id: idUser }, this.getTokenSecret());
	}

	getUserID(username) {
		if (username === 'admin')
			return -1;
		else
			return -1; // TODO: look up username and return real id
	}

	getUserInfo(idUser) {
		if (idUser === -1) {
			return {
				name: 'Admin',
				isAdmin: true,
			};
		}
		else
			return {};
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

	authorize(req, res, next) {
		const token = this.getReqToken(req);

		if (token) {
			const grant = this.getGrantFromToken(token);
			if (grant)
				req.user = {id: grant.idUser};
		}

		if (req.user) {
			next();
		} else
			res.status(401).end();
	}

	authorizeAdmin(req, res, next) {
		const token = this.getReqToken(req);

		if (token) {
			const grant = this.getGrantFromToken(token);
			if (grant && grant.idUser === -1) // TODO: Currently only 'admin' user is admin, in future, we could assign admin rights to more users
				req.user = {id: grant.idUser};
		}

		if (req.user) {
			next();
		} else
			res.status(401).end();
	}
}

const auth = new Auth();

module.exports = auth;