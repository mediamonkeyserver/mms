//@ts-check

// Handling of /api/user

const debug = require('debug')('httpserver:api:users');
const express = require('express');
const Auth = require('../auth');
const passport = require('passport');
const config = require('../configuration');

const router = express.Router();

router.post('/login', async (req, res) => {
	
	passport.authenticate('local', (err, {user, token}) => {
		
		if (user) {
			
			req.logIn(user, (err) => {
				if (err) {
					debug(err);
					return res.status(400).send();
				}
				
				debug(user.name);
				res.send({
					token: token,
					user: safeUserInfo(req.user),
				});
			});
		}
		else {
			if (err) debug(err);
			return res.status(401).send();
		}
		
	})(req, res);
});

router.post('/profile', Auth.authorize(process.env.ACCESS_ADMIN), async (req, res) => {
	
	Auth.updateProfile(req.user, req.body)
		.then(() => {
			res.send({
				user: safeUserInfo(req.user),
			});
		})
		.catch((err) => {
			debug(err);
			res.sendStatus(400);
		});
});

//not yet implemented
router.get('/roles', async (req, res) => {
	
	const roles = config.getRoles();
	res.status(200).send(roles);
	
});

router.get('/', Auth.authorize(process.env.ACCESS_ADMIN), async (req, res) => {
	res.send(safeUserInfo(req.user));
});

router.all('/logout', async (req, res) => {
	
	//destroy session
	req.logout();
	
	req.session.destroy(async function (err) {
		if (err) return console.log(err);
		
		res.sendStatus(200);
	});
});

//Filter user info to what's safe to send to the client
function safeUserInfo(user) {
	return {
		name: user.name,
		display_name: user.display_name,
		role_key: user.role_key,
	};
}

module.exports = router;