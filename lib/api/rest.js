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

const Auth = require('../auth');
const performanceMonitor = require('../db/performanceMonitor');

logger.verbose('Using node.js ' + process.version);

const router = express.Router();

router.get('/', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	res.json(Configuration.getPublicConfig());
});

router.post('/stop', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	res.send({ ok: true });
	pubsub.publishSync('APP_END', null);
});

// Return the list of folders at a given path		
// TODO: Don't show hidden folders (?). Not easy to do on Windows, no node.js API
router.get('/folders', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	var lpath = req.query.path + ''; //2020-09-12 JL: forced req.query.path to be string to avoid TS error
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

router.post('/', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	var cfg = req.body;
	Configuration.saveConfig(cfg, true);
	res.send({ ok: true }); // TODO: Add headers
});

router.get('/collections', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	res.json(Configuration.getBasicConfig().collections);
});

router.get('/tracks/:collectionId', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {

	var params = {};
	if (req.params.collectionId) {
		var collections = Configuration.getBasicConfig().collections;
		for (var c of collections) {
			let collectionId = parseInt(req.params.collectionId);
			if (c.id == collectionId)
				params.folders = c.folders;
		}
	}
	if (req.query.sort)
		params.sort = req.query.sort;
	if (req.query.filter)
		params.filters = JSON.parse(req.query.filter + '');
	if (req.query.search)
		params.search = req.query.search;
	MediaProvider.getTracklist(params, (tracks) => res.json(tracks));
});

router.get('/playlists/:guid', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	var parent_guid = req.params.guid;
	if (parent_guid == '0') // root
		parent_guid = null;
	MediaProvider.registry.getPlaylistContent(parent_guid, (err, playlists, tracks) => res.json({
		playlists: playlists,
		tracks: tracks
	}));
});

router.post('/collections', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	var collection = req.body;
	Configuration.saveCollection(collection);
	res.send({ ok: true }); // TODO: Add headers
});

router.post('/collections/:idCollection/rescan', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
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

router.delete('/collections', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	var collection = req.body;
	Configuration.deleteCollection(collection);
	res.send({ ok: true }); // TODO: Add headers and correct code
});

router.get('/log/:logType', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	res.json(logger.getLog(req.params.logType));
});

router.get('/players/', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	res.json(Clients.getClients());
});

router.post('/players/:id/seek/:newTime', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	res.json(Clients.sendCommand(req.params.id, 'seek', req.params.newTime));
});

router.post('/players/:id/:command', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	res.json(Clients.sendCommand(req.params.id, req.params.command, req.body));
});

router.get('/storage', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
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

router.get('/version', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	res.json({
		'version': Package.version,
		'node.js': process.version.substr(1)
	});
});

router.post('/scan', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
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

router.post('/upload-session', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.createUploadSession(req, res);
});

router.put('/upload/:id', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.processUpload(req.params.id, req, res);
});

router.post('/upload-playlist', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.processPlaylistUpload(req, res);
});

router.post('/update', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.processUpdate(req, res);
});

router.post('/images', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.processImages(req.body, (err, success) => {
		if (err)
			res.status(400).end(err);
		else
			res.status(200).json(success);
	});
});

router.post('/get-resources', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.getResources(req.body, (err, success) => {
		if (err)
			res.status(404).end(err);
		else
			res.status(200).json(success);
	});
});

// Get info about stream to be played (will it be transcoded, etc.)
router.get('/stream/:id/info', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	// var ext = PathNormalizer.getFileExt(id);
	var id = PathNormalizer.removeFileExt(req.params.id); // some clients (like Chromecast) requires the correct extension in the stream link
	MediaProvider.getStreamInfo(id, req, res);
});

// Get stream for playback
router.get('/stream/:id', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
	if (req.headers && req.headers.origin)
		res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
	var ext = PathNormalizer.getFileExt(req.params.id);
	if (ext === 'm3u8') {
		req.query = req.query || {};
		req.query.forceHLS = '1'; // 2020-09-12 JL: changed 'true' to '1' (TS was saying boolean not assignable to string)
	}

	var id = PathNormalizer.removeFileExt(req.params.id); // some clients (like Chromecast) requires the correct extension in the stream link
	MediaProvider.getFileStream(id, req, res);
});

// Get individual parts of transcoded streams (.ts)
router.get('/trans/:id/:file', Auth.authorize(process.env.ACCESS_VIEWER), (req, res) => {
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

router.get('/last-content-token', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.registry.getLastContentToken((token) => {
		res.json({
			token: token
		});
	});
});

router.get('/content-changes/:token', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	MediaProvider.getContentChanges(req.params.token, (err, changes) => {
		if (err) {
			res.status(400).json({
				error: err
			});
		} else
			res.json(changes);
	});
});

//Quick ping function for client to check if the server is still alive
router.all('/ping', (req, res) => {
	
	var isLoggedIn = (req.user) ? true : false;
	
	res.send({
		loggedIn: isLoggedIn,
	});
});

router.use('/user', require('./users'));

router.use('/performanceMetrics', Auth.authorize(process.env.ACCESS_ADMIN), (req, res) => {
	res.send(performanceMonitor.dump());
});

module.exports = router;