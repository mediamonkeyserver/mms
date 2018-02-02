const express = require('express');
const Configuration = require('../configuration');

class RestRouter extends express.Router {
    constructor() {
        super();

        this.get('/', function (req, res) {
            res.json(Configuration.getBasicConfig());
        });
    }
}

module.exports = RestRouter;
