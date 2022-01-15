/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

const MemoryRegistry = require('./memoryRegistry');
const sqlLayer = require('./sqlLayer');
const logger = require('../logger');
const debug = require('debug')('upnpserver:sqlRegistry');
const Path = require('path');
const PathNormalizer = require('../util/pathNormalizer');
const assert = require('assert');
const Async = require('async');
const vsprintf = require('sprintf-js').vsprintf;
const Semaphore = require('../util/semaphore');
const Uuid = require('uuid/v4');
const Configuration = require('../configuration');
const crypto = require('crypto');

class SQLRegistry extends MemoryRegistry {

	initialize(callback) {
		debug('initialize: ENTER');
		this._changedItems = {};
		
		const startTime = Date.now();
		
		Configuration.getDataDir((err, dir) => {
			if (err) return callback(err);
			const path = Path.normalize(Path.join(dir, 'mms.db'));
			this.sql = new sqlLayer(path);
				
			this.createDBStructure(err => {
				if (err) return callback(err);
		
				var dt = Date.now() - startTime;
				logger.info(`Database loaded in ${dt>3000?Math.round(dt/1000):(dt/1000).toFixed(2)} seconds`);
					
				this.prepareStatements(err => {
					if (err) return callback(err);
						
					var d2t = Date.now() - startTime - dt;
					logger.info(`Prepared statements in ${d2t>3000?Math.round(d2t/1000):(d2t/1000).toFixed(2)} seconds`);
			
					super.initialize(callback);
						
				});
			});
		});	
	}
	
	prepareStatements(callback) {
		debug('prepareStatements: ENTER');
		const sqlStatements = {
			insertUser: 'INSERT INTO users (_id, name, display_name, role_key, password) VALUES (?,?,?,?,?)',
			getUserByName: 'SELECT * FROM users WHERE name = ?',
			getUserById: 'SELECT * FROM users WHERE _id = ?',
			updateUser: 'UPDATE users SET name = ?, display_name = ?, role_key = ?, password = ? WHERE _id = ?',
			getUserFromSessionToken: 'SELECT * FROM users WHERE _id IN ( SELECT user_id FROM user_sessions WHERE token = ? AND token_expire > ? )',
			insertSession: 'INSERT INTO user_sessions (token, token_expire, token_created, user_id, useragent, ip) VALUES (?,?,?,?,?,?)',
			pruneOldSessions: 'DELETE FROM user_sessions WHERE token_expire < ?',
			getRole: 'SELECT * FROM user_roles WHERE key=?',
			getRoles: 'SELECT * FROM user_roles ORDER BY access_level',
			
			getMedia: 'SELECT * from media',
			getMediaByPath: 'SELECT * FROM media WHERE path = ?',
			getMediaById: 'SELECT * FROM media WHERE _id = ?',
			getMediaBySyncId: 'SELECT * FROM media WHERE sync_id = ?',
			getMediaByTextSearch: 'SELECT * FROM media WHERE _id IN (SELECT rowid FROM MediaText WHERE MediaText MATCH ?)',
			getIdAndSyncIdByPath: 'SELECT _id, sync_id FROM media WHERE path = ?',
			getIdBySyncId: 'SELECT _id, sync_id FROM media WHERE sync_id = ?',
			updateMediaBySyncId: 'UPDATE media SET path = ?, title = ?, album = ?, artist = ?, album_artist = ?, actor = ?, composer = ?, producer = ?, director = ?, publisher = ?, contributor= ?, lyricist = ?, conductor = ?, bpm = ?, genre = ?, rating = ?, playcount = ?, skipcount = ?, bookmark = ?, comment = ?, duration = ?, size = ?, mime_type = ?, year = ?, trackNumber = ?, discNumber = ?, lyrics = ?, last_time_played = ?, volumeLeveling = ?, normalizeTrack = ?, normalizeAlbum = ?, parental_rating = ?, grouping = ?, tempo = ?, mood = ?, occasion = ?, quality = ?, isrc = ?, initialKey = ?, originalTitle = ?, originalArtist = ?, originalLyricist = ?, originalDate = ?, copyright = ?, encoder = ?, subtitle = ?, custom1 = ?, custom2 = ?, custom3 = ?, custom4 = ?, custom5 = ?, custom6 = ?, custom7 = ?, custom8 = ?, custom9 = ?, custom10 = ?, album_art = ? WHERE sync_id = ?',
			insertMedia: 'INSERT INTO media (path, title, album, artist, album_artist, actor, composer, producer, director, publisher, contributor, lyricist, conductor, bpm, genre, rating, playcount, skipcount, bookmark, comment, duration, size, mime_type, year, trackNumber, discNumber, lyrics, last_time_played, volumeLeveling, normalizeTrack, normalizeAlbum, parental_rating, grouping, tempo, mood, occasion, quality, isrc, initialKey, originalTitle, originalArtist, originalLyricist, originalDate, copyright, encoder, subtitle, custom1, custom2, custom3, custom4, custom5, custom6, custom7, custom8, custom9, custom10, album_art, sync_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
			deleteMediaByPath: 'DELETE FROM media WHERE path = ?',
			deleteMediaByIdList: 'DELETE FROM media WHERE _id IN (?)',
			
			getCollections: 'SELECT * FROM collections',		
			getCollectionById: 'SELECT * FROM collections WHERE _id = ?',
			updateCollectionById: 'UPDATE collections SET title = ?, config = ? WHERE _id = ?',
			insertCollection: 'INSERT INTO collections (title, config) VALUES (?,?)',
						
			getPlaylistsByParentGuid: 'SELECT * FROM playlists WHERE parent_guid = ?',
			getPlaylistContent: 'SELECT media.* FROM media, playlist_items_map WHERE media._id = playlist_items_map.media_id AND playlist_items_map.playlist_guid = ? ORDER BY playlist_items_map.play_order',
			getPlaylistLastModifiedByGuid: 'SELECT last_modified FROM playlists WHERE guid = ?',
			updatePlaylistByGuid: 'UPDATE playlists SET title = ?, parent_guid = ?, last_modified = ?, criteria = ? WHERE guid = ?',
			insertPlaylist: 'INSERT INTO playlists (title, parent_guid, last_modified, criteria, guid) VALUES (?,?,?,?,?)',
			deletePlaylistByGuid: 'DELETE FROM playlists WHERE guid = ?',
			clearUnusedPlaylists: 'DELETE FROM playlists WHERE parent_guid IS NOT NULL AND parent_guid NOT IN (SELECT guid FROM playlists)',
					
			deletePlaylistItems: 'DELETE FROM playlist_items_map WHERE playlist_guid = ?',
			insertPlaylistItem: 'INSERT INTO playlist_items_map (playlist_guid, media_id, play_order) VALUES (?,?,?)',
			
			checkContentPointsByToken: 'SELECT null FROM content_points WHERE token = ?',
			insertContentToken: 'INSERT INTO content_points (token) VALUES (?)',
			getLastContentToken: 'SELECT token FROM content_points ORDER BY _id DESC LIMIT 1',
			
			getContentChangesByToken: 'SELECT * FROM content_changes WHERE token > ?',
			insertContentChange: 'INSERT INTO content_changes (token, timestamp, item_type, item_oper, item_sync_id) VALUES (?,?,?,?,?)',
			deleteContentChange: 'DELETE FROM content_changes WHERE item_type = ? AND item_oper IN (?,?) AND item_sync_id = ?',
		};
		
		
		this.statements = {};
		
		try {
			for (var stmtId in sqlStatements) {
				this.sql.addStatement(stmtId, sqlStatements[stmtId]);
			}
			callback(null);
		}
		catch (err) {
			console.error(err);
			console.log(`Possible problematic statement: ${stmtId}`);
			callback(err);
		}
	}

	createDBStructure(callback) {
		debug('createDbStructure: ENTER');
		try {
			this.sql.prepare('CREATE TABLE IF NOT EXISTS db_info (version INTEGER)').run();

			var version = 0;
			
			var row = this.sql.prepare('SELECT * FROM db_info').get();
			if (row) version = row.version;
			
			var text_unicode = 'TEXT'; // 'TEXT COLLATE UNICODE'; // TODO: UNICODE collation
			var queries = [];

			if (version < 1) {
				queries.push('PRAGMA foreign_keys = ON'); // needs to be enabled to FOREIGN KEY (and ON DELETE CASCADE) to work
				queries.push('CREATE TABLE IF NOT EXISTS media (' +
							'_id                  INTEGER PRIMARY KEY AUTOINCREMENT,' +
							'sync_id              TEXT UNIQUE NOT NULL,' +
							'title                ' + text_unicode + ',' +
							'album                ' + text_unicode + ',' +
							'album_art            ' + text_unicode + ',' +
							'path                 TEXT,' +
							'mime_type            ' + text_unicode + ',' +
							'date_added           TEXT,' +
							'date_sync            TEXT,' +
							'duration             INTEGER,' +
							'bpm                  INTEGER,' +
							'trackNumber          ' + text_unicode + ',' +
							'discNumber           ' + text_unicode + ',' +
							'year                 INTEGER,' +
							'type                 INTEGER,' +
							'rating               INTEGER DEFAULT -1 NOT NULL,' +
							'last_time_played     TEXT,' +
							'bookmark             INTEGER DEFAULT 0 NOT NULL,' +
							'playcount            INTEGER DEFAULT 0 NOT NULL,' +
							'skipcount            INTEGER DEFAULT 0 NOT NULL,' +
							'volumeLeveling       DOUBLE  DEFAULT 0.0 NOT NULL,' +
							'normalizeTrack       DOUBLE  DEFAULT 0.0 NOT NULL,' +
							'normalizeAlbum       DOUBLE  DEFAULT 0.0 NOT NULL,' +
							'lyrics               ' + text_unicode + ',' +
							'size                 INTEGER,' +
							'bitrate              INTEGER,' +
							'resolution           INTEGER,' +
							'framerate            INTEGER,' +
							'channels             INTEGER,' +
							'samplerate           INTEGER,' +
							'bitsPerSample        INTEGER,' +
							'date_release         INTEGER,' +
							'language             ' + text_unicode + ',' +
							'artist               ' + text_unicode + ',' +
							'album_artist         ' + text_unicode + ',' +
							'genre                ' + text_unicode + ',' +
							'composer             ' + text_unicode + ',' +
							'conductor            ' + text_unicode + ',' +
							'lyricist             ' + text_unicode + ',' +
							'producer             ' + text_unicode + ',' +
							'publisher            ' + text_unicode + ',' +
							'actor                ' + text_unicode + ',' +
							'director             ' + text_unicode + ',' +
							'contributor          ' + text_unicode + ',' +
							'originalTitle        ' + text_unicode + ',' +
							'originalArtist       ' + text_unicode + ',' +
							'originalLyricist     ' + text_unicode + ',' +
							'originalDate         INTEGER,' +
							'parental_rating      ' + text_unicode + ',' +
							'grouping             ' + text_unicode + ',' +
							'tempo                ' + text_unicode + ',' +
							'mood                 ' + text_unicode + ',' +
							'occasion             ' + text_unicode + ',' +
							'quality              ' + text_unicode + ',' +
							'comment              ' + text_unicode + ',' +
							'isrc                 ' + text_unicode + ',' +
							'initialKey           ' + text_unicode + ',' +
							'custom1              ' + text_unicode + ',' +
							'custom2              ' + text_unicode + ',' +
							'custom3              ' + text_unicode + ',' +
							'custom4              ' + text_unicode + ',' +
							'custom5              ' + text_unicode +
							')');
				queries.push('CREATE INDEX IF NOT EXISTS idx_media_path ON media (path)');
				queries.push('CREATE INDEX IF NOT EXISTS idx_media_sync_id ON media (sync_id)');
				queries.push(
					'CREATE TABLE IF NOT EXISTS playlists (' +
							'title       TEXT,' +
							'criteria    TEXT,' + // for the future auto-playlist features
							'guid        TEXT PRIMARY KEY,' +
							'last_modified TEXT,' +
							'parent_guid TEXT' +
							')');
				queries.push(
					'CREATE TABLE IF NOT EXISTS playlist_items_map (' +
							'_id           INTEGER PRIMARY KEY AUTOINCREMENT,' +
							'media_id      TEXT NOT NULL,' +
							'playlist_guid TEXT NOT NULL,' +
							'play_order    INTEGER,' +
							'FOREIGN KEY ( media_id ) REFERENCES media ( _id ) ON DELETE CASCADE,' +
							'FOREIGN KEY ( playlist_guid ) REFERENCES playlists ( guid ) ON DELETE CASCADE' +
							')');
				queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_guid ON playlists (guid)');
				queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_parent_guid ON playlists (parent_guid)');
				queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_map_media_id ON playlist_items_map (media_id)');
				queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_map_playlist_guid ON playlist_items_map (playlist_guid)');

				queries.push(
					'CREATE TABLE IF NOT EXISTS collections (' +
							'_id         INTEGER PRIMARY KEY AUTOINCREMENT,' +
							'title       TEXT,' +
							'config      TEXT' +
							')');
				queries.push('INSERT INTO db_info (version) VALUES (1)');
			}
			if (version < 2) {
				queries.push('ALTER TABLE media ADD COLUMN copyright ' + text_unicode);
				queries.push('ALTER TABLE media ADD COLUMN encoder ' + text_unicode);
				queries.push('ALTER TABLE media ADD COLUMN subtitle ' + text_unicode);
				queries.push('UPDATE db_info SET version = 2');
			}
			if (version < 3) {
				// FTS creation moved to the next update (because further custom fields were added)
				queries.push('UPDATE db_info SET version = 3');
			}
			if (version < 4) {
				queries.push('ALTER TABLE media ADD COLUMN custom6 ' + text_unicode);
				queries.push('ALTER TABLE media ADD COLUMN custom7 ' + text_unicode);
				queries.push('ALTER TABLE media ADD COLUMN custom8 ' + text_unicode);
				queries.push('ALTER TABLE media ADD COLUMN custom9 ' + text_unicode);
				queries.push('ALTER TABLE media ADD COLUMN custom10 ' + text_unicode);

				//queries.push('PRAGMA compile_options; ENABLE_FTS5');						
				queries.push('DROP table IF EXISTS MediaText');

				var comma_fields = 'path, title, album, artist, album_artist, actor, composer, producer, director, publisher, contributor, lyricist, conductor, genre, lyrics, parental_rating, grouping, tempo, mood, occasion, quality, comment, isrc, initialKey, originalTitle, originalArtist, originalLyricist, copyright, encoder, subtitle, custom1, custom2, custom3, custom4, custom5, custom6, custom7, custom8, custom9, custom10';
				queries.push('CREATE VIRTUAL TABLE MediaText USING FTS5 ( tokenize = \'unicode61\', content=\'media\', content_rowid=\'_id\',' + comma_fields + ')');

				queries.push('DROP TRIGGER IF EXISTS insert_media');
				queries.push('CREATE TRIGGER insert_media AFTER INSERT ON media ' +
							'BEGIN' +
							'  INSERT INTO MediaText (rowid, path, title, album, artist, album_artist, actor, composer, producer, director, publisher, contributor, lyricist, conductor, genre, comment, lyrics, parental_rating, grouping, tempo, mood, occasion, quality, isrc, initialKey, originalTitle, originalArtist, originalLyricist, copyright, encoder, subtitle, custom1, custom2, custom3, custom4, custom5, custom6, custom7, custom8, custom9, custom10)' +
							'  VALUES (new._id, new.path, new.title, new.album, new.artist, new.album_artist, new.actor, new.composer, new.producer, new.director, new.publisher, new.contributor, new.lyricist, new.conductor, new.genre, new.comment, new.lyrics, new.parental_rating, new.grouping, new.tempo, new.mood, new.occasion, new.quality, new.isrc, new.initialKey, new.originalTitle, new.originalArtist, new.originalLyricist, new.copyright, new.encoder, new.subtitle, new.custom1, new.custom2, new.custom3, new.custom4, new.custom5, new.custom6, new.custom7, new.custom8, new.custom9, new.custom10);' +
							'END;');

				queries.push('DROP TRIGGER IF EXISTS delete_media');
				queries.push('CREATE TRIGGER delete_media DELETE ON media ' +
							'BEGIN' +
							'  DELETE FROM MediaText WHERE rowid=old._id;' +
							'END;');

				var createFullTextTrigger = (field) => {
					queries.push(vsprintf('DROP TRIGGER IF EXISTS update_media_%s', [field]));
					queries.push(vsprintf('CREATE TRIGGER update_media_%s UPDATE OF %s ON media WHEN new.%s<>old.%s ' +
								'BEGIN' +
								'  UPDATE MediaText SET %s=new.%s WHERE rowid=new._id;' +
								'END;', [field, field, field, field, field, field]));
				};

				var c = createFullTextTrigger;
				c('path');
				c('title');
				c('album');
				c('artist');
				c('album_artist');
				c('actor');
				c('composer');
				c('producer');
				c('director');
				c('publisher');
				c('contributor');
				c('lyricist');
				c('conductor');
				c('genre');
				c('comment');
				c('lyrics');
				c('parental_rating');
				c('grouping');
				c('tempo');
				c('mood');
				c('occasion');
				c('quality');
				c('isrc');
				c('initialKey');
				c('originalTitle');
				c('originalArtist');
				c('originalLyricist');
				c('copyright');
				c('encoder');
				c('subtitle');
				c('custom1');
				c('custom2');
				c('custom3');
				c('custom4');
				c('custom5');
				c('custom6');
				c('custom7');
				c('custom8');
				c('custom9');
				c('custom10');

				queries.push('INSERT INTO MediaText (rowid,' + comma_fields + ') SELECT _id AS rowid,' + comma_fields + ' FROM media');

				queries.push('UPDATE db_info SET version = 4');
			}
			if (version < 5) {
				queries.push(
					'CREATE TABLE IF NOT EXISTS content_points (' +
							'_id         	INTEGER PRIMARY KEY AUTOINCREMENT,' +
							'token       	INTEGER' +
							')');
				queries.push(
					'CREATE TABLE IF NOT EXISTS content_changes (' +
							'_id           INTEGER PRIMARY KEY AUTOINCREMENT,' +
							'timestamp     INTEGER,' +
							'token         INTEGER,' +
							'item_type     TEXT NOT NULL,' +
							'item_oper     TEXT NOT NULL,' +
							'item_sync_id  TEXT' +
							')');
				queries.push('CREATE INDEX IF NOT EXISTS idx_content_changes_token ON content_changes (token)');
				queries.push('UPDATE db_info SET version = 5');
			}
			if (version < 6) {
				queries.push(
					'CREATE TABLE IF NOT EXISTS user_roles (' +
							'key			TEXT NOT NULL UNIQUE,' +
							'label			TEXT NOT NULL UNIQUE,' +
							'access_level	INTEGER NOT NULL UNIQUE,' +
							'PRIMARY KEY(key)' +
							')'
				);
				queries.push({
					sql: 'INSERT INTO user_roles (key, label, access_level) VALUES (?, ?, ?)',
					params: ['viewer', 'Viewer', 0]
				});
				queries.push({
					sql: 'INSERT INTO user_roles (key, label, access_level) VALUES (?, ?, ?)',
					params: ['editor', 'Editor', 1],
				});
				queries.push({
					sql: 'INSERT INTO user_roles (key, label, access_level) VALUES (?, ?, ?)',
					params: ['admin', 'Admin', 2],
				});
				queries.push('UPDATE db_info SET version = 6');
			}
			if (version < 7) {
				queries.push(
					'CREATE TABLE IF NOT EXISTS users (' +
								'_id			TEXT NOT NULL UNIQUE,' +
								'name			TEXT NOT NULL UNIQUE,' +
								'display_name	TEXT NOT NULL,' +
								'role_key		TEXT,' +
								'password		TEXT NOT NULL,' +
								'FOREIGN KEY(role_key) REFERENCES user_roles(key),' +
								'PRIMARY KEY(_id)' +
							')'
				);
				//Default admin user with password 'admin'
				queries.push({
					sql: 'INSERT INTO users (_id, name, display_name, role_key, password) VALUES (?,?,?,?,?)',
					params: ['pFHsj0iAabgvX1Mp', 'admin', 'Admin', 'admin', '$2a$04$DWc3YDK8zbOoAcWB81LZ0eegQ8nnx7XE9xLli3njgfVlP93JdYDSC']
				});
				queries.push('UPDATE db_info SET version = 7');
			}
			if (version < 8) {
				queries.push(
					'CREATE TABLE IF NOT EXISTS user_sessions (' +
								'token			TEXT NOT NULL UNIQUE,' +
								'token_expire	INTEGER NOT NULL,' + // Note: JS Date() format
								'token_created	INTEGER NOT NULL,' +
								'user_id		TEXT NOT NULL,' +
								'useragent		TEXT,' +	// TODO: Configurable option to enable/disable useragent+IP session storage
								'ip				TEXT,' +	//	Purpose: Someone may wish to share their media server to the public & may wish to audit usage
								'FOREIGN KEY(user_id) REFERENCES users(_id),' +
								'PRIMARY KEY(token)' +
							')'
				);
				queries.push('UPDATE db_info SET version = 8');
			}
			//execute queries in order
			for (var query of queries) {
				var stmt;
				//if query is an object with sql + params
				if (query.sql && query.params) {
					stmt = this.sql.prepare(query.sql);
					stmt.run(query.params);
				}
				//if query is just sql
				else {
					stmt = this.sql.prepare(query);
					stmt.run();
				}
			}
			callback();
		}
		catch (err) {
			if (query) console.log(query);
			console.log(err);
			callback(err);
		}
	}


	getMetas(path, topic, callback) {
		debug('getMetas: ENTER');
		
		if (typeof path != 'string') return callback('Path must be string');
		
		//With prepared statements, we no longer need the _doubleApostrophe function.
		var row = this.sql.getStatement('getMediaByPath').get(path);
		
		if (row) {
			var metas = this._assignMetasFromRow(row);
			callback(null, metas);
		}
		else {
			//callback('Query did not return any data');
			callback(null, null);
		}
	}

	/**
	 * Save metas of a particular track/media to db
	 * @param {string} path Path of media
	 * @param {any} mtime ?
	 * @param {import('../DataStructures').Metas} metas Track metas
	 * @param {function} callback Callbcak
	 */
	putMetas(path, mtime, metas, callback) {
		debug('putMetas: ENTER');

		if (!metas) {
			callback('metas undefined');
			return;
		}

		if (metas.mimeType == 'inode/directory') {
			callback();
			return;
		}

		path = PathNormalizer.normalize(path);

		logger.verbose('putMetas: ' + path + ' metas: ' + Object.keys(metas));
		
		//Determine which prepared SQL statement to execute
		var selectorStmtId, statementParam;
		if (!metas.sync_id) {
			metas.sync_id = this._newSyncId(metas);
			selectorStmtId = 'getIdAndSyncIdByPath';
			statementParam = path;
		}
		else {
			selectorStmtId = 'getIdBySyncId';
			statementParam = metas.sync_id;
		}
		
		// Lock transaction so that the same sync_id isn't processed by another scanning thread at the same time (resulting in double insertion)
		this.takeLock('media_insert', () => {
			
			var itemExists = false;
			//Check if item exists in the database
			var row = this.sql.getStatement(selectorStmtId).get(statementParam);
			if (row) {
				itemExists = true;
				metas.db_id = row._id;
				metas.sync_id = row.sync_id;
			}
			
			var mv = this._multiValueArr2Str;
			var nn = this._notNull;
			
			var rating = -1;
			if (metas.rating) rating = metas.rating;
			else if (metas.ratings && metas.ratings.length) rating = metas.ratings[0].rating;
			if (!metas.mimeType) metas.mimeType = PathNormalizer.getMime(path);
			
			var updateStmtId = itemExists ? 'updateMediaBySyncId' : 'insertMedia';
			var updateStmtParams = [path, metas.title, metas.album, mv(metas.artists), mv(metas.albumArtists), mv(metas.actors), mv(metas.authors), mv(metas.producers), mv(metas.directors), mv(metas.publishers), mv(metas.contributors), mv(metas.lyricists), mv(metas.conductors), metas.bpm, mv(metas.genres), rating, nn(metas.playcount), nn(metas.skipcount), nn(metas.bookmark), metas.comment, metas.duration * 1000, metas.size, metas.mimeType, metas.year, metas.originalTrackNumber, metas.originalDiscNumber, metas.lyrics, metas.last_time_played, nn(metas.volumeLeveling), nn(metas.volumeLevelTrack), nn(metas.volumeLevelAlbum), metas.parental_rating, metas.grouping, metas.tempo, metas.mood, metas.occasion, metas.quality, metas.isrc, metas.initialKey, metas.originalTitle, metas.originalArtist, metas.originalLyricist, metas.originalDate, metas.copyright, metas.encoder, metas.subtitle, metas.custom1, metas.custom2, metas.custom3, metas.custom4, metas.custom5, metas.custom6, metas.custom7, metas.custom8, metas.custom9, metas.custom10, JSON.stringify(metas.albumArts),
				metas.sync_id //needs to be the last
			];
			var info = this.sql.getStatement(updateStmtId).run(updateStmtParams);
			
			if (!itemExists) metas.db_id = info.lastInsertRowid;
			assert(metas.db_id, 'db_id missing for ' + metas.sync_id);
			
			if (info.changes < 1) {
				console.warn('Changes < 1');
			}

			this.leaveLock('media_insert');
			this._cleanCacheFor(['getTracklist', 'getFiles', 'filteredFileEntry']);
			
			if (itemExists) this._logContentChange('media', 'updated', metas.sync_id);
			else this._logContentChange('media', 'added', metas.sync_id);
			
			callback();
		});
	}
	
	/**
	 * 
	 * @param {import('../DataStructures').Metas} metas 
	 * @param {function} callback 
	 */
	deleteMetas(metas, callback) {
		debug('deleteMetas: ENTER');
		
		assert(metas.db_id && metas.sync_id, 'DB or sync id missing for ' + metas.title + ', path: ' + metas.path);
		logger.info('deleteMetas: db_id: ' + metas.db_id);
		
		this.sql.getStatement('deleteMediaByPath').run(metas.db_id);
		this._logContentChange('media', 'deleted', metas.sync_id);
		
		if (callback) callback();
		
		this._cleanCacheFor(['getTracklist', 'getFiles']);
	}
	

	getPlaylistContent(parent_guid, callback) {
		debug('getPlaylistContent: ENTER');
		assert(parent_guid, 'parent_guid must be specified.');
		
		var playlists = [];
		
		var playlistRows = this.sql.getStatement('getPlaylistsByParentGuid').all(parent_guid);
		
		for (let row of playlistRows) {
			playlists.push(this._playlistFromRow(row));
		}
		
		this.markItemContentChanged(parent_guid, false);
		
		if (parent_guid) {
			var files = [];
			
			var fileRows = this.sql.getStatement('getPlaylistContent').all(parent_guid);
				
			for (let row of fileRows) {
				var file = this._assignMetasFromRow(row);
				files.push(file);
			}
			
			debug(`getPlaylistContent: callback with playlists & files; lengths = ${playlists.length}, ${files.length}`);
			callback(null, playlists, files);
		}
		else {
			debug(`getPlaylistContent: callback with playlists, length = ${playlists.length}`);	
			callback(null, playlists);
		}
	}
	
	/**
	 * Get playlists by [params]
	 * @param {object} params params
	 * @param {array} params.guidArray guidArray
	 */
	getPlaylistsBy(params) {
		debug('getPlaylistsBy: ENTER');
		
		var playlists = [];
		assert(params.guidArray, 'getPlaylistsBy params: only guidArray is supported now');
		
		if (params.guidArray.length != 0) {
			var rows = this.sql.db.exec('SELECT * FROM playlists WHERE guid IN ("' + params.guidArray.join('","') + '")');
			
			if (rows && rows[0]) {
				for (var row of rows) {
					playlists.push(this._playlistFromRow(row));
				}
			}
		}
		
		return playlists;
	}

	getFiles(callback) {
		debug('getFiles: ENTER');
		var cache = this._getCacheFor('getFiles');
		if (cache.files) {
			debug(`getFiles: returning cache.files, cache.files=${typeof cache.files}, length=${cache.files.length}`);
			callback(null, cache.files);
		} else {
			cache.files = [];
			var files = cache.files;
			var startTime = Date.now();
			
			var rows = this.sql.getStatement('getMedia').all();
			
			for (var row of rows) {
				var metas = this._assignMetasFromRow(row);
				files.push(metas);
			}
			
			logger.info(`${files.length} files have been read from database in ${(Date.now() - startTime)} ms`);
			
			//console.trace();
			
			callback(null, files);
		}
	}

	/**
	 * Get files by search phrase
	 * @param {object} params params
	 * @param {string} [params.searchPhrase] Search phrase
	 * @param {function} callback callback
	 * @returns {Array<import('../DataStructures').Metas>} files
	 */
	getFilesBy(params, callback) {
		debug('getFilesBy: ENTER');
		if (!params || !params.searchPhrase) {
			// all files
			return this.getFiles(callback); 
		} 
		else {
			logger.info(`Full text search for: ${params.searchPhrase}`);
			
			var files = [];
			var rows = this.sql.getStatement('getMediaByTextSearch').all(params.searchPhrase);
			
			for (var row of rows) {
				var metas = this._assignMetasFromRow(row);
				files.push(metas);
			}
			
			callback(null, files);
		}
	}
	
	/**
	 * Get individual file by id or sync id
	 * @param {object} criteria search criteria
	 * @param {number} [criteria.id] ID
	 * @param {number} [criteria.sync_id] sync ID
	 * @param {function} callback callback
	 */
	getFile(criteria, callback) {
		debug('getFile: ENTER');
		assert(criteria.id || criteria.sync_id, 'file id undefined');
		
		var file;
		var row;
		
		if (criteria.id) row = this.sql.getStatement('getMediaById').get(criteria.id);
		else if (criteria.sync_id) row = this.sql.getStatement('getMediaBySyncId').get(criteria.sync_id);
		
		if (row) {
			file = this._assignMetasFromRow(row);
			callback(null, file);
		}
		else {
			callback (`File with ${criteria.id?'id':'sync_id'} ${criteria.id||criteria.sync_id} not found`);
		}
	}

	garbageFilesOutOfFolders(folders, callback) {
		debug('garbageFilesOutOfFolders: ENTER');
		this.getFiles((err, files) => {
			var delete_ids = [];
			var deleted_files = [];
			for (var f of files) {
				if (!this._fileIsInFolders(f, folders)) {
					delete_ids.push(f.db_id);
					deleted_files.push(f);
				}
			}
			if (delete_ids.length) {
				
				var result = this.sql.getStatement('deleteMediaByIdList').run(delete_ids.join(','));
				logger.info(`garbageFilesOutOfFolders: result=${JSON.stringify(result)}`);
				
				this._cleanCacheFor(['getTracklist', 'getFiles']);
				Async.eachSeries(deleted_files,
					(metas, cbk) => {
						this._logContentChange('media', 'deleted', metas.sync_id);
						if (cbk) cbk();
					}, () => {
						if (callback)
							callback(err, deleted_files);
					}
				);
			} else {
				if (callback)
					callback(null, deleted_files);
			}
		});
	}
	
	/**
	 * 
	 * @param {import('../DataStructures').Playlist} item Playlist to insert
	 * @param {*} service 
	 * @param {*} callback 
	 */
	putPlaylist(item, service, callback) {
		debug('putPlaylist: ENTER');
		
		logger.info('putPlaylist: ' + item.name + ', guid: ' + item.guid + ', last_modified: ' + item.last_modified);
		
		var itemExists = false;
		var lastModified;
		
		var row = this.sql.getStatement('getPlaylistLastModifiedByGuid').get(item.guid);
		
		if (row) {
			itemExists = true;
			//Not sure if a "select x from table" statement returns an object or just the single variable
			//Might have to re-code it if this becomes an error
			if (typeof row != 'object') throw new TypeError('hey there, sorry, you\'ll have to fix my code lol. Check the comment above this line');
			lastModified = row.last_modified;
			
			if (lastModified > item.last_modified) {
				return callback('Playlist to put is older: ' + item.last_modified + ' than current ' + lastModified);
			}
			else if (lastModified == item.last_modified) {
				//up to date, already in database
				return callback(); 
			}
		}
		
		//determine whether to update playlist or insert playlist
		//	Parameters are the same either way
		var statementId = itemExists ? 'updatePlaylistByGuid' : 'insertPlaylist';
		var parameters = [item.name, item.parent_guid, item.last_modified, item.criteria, item.guid];
		
		//write playlist
		var plWriteResult = this.sql.getStatement(statementId).run(parameters);
		//clear playlistItems
		var plItemsDeleteResult = this.sql.getStatement('deletePlaylistItems').run(item.guid);
		
		//insert playlistItems
		var stmtInsert = this.sql.getStatement('insertPlaylistItem');
		for (var i = 0; i < item.track_ids.length; i++) {
			stmtInsert.run(item.guid, item.track_ids[i], i);
		}
		
		//log content change
		this.markItemContentChanged(item.parent_guid, true);
		if (itemExists) this._logContentChange('playlist', 'updated', item.guid);
		else this._logContentChange('playlist', 'added', item.guid);
		
		logger.trace(`playlistWriteResult=${JSON.stringify(plWriteResult)}, playlistItemsDeleteResult=${JSON.stringify(plItemsDeleteResult)}`);
		
		//end
		callback();
	}
	
	/**
	 * 
	 * @param {import('../DataStructures').Playlist|object} item playlist to delete
	 * @param {function} callback callback
	 */
	deletePlaylist(item, callback) {
		debug('deletePlaylist: ENTER');
		logger.info('deletePlaylist: guid: ' + item.guid);
		
		this.sql.getStatement('deletePlaylistByGuid').run(item.guid);
		this.sql.getStatement('clearUnusedPlaylists').run();
		
		this.markItemContentChanged(item.parent_guid, true);
		this._logContentChange('playlist', 'deleted', item.guid);
		
		callback();
	}
	
	/**
	 * 
	 * @param {number} token token
	 * @param {function} callback callback
	 */
	getContentChanges(token, callback) {
		debug('getContentChanges: ENTER');
		//2019-09-19 JL: changed deprecation callback into an assert
		assert((!isNaN(token)), 'non-integer tokens deprecated');
		
		var tokenExists;
		var changes = [];
		
		var tokenCheck = this.sql.getStatement('checkContentPointsByToken').get(token);
		
		if (tokenCheck) tokenExists = true;
		
		if (!tokenExists) return callback(`Token ${token} does not exist`);
		else {
			//get changes after token
			var rows = this.sql.getStatement('getContentChangesByToken').all(token);
			
			if (rows && rows[0]) {
				for (var row of rows) {
					changes.push({
						item_type: row.item_type,
						item_oper: row.item_oper,
						item_sync_id: row.item_sync_id
					});
				}
				callback(null, changes);
			}
			//2020-09-19 JL: Added a catch for when no content changes were found.
			// Not sure if we want to keep it this way. Easu to revert.
			else {
				callback('No content changes were found.');
			}
		}
	}
	
	/**
	 * Get user by name
	 * @param {string} username Username
	 * @returns {import('../DataStructures').User} user data
	 */
	getUserByName(username) {
		debug('getUserByName: ENTER');
		
		if (typeof username == 'string') {
			return this.sql.getStatement('getUserByName').get(username);
		}
		else {
			debug('getUserByName: Username not provided');
			return null;
		}
	}
	
	/**
	 * Get user by ID
	 * @param {string} _id User ID
	 * @returns {import('../DataStructures').User} user data
	 */
	getUserById(_id) {
		debug('getUserById: ENTER');
		
		return this.sql.getStatement('getUserById').get(_id);
	}
	
	/**
	 * Create user with given data
	 * @param {Object} userData User data to insert
	 * @returns {import('better-sqlite3').RunResult} Run Result
	 */
	insertUser(userData) {
		debug('insertUser: ENTER');
		if (typeof userData != 'object')throw new TypeError('sqlRegistry/insertUser: User must be of type object.');
		
		var _id = crypto.randomBytes(12).toString('base64');
		var name = userData.username;
		var display_name = userData.displayname || userData.display_name || '?';
		var role_key = userData.role_key;
		var password = userData.password;
		
		if (!name || !role_key || !password) {
			throw new Error('sqlRegistry/insertUser: Must specify username, role_key, and password');
		}
		
		//Check if _id has a clash; if so, just call this function again
		var idClashCheck = this.sql.getStatement('getUserById').get(_id);
		
		if (idClashCheck) {
			return this.insertUser(userData);
		}
		else {
			return this.sql.getStatement('insertUser').run(_id, name, display_name, role_key, password);
		}
	}
	
	/**
	 * Update user with given data
	 * @param {string} userId userID
	 * @param {Object} userData User data to update
	 * @returns {import('better-sqlite3').RunResult} Run Result
	 */
	updateUser(userId, userData) {
		debug('updateUser: ENTER');
		if (typeof userId != 'string') throw new TypeError('userId must be a string');
		if (typeof userData != 'object') throw new TypeError('userData must be an object');
		
		var existingUserData = this.getUserById(userId);
		
		const name = userData.name || existingUserData.name;
		const display_name = userData.display_name || existingUserData.display_name;
		const role_key = userData.role_key || existingUserData.role_key;
		const password = userData.password || existingUserData.password;
		
		return this.sql.getStatement('updateUser').run(name, display_name, role_key, password, userId);
	}
	
	/**
	 * Get user from session token
	 * @param {string} token Auth token
	 * @returns {import('../DataStructures').User} user data
	 */
	getUserFromSessionToken(token) {
		debug('getUserFromSessionToken: ENTER');
		
		return this.sql.getStatement('getUserFromSessionToken').get(token, Date.now());
	}
	
	/**
	 * 
	 * @param {string} token New token
	 * @param {Date|Number} token_expire Expiration time
	 * @param {string} userId User ID
	 * @param {string} [useragent] Useragent, for logging
	 * @param {string} [ip] IP address of user, for logging
	 */
	insertSession(token, token_expire, userId, useragent, ip) {
		debug('insertSession: ENTER');
		
		token_expire = new Date(token_expire).valueOf();
		assert(!isNaN(token_expire.valueOf()), 'token_expire is an invalid date.');
		assert(typeof userId === 'string', 'userId must be string.');
		assert(typeof token === 'string', 'token must be a string,');
		if (!useragent) useragent = null;
		if (!ip) ip = null;
		
		return this.sql.getStatement('insertSession').run(token, token_expire, Date.now(), userId, useragent, ip);
	}
	
	/**
	 * Get role by key
	 * @param {string} key Role key
	 * @returns {import('../DataStructures').Role} Role info
	 */
	getRole(key) {
		debug('getRole: ENTER');
		
		return this.sql.getStatement('getRole').get(key);
	}
	
	/**
	 * Get list of all roles, in order of access level
	 * @returns {Array<import('../DataStructures').Role>} Role info
	 */
	getRoles() {
		debug('getRoles: ENTER');
		
		return this.sql.getStatement('getRoles').all();
	}
	
	// == Public General Functions ==
	
	putConfig(config, callback) {
		debug('putConfig: ENTER');
		//console.log(config.collections);
		this._putCollections(config.collections, callback);
	}

	getConfig(config, callback) {
		debug('getConfig: ENTER');
		
		var rows = this.sql.getStatement('getCollections').all();
		var collections = [];
		
		if (rows && rows[0]) {
			for (var row of rows) {
				var _config = JSON.parse(row.config);
				collections.push({
					id: row._id,
					name: row.title,
					folders: _config.folders,
					type: _config.type
				});
			}
			//Only override collections if some already exist in the database
			config.collections = collections;
		}
		
		callback(null, config);
	}
	
	takeLock(lockName, callback) {
		debug('takeLock: ENTER');
		var semaphores = this._semaphores;
		if (!semaphores) {
			semaphores = {};
			this._semaphores = semaphores;
		}
		var semaphore = semaphores[lockName];
		if (!semaphore) {
			semaphore = new Semaphore(lockName);
			semaphores[lockName] = semaphore;
		}

		semaphore.take(callback);
	}

	leaveLock(lockName) {
		debug('leaveLock: ENTER');
		var semaphores = this._semaphores;
		if (!semaphores) {
			throw new Error('Invalid Semaphores context');
		}
		var semaphore = semaphores[lockName];
		if (!semaphore) {
			throw new Error('Invalid Semaphore context \'' + lockName + '\'');
		}

		semaphore.leave();
	}
	
	/**
	 * Validate FTS (search term?)
	 * @param {string} value Value to validate
	 * @returns {string} validated/filtered search query thing
	 */
	validateFTS(value) {
		debug('validateFTS: ENTER');
		var res;
		if (value) {
			res = value.trim();

			// quote strings with separators so that searching for "don't", "ah-a", "ac/dc" works	
			var separators = ['\'', '/', '-', '\\', '+', '^', '!', '?', ',', '|', ':', '.', '_', '(', ')', '[', ']', '&', '@', '#', '*', ';'];
			if (res.length && (res[0] != '"'))
				for (var sep of separators) {
					if (res.indexOf(sep) >= 0) {
						// hack, for some reason searching for quoted "a-h", "a h", "a- h", "a - h" crashes completely while "a-ha" works perfectly, why?? bug in FTS5
						// until this if fixed, we just replace the separators by space (and not auto-quote the strings)
						res = res.replace(sep, ' ');
						//res = '"' + res + '"';						
						break;
					}
				}
		}
		return res;
	}
	
	getItemContentChanged(guid) {
		debug('getItemContentChanged: ENTER');
		var _guid = guid;
		if (!_guid)
			_guid = 'root';
		return this._changedItems[_guid];
	}

	markItemContentChanged(guid, value) {
		debug('markItemContentChanged: ENTER');
		var _guid = guid;
		if (!_guid)
			_guid = 'root';
		this._changedItems[_guid] = value;
	}

	getLastContentToken() {
		debug('getLastContentToken: ENTER');
		// this way instances asks for the current token
		// mark this content token as distributed and change it to another token on next content change		
		var token = this._getLastContentToken();
		this._distributedContentToken = token;
		return token;
	}
	
	// == Internal Database Functions ==
	
	_newContentToken() {
		debug('_newContentToken: ENTER');
		// token changed to incremental integer here
		// this way instances can found whether another instance asked the token between the sync
		// example:
		//  i)   instance A asks the last token on the beging of sync, it gets '1'
		//  ii)  instance A performed the sync (writing new content)
		//  iii) instance A asks the last token again at the end of sync, it gets '2'
		//  this way instance A knows that all changes between token '1' and '2' were made by instance A and does not need to scan changes between 1 and 2
		//  i.e. if instance B asks the content in the middle of syncing with A then A gets '3' in the step iii)
		if (!this._currentContentToken)
			this._currentContentToken = 1;
		else
			this._currentContentToken++;

		this.sql.getStatement('insertContentToken').run(this._currentContentToken);
		
		return this._currentContentToken;
	}

	_getLastContentToken(canCreateNew) {
		debug('_getLastContentToken: ENTER');
		var token;
		
		if (this._currentContentToken) {
			token = this._currentContentToken;
		}
		//if current token is not defined
		else {
			var row = this.sql.getStatement('getLastContentToken').get();
			
			if (row) {
				//if this error is thrown, that means this code will have to be fixed, sorry :p
				if (!row.token) throw new TypeError('Sorry, looks like "select ___ from ____" returns just the value, not an object containing it.');
				this._currentContentToken = row.token;
				
				token = this._currentContentToken;
			}
			//if row not found
			else {
				if (canCreateNew) {
					token = this._newContentToken();
				}
				else {
					token = null;
				}
			}
		}
		
		return token;
	}
	
	_putCollection(item) {
		debug('_putCollection: ENTER');
				
		var _config = JSON.stringify({
			folders: item.folders,
			type: item.type
		});
		
		var collection = this.sql.getStatement('getCollectionById').get(item.id);
		var result;
		
		if (collection) {
			result = this.sql.getStatement('updateCollectionById').run(item.name, _config, item.id);
		}
		else {
			result = this.sql.getStatement('insertCollection').run(item.name, _config);
			item.id = result.lastInsertRowid;
		}
	}
	
	_putCollections(collections, callback) {
		debug('_putCollections: ENTER');
		
		var list = collections || [];
		var ids = [];
		var _processItem = function (idx) {
			if (idx >= list.length) {				
				if (ids.length) {
					this.sql.db.exec('DELETE FROM collections WHERE _id NOT IN (' + ids.join(',') + ')');					
				}				
				callback();
			} else {
				var coll = list[idx];
				
				this._putCollection(coll);
				ids.push(coll.id);
				_processItem(idx + 1);
			}
		}.bind(this);
		_processItem(0);
	}
	
	_logContentChange(item_type, operation, sync_id) {
		debug('_logContentChange: ENTER');
		logger.debug('Log content change: ' + item_type + ',' + operation + ',' + sync_id);
		
		var token = this._checkChangeToken();
		
		if (!token) {
			// no token in database yet, no need to track the changes (to save DB space)
			// i.e. waiting until an instance asks us for last content token
			return;
		}
		else {
			// token exists, track the changes:
			
			if (operation == 'added') {
				// item might be re-added, we need to remove the 'deleted' state (if exists)
				this.sql.getStatement('deleteContentChange').run([item_type, 'deleted', 'updated', sync_id]);
			}
			else if (operation == 'deleted') {
				// item was just deleted, remove all 'updated' and 'added' states added previously
				this.sql.getStatement('deleteContentChange').run([item_type, 'updated', 'added', sync_id]);
			}
				
			//now, insert content change
			this.sql.getStatement('insertContentChange').run([token, Date.now(), item_type, operation, sync_id]);
		}
	}
	
	// == Internal General Functions ==
	
	/**
	 * Turn row into metas object
	 * @param {object} row input
	 * @returns {import('../DataStructures').Metas} metas object
	 */
	_assignMetasFromRow(row) {
		
		//2020-09-19 JL: Now returns metas object, instead of being passed it in params
		var metas = {};
		
		var mv = this._multiValueStr2Arr;

		metas.db_id = row._id;
		metas.sync_id = row.sync_id;
		metas.path = row.path;
		metas.mimeType = row.mime_type;
		// upnp:* and dc:* properties:
		metas.title = row.title;
		metas.album = row.album;
		metas.artists = mv(row.artist);
		metas.albumArtists = mv(row.album_artist);
		metas.actors = mv(row.actor);
		metas.authors = mv(row.composer);
		metas.producers = mv(row.producer);
		metas.directors = mv(row.director);
		metas.publishers = mv(row.publisher);
		metas.genres = mv(row.genre);
		metas.year = row.year;
		metas.originalTrackNumber = Number(row.trackNumber);
		metas.originalDiscNumber = Number(row.discNumber);
		metas.duration = row.duration / 1000;
		metas.rating = row.rating;
		metas.ratings = [];
		metas.ratings.push({
			rating: row.rating,
			type: 'userRating'
		});
		metas.comment = row.comment;
		metas.lyrics = row.lyrics; // is used by 'lyrics' contentHandler to serve lyrics from upnp:lyricsURI

		// res@* properties:
		metas.size = row.size;
		/* TODO?: keep resource/format data in DB, they should served based on purpose (auto-converted to various supported formats)
        metas.bitrate = row.bitrate;
        metas.sampleFrequency = row.samplerate;
        metas.bitsPerSample = row.bitsPerSample;
        metas.nrAudioChannels = row.channels;
        metas.resolution = row.resolution;
        metas.framerate = row.framerate;
        */

		// unofficial
		metas.playcount = row.playcount;
		metas.skipcount = row.skipcount;
		metas.bookmark = row.bookmark;
		metas.bpm = row.bpm;
		metas.volumeLeveling = row.volumeLeveling;
		metas.volumeLevelTrack = row.normalizeTrack;
		metas.volumeLevelAlbum = row.normalizeAlbum;
		metas.last_time_played = row.last_time_played;
		metas.parental_rating = row.parental_rating;
		metas.grouping = row.grouping;
		metas.tempo = row.tempo;
		metas.mood = row.mood;
		metas.occasion = row.occasion;
		metas.quality = row.quality;
		metas.isrc = row.isrc;
		metas.initialKey = row.initialKey;
		metas.conductors = mv(row.conductor);
		metas.contributors = mv(row.contributor);
		metas.lyricists = mv(row.lyricist);
		metas.originalTitle = row.originalTitle;
		metas.originalArtist = row.originalArtist;
		metas.originalLyricist = row.originalLyricist;
		metas.originalDate = row.originalDate;
		metas.encoder = row.encoder;
		metas.copyright = row.copyright;
		metas.subtitle = row.subtitle;
		metas.custom1 = row.custom1;
		metas.custom2 = row.custom2;
		metas.custom3 = row.custom3;
		metas.custom4 = row.custom4;
		metas.custom5 = row.custom5;
		metas.custom6 = row.custom6;
		metas.custom7 = row.custom7;
		metas.custom8 = row.custom8;
		metas.custom9 = row.custom9;
		metas.custom10 = row.custom10;

		if (row.album_art) metas.albumArts = JSON.parse(row.album_art);
			
		return metas;
	}
	
	_multiValueStr2Arr(str) {
		return (typeof str == 'string') ? str.split(';') : [];
		/*
		if (str)
			return str.split(';');
		else
			return [];
		*/
	}

	_multiValueArr2Str(arr) {
		return (arr && arr.join) ? arr.join(';') : '';
		/*
		var res = '';
		if (ar) {
			res = ar.join(';');
		}
		return res;
		*/
	}

	_doubleApostrophe(str) {
		// LS: taken from https://jsfiddle.net/sgmnawf8/1/ -- bunch of alternate methods there + speed compare
		return str.split('\'').join('\'\'');
	}

	_notNull(value) {
		return value || 0;
	}
	
	/**
	 * @param {object} row Row
	 * @returns {import('../DataStructures').Playlist} playlist
	 */
	_playlistFromRow(row) {
		return {
			name: row.title,
			guid: row.guid,
			parent_guid: row.parent_guid,
			last_modified: row.last_modified,
			criteria: row.criteria
		};
	}
	
	_newSyncId(metas) {
		var res = Uuid();
		if (metas.title)
			res = metas.title.substr(0, 20) + '.' + res; // just for a better identification during debugging
		return res;
	}

	_checkChangeToken() {
		// check whether the last distributed token is the current
		// if yes, then we need to use new content for this content change
		var token = this._getLastContentToken(false);
		
		if (this._distributedContentToken && this._distributedContentToken == token) {
			token = this._newContentToken();
		}
		// original logic had an else callback(token) statement, but that would be redudant here
		return token;
	}
}

module.exports = SQLRegistry;
