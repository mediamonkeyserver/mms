//@ts-check

const child_process = require('child_process');
const spawn = child_process.spawn;
/** @type {any} */
const Uuid = require('uuid');
const logger = require('./logger');
const path = require('path');
const mkdir = require('mkdirp'); // Can create multiple nested folders
const rimraf = require('rimraf'); // Removes non-empty dirs
const fs = require('fs');

const configuration = require('./configuration');

var transcoders = [];

const OUT_FILE_PREFIX = 'f';
const OUT_FILE_EXT = 'ts';
const TARGETDURATION = 3; // seconds of one .ts piece
const MAX_CONV_WAIT_TIME = 7000; // Max wait time for a segment creation
const PAUSE_CONVERSION_TIME = TARGETDURATION * 3;

// Prepare the temporary folder for transcoding
var transFolder = path.join(configuration.getTempFolder(), 'trans');
rimraf(transFolder, () => { }); // Remove it in order to clean it. It will be created later, when needed by transcoding


class Transcoder {
	constructor() {
		this.uuid = Uuid.v4();
		this.lastReadTime = Date.now();
		this.seekIndex = 0;
		this.contentURL = null;

		this.codecArgs = [];
		this.targetArgs = [];
		this.mimeType = '';
		this.outStream = null;

		transcoders.push(this);
		this._checkStateInt = setInterval(this._checkState.bind(this), 1000);
	}

	async init() {
		this.folder = path.join(transFolder, this.uuid);

		// Resolve only when the folder really exists
		return new Promise(async (resolve, reject) => {
			mkdir(this.folder, err => {
				if (err)
					reject(err);
				else
					resolve();
			});

			// Following not needed after the fix for resolve() above?
			// const test = () => {
			// 	fs.access(this.folder, err => {
			// 		if (err)
			// 			setTimeout(test, 1);
			// 		else
			// 			resolve();
			// 	});
			// };

			// test();
		});
	}

	stopConversion() {
		logger.debug('Stopping conversion.');

		if (this.inputStream) {
			logger.debug('Closing input stream.');
			this.inputStream.unpipe();
			this.inputStream.destroy();
			this.inputStream = undefined;
		}

		if (this.ffmpeg) {
			logger.debug('Terminating ffmpeg.');
			this.ffmpeg.stdin.end();
			if (this.paused && process.platform !== 'win32') // No windows support
				this.ffmpeg.kill('SIGCONT');	// Resume ffmpeg so that it can gracefully terminate
			this.ffmpeg = undefined;
		}
	}

	close() {
		logger.debug('Closing transcoder');

		this.stopConversion();

		clearInterval(this._checkStateInt);

		// Remove folder
		rimraf(this.folder, () => { });

		// Remove this transcoder
		transcoders.filter(t => t !== this);
	}

	_checkState() {
		var diff = Date.now() - this.lastReadTime;
		if (diff > PAUSE_CONVERSION_TIME * 1000 && !this.paused) {
			this.paused = true;
			if (this.ffmpeg && process.platform !== 'win32') // No windows support
				this.ffmpeg.kill('SIGSTOP');
		}
	}

	_getStreamIndex(path) {
		var re = new RegExp(OUT_FILE_PREFIX+'(\\d+).' + OUT_FILE_EXT,'');
		const res = re.exec(path);
		return Number(res[1]);
	}

	_formatStreamPartPath(partIndex) {
		return path.join(this.folder, `${OUT_FILE_PREFIX}${partIndex}.${OUT_FILE_EXT}`);
	}

	async _fileExists(filename) {
		return new Promise(resolve => {
			fs.access(filename, (err) => {
				if (err)
					logger.debug(`Stream file doesn't exist: ${err}`);
				if ((err === undefined) || (err === null)) {
					return resolve(true);
				} else {
					// Check existence of the '.tmp' file as well
					fs.access(filename + '.tmp', (err) => {
						if (err)
							logger.debug(`Stream file doesn't exist: ${err}`);
						resolve((err === undefined) || (err === null));
					});
				}
			});
		});
	}

	async _streamPartExists(partIndex) {
		return await this._fileExists(this._formatStreamPartPath(partIndex));
	}

	// Seeks to the specified index
	async _performSeek(partIndex) {
		logger.verbose(`Seeking to stream position index ${partIndex}.`);
		return new Promise(async (resolve) => {
			this.stopConversion();
			await this.openInputStream();
			var startIndex = partIndex;
			var seekSec = startIndex * TARGETDURATION;
			this.spawnFFmpeg(['-ss', `${seekSec}`],
				['-segment_start_number', `${startIndex}`,
					'-segment_time_delta', `-${seekSec}`,
					'-copyts' /* adjust timestamps */]);
			this.inputStream.pipe(this.ffmpeg.stdin);
			this.seekIndex = partIndex;
			resolve();
		});
	}

	getFile(file) {
		const fullPath = path.join(this.folder, file);
		logger.debug(`Getting file ${fullPath} for streaming.`);

/*		if(file.endsWith('.m3u8')) {
			return new Promise(async (resolve, reject) => {
				var stream = fs.createReadStream(fullPath);
				stream.on('open', () => {
					logger.debug(`Stream ${fullPath} successfully openned.`);
					resolve(stream);
				});
				stream.on('error', async (err) => {
					logger.debug(`Stream ${fullPath} not available yet (${err}).`);
				});
			});
		}*/
		const streamIndex = this._getStreamIndex(file);

		this.lastReadTime = Date.now();
		const reqStart = Date.now();
		var fileExistsSince;

		if (this.paused) {
			this.paused = undefined;
			if (this.ffmpeg && process.platform !== 'win32') // No windows support
				this.ffmpeg.kill('SIGCONT'); // Resume ffmpeg
		}

		return new Promise(async (resolve, reject) => {

			var openPath = fullPath;

			const openStream = async () => {
				if (Date.now() - reqStart > MAX_CONV_WAIT_TIME) {
					logger.verbose(`Waiting too long for ${fullPath}, terminating`);
					reject();
					return;
				}

				const thisExists = await this._streamPartExists(streamIndex);
				const nextExists = await this._streamPartExists(streamIndex + 1);
				if (thisExists && !fileExistsSince)
					fileExistsSince = Date.now();

				if (thisExists && (nextExists || Date.now() - fileExistsSince > 2000)) {	// TODO: A hack to make sure we open a file that's really already fully created by ffmpeg
					var stream = fs.createReadStream(openPath);
					stream.on('open', () => {
						logger.debug(`Stream ${fullPath} successfully openned.`);
						this.lastReadTime = Date.now();
						resolve(stream);
					});
					stream.on('error', async (err) => {
						logger.debug(`Stream ${fullPath} not available yet (${err}).`);
						setTimeout(openStream, 100);
					});
				} else {
					setTimeout(openStream, 100);
				}
			};

			const isSeek = (streamIndex < this.seekIndex ? true :     // Prior to the previously seeked position => it's a seek.
				(streamIndex === this.seekIndex ? false :               // At the seeked position => not a seek now, just wait for the file.
					!await this._streamPartExists(streamIndex - 1)));     // Does the previous index exist? Not a seek, wait for this one.

			if (isSeek) {
				// We aren't at the requested position yet, let's seek
				await this._performSeek(streamIndex);
				setTimeout(openStream, 0); // Open the stream right away
			} else {
				openStream();
			}
		});
	}

	onFFmpegEnd() {
		logger.debug('FFmpeg was terminated.');
		this.ffmpeg = undefined;
	}

	spawnFFmpeg(inputArgs, outputArgs) {
		const args = (inputArgs || []).concat(['-i', 'pipe:0']).concat(this.codecArgs).concat(outputArgs || []).concat(this.targetArgs);
		logger.verbose('Spawning ffmpeg ' + args.join(' '));

		this.ffmpeg = spawn('ffmpeg', args);

		this.ffmpeg.on('exit', this.onFFmpegEnd.bind(this));

		this.ffmpeg.stderr.on('data', function (data) {
			logger.verbose('ffmpeg: ' + data);
		});
	}

	_getM3UFilename() {
		return path.join(this.folder, 'out.m3u8');
	}

	async createM3UStream(duration) {
		var s = '';
		s += '#EXTM3U\n';
		s += '#EXT-X-VERSION:3\n';
		s += `#EXT-X-TARGETDURATION:${TARGETDURATION}\n`;
		s += '#EXT-X-MEDIA-SEQUENCE:0\n';
		s += '#EXT-X-PLAYLIST-TYPE:VOD\n';

		for (var i = 0, done = 0; done < duration; i++ , done += TARGETDURATION) {
			s += `#EXTINF:${TARGETDURATION},\n`;
			s += `/api/trans/${this.uuid}/${OUT_FILE_PREFIX}${i}.${OUT_FILE_EXT}\n`;
		}

		s += '#EXT-X-ENDLIST\n';

		this.streamSize = s.length;
		this.TSparts = i;

		return new Promise((resolve, reject) => {
			fs.writeFile(this._getM3UFilename(), s, (error) => {
				if (error)
					reject(error);
				else
					resolve(fs.createReadStream(this._getM3UFilename()));
			});
		});
	}

	static async getStreamInfo(mediaItem, request) {
		return new Promise((resolve/*, reject*/) => {
			const accepted = ['audio/mpeg', 'video/mp4', 'audio/mp4', 'audio/mp3', 'video/webm', 'audio/webm', 'video/ogg', 'audio/wav', 'audio/ogg'];
			request = request || {};
			var userAgent = request.headers ? request.headers['user-agent'] : '';
			var transcode = false;			
			var forceHLS = (request.query && request.query.forceHLS);
			var resMime = undefined;
			var isChromecast = false;
			if (userAgent.startsWith('MediaMonkey') || userAgent.startsWith('NSPlayer/')) { // NSPlayer is user agent e.g. from our WMA plugin
				resMime = mediaItem.mimeType;
			} else {
				if (!forceHLS) {
					// detect chromecast
					if(userAgent.toUpperCase().includes('CRKEY')) {
						// it is Chromecast
						var acceptedChr = ['audio/mp4', 'video/mp4', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'video/webm', 'audio/wav', 'audio/aac', 'audio/x-flac'];
						resMime = acceptedChr.find(value => value === mediaItem.mimeType);
						isChromecast = true;
					} else {
						// basic detect of browser
						// TODO: more precise detection
						if(userAgent.includes('Seamonkey/') || userAgent.includes('Firefox/') || userAgent.includes('Chromium/') || userAgent.includes('Chrome/')
						|| userAgent.includes('Safari/') || userAgent.includes('OPR/') || userAgent.includes('Opera/')) {
							resMime = accepted.find(value => value === mediaItem.mimeType);
						} else if(userAgent.includes('; MSIE')) {
							var acceptedIE = ['audio/mpeg', 'video/mpeg', 'video/mp4', 'audio/mp4', 'audio/mp3'];
							resMime = acceptedIE.find(value => value === mediaItem.mimeType);
						} else {
							// for all unknown do not convert and send original file
							resMime = mediaItem.mimeType;
						}
					}
				};

				if (forceHLS || !resMime) {
					resMime = 'application/x-mpegurl';
					transcode = true;
				}
			};

			resolve({
				stream: {
					mimeType: resMime,
					transcode: transcode,
				}
			});
		});
	}

	async openInputStream() {
		return new Promise((resolve, reject) => {
			this.contentURL.createReadStream(null, {}, async (error, stream) => {
				if (error) {
					const errorStr = `No stream for contentURL=${this.contentURL} (${error})`;
					logger.error(errorStr);
					reject(error);
				} else {
					this.inputStream = stream;
					resolve(stream);
				}
			});
		});
	}

	static async convert(contentURL, mediaItem, request) {

		return new Promise(async (resolve, reject) => {

			var streamInfo = await Transcoder.getStreamInfo(mediaItem, request);
			if (!streamInfo.stream.transcode) {
				resolve(null); // No transcoding necessary
				return;
			}

			const trans = new Transcoder();
			await trans.init();

			trans.mimeType = streamInfo.stream.mimeType;
			trans.contentURL = contentURL;
			await trans.openInputStream();

			if (!mediaItem.duration) {
				reject('Transcode: No source duration (TODO)');
				return;
			}
			if(trans.mimeType === 'application/x-mpegurl') {
				if (mediaItem.mimeType.startsWith('audio/')) {
					trans.codecArgs = [
						'-c:a', 'aac', // mp3 in TS not supported by Chromecast
						'-ac', '2', // multichannel not supported, max. 2 channels
						'-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,
						'-vn', // Avoid video in audio conversions (artwork is treated as video and causes troubles otherwise)
						'-f', 'segment',	// Tested also 'hls' muxer, but seeking didn't work well (not sure why though).
						'-max_delay', '5000000',
						'-avoid_negative_ts', 'disabled',

						'-start_at_zero',
						'-segment_time', '3',
						'-individual_header_trailer', '0',
						'-segment_format', 'mpegts',
						'-segment_list_type', 'm3u8',
					];
				} else {
					trans.codecArgs = [
						'-c:v', 'libx264',
						'-preset', 'veryfast',
						'-crf', '23',
						'-x264opts:0', 'subme=0:me_range=4:rc_lookahead=10:me=dia:no_chroma_me:8x8dct=0:partitions=none',
						// '-force_key_frames', '"expr:if(isnan(prev_forced_t),eq(t,t),gte(t,prev_forced_t+2))"',
						'-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,
						'-profile:v', 'high',
						'-level', '4.1',

						'-c:a', 'aac', // mp3 in TS not supported by Chromecast
						'-ac', '2', // multichannel not supported, max. 2 channels
						// '-codec:a', 'copy',

						'-f', 'segment',	// Tested also 'hls' muxer, but seeking didn't work well (not sure why though).
						'-max_delay', '5000000',
						'-avoid_negative_ts', 'disabled',

						'-start_at_zero',
						'-segment_time', '3',
						'-individual_header_trailer', '0',
						'-segment_format', 'mpegts',
						'-segment_list_type', 'm3u8',
//						'-segment_format_options', 'movflags=+frag_keyframe', // needed for fmp4 muxer
					];
				}

				trans.targetArgs = [
					'-segment_list', path.join(trans.folder, OUT_FILE_PREFIX) + '.m3u8',
					path.join(trans.folder, OUT_FILE_PREFIX) + '%d.' + OUT_FILE_EXT];

				trans.spawnFFmpeg();
				trans.inputStream.pipe(trans.ffmpeg.stdin);

				trans.outStream = await trans.createM3UStream(mediaItem.duration);
				resolve(trans);
			} else {
				reject('Transcode: Conversion to DASH WEBM not supported yet');
				return;
			}
		});

	}

	// static async convert_todolater(contentURL, mediaItem) {

	// 	const trans = new Transcoder();
	// 	await trans.init();

	// 	return new Promise((resolve, reject) => {

	// 		contentURL.createReadStream(null, {}, (error, stream) => {
	// 			if (error) {
	// 				const errorStr = `No stream for contentURL=${contentURL} (${error})`;
	// 				logger.error(errorStr);
	// 				reject(errorStr);
	// 				return;
	// 			}

	// 			var args;
	// 			if (mediaItem.mimeType.startsWith('audio/')) {
	// 				args = ['-f', 'mp3', '-ac', '2', '-ab', '128k', '-acodec', 'libmp3lame'];
	// 			} else {
	// 				args = ['-f', 'webm', '-vcodec', 'libvpx', '-acodec', 'libvorbis', '-ab', '128000', '-crf', '22'];
	// 				// args = ['-f', 'mpegts', '-vcodec', 'libx264', '-movflags', 'faststart+frag_keyframe+empty_moov ','-acodec', 'aac', '-ab', '128000', /*'-strict', 'experimental',*/ '-ac', '2', '-crf', '22'];
	// 			}

	// 			const ffmpeg = trans.spawnFFmpeg(args, () => { });
	// 			stream.pipe(ffmpeg.stdin);

	// 			trans.outStream = ffmpeg.stdout;
	// 			resolve(trans);

	// 			// stream.on('end', () => callback(null, true));
	// 		});

	// 	});
	// }

	static getById(id) {
		return transcoders.find(t => t.uuid === id);
	}

	static cancelRunningForClient(clientId) {
		transcoders.filter(t => t.clientId === clientId).forEach(t => {
			logger.debug('Cancelling a transcoder, new request from the same client.');
			t.close();
		});
	}
}

module.exports = Transcoder;