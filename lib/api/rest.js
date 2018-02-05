const Logger = require.main.require('./lib/logger');
const express = require('express');
const Configuration = require.main.require('./lib/configuration');
const fs = require('fs');
const path = require('path');

class RestRouter extends express.Router {
    constructor() {
        super();

        this.get('/', function (req, res) {
            res.json(Configuration.getBasicConfig());
        });

        // Return the list of folders at a given path
        // TODO: List drives on Windows (currently only C:)
        // TODO: Don't show hidden folders (?). Not easy to do on Windows, no node.js API
        this.get('/folders', function(req, res) {
            var lpath = req.param('path');
            if (process.platform == 'win32') {

            }
            fs.readdir(lpath, (err, items) => {
                if (err) {
                    Logger.warn('Problem reading content of '+lpath+' ('+err.message+')');
                    items = [];
                }

                var folders = items.filter(file => {
                    try {
                        return fs.statSync(path.join(lpath+'/'+file)).isDirectory();
                    } catch(err) { // In order to ignore Windows locked files (try cause errors in statSync()).
                        return undefined;
                    }
                });
                if (lpath !== '/')
                    folders.splice(0, 0, '..');
                res.json(folders);
            });
        });
    }
}

module.exports = RestRouter;
