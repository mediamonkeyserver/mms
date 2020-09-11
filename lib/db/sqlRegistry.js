/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

const MemoryRegistry = require('./memoryRegistry');
const SQLLayer = require('./sqlLayer');
const logger = require('../logger');
const Path = require('path');
const PathNormalizer = require('../util/pathNormalizer');
const assert = require('assert');
const Async = require('async');
const vsprintf = require('sprintf-js').vsprintf;
//var SqlString = require('sqlstring');
const Semaphore = require('../util/semaphore');
const Uuid = require('uuid/v4');
const Configuration = require('../configuration');
const crypto = require('crypto');


class SQLRegistry extends MemoryRegistry {

	initialize(callback) {
		this._changedItems = {};

		var now = Date.now();
		this.initializeDB((error) => {
			if (error) {
				return callback(error);
			}

			var dt = Date.now() - now;

			if (dt > 1500) {
				dt = Math.floor(dt / 1000);
				logger.info('Database loaded in ' + dt + ' second' + ((dt > 1) ? 's' : ''));
			} else {
				logger.info('Database loaded in ' + dt + ' ms');
			}

			super.initialize(callback);
		});
	}

	initializeDB(callback) {
		Configuration.getDataDir((err, dir) => {
			if (err)
				callback(err);
			else {
				var path = Path.join(dir, 'mms.db');
				path = Path.normalize(path);
				this.sql = new SQLLayer;
				this.sql.init(path, (error) => {
					if (error)
						callback(error);
					else {
						this.createDBStructure(callback);
					}
				});
			}
		});
	}

	createDBStructure(callback) {

		this.sql.exec(
			'CREATE TABLE IF NOT EXISTS db_info (' +
			'version INTEGER' +
			')', (err) => {
				if (err) {
					callback(err);
				} else {

					var version = 0;
					this.sql.open('SELECT * FROM db_info', (err, row) => {
						if (!err)
							version = row.version;
					}, () => {
						var text_unicode = 'TEXT'; // 'TEXT COLLATE UNICODE'; // TODO: UNICODE collation
						var queries = [];

						if (version < 1) {
							queries.push('PRAGMA foreign_keys = ON'); // needs to be enabled to FOREIGN KEY (and ON DELETE CASCADE) to work
							queries.push('CREATE TABLE IF NOT EXISTS media (' +
								'_id                  INTEGER PRIMARY KEY,' +
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
								'_id           INTEGER PRIMARY KEY,' +
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
								'_id         INTEGER PRIMARY KEY,' +
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
								'_id         	INTEGER PRIMARY KEY,' +
								'token       	INTEGER' +
								')');
							queries.push(
								'CREATE TABLE IF NOT EXISTS content_changes (' +
								'_id           INTEGER PRIMARY KEY,' +
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
							queries.push('INSERT INTO user_roles (key, label, access_level) VALUES ("viewer", "Viewer", 0)');
							queries.push('INSERT INTO user_roles (key, label, access_level) VALUES ("editor", "Editor", 1)');
							queries.push('INSERT INTO user_roles (key, label, access_level) VALUES ("admin", "Admin", 2)');
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
							queries.push('INSERT INTO users (_id, name, display_name, role_key, password) VALUES ("pFHsj0iAabgvX1Mp", "admin", "Admin", "admin", "$2a$04$DWc3YDK8zbOoAcWB81LZ0eegQ8nnx7XE9xLli3njgfVlP93JdYDSC")');
							queries.push('UPDATE db_info SET version = 7');
						}
						this.sql.execQueriesSequence(queries, callback);
					});
				}
			}
		);


	}

	_assignMetasFromRow(metas, row) {

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

		if (row.album_art)
			metas.albumArts = JSON.parse(row.album_art);
	}

	getMetas(path, topic, callback) {

		var metas = null;
		this.sql.open('SELECT * FROM media WHERE path = \'' + this._doubleApostrophe(path) + '\'', (err, row) => {

			if (!err) {
				metas = {};
				this._assignMetasFromRow(metas, row);
			}

		}, function () {
			callback(null /*error*/ , metas);
		});
	}

	_multiValueStr2Arr(str) {
		if (str)
			return str.split(';');
		else
			return [];
	}

	_multiValueArr2Str(ar) {
		var res = '';
		if (ar) {
			res = ar.join(';');
			/*
            for (var i = 0; i < ar.length; i++) {
                if (res != '')
                    res = res + ';';
                res = res + ar[i];
            }
            */
		}
		return res;
	}

	_doubleApostrophe(str) {
		// LS: taken from https://jsfiddle.net/sgmnawf8/1/ -- bunch of alternate methods there + speed compare
		return str.split('\'').join('\'\'');

	}

	_notNull(value) {
		if (value)
			return value;
		else
			return 0;
	}

	takeLock(lockName, callback) {
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

	_newSyncId(metas) {
		var res = Uuid();
		if (metas.title)
			res = metas.title.substr(0, 20) + '.' + res; // just for a better identification during debugging
		return res;
	}

	putMetas(path, mtime, metas, callback) {

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

		var selector;
		if (!metas.sync_id) { // new track to insert
			metas.sync_id = this._newSyncId(metas);
			selector = 'SELECT _id, sync_id FROM media WHERE path = \'' + this._doubleApostrophe(path) + '\'';
		} else {
			selector = 'SELECT _id, sync_id FROM media WHERE sync_id = \'' + this._doubleApostrophe(metas.sync_id) + '\'';
		}

		this.takeLock('media_insert', () => { // need to be in lock so that the same sync_id isn't processed by another scanning thread at the same time (resulting in double insertion)
			var item_exists = false;
			this.sql.open(selector, (err, row) => {
				item_exists = true;
				metas.db_id = row._id;
				metas.sync_id = row.sync_id;
			}, () => {

				var sql;
				if (item_exists)
					sql = 'UPDATE media SET path = ?, title = ?, album = ?, artist = ?, album_artist = ?, actor = ?, composer = ?, producer = ?, director = ?, publisher = ?, contributor= ?, lyricist = ?, conductor = ?, bpm = ?, genre = ?, rating = ?, playcount = ?, skipcount = ?, bookmark = ?, comment = ?, duration = ?, size = ?, mime_type = ?, year = ?, trackNumber = ?, discNumber = ?, lyrics = ?, last_time_played = ?, volumeLeveling = ?, normalizeTrack = ?, normalizeAlbum = ?, parental_rating = ?, grouping = ?, tempo = ?, mood = ?, occasion = ?, quality = ?, isrc = ?, initialKey = ?, originalTitle = ?, originalArtist = ?, originalLyricist = ?, originalDate = ?, copyright = ?, encoder = ?, subtitle = ?, custom1 = ?, custom2 = ?, custom3 = ?, custom4 = ?, custom5 = ?, custom6 = ?, custom7 = ?, custom8 = ?, custom9 = ?, custom10 = ?, album_art = ? WHERE sync_id = ?';
				else
					sql = 'INSERT INTO media (path, title, album, artist, album_artist, actor, composer, producer, director, publisher, contributor, lyricist, conductor, bpm, genre, rating, playcount, skipcount, bookmark, comment, duration, size, mime_type, year, trackNumber, discNumber, lyrics, last_time_played, volumeLeveling, normalizeTrack, normalizeAlbum, parental_rating, grouping, tempo, mood, occasion, quality, isrc, initialKey, originalTitle, originalArtist, originalLyricist, originalDate, copyright, encoder, subtitle, custom1, custom2, custom3, custom4, custom5, custom6, custom7, custom8, custom9, custom10, album_art, sync_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

				var mv = this._multiValueArr2Str;
				var nn = this._notNull;

				var rating = -1;
				if (metas.rating)
					rating = metas.rating;
				else
				if (metas.ratings && metas.ratings.length)
					rating = metas.ratings[0].rating;

				if (!metas.mimeType)
					metas.mimeType = PathNormalizer.getMime(path);

				this.sql.exec(sql, [path, metas.title, metas.album, mv(metas.artists), mv(metas.albumArtists), mv(metas.actors), mv(metas.authors), mv(metas.producers), mv(metas.directors), mv(metas.publishers), mv(metas.contributors), mv(metas.lyricists), mv(metas.conductors), metas.bpm, mv(metas.genres), rating, nn(metas.playcount), nn(metas.skipcount), nn(metas.bookmark), metas.comment, metas.duration * 1000, metas.size, metas.mimeType, metas.year, metas.originalTrackNumber, metas.originalDiscNumber, metas.lyrics, metas.last_time_played, nn(metas.volumeLeveling), nn(metas.volumeLevelTrack), nn(metas.volumeLevelAlbum), metas.parental_rating, metas.grouping, metas.tempo, metas.mood, metas.occasion, metas.quality, metas.isrc, metas.initialKey, metas.originalTitle, metas.originalArtist, metas.originalLyricist, metas.originalDate, metas.copyright, metas.encoder, metas.subtitle, metas.custom1, metas.custom2, metas.custom3, metas.custom4, metas.custom5, metas.custom6, metas.custom7, metas.custom8, metas.custom9, metas.custom10, JSON.stringify(metas.albumArts),
					metas.sync_id /*needs to be the last*/
				], (err, info) => {

					if (!item_exists)
						metas.db_id = info.lastID;

					assert(metas.db_id, 'db_id missing for ' + metas.sync_id);

					this.leaveLock('media_insert');

					this._cleanCacheFor(['getTracklist', 'getFiles', 'filteredFileEntry']);
					if (item_exists)
						this._logContentChange('media', 'updated', metas.sync_id);
					else
						this._logContentChange('media', 'added', metas.sync_id);

					callback();
				});
			});
		});
	}

	deleteMetas(metas, callback) {
		assert(metas.db_id && metas.sync_id, 'DB or sync id missing for ' + metas.title + ', path: ' + metas.path);
		logger.info('deleteMetas: db_id: ' + metas.db_id);
		var sql = 'DELETE FROM media WHERE path = ?';
		this.sql.exec(sql, [metas.db_id], () => {
			this._logContentChange('media', 'deleted', metas.sync_id);
			if (callback)
				callback();
		});
		this._cleanCacheFor(['getTracklist', 'getFiles']);
	}

	_playlistFromRow(row) {
		return {
			name: row.title,
			guid: row.guid,
			parent_guid: row.parent_guid,
			last_modified: row.last_modified,
			criteria: row.criteria
		};
	}

	getPlaylistContent(parent_guid, callback) {
		var playlists = [];
		var q_parent_guid = ' IS NULL';
		if (parent_guid)
			q_parent_guid = ' = \'' + parent_guid + '\'';

		var _this = this;
		_this.sql.open('SELECT * FROM playlists WHERE parent_guid' + q_parent_guid, (err, row) => {
			if (!err)
				playlists.push(this._playlistFromRow(row));
		}, () => {
			_this.markItemContentChanged(parent_guid, false);
			if (parent_guid) {
				var files = [];
				_this.sql.open('SELECT media.* FROM media, playlist_items_map WHERE media._id = playlist_items_map.media_id AND playlist_items_map.playlist_guid' + q_parent_guid + ' ORDER BY playlist_items_map.play_order', function (err, row) {
					if (!err) {
						var file = {};
						_this._assignMetasFromRow(file, row);
						files.push(file);
					}
				}, () => {
					callback(null, playlists, files);
				});
			} else {
				callback(null, playlists);
			}
		});
	}

	getPlaylistsBy(params, callback) {
		var playlists = [];
		assert(params.guidArray, 'getPlaylistsBy params: only guidArray is supported now');
		if (params.guidArray.length == 0)
			callback(null, []);
		else {
			this.sql.open('SELECT * FROM playlists WHERE guid IN ("' + params.guidArray.join('","') + '")', (err, row) => {
				if (!err)
					playlists.push(this._playlistFromRow(row));
			}, function () {
				callback(null, playlists);
			});
		}
	}

	getFiles(callback) {
		var cache = this._getCacheFor('getFiles');
		if (cache.files) {
			callback(null, cache.files);
		} else {
			cache.files = [];
			var files = cache.files;
			var dt = Date.now();
			this.sql.open('SELECT * FROM media', (err, row) => {
				if (!err) {
					var metas = {};
					this._assignMetasFromRow(metas, row);
					files.push(metas);
				}
			}, function () {
				var s = Math.floor((Date.now() - dt));
				logger.info(`${files.length} files has been read from SQL DB in ${s} millisecond${(s>1)?'s':''}`);
				callback(null, files);
			});
		}
	}

	validateFTS(value) {
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

	getFilesBy(params, callback) {
		if (!params || !params.searchPhrase) {
			return this.getFiles(callback); // all files
		} else {
			var files = [];
			var append = '';
			if (params.searchPhrase) {
				logger.info('Full text search for: ' + params.searchPhrase);
				// don't use SqlString.escape() in MATCH as it escapes double-quotes and searching for '"a-ha"' doesn't work then
				append = ' WHERE _id IN (SELECT rowid FROM MediaText WHERE MediaText MATCH \'' + params.searchPhrase + '\')';
			}

			this.sql.open('SELECT * FROM media' + append, (err, row) => {
				if (!err) {
					var metas = {};
					this._assignMetasFromRow(metas, row);
					files.push(metas);
				}
			}, function () {
				callback(null, files);
			});
		}
	}

	getFile(criteria, callback) {
		var file;
		var _err;
		assert(criteria.id || criteria.sync_id, 'file id undefined');
		var sql;
		if (criteria.id)
			sql = 'SELECT * FROM media WHERE _id = ' + criteria.id;
		if (criteria.sync_id)
			sql = 'SELECT * FROM media WHERE sync_id = \'' + this._doubleApostrophe(criteria.sync_id) + '\'';

		this.sql.open(sql, (err, row) => {
			if (!err) {
				file = {};
				this._assignMetasFromRow(file, row);
			} else {
				_err = err;
			}
		}, function () {
			if (!file)
				_err = _err || 'not found';
			callback(_err, file);
		});
	}

	garbageFilesOutOfFolders(folders, callback) {
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
				this.sql.exec('DELETE FROM media WHERE _id IN (' + delete_ids.join(',') + ')', (err) => {
					this._cleanCacheFor(['getTracklist', 'getFiles']);
					Async.eachSeries(deleted_files,
						(metas, cbk) => {
							this._logContentChange('media', 'deleted', metas.sync_id, cbk);
						}, () => {
							if (callback)
								callback(err, deleted_files);
						});
				});
			} else {
				if (callback)
					callback(null, deleted_files);
			}
		});
	}

	getItemContentChanged(guid) {
		var _guid = guid;
		if (!_guid)
			_guid = 'root';
		return this._changedItems[_guid];
	}

	markItemContentChanged(guid, value) {
		var _guid = guid;
		if (!_guid)
			_guid = 'root';
		this._changedItems[_guid] = value;
	}

	putPlaylist(item, service, callback) {

		logger.info('putPlaylist: ' + item.name + ', guid: ' + item.guid + ', last_modified: ' + item.last_modified);

		var item_exists = false;
		var last_modified;
		this.sql.open('SELECT last_modified FROM playlists WHERE guid = \'' + item.guid + '\'', (err, row) => {
			item_exists = true;
			last_modified = row.last_modified;
		}, () => {

			if (item_exists && last_modified) {
				if (last_modified > item.last_modified)
					return callback('Playlist to put is older: ' + item.last_modified + ' than current ' + last_modified);
				else
				if (last_modified == item.last_modified)
					return callback(); // up to date, already in database
			}

			var sql;
			if (item_exists)
				sql = 'UPDATE playlists SET title = ?, parent_guid = ?, last_modified = ?, criteria = ? WHERE guid = ?';
			else
				sql = 'INSERT INTO playlists (title, parent_guid, last_modified, criteria, guid) VALUES (?,?,?,?,?)';

			var q = this.sql.prepare(sql);
			q.run(item.name, item.parent_guid, item.last_modified, item.criteria, item.guid /*needs to be the last*/ );
			q.finalize(() => {
				this.sql.exec('DELETE FROM playlist_items_map WHERE playlist_guid = "' + item.guid + '"', () => {
					var qf = this.sql.prepare('INSERT INTO playlist_items_map (playlist_guid, media_id, play_order) VALUES (?,?,?)');
					for (var i = 0; i < item.track_ids.length; i++)
						qf.run(item.guid, item.track_ids[i], i);
					qf.finalize(() => {
						this.markItemContentChanged(item.parent_guid, true);
						if (item_exists)
							this._logContentChange('playlist', 'updated', item.guid);
						else
							this._logContentChange('playlist', 'added', item.guid);
						callback();
					});
				});
			});
		});
	}

	deletePlaylist(item, callback) {
		logger.info('deletePlaylist: guid: ' + item.guid);
		var queries = [];
		queries.push('DELETE FROM playlists WHERE guid = "' + item.guid + '"');
		queries.push('DELETE FROM playlists WHERE parent_guid IS NOT NULL AND parent_guid NOT IN (SELECT guid FROM playlists)');
		// queries.push( 'DELETE FROM playlist_items_map WHERE playlist_guid = "' + item.guid + '"'); // not needed, see DB structure
		this.sql.execQueriesSequence(queries, callback);
		this.markItemContentChanged(item.parent_guid, true);
		this._logContentChange('playlist', 'deleted', item.guid);
	}

	_getCollections(callback) {
		var collections = [];
		this.sql.open('SELECT * FROM collections', function (err, row) {
			if (err) {
				callback(err);
			} else {
				var _config = JSON.parse(row.config);
				collections.push({
					id: row._id,
					name: row.title,
					folders: _config.folders,
					type: _config.type
				});
			}
		}, function () {
			callback(null, collections);
		});
	}

	getConfig(config, callback) {
		this._getCollections((err, collections) => {
			if (collections.length)
				config.collections = collections;
			callback(null, config);
		});
	}

	_putCollection(item, callback) {
		var item_exists = false;
		this.sql.open('SELECT * FROM collections WHERE _id = \'' + item.id + '\'', ( /*err, row*/ ) => {
			item_exists = true;
		}, () => {

			var _config = JSON.stringify({
				folders: item.folders,
				type: item.type
			});

			var sql;
			if (item_exists)
				sql = 'UPDATE collections SET title = ?, config = ? WHERE _id = ' + item.id;
			else
				sql = 'INSERT INTO collections (title, config) VALUES (?,?)';

			this.sql.exec(sql, [item.name, _config], (err, info) => {
				if (!item_exists)
					item.id = info.lastID;
				callback();
			});
		});
	}

	_putCollections(collections, callback) {

		var list = collections || [];
		var ids = [];
		var _processItem = function (idx) {
			if (idx >= list.length) {
				if (ids.length)
					this.sql.exec('DELETE FROM collections WHERE _id NOT IN (' + ids.join(',') + ')', callback);
				else
					callback();
			} else {
				var coll = list[idx];
				this._putCollection(coll, () => {
					ids.push(coll.id);
					_processItem(idx + 1);
				});
			}
		}.bind(this);
		_processItem(0);
	}

	putConfig(config, callback) {
		this._putCollections(config.collections, callback);
	}

	_checkChangeToken(callback) {
		// check whether the last distributed token is the current
		// if yes, then we need to use new content for this content change
		this._getLastContentToken(false, (token) => {
			if (this._distributedContentToken && this._distributedContentToken == token)
				this._newContentToken(callback);
			else
				callback(token);
		});
	}

	_logContentChange(item_type, operation, sync_id, callback) {
		logger.debug('Log content change: ' + item_type + ',' + operation + ',' + sync_id);
		this._checkChangeToken((token) => {
			if (!token) {
				// no token in database yet, no need to track the changes (to save DB space)
				// i.e. waiting until an instance asks us for last content token
				if (callback)
					callback();
			} else {
				// token exists, track the changes:
				var _trackChange = () => {
					this.sql.exec('INSERT INTO content_changes (token, timestamp, item_type, item_oper, item_sync_id) VALUES (?,?,?,?,?)', [token, Date.now(), item_type, operation, sync_id], callback);
				};
				if (operation == 'added') // item might be re-added, we need to remove the 'deleted' state (if exists)
					this.sql.exec('DELETE FROM content_changes WHERE item_type = ? AND item_oper IN (?,?) AND item_sync_id = ?', [item_type, 'deleted', 'updated', sync_id], _trackChange);
				else
				if (operation == 'deleted') // item was just deleted, remove all 'updated' and 'added' states added previously
					this.sql.exec('DELETE FROM content_changes WHERE item_type = ? AND item_oper IN (?,?) AND item_sync_id = ?', [item_type, 'updated', 'added', sync_id], _trackChange);
				else
					_trackChange();
			}
		});
	}

	getContentChanges(token, callback) {

		if (isNaN(token))
			callback('non-integer tokens deprecated');
		else {
			var changes = [];
			var _err;
			var token_exists;
			this.sql.open('SELECT null FROM content_points WHERE token = ' + token, () => {
				token_exists = true;
			}, () => {
				if (!token_exists)
					callback('Token ' + token + ' does not exist!');
				else {
					this.sql.open('SELECT * FROM content_changes WHERE token > ' + token, (err, row) => {
						if (err)
							_err = err;
						else
							changes.push({
								item_type: row.item_type,
								item_oper: row.item_oper,
								item_sync_id: row.item_sync_id
							});
					}, (err) => {
						callback(_err || err, changes);
					});
				}
			});
		}
	}

	_newContentToken(callback) {
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

		this.sql.exec('INSERT INTO content_points (token) VALUES (?)', [this._currentContentToken], () => {
			if (callback)
				callback(this._currentContentToken);
		});
	}

	_getLastContentToken(canCreateNew, callback) {
		if (this._currentContentToken)
			callback(this._currentContentToken);
		else {
			this.sql.open('SELECT token FROM content_points ORDER BY _id DESC LIMIT 1', (err, row) => {
				if (!err)
					this._currentContentToken = row.token;
			}, () => {
				if (this._currentContentToken)
					callback(this._currentContentToken);
				else {
					if (!canCreateNew)
						callback();
					else
						this._newContentToken(callback);
				}
			});
		}
	}

	getLastContentToken(callback) {
		// this way instances asks for the current token
		// mark this content token as distributed and change it to another token on next content change
		this._getLastContentToken(true, (token) => {
			this._distributedContentToken = token;
			callback(token);
		});
	}
	
	getUserByName(username, cb) {
		
		var userInfo, _err;
		
		//**NO SQL INJECTION PREVENTION YET (I DON'T KNOW EXACTLY HOW TO DO THAT PROPERLY)
		this.sql.open(`SELECT * FROM users WHERE name="${username}"`, (err, row) => {
			if (!err) {
				//console.error(err);
				userInfo = row;
				//console.log(row);
			}
		}, (err) => {
			cb(err || _err, userInfo);
		});
	}
	
	getUserById(_id, cb) {
		
		var userInfo, _err;
		
		//**NO SQL INJECTION PREVENTION YET (I DON'T KNOW EXACTLY HOW TO DO THAT PROPERLY)
		this.sql.open(`SELECT * FROM users WHERE _id="${_id}"`, (err, row) => {
			if (!err) {
				//console.error(err);
				userInfo = row;
				//console.log(row);
			}
		}, (err) => {
			cb(err || _err, userInfo);
		});
	}
	
	insertUser(userData, cb) {
		if (typeof userData != 'object') return cb('sqlRegistry/insertUser: User must be of type object.');
		/*
		user = {
			id: '3498grjdskljdklgo49045655dfd'
			name: 'username12',
			displayname: 'Joe Schmoe',
			role_key: 'admin',
			password: '34984389gfsjidsjkldfkjaldsf',
			preferences: {}
		}
		*/
		var _id = crypto.randomBytes(12).toString('base64');
		var name = userData.username;
		var display_name = userData.displayname || '?';
		var role_key = userData.role_key;
		var password = userData.password;
		
		if (!name || !role_key || !password) {
			return cb('sqlRegistry/insertUser: Must specify username, role_key, and password');
		}
		
		//this.sql.open(`SELECT * FROM users WHERE _id=${_id} OR username=${username} OR role_key=${role_key}`)
		this.sql.open(`INSERT INTO users (_id, name, display_name, role_key, password) VALUES (${_id},${name},${display_name},${role_key},${password})`, (err, data) => {
			console.log(`err: ${err}`);
			console.log(`data: ${data}`);
		});
	}
	
	updateUser(userId, userData, cb) {
		if (typeof userId != 'string') throw new TypeError('userId must be a string');
		if (typeof userData != 'object') throw new TypeError('userData must be an object');
		
		//**NO SQL INJECTION PREVENTION YET (I DON'T KNOW EXACTLY HOW TO DO THAT PROPERLY)
		var query = 'UPDATE users SET ';
		
		for (var key in userData) {
			switch(key) {
				case 'name': query += `name = "${userData.name}", `; break;
				case 'display_name': query += `display_name = "${userData.display_name}", `; break;
				case 'role_key': query += `role_key = "${userData.role_key}", `; break;
				case 'password': query += `password = "${userData.password}", `; break;
			}
		}
		
		//Remove last comma from query
		query = query.substring(0, query.length - 2);
		query += ` WHERE _id = "${userId}"`;
		
		var writeResult, _err;
		
		this.sql.open(query, (err, data) => {
			if (!err) {
				writeResult = data;
				//console.log(data);
			}
		}, (err) => {
			cb(err || _err, writeResult);
		});
	}
	
	getRole(key, cb) {
		
		var roleInfo, _err;
		
		this.sql.open(`SELECT * FROM user_roles WHERE key="${key}"`, (err, row) => {
			if (!err) {
				//console.error(err);
				roleInfo = row;
				//console.log(row);
			}
		}, (err) => {
			cb(err || _err, roleInfo);
		});
	}
	
}

module.exports = SQLRegistry;