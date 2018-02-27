const Logger = require.main.require('./lib/logger');
const express = require('express');
const Configuration = require.main.require('./lib/configuration');
const fs = require('fs');
const path = require('path');
const windowsFS = require.main.require('./lib/util/windowsFS');

class RestRouter extends express.Router {
	constructor() {
		super();

		this.get('/', (req, res) => {
			res.json(Configuration.getBasicConfig());
		});

		// Return the list of folders at a given path
		// TODO: List drives on Windows (currently only C:)
		// TODO: Don't show hidden folders (?). Not easy to do on Windows, no node.js API
		this.get('/folders', (req, res) => {
			var lpath = req.query.path;
			if ((lpath === '' || lpath === '/') && process.platform == 'win32') {
				// Return drive letters for Windows
				windowsFS.getDriveLetters()
					.then(letters => {
						var drives = letters.map(letter => letter + ':/');
						res.json(drives);
					})
					.catch(err => {
						Logger.warn('Problem reading content of ' + lpath + ' (' + err.message + ')');
					});
				return;
			}
			fs.readdir(lpath, (err, items) => {
				if (err) {
					Logger.warn('Problem reading content of ' + lpath + ' (' + err.message + ')');
					items = [];
				}

				var folders = items.filter(file => {
					try {
						return fs.statSync(path.join(lpath + '/' + file)).isDirectory();
					} catch (err) { // In order to ignore Windows locked files (try cause errors in statSync()).
						return undefined;
					}
				});
				if (lpath !== '/')
					folders.splice(0, 0, '..');
				res.json(folders);
			});
		});

		this.post('/', (req, res) => {
			var cfg = req.body;
			Configuration.saveConfig(cfg);
			res.send('OK'); // TODO: Add headers
		});

		this.get('/collections', (req, res) => {
			res.json(Configuration.getBasicConfig().collections);
		});

		this.get('/tracks/:collectionId', (req, res) => {
			var params = {
				collectionID: req.params.collectionId,
			};
			if (req.query.sort)
				params.sort = req.query.sort;
			if (req.query.filter)
				params.filters = JSON.parse(req.query.filter);
			Configuration.getRegistry().getTracklist(params, (tracks) => res.json(tracks));
		});

		this.get('/playlists/', (req, res) => {
			var parent_guid = null /* root */; // req.params.parent_guid;
			Configuration.getRegistry().getPlaylists(parent_guid, (err, playlists, tracks) => res.json({ playlists: playlists, tracks: tracks }));
		});		

		this.post('/collections', (req, res) => {
			var collection = req.body;
			Configuration.saveCollection(collection);
			res.send('OK'); // TODO: Add headers
		});

		this.delete('/collections', (req, res) => {
			var collection = req.body;
			Configuration.deleteCollection(collection);
			res.send('OK'); // TODO: Add headers and correct code
		});

		this.get('/log/:logType', (req, res) => {
			res.json(Logger.getLog(req.params.logType));
		});
	}
}

module.exports = RestRouter;
