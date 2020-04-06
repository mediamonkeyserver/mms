//@ts-check

const logger = require('../logger');
const express = require('express');
const Configuration = require('../configuration');
const fs = require('fs');
const os = require('os');
const checkDiskSpace = require('check-disk-space');
const path = require('path');
const windowsFS = require('../util/windowsFS');
const PathNormalizer = require('../util/pathNormalizer');
const Clients = require('../clients');
const MediaProvider = require('../mediaProvider');
const Transcoder = require('../transcoder');
// @ts-ignore (json loading)
const Package = require('../../package.json');
const pubsub = require('pubsub-js');

const auth = require('../auth');
const authorize = auth.authorize.bind(auth);
const authorizeAdmin = auth.authorizeAdmin.bind(auth);

logger.verbose('Using node.js ' + process.version);

const restRouter = express.Router();

restRouter.get('/', authorize, (req, res) => {
	res.json(Configuration.getPublicConfig());
});

restRouter.post('/stop', authorizeAdmin, (req, res) => {
	res.send({ ok: true });
	pubsub.publishSync('APP_END', null);
});

// Return the list of folders at a given path		
// TODO: Don't show hidden folders (?). Not easy to do on Windows, no node.js API
restRouter.get('/folders', authorizeAdmin, (req, res) => {
	var lpath = req.query.path;
	if ((lpath === '' || lpath === '/') && process.platform == 'win32') {
		// Return drive letters for Windows
		windowsFS.getDriveLetters()
			.then(letters => {
				var drives = letters.map(letter => letter + ':/');
				res.json({ folders: drives, files: [] });
			})
			.catch(err => {
				logger.warn('Problem reading content of ' + lpath + ' (' + err.message + ')');
			});
		return;
	}
	fs.readdir(lpath, (err, items) => {
		if (err) {
			logger.warn('Problem reading content of ' + lpath + ' (' + err.message + ')');
			items = [];
		}

		const folders = [], files = [];
		for (const file of items) {
			try {
				if (fs.statSync(path.join(lpath + '/' + file)).isDirectory())
					folders.push(file);
				else
					files.push(file);
			} catch (err) { // In order to ignore Windows locked files (try cause errors in statSync()).
			}
		}

		if (lpath !== '/')
			folders.splice(0, 0, '..');

		res.json({
			folders,
			files,
		});
	});
});

restRouter.post('/', authorizeAdmin, (req, res) => {
	var cfg = req.body;
	Configuration.saveConfig(cfg, true);
	res.send({ ok: true }); // TODO: Add headers
});

restRouter.get('/collections', authorize, (req, res) => {
	res.json(Configuration.getBasicConfig().collections);
});

restRouter.get('/tracks/:collectionId', authorizeAdmin, (req, res) => {

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
	if (req.query.search)
		params.search = req.query.search;
	MediaProvider.getTracklist(params, (tracks) => res.json(tracks));
});

restRouter.get('/playlists/:guid', authorize, (req, res) => {
	var parent_guid = req.params.guid;
	if (parent_guid == '0') // root
		parent_guid = null;
	MediaProvider.registry.getPlaylistContent(parent_guid, (err, playlists, tracks) => res.json({
		playlists: playlists,
		tracks: tracks
	}));
});

restRouter.post('/collections', authorizeAdmin, (req, res) => {
	var collection = req.body;
	Configuration.saveCollection(collection);
	res.send({ ok: true }); // TODO: Add headers
});

restRouter.post('/collections/:idCollection/rescan', authorizeAdmin, (req, res) => {
	var idCollection;
	try {
		idCollection = Number(req.params.idCollection);
	} catch (err) {
		res.status(400).end(err);
		return;
	}
	Configuration.rescanCollection(idCollection);
	res.send({ ok: true }); // TODO: Add headers
});

restRouter.delete('/collections', authorizeAdmin, (req, res) => {
	var collection = req.body;
	Configuration.deleteCollection(collection);
	res.send({ ok: true }); // TODO: Add headers and correct code
});

restRouter.get('/log/:logType', authorizeAdmin, (req, res) => {
	res.json(logger.getLog(req.params.logType));
});

restRouter.get('/players/', authorize, (req, res) => {
	res.json(Clients.getClients());
});

restRouter.post('/players/:id/seek/:newTime', authorize, (req, res) => {
	res.json(Clients.sendCommand(req.params.id, 'seek', req.params.newTime));
});

restRouter.post('/players/:id/:command', authorize, (req, res) => {
	res.json(Clients.sendCommand(req.params.id, req.params.command, req.body));
});

restRouter.get('/storage', authorizeAdmin, (req, res) => {
	// gets free/used disc space (used by MM5 sync)			
	checkDiskSpace(os.homedir()).then((diskSpace) => {
		res.json({
			space: {
				total: diskSpace.size,
				used: diskSpace.size - diskSpace.free
			},
			defaultDirectories: {
				'audio': MediaProvider.getDefaultFolderForMime('audio/*'),
				'video': MediaProvider.getDefaultFolderForMime('video/*')
			}
		});
	});
});

restRouter.get('/version', authorizeAdmin, (req, res) => {
	res.json({
		'version': Package.version,
		'node.js': process.version.substr(1)
	});
});

restRouter.post('/scan', authorizeAdmin, (req, res) => {
	var obj = req.body;
	if (obj.content) {
		MediaProvider.scan(obj.content, obj.justCheckAccess, (results) => {
			res.json({
				items: results
			});
		});
	} else {
		res.writeHead(400, 'Bad Request');
	}
});

restRouter.post('/upload-session', authorizeAdmin, (req, res) => {
	MediaProvider.createUploadSession(req, res);
});

restRouter.put('/upload/:id', authorizeAdmin, (req, res) => {
	MediaProvider.processUpload(req.params.id, req, res);
});

restRouter.post('/upload-playlist', authorizeAdmin, (req, res) => {
	MediaProvider.processPlaylistUpload(req, res);
});

restRouter.post('/update', authorizeAdmin, (req, res) => {
	MediaProvider.processUpdate(req, res);
});

restRouter.post('/images', authorizeAdmin, (req, res) => {
	MediaProvider.processImages(req.body, (err, success) => {
		if (err)
			res.status(400).end(err);
		else
			res.status(200).json(success);
	});
});

restRouter.post('/get-resources', authorizeAdmin, (req, res) => {
	MediaProvider.getResources(req.body, (err, success) => {
		if (err)
			res.status(404).end(err);
		else
			res.status(200).json(success);
	});
});

// Get info about stream to be played (will it be transcoded, etc.)
restRouter.get('/stream/:id/info', authorize, (req, res) => {
	// var ext = PathNormalizer.getFileExt(id);
	var id = PathNormalizer.removeFileExt(req.params.id); // some clients (like Chromecast) requires the correct extension in the stream link
	MediaProvider.getStreamInfo(id, req, res);
});

// Get stream for playback
restRouter.get('/stream/:id', authorize, (req, res) => {
	if (req.headers && req.headers.origin)
		res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
	var ext = PathNormalizer.getFileExt(req.params.id);
	if (ext === 'm3u8') {
		req.query = req.query || {};
		req.query.forceHLS = true;
	}

	var id = PathNormalizer.removeFileExt(req.params.id); // some clients (like Chromecast) requires the correct extension in the stream link
	MediaProvider.getFileStream(id, req, res);
});

// Get individual parts of transcoded streams (.ts)
restRouter.get('/trans/:id/:file', authorize, (req, res) => {
	if (req.headers && req.headers.origin)
		res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
	const trans = Transcoder.getById(req.params.id);
	if (trans)
		trans.getFile(req.params.file).then(stream => {
			stream.pipe(res);
		}).catch(() => {
			res.status(404).end();
		});
	else {
		logger.error('Invalid transcoding session request.');
		res.status(400).json({
			error: 'Transcoding session doesn\'t exist'
		});
	}
});

restRouter.get('/last-content-token', authorizeAdmin, (req, res) => {
	MediaProvider.registry.getLastContentToken((token) => {
		res.json({
			token: token
		});
	});
});

restRouter.get('/content-changes/:token', authorizeAdmin, (req, res) => {
	MediaProvider.getContentChanges(req.params.token, (err, changes) => {
		if (err) {
			res.status(400).json({
				error: err
			});
		} else
			res.json(changes);
	});
});

restRouter.use('/user', require('./users'));

module.exports = restRouter;