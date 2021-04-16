/*jslint node: true, nomen: true, node: true, esversion: 6 */
'use strict';

const assert = require('assert');
const Async = require('async');

const debug = require('debug')('upnpserver:repositories:Music');
//const logger = require('../logger');

const ScannerRepository = require('./scannerCached');

//const Item = require('../class/object.item');
const MusicGenre = require('../class/object.container.genre.musicGenre');
const MusicArtist = require('../class/object.container.person.musicArtist');
const MusicAlbum = require('../class/object.container.album.musicAlbum');
const MusicTrack = require('../class/object.item.audioItem.musicTrack');

const MediaProvider = require('../mediaProvider');
const PathNormalizer = require('../util/pathNormalizer');

class MusicRepository extends ScannerRepository {

	get type() {
		return 'music';
	}

	/**
	 * 
	 */
	keepFile(infos) {
		var mimeType = infos.mimeType;
		var mimePart = mimeType.split('/');

		if (mimePart.length !== 2 || (mimePart[0] !== 'audio' && mimePart[0] !== 'image')) {
			return false;
		}

		if (mimePart[1] === 'x-mpegurl') {
			return false; // Dont keep .m3u
		}

		if (mimePart[1] === 'midi' || mimePart[1] === 'mid') {
			return false; // Dont keep .midi
		}

		return true;
	}


	onDirectoryScanStart() {
		this._scannedDirs = {};
	}
	
	//This runs after directory scan ends
	onDirectoryScanEnd () {

		var keys = Object.keys(this._scannedDirs);
		for (var key of keys) {
			var dir = this._scannedDirs[key];
			if (dir.images.length) {
				for (var track of dir.tracks) {
					//Images are processed, and updateMetas is called within this function
					MediaProvider.processImages({
						db_id: track.db_id,
						images: dir.images
					}, () => {});
				}
			}
		}
		this._scannedDirs = {};
	}

	_addImage2LinkTracks(infos) {
		if (this._scannedDirs) { // can be null when just processFile is called without actual directory scan
			var imgPath = infos.contentURL.path;
			var fld = PathNormalizer.getFileFolder(imgPath);
			this._scannedDirs[fld] = this._scannedDirs[fld] || {
				tracks: [],
				images: []
			};
			this._scannedDirs[fld].images.push({
				path: PathNormalizer.getFilename(imgPath),
				size: infos.size || infos.stats.size,
				mimeType: infos.mimeType
			});
		}
	}

	_addTrack2LinkImage(path, track) {
		if (this._scannedDirs) { // can be null when just processFile is called without actual directory scan
			var fld = PathNormalizer.getFileFolder(path);
			this._scannedDirs[fld] = this._scannedDirs[fld] || {
				tracks: [],
				images: []
			};
			this._scannedDirs[fld].tracks.push(track);
		}
	}

	processFile(rootNode, infos, callback) {
		assert.equal(typeof (callback), 'function', 'Invalid callback parameter');

		var mt = infos.mimeType;
		if (mt && mt.startsWith('image')) {
			this._addImage2LinkTracks(infos);
			return callback();
		}

		if (!mt || !mt.startsWith('audio') || !this.keepFile(infos)) {
			debug('Music repository: Unsupported mime:  ' + mt);
			return callback();
		}

		var contentURL = infos.contentURL;

		var _loadFn;
		if (infos.attributes) {
			// attributes are already loaded (e.g. from DB)
			_loadFn = function (infos, callback) {
				callback(null, infos.attributes);
			};
		} else {
			// attributes are unknown, we need to load them:
			_loadFn = this.service.loadMetas.bind(this.service);
		}

		_loadFn(infos, (error, attributes) => {
			if (error) {
				return callback(error);
			}

			assert(attributes, 'Attributes var is null');

			this._addTrack2LinkImage(infos.contentURL.path, attributes);

			// console.log("Attributes of #" + node.id, attributes);

			var name = contentURL.basename;

			var i18n = this.service.upnpServer.configuration.i18n;

			var album = attributes.album || i18n.UNKNOWN_ALBUM;
			var title = attributes.title || name || i18n.UNKNOWN_TITLE;
			var artists = attributes.artists || [i18n.UNKNOWN_ARTIST];
			var genres = attributes.genres || [i18n.UNKNOWN_GENRE];
			var albumArtists = attributes.albumArtists;

			var itemData = {
				contentURL: contentURL,
				attributes: attributes,
				stats: infos.stats,

				album: album,
				title: title,
				artists: artists,
				genres: genres,
				albumArtists: albumArtists
			};

			this.registerAlbumsFolder(rootNode, itemData, (error /*, musicTrackNode*/ ) => {
				if (error) {
					return callback(error);
				}

				// itemData.musicTrackNode = musicTrackNode;

				var tasks = [];

				if (artists) {
					artists.forEach((artist) => {
						if (!artist)
							return;
						artist = artist.trim();
						tasks.push({
							fn: this.registerArtistsFolder,
							param: artist
						});
					});
				}

				if (genres) {
					genres.forEach((genre) => {
						if (!genre)
							return;
						genre = genre.trim();
						tasks.push({
							fn: this.registerGenresFolder,
							param: genre
						});
					});
				}

				Async.eachSeries(tasks, (task, callback) => {
					// logger.debug("Task: ", task.fn, task.param);

					task.fn.call(this, rootNode, itemData, task.param, callback);

				}, (error) => {
					callback(error, attributes);
				});
			});
		});
	}

	/**
	 * 
	 */
	registerArtistsFolder(parentNode, itemData, artistName, callback) {
		assert.equal(typeof (callback), 'function', 'Invalid callback parameter');

		parentNode.takeLock('scanner', () => {

			var artitsLabel = this.service.upnpServer.configuration.i18n.ARTISTS_FOLDER;

			parentNode.getFirstVirtualChildByTitle(artitsLabel, (error, artistsNode) => {

				if (error) {
					parentNode.leaveLock('scanner');
					return callback(error);
				}

				if (artistsNode) {
					parentNode.leaveLock('scanner');

					return this.registerArtist(artistsNode, itemData, artistName, callback);
				}

				debug('registerArtistsFolder', 'Register artists folder in #', parentNode.id);

				this.newVirtualContainer(parentNode, artitsLabel, (error, artistsNode) => {
					parentNode.leaveLock('scanner');

					if (error) {
						return callback(error);
					}

					this.registerArtist(artistsNode, itemData, artistName, callback);
				});
			});
		});
	}

	/**
	 * 
	 */
	registerArtist(parentNode, itemData, artistName, callback) {
		assert.equal(typeof (callback), 'function', 'Invalid callback parameter');

		parentNode.takeLock('scanner', () => {

			parentNode.getFirstVirtualChildByTitle(artistName, (error, artistNode) => {
				if (error) {
					parentNode.leaveLock('scanner');
					return callback(error);
				}

				if (artistNode) {
					parentNode.leaveLock('scanner');

					return this.registerAlbum(artistNode, itemData, callback);
				}

				debug('registerArtist', 'Register artist on #', parentNode.id, 'artist=', artistName);

				this.newVirtualContainer(parentNode, artistName, MusicArtist.UPNP_CLASS,
					(error, artistNode) => {
						parentNode.leaveLock('scanner');

						if (error) {
							return callback(error);
						}

						this.registerAlbum(artistNode, itemData, callback);
					});
			});
		});
	}

	/**
	 * 
	 */
	registerAlbum(parentNode, itemData, callback) {
		assert.equal(typeof (callback), 'function', 'Invalid callback parameter');

		parentNode.takeLock('scanner', () => {

			var album = itemData.album;

			parentNode.getFirstVirtualChildByTitle(album, (error, albumNode) => {
				if (error) {
					parentNode.leaveLock('scanner');

					return callback(error);
				}

				debug('registerAlbum', 'Find album=', album, 'in #', parentNode.id, '=>', !!albumNode);

				if (albumNode) {
					parentNode.leaveLock('scanner');

					if (albumNode.refId) {
						return callback();
					}

					itemData.albumItem = albumNode;


					this.registerMusicTrack(albumNode, itemData, callback);

					return;
				}

				if (itemData.albumItem) {
					// Non, pour un artiste on ne veut que les chansons de cet artiste par les autres
					// return self.newNodeRef(parentItem, itemData.albumItem, null, callback);
				}

				debug('registerAlbum', 'New album container parent=#', parentNode.id, 'name=', album);

				this.newVirtualContainer(parentNode, itemData.album, MusicAlbum.UPNP_CLASS,
					(error, albumNode) => {
						parentNode.leaveLock('scanner');

						if (error) {
							return callback(error);
						}

						itemData.albumItem = albumNode;

						this.registerMusicTrack(albumNode, itemData, callback);
					});
			});
		});
	}

	/**
	 * 
	 */
	registerMusicTrack(parentNode, itemData, callback) {
		assert.equal(typeof (callback), 'function', 'Invalid callback parameter');

		parentNode.takeLock('scanner', () => {

			var t = itemData.title;
			var contentPath = itemData.contentURL.path;

			var appendMusicTrack = () => {
				if (itemData.musicTrackNode) {
					debug('registerMusicTrack', 'Link musicTrack on #', parentNode.id, 'title=', t);

					this.newNodeRef(parentNode, itemData.musicTrackNode, (error) => {
						parentNode.leaveLock('scanner');

						callback(error);
					});
					return;
				}

				debug('registerMusicTrack', 'Create musicTrack on #', parentNode.id, 'title=', t);
				this.newFile(parentNode,
					itemData.contentURL,
					MusicTrack.UPNP_CLASS,
					itemData.stats,
					itemData.attributes,
					null,
					(error, node) => {
						parentNode.leaveLock('scanner');

						if (error) {
							return callback(error);
						}

						itemData.musicTrackNode = node;
						parentNode.childrenByContentPath = parentNode.childrenByContentPath || {};
						parentNode.childrenByContentPath[contentPath] = node;

						callback(null, node);
					});
			};

			if (!parentNode.childrenByContentPath || !parentNode.childrenByContentPath[contentPath]) {
				appendMusicTrack();
			} else {
				var mu = parentNode.childrenByContentPath[contentPath];
				itemData.musicTrackNode = mu;
				parentNode.leaveLock('scanner');
				callback(null, mu);
			}

		});
	}

	/**
	 * 
	 */
	registerGenresFolder(parentNode, itemData, genreName, callback) {

		assert.equal(typeof (callback), 'function', 'Invalid callback parameter');

		parentNode.takeLock('scanner', () => {

			var genresLabel = this.service.upnpServer.configuration.i18n.GENRES_FOLDER;

			parentNode.getFirstVirtualChildByTitle(genresLabel, (error, genresNode) => {

				if (error) {
					parentNode.leaveLock('scanner');
					return callback(error);
				}

				if (genresNode) {
					parentNode.leaveLock('scanner');

					return this.registerGenre(genresNode, itemData, genreName, callback);
				}

				debug('registerArtistsFolder', 'Register genres folder in #', parentNode.id);

				this.newVirtualContainer(parentNode, genresLabel, (error, genresNode) => {
					parentNode.leaveLock('scanner');

					if (error) {
						return callback(error);
					}

					this.registerGenre(genresNode, itemData, genreName, callback);
				});
			});
		});
	}

	/**
	 * 
	 */
	registerGenre(parentNode, itemData, genreName, callback) {

		parentNode.takeLock('scanner', () => {

			parentNode.getFirstVirtualChildByTitle(genreName, (error, genreItem) => {
				if (error) {
					parentNode.leaveLock('scanner');
					return callback(error);
				}

				if (genreItem) {
					parentNode.leaveLock('scanner');
					return this.registerAlbum(genreItem, itemData, callback);
				}

				this.newVirtualContainer(parentNode, genreName, MusicGenre.UPNP_CLASS,
					(error, genreItem) => {
						parentNode.leaveLock('scanner');
						if (error) {
							return callback(error);
						}

						this.registerAlbum(genreItem, itemData, callback);
					});
			});
		});
	}

	/**
	 * 
	 */
	registerAlbumsFolder(parentNode, itemData, callback) {

		parentNode.takeLock('scanner', () => {

			var albumsLabel = this.service.upnpServer.configuration.i18n.ALBUMS_FOLDER;

			parentNode.getFirstVirtualChildByTitle(albumsLabel, (error, albumsNode) => {

				if (error) {
					parentNode.leaveLock('scanner');
					return callback(error);
				}

				if (albumsNode) {
					parentNode.leaveLock('scanner');
					return this.registerAlbum(albumsNode, itemData, callback);
				}

				debug('registerAlbumsFolder', 'Register albums folder in #', parentNode.id);

				this.newVirtualContainer(parentNode, albumsLabel, (error, albumsNode) => {
					parentNode.leaveLock('scanner');
					if (error) {
						return callback(error);
					}

					this.registerAlbum(albumsNode, itemData, callback);
				});
			});
		});
	}
}

module.exports = MusicRepository;