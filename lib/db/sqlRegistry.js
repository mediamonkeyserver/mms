/*jslint node: true, nomen: true, esversion: 6 */
"use strict";

const assert = require('assert');

const MemoryRegistry = require('./memoryRegistry');
const SQLLayer = require('./sqlLayer');
const Node = require('../node');
const logger = require('../logger');
const Path = require('path');
const PathNormalizer = require('../util/pathNormalizer');
const os = require('os');
const fs = require('fs');


class SQLRegistry extends MemoryRegistry {

    initialize(service, callback) {
        this._service = service;
        this._changedItems = {};

        var now = Date.now();
        this.initializeDB((error) => {
            if (error) {
                return callback(error);
            }

            var dt = Date.now() - now;

            if (dt > 1500) {
                dt = Math.floor(dt / 1000);
                logger.info("Database loaded in " + dt + " second" + ((dt > 1) ? "s" : ""));
            } else {
                logger.info("Database loaded in " + dt + " ms");
            }

            super.initialize(service, callback);
        });
    }

    initializeDB(callback) {
        var path = Path.join(os.homedir(), "mms.db");
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

    createDBStructure(callback) {
        var text_unicode = 'TEXT'; // 'TEXT COLLATE UNICODE'; // TODO: UNICODE collation
        var queries = [];
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
            'item_sync_id  TEXT NOT NULL,' +
            'playlist_guid TEXT NOT NULL,' +
            'play_order    INTEGER,' +
            'FOREIGN KEY ( item_sync_id ) REFERENCES media ( sync_id ) ON DELETE CASCADE,' +
            'FOREIGN KEY ( playlist_guid ) REFERENCES playlists ( guid ) ON DELETE CASCADE' +
            ')');
        queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_guid ON playlists (guid)');
        queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_parent_guid ON playlists (parent_guid)');
        queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_map_item_sync_id ON playlist_items_map (item_sync_id)');
        queries.push('CREATE INDEX IF NOT EXISTS idx_playlist_map_playlist_guid ON playlist_items_map (playlist_guid)');

        queries.push(
            'CREATE TABLE IF NOT EXISTS collections (' +
            '_id         INTEGER PRIMARY KEY,' +
            'title       TEXT,' +
            'config      TEXT' +
            ')');

        this.sql.execQueriesSequence(queries, callback);
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
        metas.contributors = mv(row.contributor);
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
        metas.lyrics = row.lyrics; // TODO:  upnp:lyricsURI

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
        metas.conductor = row.conductor;
        metas.contributor = row.contributor;
        metas.lyricist = row.lyricist;
        metas.originalTitle = row.originalTitle;
        metas.originalArtist = row.originalArtist;
        metas.originalLyricist = row.originalLyricist;
        metas.originalDate = row.originalDate;
        metas.custom1 = row.custom1;
        metas.custom2 = row.custom2;
        metas.custom3 = row.custom3;
        metas.custom4 = row.custom4;
        metas.custom5 = row.custom5;

        if (row.album_art)
            metas.albumArts = JSON.parse(row.album_art);
    }

    getMetas(path, topic, callback) {

        var sync_id = this._getSyncId(path);
        var metas = null;

        this.sql.open("SELECT * FROM media WHERE sync_id = '" + this._doubleAmpersands(sync_id) + "'", (err, row) => {

            if (!err) {
                metas = {};
                this._assignMetasFromRow(metas, row);
            }

        }, function () {
            callback(null /*error*/, metas);
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

    _doubleAmpersands(str) {
        // LS: taken from https://jsfiddle.net/sgmnawf8/1/ -- bunch of alternate methods there + speed compare
        return str.split("'").join("''");

    }

    _notNull(value) {
        if (value)
            return value;
        else
            return 0;
    }

    _getSyncId(path) {
        return PathNormalizer.removeFileExt(PathNormalizer.normalize(path).toLowerCase());
    }

    putMetas(path, mtime, metas, callback) {

        if (metas.mimeType == 'inode/directory') {
            callback();
            return;
        }
        
        logger.verbose('putMetas: ' + path + ' metas: ' + Object.keys(metas));

        var sync_id = this._getSyncId(path);
        var item_exists = false;        
        this.sql.open("SELECT _id FROM media WHERE sync_id = '" + this._doubleAmpersands(sync_id) + "'", (err, row) => {
            item_exists = true;
            metas.db_id = row._id;
        }, () => {

            var sql;
            if (item_exists)
                sql = 'UPDATE media SET path = ?, title = ?, album = ?, artist = ?, album_artist = ?, actor = ?, composer = ?, producer = ?, director = ?, publisher = ?, contributor= ?, lyricist = ?, conductor = ?, bpm = ?, genre = ?, rating = ?, playcount = ?, skipcount = ?, bookmark = ?, comment = ?, duration = ?, size = ?, year = ?, trackNumber = ?, discNumber = ?, lyrics = ?, last_time_played = ?, volumeLeveling = ?, normalizeTrack = ?, normalizeAlbum = ?, parental_rating = ?, grouping = ?, tempo = ?, mood = ?, occasion = ?, quality = ?, comment = ?, isrc = ?, initialKey = ?, originalTitle = ?, originalArtist = ?, originalLyricist = ?, originalDate = ?, custom1 = ?, custom2 = ?, custom3 = ?, custom4 = ?, custom5 = ?, album_art = ? WHERE sync_id = ?';
            else
                sql = 'INSERT INTO media (path, title, album, artist, album_artist, actor, composer, producer, director, publisher, contributor, lyricist, conductor, bpm, genre, rating, playcount, skipcount, bookmark, comment, duration, size, year, trackNumber, discNumber, lyrics, last_time_played, volumeLeveling, normalizeTrack, normalizeAlbum, parental_rating, grouping, tempo, mood, occasion, quality, comment, isrc, initialKey, originalTitle, originalArtist, originalLyricist, originalDate, custom1, custom2, custom3, custom4, custom5, album_art, sync_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

            var mv = this._multiValueArr2Str;
            var nn = this._notNull;

            var rating = -1;
            if (metas.rating)
                rating = metas.rating;
            else
                if (metas.ratings && metas.ratings.length)
                    rating = metas.ratings[0].rating;

            this.sql.exec(sql, [path, metas.title, metas.album, mv(metas.artists), mv(metas.albumArtists), mv(metas.actors), mv(metas.authors), mv(metas.producers), mv(metas.directors), mv(metas.publishers), mv(metas.contributors), mv(metas.lyricists), mv(metas.conductors), metas.bpm, mv(metas.genres), rating, nn(metas.playcount), nn(metas.skipcount), nn(metas.bookmark), metas.comment, metas.duration * 1000, metas.size, metas.year, metas.originalTrackNumber, metas.originalDiscNumber, metas.lyrics, metas.last_time_played, nn(metas.volumeLeveling), nn(metas.volumeLevelTrack), nn(metas.volumeLevelAlbum), metas.parental_rating, metas.grouping, metas.tempo, metas.mood, metas.occasion, metas.quality, metas.comment, metas.isrc, metas.initialKey, metas.originalTitle, metas.originalArtist, metas.originalLyricist, metas.originalDate, metas.custom1, metas.custom2, metas.custom3, metas.custom4, metas.custom5, JSON.stringify(metas.albumArts),
                sync_id /*needs to be the last*/],
                (err, info) => {

                    if (!item_exists)
                        metas.db_id = info.lastID;

                    if (metas.mimeType) { // LS: TODO: more format data to update separatelly?
                        var qf = this.sql.prepare('UPDATE media SET mime_type = ? WHERE sync_id = ?');
                        qf.run(metas.mimeType, sync_id);
                        qf.finalize();
                    }

                    this._cleanCacheFor(['getTracklist', 'getFiles', 'filteredFileEntry']);
                    callback();
                }
            );
            
        });
    }

    deleteMetas(path, callback) {
        logger.info('deleteMetas: path: ' + path);
        var sync_id = this._getSyncId(path);
        var sql = 'DELETE FROM media WHERE sync_id = ?';
        this.sql.exec(sql, [sync_id], () => {
            if (callback)
                callback();
        });
        this._cleanCacheFor(['getTracklist', 'getFiles']);
    }

    getPlaylists(parent_guid, callback) {
        var playlists = [];
        var q_parent_guid = " IS NULL";
        if (parent_guid)
            q_parent_guid = " = '" + parent_guid + "'";

        var _this = this;
        _this.sql.open('SELECT * FROM playlists WHERE parent_guid' + q_parent_guid, function (err, row) {
            if (!err)
                playlists.push({
                    name: row.title,
                    guid: row.guid
                });
        }, function () {
            _this.markItemContentChanged(parent_guid, false);
            if (parent_guid) {
                var files = [];
                _this.sql.open('SELECT media.* FROM media, playlist_items_map WHERE media.sync_id = playlist_items_map.item_sync_id AND playlist_items_map.playlist_guid' + q_parent_guid + ' ORDER BY playlist_items_map.play_order', function (err, row) {
                    if (!err) {
                        var file = {};
                        _this._assignMetasFromRow(file, row);
                        files.push(file);                        
                    }
                }, function () {
                    callback(null, playlists, files);
                });
            } else {
                callback(null, playlists);
            }
        });
    }

    getFiles(callback) {
        var cache = this._getCacheFor('getFiles');
        if (cache.files) {
            callback(null, cache.files);
        } else {
            cache.files = [];
            var files = cache.files;
            var dt = Date.now();
            this.sql.open("SELECT * FROM media", (err, row) => {
                if (!err) {
                    var metas = {};
                    this._assignMetasFromRow(metas, row);
                    files.push(metas);
                }
            }, function () {
                var s = Math.floor((Date.now() - dt));
                logger.info(`${files.length} files has been read from SQL DB in ${s} millisecond${(s>1)?"s":""}`);
                callback(null, files);
            });
        }
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
                    if (callback)
                        callback(err, deleted_files);
                });
            } else {
                if (callback)
                    callback(null, delete_ids);
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

        logger.info('putPlaylist: ' + item.name + ' , guid: ' + item.guid);

        var _this = this;

        var item_exists = false;
        this.sql.open("SELECT guid FROM playlists WHERE guid = '" + item.guid + "'", function (err, row) {
            item_exists = true;
        }, () => {

            var sql;
            if (item_exists)
                sql = 'UPDATE playlists SET title = ?, parent_guid = ? WHERE guid = ?';
            else
                sql = 'INSERT INTO playlists (title, parent_guid, guid) VALUES (?,?,?)';

            var q = _this.sql.prepare(sql);
            q.run(item.name, item.parent_guid, item.guid /*needs to be the last*/);
            q.finalize(() => {
                var tracks = item.tracks;
                for (var i = 0; i < tracks.length; i++) {
                    var path = tracks[i];
                    var repository = service.getRepositoryForPath(path);
                    path = PathNormalizer.removeLastSlash(repository.originalPath) + path;
                    var sync_id = _this._getSyncId(path);
                    tracks[i] = sync_id;
                }
                _this.sql.exec('DELETE FROM playlist_items_map WHERE playlist_guid = "' + item.guid + '"', () => {
                    var qf = _this.sql.prepare('INSERT INTO playlist_items_map (playlist_guid, item_sync_id, play_order) VALUES (?,?,?)');
                    for (var i = 0; i < tracks.length; i++)
                        qf.run(item.guid, tracks[i], i);
                    qf.finalize(() => {
                        _this.markItemContentChanged(item.parent_guid, true);
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
    }

    _getCollections(callback) {
        var collections = [];
        this.sql.open("SELECT * FROM collections", function (err, row) {
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
            var path = Path.join(os.homedir(), "mms.json");
            fs.readFile(path, (err, data) => {
                if (err) {
                    if (err.code == 'ENOENT')
                        callback(null, config); // config file doesn't exist yet
                    else
                        callback(err, config);
                } else
                    if (!data.length) {
                        callback(null, config); // config file is empty
                    } else {
                        var _config = JSON.parse(data);
                        for (var key in _config)
                            config[key] = _config[key];
                        callback(null, config);
                    }
            });
        });
    }

    _putCollection(item, callback) {
        var item_exists = false;
        this.sql.open("SELECT * FROM collections WHERE _id = '" + item.id + "'", (err, row) => {
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

            var q = this.sql.prepare(sql);
            q.run(item.name, _config);
            q.finalize(callback);
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
                ids.push(coll.id);
                this._putCollection(coll, () => {
                    _processItem(idx + 1);
                });
            }
        }.bind(this);
        _processItem(0);
    }

    putConfig(config, callback) {
        this._putCollections(config.collections, () => {
            // put the other config to JSON file:
            var path = Path.join(os.homedir(), "mms.json");
            var _configCopy = JSON.parse(JSON.stringify(config)); // to deep copy the object (in order to remove collections)
            _configCopy.collections = undefined; // collections were already put into DB
            fs.writeFile(path, JSON.stringify(_configCopy), null, callback);
        });
    }
}

module.exports = SQLRegistry;
