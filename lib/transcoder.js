const child_process = require('child_process');
const spawn = child_process.spawn;
const Uuid = require('uuid');
const logger = require('./logger');
const path = require('path');
const mkdir = require('mkdirp'); // Uses promises and can create multiple nested folders
const fs = require('fs');

const configuration = require('./configuration');

var transcoders = [];

const OUT_FILE_PREFIX = 'f';
const TARGETDURATION = 3;

class Transcoder {
	constructor() {
		this.uuid = Uuid.v4();
		transcoders.push(this);
	}

	async init() {
		this.folder = path.join(configuration.getTempFolder(), this.uuid);
		await mkdir(this.folder);
	}

	static getById(id) {
		return transcoders.find(t => t.uuid === id);
	}

	getFile(file) {
		const fullpath = path.join(this.folder, file);
		logger.debug(`Getting file ${fullpath} for streaming.`);

		return new Promise((resolve/*, reject*/) => {

			const openStream = () => {
				var stream = fs.createReadStream(fullpath);
				stream.on('open', () => {
					logger.debug(`Stream ${fullpath} successfully openned.`);
					resolve(stream);
				});
				stream.on('error', () => {
					logger.debug(`Stream ${fullpath} not available yet.`);
					setTimeout(openStream, 50);
				});
			};

			openStream();
		});
	}

	onFFmpegEnd() {
		this.ffmpeg = undefined;
	}

	spawnFFmpeg(codecArgs) {
		const args = ['-i', 'pipe:0'].concat(codecArgs);//.concat(['pipe:1']);

		this.ffmpeg = spawn('ffmpeg', args);

		logger.verbose('Spawning ffmpeg ' + args.join(' '));

		this.ffmpeg.on('exit', this.onFFmpegEnd.bind(this));

		this.ffmpeg.stderr.on('data', function (data) {
			logger.verbose('ffmpeg: ' + data);
		});
	}

	getM3UFilename() {
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

		return new Promise((resolve, reject) => {
			fs.writeFile(this.getM3UFilename(), s, (error) => {
				if (error)
					reject(error);
				else
					resolve(fs.createReadStream(this.getM3UFilename()));
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

			contentURL.createReadStream(null, {}, async (error, stream) => {
				if (error) {
					const errorStr = `No stream for contentURL=${contentURL} (${error})`;
					logger.error(errorStr);
					reject(errorStr);
					return;
				}

				if (!mediaItem.duration) {
					reject('Transcode: No source duration (TODO)');
					return;
				}

				// var args;
				// if (mediaItem.mimeType.startsWith('audio/')) {
				// 	args = ['-f', 'mp3', '-ac', '2', '-ab', '128k', '-acodec', 'libmp3lame'];
				// } else {
				// 	args = ['-f', 'webm', '-vcodec', 'libvpx', '-acodec', 'libvorbis', '-ab', '128000', '-crf', '22'];
				// 	// args = ['-f', 'mpegts', '-vcodec', 'libx264', '-movflags', 'faststart+frag_keyframe+empty_moov ','-acodec', 'aac', '-ab', '128000', /*'-strict', 'experimental',*/ '-ac', '2', '-crf', '22'];
				// }

				var args;
				if (mediaItem.mimeType.startsWith('audio/')) {
					args = ['-c:a', 'mp3', '-flags', '+cgop', '-hls_time', `${TARGETDURATION}`, '-hls_list_size', '0',
						'-hls_playlist_type', 'vod',
						'-hls_flags', 'round_durations+temp_file', // temp file, so that the file isn't present, until actually fully encoded and ready to be served
						'-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,
						'-vn', // Avoid video in audio conversions (artwork is treated as video and causes troubles otherwise)
						path.join(trans.folder, OUT_FILE_PREFIX) + '.m3u8'];
				} else {
					args = [
						'-c:v', 'libx264',
						'-c:a', 'mp3',
						'-flags', '+cgop',
						'-hls_time', `${TARGETDURATION}`,
						'-hls_list_size', '0',
						'-hls_playlist_type', 'vod',
						'-hls_flags', 'round_durations+temp_file', // temp file, so that the file isn't present, until actually fully encoded and ready to be served
						'-force_key_frames', `expr:gte(t,n_forced*${TARGETDURATION})`,
						path.join(trans.folder, OUT_FILE_PREFIX) + '.m3u8'];
				}

				trans.spawnFFmpeg(args, () => { });
				stream.pipe(trans.ffmpeg.stdin);

				trans.outStream = await trans.createM3UStream(mediaItem.duration);
				resolve(trans);

				// stream.on('end', () => callback(null, true));
			});

		});
	}

	static async convert_todolater(contentURL, mediaItem) {

		const trans = new Transcoder();
		await trans.init();

		return new Promise((resolve, reject) => {

			contentURL.createReadStream(null, {}, (error, stream) => {
				if (error) {
					const errorStr = `No stream for contentURL=${contentURL} (${error})`;
					logger.error(errorStr);
					reject(errorStr);
					return;
				}

				var args;
				if (mediaItem.mimeType.startsWith('audio/')) {
					args = ['-f', 'mp3', '-ac', '2', '-ab', '128k', '-acodec', 'libmp3lame'];
				} else {
					args = ['-f', 'webm', '-vcodec', 'libvpx', '-acodec', 'libvorbis', '-ab', '128000', '-crf', '22'];
					// args = ['-f', 'mpegts', '-vcodec', 'libx264', '-movflags', 'faststart+frag_keyframe+empty_moov ','-acodec', 'aac', '-ab', '128000', /*'-strict', 'experimental',*/ '-ac', '2', '-crf', '22'];
				}

				const ffmpeg = trans.spawnFFmpeg(args, () => { });
				stream.pipe(ffmpeg.stdin);

				trans.outStream = ffmpeg.stdout;
				resolve(trans);

				// stream.on('end', () => callback(null, true));
			});

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