// ts-check

'use strict';

const crypto = require('crypto');

const mm = require('music-metadata');
const Mime = require('mime');

const debug = require('debug')('upnpserver:contentHandlers:Musicmetadata');

const logger = require('../logger');
const ContentHandler = require('./contentHandler');

class Audio_MusicMetadata extends ContentHandler {

	/**
	 *
	 */
	get name() {
		return 'musicMetadata';
	}

	prepareMetas(contentInfos, context, callback) {

		debug('Prepare', contentInfos);

		var contentURL = contentInfos.contentURL;

		logger.verbose('Reading metadata of ' + contentURL.path);

		var parsing = true;

		try {
			debug('Start musicMetadata contentURL=', contentURL);
			// mm(stream, {
			// 	duration: true
			// 	// fileSize : stats.size

			// }, (error, tags) => {
			mm.parseFile(contentURL.path, { duration: true, native: true }).then((metadata) => {
				var tags = metadata.common;

				parsing = false;

				debug('Parsed musicMetadata contentURL=', contentURL, 'tags=', tags);

				if (!tags) {
					logger.error('MM does not support: ' + contentURL);
					return callback();
				}

				var metas = {};

				metas['duration'] = metadata.format.duration;

				['title', 'album', 'grouping', 'copyright'].forEach((n) => {
					if (tags[n]) {
						metas[n] = tags[n];
					}
				});

				if (tags.albumartist)
					metas.albumArtists = [tags.albumartist];
				metas.artists = normalize(tags.artists); // js array
				metas.genres = normalize(tags.genre); // js array
				metas.authors = normalize(tags.composer); // js array
				metas.conductors = normalize(tags.conductor); // js array
				metas.lyricists = normalize(tags.lyricist); // js array
				if (tags.label)
					metas.publishers = [tags.label];
				
				metas.encoder = tags.encodersettings || tags.encodedby;
				metas.copyright = tags.copyright;
				metas.subtitle = tags.subtitle;
				metas.bitrate = metadata.format.bitrate;
				metas.sampleFrequency = metadata.format.sampleRate;				
				metas.nrAudioChannels = metadata.format.numberOfChannels;
				if (tags.bpm && !isNaN(tags.bpm))
					metas.bpm = Math.round( Number(tags.bpm));

				metas.originalTitle = tags.originalalbum;
				metas.originalArtist = tags.originalartist;				
				metas.originalDate = tags.originaldate;

				metas.mood = tags.mood;		
				metas.isrc = tags.isrc;

				if (tags.lyrics && tags.lyrics.length)
					metas.lyrics = tags.lyrics[0];

				if (tags.comment && tags.comment.length)
					metas.comment = tags.comment[0];

				var native = metadata.native;
				if (native && (native['ID3v2.4'] || native['ID3v2.3'] || native['ID3v2.2'])) {
					var ID3 = native['ID3v2.4'] || native['ID3v2.3'] || native['ID3v2.2'];
					this._parseID3( ID3, metas);
				}	

				if (native && native['iTunes MP4']) {
					var MP4 = native['iTunes MP4'];
					this._parseiTunesMP4(MP4, metas);
				}	

				if (native && native['vorbis']) {
					var vorbis = native['vorbis'];
					this._parseVorbis(vorbis, metas);
				}

				if (tags.year) {
					metas.year = tags.year && parseInt(tags.year, 10);
				}

				var track = tags.track;
				if (track) {
					if (typeof (track.no) === 'number' && track.no) {
						metas.originalTrackNumber = track.no;

						if (typeof (track.of) === 'number' && track.of) {
							metas.trackOf = track.of;
						}
					}
				}

				var disk = tags.disk;
				if (disk) {
					if (typeof (disk.no) === 'number' && disk.no) {
						metas.originalDiscNumber = disk.no;

						if (typeof (disk.of) === 'number' && disk.of) {
							metas.diskOf = disk.of;
						}
					}
				}

				if (tags.picture) {
					var as = [];
					var res = [{}];

					var index = 0;
					tags.picture.forEach((picture) => {
						var mimeType = Mime.getType(picture.format) || picture.format;

						var key = index++;

						if (!mimeType) {
							logger.verbose('Unknown mime type ('+picture.format+')');
							return;
						}

						if (!picture.data) {
							logger.verbose('Empty image data.');
							return;
						}

						if (!mimeType.indexOf('image/')) {

							var hash = computeHash(picture.data);

							as.push({
								contentHandlerKey: this.name,
								mimeType: mimeType,
								size: picture.data.length,
								hash: hash,
								key: key
							});
							return;
						}

						res.push({
							contentHandlerKey: this.name,
							mimeType: mimeType,
							size: picture.data.length,
							key: key
						});

					});

					if (as.length) {
						metas.albumArts = as;
					}
					if (res.length > 1) {
						metas.res = res;
					}
				}

				callback(null, metas);
			}).catch((error) => {
				logger.error('Music metadata parsing error: ' + error + ' (' + contentURL.path + ')');
				callback();
			});
		} catch (x) {
			if (parsing) {
				logger.error('Catch ', x, x.stack);

				logger.error('MM: Parsing exception contentURL=' + contentURL.path, x);
				return callback();
			}
			logger.error('Catch ', x, x.stack);

			throw x;
		}
	}

	_writeRating(val, metas) {
		metas.rating = val;
		metas.ratings = [];
		metas.ratings.push({
			rating: val,
			type: 'userRating'
		});
	}

	_parseID3(ID3, metas) {
		for (var item of ID3) {
			if (item.id == 'USLT') 
				metas.lyrics = item.value.text;
			else
			if (item.id == 'TOLY') 
				metas.originalLyricist = item.value;
			else
			if (item.id == 'POPM' && !isNaN(item.value.rating)) {
				var i = Number(item.value.rating);
				var value = 0;				
				if (i == 0)
					value = 0;
				else
				if (i == 0x01) // WMP rating of 1 star
					value = 20;
				else
				if (i == 0xFF)
					value = 100; // WMP rating of 5 stars
				else
				if (i >= 0x04 && i <= 0x1D)	
					value = i-3;
				else					
				if (i >= 0x32 && i <= 0x45)	
					value = i-24;
				else
				if (i >= 0x72 && i <= 0x85)	
					value = i-68;
				else
				if (i >= 0xB6 && i <= 0xC9)	
					value = i-116;
				else
				if (i >= 0xEE && i <= 0xFC)	
					value = i-152;
				else																				
					value = Math.round( i*100/255); // Otherwise apply the old type of conversion used by MM 3.0				
				this._writeRating(value, metas);				
			} else
			if (item.id == 'TXXX:replaygain_track_gain') {
				var val1 = item.value.replace('dB','');
				if (!isNaN(val1))
					metas.volumeLevelTrack = Number(val1);
			} else
			if (item.id == 'TXXX:replaygain_album_gain')  {
				var val2 = item.value.replace('dB','');
				if (!isNaN(val2))
					metas.volumeLevelAlbum = Number(val2);
			} else
			if (item.id == 'COMM') {
				switch(item.value.description) {
					case 'Songs-DB_Tempo', 'MusicMatch_Tempo':
						metas.tempo = item.value.text;
						break;
					case 'Songs-DB_Mood', 'MusicMatch_Mood':
						metas.mood = item.value.text;
						break;
					case 'Songs-DB_Occasion', 'MusicMatch_Situation':
						metas.occasion = item.value.text;
						break;		
					case 'Songs-DB_Preference', 'MusicMatch_Preference':
						metas.quality = item.value.text;
						break;
					case 'Songs-DB_Custom1':
						metas.custom1 = item.value.text;
						break;
					case 'Songs-DB_Custom2':
						metas.custom2 = item.value.text;
						break;
					case 'Songs-DB_Custom3':
						metas.custom3 = item.value.text;
						break;
					case 'Songs-DB_Custom4':
						metas.custom4 = item.value.text;
						break;
					case 'Songs-DB_Custom5':
						metas.custom5 = item.value.text;
						break;																																																					
					case 'Songs-DB_Custom6':
						metas.custom6 = item.value.text;
						break;
					case 'Songs-DB_Custom7':
						metas.custom7 = item.value.text;
						break;
					case 'Songs-DB_Custom8':
						metas.custom8 = item.value.text;
						break;
					case 'Songs-DB_Custom9':
						metas.custom9 = item.value.text;
						break;
					case 'Songs-DB_Custom10':
						metas.custom10 = item.value.text;
						break;							
					default:
						break;
				}

			}
		}
	}

	_parseiTunesMP4(MP4, metas) {
		for (var itm of MP4) {
			if (itm.id == 'rate' && !isNaN(itm.value)) {
				var val = Number(itm.value);
				this._writeRating(val, metas);				
			}
			else
				switch (itm.id) {
					case '----:com.apple.iTunes:ORIGINAL ARTIST':
						metas.originalArtist = itm.value;
						break;
					case '----:com.apple.iTunes:ORIGINAL ALBUM':
						metas.originalTitle = itm.value;
						break;
					case '----:com.apple.iTunes:ORIGINAL LYRICIST':
						metas.originalLyricist = itm.value;
						break;
					case '----:com.apple.iTunes:INVOLVED PEOPLE':
						metas.contributor = itm.value;
						break;
					case '----:com.apple.iTunes:ORIGINAL DATE':
						metas.originalDate = itm.value;
						break;
					case '----:com.apple.iTunes:TEMPO':
						metas.tempo = itm.value;
						break;
					case '----:com.apple.iTunes:MOOD':
						metas.mood = itm.value;
						break;
					case '----:com.apple.iTunes:OCCASION':
						metas.occasion = itm.value;
						break;
					case '----:com.apple.iTunes:QUALITY':
						metas.quality = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM1':
						metas.custom1 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM2':
						metas.custom2 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM3':
						metas.custom3 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM4':
						metas.custom4 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM5':
						metas.custom5 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM6':
						metas.custom6 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM7':
						metas.custom7 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM8':
						metas.custom8 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM9':
						metas.custom9 = itm.value;
						break;
					case '----:com.apple.iTunes:CUSTOM10':
						metas.custom10 = itm.value;
						break;						
					default:
						break;
				}
		}
	}

	_parseVorbis(vorbis, metas) {
		for (var v_itm of vorbis) {
			if (v_itm.id == 'RATING' && !isNaN(v_itm.value)) {
				var val = Number(v_itm.value);
				this._writeRating(val, metas);
			} else
			if (v_itm.id == 'REPLAYGAIN_TRACK_GAIN') {
				var val1 = v_itm.value.replace('dB','');
				if (!isNaN(val1))
					metas.volumeLevelTrack = Number(val1);
			} else
			if (v_itm.id == 'REPLAYGAIN_ALBUM_GAIN')  {
				var val2 = v_itm.value.replace('dB','');
				if (!isNaN(val2))
					metas.volumeLevelAlbum = Number(val2);
			}
			else
				switch (v_itm.id) {
					case 'ORIGINAL ARTIST':
						metas.originalArtist = v_itm.value;
						break;
					case 'ORIGINAL TITLE':
						metas.originalTitle = v_itm.value;
						break;
					case 'ORIGINAL LYRICIST':
						metas.originalLyricist = v_itm.value;
						break;
					case 'INVOLVED PEOPLE':
						metas.contributor = v_itm.value;
						break;
					case 'ORGANIZATION':
						metas.publishers = [v_itm.value];
						break;	
					case 'ENCODER':
						metas.encoder = v_itm.value;
						break;							
					case 'ORIGINAL DATE':
						metas.originalDate = v_itm.value;
						break;
					case 'TEMPO':
						metas.tempo = v_itm.value;
						break;
					case 'MOOD':
						metas.mood = v_itm.value;
						break;
					case 'OCCASION':
						metas.occasion = v_itm.value;
						break;
					case 'QUALITY':
						metas.quality = v_itm.value;
						break;
					case 'CUSTOM1':
						metas.custom1 = v_itm.value;
						break;
					case 'CUSTOM2':
						metas.custom2 = v_itm.value;
						break;
					case 'CUSTOM3':
						metas.custom3 = v_itm.value;
						break;
					case 'CUSTOM4':
						metas.custom4 = v_itm.value;
						break;
					case 'CUSTOM5':
						metas.custom5 = v_itm.value;
						break;
					case 'CUSTOM6':
						metas.custom6 = v_itm.value;
						break;
					case 'CUSTOM7':
						metas.custom7 = v_itm.value;
						break;
					case 'CUSTOM8':
						metas.custom8 = v_itm.value;
						break;
					case 'CUSTOM9':
						metas.custom9 = v_itm.value;
						break;
					case 'CUSTOM10':
						metas.custom10 = v_itm.value;
						break;						
					default:
						break;
				}
		}
	}

	/**
	 *
	 */
	processRequest(node, request, response, path, parameters, callback) {

		var albumArtKey = parseInt(parameters[0], 10);
		if (isNaN(albumArtKey) || albumArtKey < 0) {
			let error = new Error('Invalid albumArtKey parameter (' + parameters + ')');
			error.node = node;
			error.request = request;

			return callback(error, false);
		}

		var contentURL = node.contentURL;
		// console.log("Get stream of " + node, node.attributes);

		this._getPicture(node, contentURL, albumArtKey, (error, picture) => {

			if (!picture.format || !picture.data) {
				let error = new Error('Invalid picture for node #' + node.id + ' key=' + albumArtKey);
				error.node = node;
				error.request = request;

				return callback(error, false);
			}

			response.setHeader('Content-Type', picture.format);
			response.setHeader('Content-Size', picture.data.length);

			response.end(picture.data, () => callback(null, true));
		});
	}

	_getPicture(node, contentURL, pictureIndex, callback) {

		logger.verbose('Getting picture for ' + contentURL.path);

		mm.parseFile(contentURL.path, { duration: true }).then((metadata) => {
			if (metadata.common.picture && metadata.common.picture.length > pictureIndex)
				callback(null, metadata.common.picture[pictureIndex]);
			else
				logger.error('Cannot find picture index ' + pictureIndex);
		}).catch((err) => {
			logger.error('Reading picture: ' + err);
		});
	}
}

function normalize(strs) {
	var r = [];
	if (!strs || !strs.length) {
		return undefined;
	}
	strs.forEach((str) => str.split(',').forEach(
		(tok) =>
			r.push(tok.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()).trim())
	));
	return r;
}

function computeHash(buffer) {
	var shasum = crypto.createHash('sha1');
	shasum.update(buffer);

	return shasum.digest('hex');
}

module.exports = Audio_MusicMetadata;