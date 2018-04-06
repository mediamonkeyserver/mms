const child_process = require('child_process');
const spawn = child_process.spawn;
const Uuid = require('uuid');
const logger = require('./logger');
const path = require('path');
const mkdir = require('mkdirp'); // Uses promises and can create multiple nested folders
const rimraf = require('rimraf'); // Removes non-empty dirs
const fs = require('fs');

const configuration = require('./configuration');

var transcoders = [];

const OUT_FILE_PREFIX = 'f';
const TARGETDURATION = 3; // seconds of one .ts piece
const MAX_CONV_WAIT_TIME = 7000; // Max wait time for a segment creation
// const PAUSE_CONVERSION_TIME = TARGETDURATION * 2;

// Prepare the temporary folder for transcoding
var transFolder = path.join(configuration.getTempFolder(), 'trans');
rimraf(transFolder, () => { }); // Remove it in order to clean it. It will be created later, when needed by transcoding


class Transcoder {
	constructor() {
		this.uuid = Uuid.v4();
		this.lastReadTime = Date.now();
		this.seekIndex = 0;
		transcoders.push(this);
		this._checkStateInt = setInterval(this._checkState.bind(this), 1000);
	}

	async init() {
		this.folder = path.join(transFolder, this.uuid);

		// Resolve only when the folder really exists
		return new Promise(async resolve => {
			await mkdir(this.folder);

			const test = () => {
				fs.access(this.folder, err => {
					if (err)
						setTimeout(test, 1);
					else
						resolve();
				});
			};

			test();
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
		// TODO: Doesn't work well yet
		// var diff = Date.now() - this.lastReadTime;
		// if (diff > PAUSE_CONVERSION_TIME * 1000 && this.inputStream && !this.inputStream.isPaused()) {
		// 	this.paused = true;
		// 	this.inputStream.pause();
		// }
	}

	_getStreamIndex(path) {
		const res = /f(\d+).ts/.exec(path);
		return Number(res[1]);
	}

	_formatStreamPartPath(partIndex) {
		return path.join(this.folder, `${OUT_FILE_PREFIX}${partIndex}.ts`);
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
			// this.spawnFFmpeg(['-ss', `${startIndex * TARGETDURATION}`], ['-start_number', `${startIndex}`, '-copyts' /* adjust timestamps */]);
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
		const streamIndex = this._getStreamIndex(file);

		this.lastReadTime = Date.now();
		const reqStart = Date.now();
		var fileExistsSince;
		// if (this.inputStream && this.inputStream.isPaused()) {
		// 	this.paused = undefined;
		// 	this.inputStream.resume();
		// }

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
			s += `/api/trans/${this.uuid}/${OUT_FILE_PREFIX}${i}.ts\n`;
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

	static async getStreamInfo(mediaItem) {
		return new Promise((resolve/*, reject*/) => {
			const accepted = ['audio/mpeg', 'video/mpeg', 'video/mp4'];

			var transcode = false;
			var resMime = accepted.find(value => value === mediaItem.mimeType);

			if (!resMime) {
				resMime = 'application/x-mpegurl';
				transcode = true;
			}

			resolve({
				stream: {
					mimeType: resMime,
					transcode,
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

	static async convert(contentURL, mediaItem) {

		return new Promise(async (resolve, reject) => {

			var streamInfo = await Transcoder.getStreamInfo(mediaItem);
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

			if (mediaItem.mimeType.startsWith('audio/')) {
				trans.codecArgs = [
					// '-c:a', 'mp3',
					// '-hls_time', `${TARGETDURATION}`,
					// '-hls_list_size', '0',
					// '-hls_playlist_type', 'vod',
					// '-hls_flags', 'round_durations+temp_file', // temp file, so that the file isn't present, until actually fully encoded and ready to be served
					// '-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,
					// '-vn', // Avoid video in audio conversions (artwork is treated as video and causes troubles otherwise)

					'-c:a', 'mp3',
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
					// '-c:v', 'libx264',
					// '-c:a', 'mp3',
					// '-flags', '+cgop', // Closed GOP (is it needed?)
					// '-hls_time', `${TARGETDURATION}`,
					// '-hls_list_size', '0',
					// '-hls_playlist_type', 'vod',
					// '-hls_flags', 'round_durations+temp_file', // temp file, so that the file isn't present, until actually fully encoded and ready to be served
					// '-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,

					'-c:v', 'libx264',
					'-preset', 'veryfast',
					'-crf', '23',
					'-x264opts:0', 'subme=0:me_range=4:rc_lookahead=10:me=dia:no_chroma_me:8x8dct=0:partitions=none',
					// '-force_key_frames', '"expr:if(isnan(prev_forced_t),eq(t,t),gte(t,prev_forced_t+2))"',
					'-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,
					'-profile:v', 'high',
					'-level', '4.1',

					'-c:a', 'mp3',
					// '-codec:a', 'copy',

					'-f', 'segment',	// Tested also 'hls' muxer, but seeking didn't work well (not sure why though).
					'-max_delay', '5000000',
					'-avoid_negative_ts', 'disabled',

					'-start_at_zero',
					'-segment_time', '3',
					'-individual_header_trailer', '0',
					'-segment_format', 'mpegts',
					'-segment_list_type', 'm3u8',

					// '-hls_time', `${TARGETDURATION}`,
					// '-hls_list_size', '0',
					// '-bsf:v', 'h264_mp4toannexb',
					// '-hls_flags', 'temp_file', // temp file, so that the file isn't present, until actually fully encoded and ready to be served
					// '-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,
				];
			}

			trans.targetArgs = [
				'-segment_list', path.join(trans.folder, OUT_FILE_PREFIX) + '.m3u8',
				path.join(trans.folder, OUT_FILE_PREFIX) + '%d.ts'];

			trans.spawnFFmpeg();
			trans.inputStream.pipe(trans.ffmpeg.stdin);

			trans.outStream = await trans.createM3UStream(mediaItem.duration);
			resolve(trans);
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

// **********

// function spawnFfmpeg(codecArgs, exitCallback) {
// 	const args = ['-i', 'pipe:0'].concat(codecArgs).concat(['pipe:1']);

// 	// Arg for transport mp3
// 	//-c:a mp3 -flags +cgop -hls_time 10 -hls_list_size 0 -hls_playlist_type vod -hls_flags round_durations -force_key_frames expr:gte(t,n_forced*3) out.m3u8

// 	var ffmpeg = spawn('ffmpeg', args);

// 	logger.verbose('Spawning ffmpeg ' + args.join(' '));

// 	ffmpeg.on('exit', exitCallback);

// 	ffmpeg.stderr.on('data', function (data) {
// 		logger.debug('ffmpeg: ' + data);
// 	});

// 	return ffmpeg;
// }

// exports.convert = function convert(contentURL, mediaItem) {

// 	// new Transcoder();

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

// 			const ffmpeg = spawnFfmpeg(args, () => { });
// 			stream.pipe(ffmpeg.stdin);

// 			resolve(ffmpeg.stdout);

// 			// stream.on('end', () => callback(null, true));
// 		});

// 	});
// };

module.exports = Transcoder;