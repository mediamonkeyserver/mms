/*jslint node: true, nomen: true, esversion: 6 */
"use strict";

const assert = require('assert');

const MemoryRegistry = require('./memoryRegistry');
const SQLLayer = require('./sqlLayer');
const Node = require('../node');
const logger = require('../logger');
const Path = require('path');
const os = require('os');


class SQLRegistry extends MemoryRegistry {

    initialize(service, callback) {
        this._service = service;

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
        queries.push('CREATE TABLE IF NOT EXISTS media (' +
            '_id                  INTEGER PRIMARY KEY,' +
            'sync_id              TEXT    NOT NULL,' +
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
            /* LS: doesn't seem to make sense to keep resource/format data in this DB table, they should be served based on purpose (auto-converted to _various_ supported formats)
            'size                 INTEGER,' +
            'bitrate              INTEGER,' +
            'resolution           INTEGER,' +
            'framerate            INTEGER,' +
            'channels             INTEGER,' +
            'samplerate           INTEGER,' +
            'bitsPerSample        INTEGER,' +
            */
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
            'CREATE TABLE IF NOT EXISTS playlists ('+
            '_id         INTEGER PRIMARY KEY,'+
            'title       TEXT,'+
            'guid        TEXT,'+
            'last_modified TEXT,'+
            'parent_guid TEXT'+
            ')');
        queries.push(
            'CREATE TABLE IF NOT EXISTS playlist_items_map ('+
            '_id           INTEGER PRIMARY KEY,'+
            'item_sync_id  TEXT NOT NULL,'+
            'playlist_guid TEXT NOT NULL,'+
            'play_order    INTEGER,'+
            'FOREIGN KEY ( item_sync_id ) REFERENCES media ( sync_id ) ON DELETE CASCADE,'+
            'FOREIGN KEY ( playlist_guid ) REFERENCES playlists ( guid ) ON DELETE CASCADE'+
            ')');
        queries.push( 'CREATE INDEX IF NOT EXISTS idx_playlist_guid ON playlists (guid)');
        queries.push( 'CREATE INDEX IF NOT EXISTS idx_playlist_parent_guid ON playlists (parent_guid)');
        queries.push( 'CREATE INDEX IF NOT EXISTS idx_playlist_map_item_sync_id ON playlist_items_map (item_sync_id)');
        queries.push( 'CREATE INDEX IF NOT EXISTS idx_playlist_map_playlist_guid ON playlist_items_map (playlist_guid)');

        var sql_engine = this.sql;

        var _runQuery = function (idx) {
            if (idx >= queries.length)
                callback();
            else { 
                var q = queries[idx];
                sql_engine.exec(q, (err) => {
                    if (err)
                        callback(err);
                    else
                        _runQuery(idx + 1);
                });
            }
        }
        _runQuery(0);
    }        

    getMetas(path, topic, callback) {

        var sync_id = this._getSyncId(path);
        var metas = null;
        var mv = this._multiValueStr2Arr;

        this.sql.open("SELECT * FROM media WHERE sync_id = '" + this._doubleAmpersands(sync_id) + "'", function (err, row) {

            metas = {};
            metas.uid = row.sync_id;
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
            /* LS: doesn't seem to make sense to keep resource/format data in DB, they should served based on purpose (auto-converted to various supported formats)
            metas.size = row.size;            
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
        return path.replace(/\\/g, '/').toLowerCase();
    }

    putMetas(path, mtime, metas, callback) {

        if (metas.mimeType == 'inode/directory') {
            callback();
            return;
        }

        //logger.info('putMetas: ' + path + ' metas: ' + Object.keys(metas));

        var sync_id = this._getSyncId(path);
        var item_exists = false;
        this.sql.open("SELECT sync_id FROM media WHERE sync_id = '" + this._doubleAmpersands(sync_id) + "'", function (err, row) {
            item_exists = true;
        }, function () {

            var sql;
            if (item_exists)
                sql = 'UPDATE media SET path = ?, title = ?, album = ?, artist = ?, album_artist = ?, actor = ?, composer = ?, producer = ?, director = ?, publisher = ?, contributor= ?, lyricist = ?, conductor = ?, bpm = ?, genre = ?, rating = ?, playcount = ?, skipcount = ?, bookmark = ?, comment = ?, duration = ?, year = ?, trackNumber = ?, discNumber = ?, lyrics = ?, last_time_played = ?, volumeLeveling = ?, normalizeTrack = ?, normalizeAlbum = ?, parental_rating = ?, grouping = ?, tempo = ?, mood = ?, occasion = ?, quality = ?, comment = ?, isrc = ?, initialKey = ?, originalTitle = ?, originalArtist = ?, originalLyricist = ?, originalDate = ?, custom1 = ?, custom2 = ?, custom3 = ?, custom4 = ?, custom5 = ?, album_art = ? WHERE sync_id = ?';
            else
                sql = 'INSERT INTO media (path, title, album, artist, album_artist, actor, composer, producer, director, publisher, contributor, lyricist, conductor, bpm, genre, rating, playcount, skipcount, bookmark, comment, duration, year, trackNumber, discNumber, lyrics, last_time_played, volumeLeveling, normalizeTrack, normalizeAlbum, parental_rating, grouping, tempo, mood, occasion, quality, comment, isrc, initialKey, originalTitle, originalArtist, originalLyricist, originalDate, custom1, custom2, custom3, custom4, custom5, album_art, sync_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

            //logger.info('sql: ' + sql);

            var q = this.sql.prepare(sql);
            var mv = this._multiValueArr2Str;
            var nn = this._notNull;

            var rating = -1;
            if (metas.rating)
                rating = metas.rating;
            else
            if (metas.ratings && metas.ratings.length)
                rating = metas.ratings[0].rating;

            q.run(path, metas.title, metas.album, mv(metas.artists), mv(metas.albumArtists), mv(metas.actors), mv(metas.authors), mv(metas.producers), mv(metas.directors), mv(metas.publishers), mv(metas.contributors), mv(metas.lyricists), mv(metas.conductors), metas.bpm, mv(metas.genres), rating, nn(metas.playcount), nn(metas.skipcount), nn(metas.bookmark), metas.comment, metas.duration * 1000, metas.year, metas.originalTrackNumber, metas.originalDiscNumber, metas.lyrics, metas.last_time_played, nn(metas.volumeLeveling), nn(metas.volumeLevelTrack), nn(metas.volumeLevelAlbum), metas.parental_rating, metas.grouping, metas.tempo, metas.mood, metas.occasion, metas.quality, metas.comment, metas.isrc, metas.initialKey, metas.originalTitle, metas.originalArtist, metas.originalLyricist, metas.originalDate, metas.custom1, metas.custom2, metas.custom3, metas.custom4, metas.custom5, JSON.stringify(metas.albumArts),
                sync_id /*needs to be the last*/ );
            q.finalize(() => {

                if (metas.mimeType) { // LS: TODO: more format data to update separatelly?
                    var qf = this.sql.prepare('UPDATE media SET mime_type = ? WHERE sync_id = ?');
                    qf.run(metas.mimeType, sync_id);
                    qf.finalize();
                }  

            });

            callback();
        }.bind(this));
    }

    getPlaylists(parent_guid, callback) {
        var playlists = [];
        var q_parent_guid = " IS NULL";
        if (parent_guid)
            q_parent_guid = " = '" + parent_guid + "'";

        var sql = this.sql;
        sql.open("SELECT * FROM playlists WHERE parent_guid" + q_parent_guid, function (err, row) {
            if (!err)
                playlists.push({
                    name: row.title,
                    guid: row.guid
                });
        }, function () {
            if (parent_guid) {
                var tracks = [];
                sql.open("SELECT * FROM playlist_items_map WHERE playlist_guid" + q_parent_guid, function (err, row) {
                    if (!err)
                        tracks.push(row.item_sync_id);
                }, function () {
                    callback(null, playlists, tracks);
                });
            } else {
                callback(null, playlists);
            }
        });
    }

}

module.exports = SQLRegistry;
