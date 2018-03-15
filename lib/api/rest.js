const Logger = require.main.require('./lib/logger');
const express = require('express');
const Configuration = require.main.require('./lib/configuration');
const fs = require('fs');
const os = require('os');
const checkDiskSpace = require('check-disk-space');
const path = require('path');
const windowsFS = require.main.require('./lib/util/windowsFS');
const Clients = require.main.require('./lib/clients');

class RestRouter extends express.Router {
	constructor() {
		super();

		this.get('/', (req, res) => {
			res.json(Configuration.getBasicConfig());
		});

		// Return the list of folders at a given path		
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
			
			var params = {};
			if (req.params.collectionId) {
				var collections = Configuration.getBasicConfig().collections;
				for (var c of collections) {
					if (c.id == req.params.collectionId)
						params.folders = c.folders;
				}
			}			
			if (req.query.sort)
				params.sort = req.query.sort;
			if (req.query.filter)
				params.filters = JSON.parse(req.query.filter);
			Configuration.getProvider().getTracklist(params, (tracks) => res.json(tracks));
		});

		this.get('/playlists/:guid', (req, res) => {
			var parent_guid = req.params.guid;
			if (parent_guid == '0') // root
				parent_guid = null;
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

		this.get('/players/', (req, res) => {
			res.json(Clients.getClients());
		});

		this.post('/players/:id/:command', (req, res) => {
			res.json(Clients.sendCommand(req.params.id, req.params.command, req.body));
		});

		this.get('/storage', (req, res) => {
			// gets free/used disc space (used by MM5 sync)			
			checkDiskSpace(os.homedir()).then((diskSpace) => {
				res.json({ space: { total: diskSpace.size, used: diskSpace.size - diskSpace.free } });
			});
		});

		this.post('/createUploadSession', (req, res) => {			
			Configuration.getProvider().createUploadSession(req, res);
		});

		this.put('/upload/:id', (req, res) => {			
			Configuration.getProvider().processUpload(req.params.id, req, res);
		});

		this.post('/uploadPlaylist', (req, res) => {			
			Configuration.getProvider().processPlaylistUpload(req, res);
		});

		this.get('/stream/:id', (req, res) => {
			Configuration.getProvider().getFileStream(req.params.id, req, res);
		});

	}
}

module.exports = RestRouter;
