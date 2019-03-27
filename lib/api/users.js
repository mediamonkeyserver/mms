//@ts-check

// Handling of /api/user

const express = require('express');
const auth = require('../auth');
const authorize = auth.authorize.bind(auth);

/** @type {any}  -- To get around warnings */
const route = express.Router();

route.post('/login', async (req, res) => {
	const token = await auth.login(req.body.user, req.body.pass);
	if (!token)
		return res.status(401).end();

	res.send({
		token: token,
		user: auth.getUserInfo(auth.getUserID(req.body.user)),
	});
});

route.post('/profile', authorize, async (req, res) => {
	auth.updateProfile(req.user, req.body);
	res.send({
		ok: true,
		user: auth.getUserInfo(req.user.id)
	});
});

route.get('/', authorize, async (req, res) => {
	res.send(auth.getUserInfo(req.user.id));
});

module.exports = route;