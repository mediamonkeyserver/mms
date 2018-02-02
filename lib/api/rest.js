const express = require('express');

class RestRouter extends express.Router {
    constructor() {
        super();
        
        this.get('/', function (req, res) {
			res.json({ serverName: 'Jiri\'s testing MediaMonkey server' });
		});
    }
}

module.exports = RestRouter;
