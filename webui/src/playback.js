// @ts-check
import Server from './server';
import { audioPlayer } from './Fragments/AudioPlayer';
import { videoPlayer } from './Fragments/VideoPlayer';
import { notifyPlaybackState, subscribePlaybackStateChange, notifyVideoShow, notifyVideoHide } from './actions';

import Hls from 'hls.js';

import Debug from 'debug';
const debug = Debug('mms:playback');
const debugError = Debug('mms:error:playback');
//localStorage.debug = '*';
// TODO: USe https://github.com/mediaelement/mediaelement for playback? Offers several renderers, etc.

// == Casting ==

var castingClientID = null;

export function getCastingClientID() {
	return castingClientID;
}

export function setCastingClientID(newClientID) {
	castingClientID = newClientID;
}

// == Server events ==

Server.addEventHandler('play_item', (mediaItem) => {
	LocalPlayback.playItem(mediaItem);
});

Server.addEventHandler('play_pause', () => {
	LocalPlayback.pause();
});

Server.addEventHandler('stop', () => {
	LocalPlayback.stop();
});

Server.addEventHandler('seek', (newTime) => {
	LocalPlayback.seek(newTime);
});


Server.addEventHandler('playback_state', (playerID) => {
	if (playerID === castingClientID) {
		// We are notified about playback state of the Player we Cast to => refresh our UI
		Server.getPlayers().then(players => {
			for (var player of players) {
				if (player.id === playerID) {
					state.castingPlaying = (player.status === 'playing');
					state.castingActive = (player.status === 'playing' || player.status === 'paused');
					state.mediaItem = player.mediaItem;
					state.castingCurrentTime = player.currentTime;
					state.castingLastUpdate = performance.now();

					notifyPlaybackState();
				}
			}
		});
	}
});

// == Server notifications ==

var lastStateSent = null;
var lastMediaItem = null;

// TODO: Send notifications about playback position every ~10 seconds.

subscribePlaybackStateChange((data) => {
	if (castingClientID)
		return;	// Don't notify server in case we're casting to another player

	var newstate = data.state;
	var mediaItem = data.mediaItem || state.mediaItem;
	var send = (data.state !== lastStateSent) ||	// Different state => send notification
		((lastMediaItem || {}).db_id !== (mediaItem || {}).db_id); // Diffent item playing => send notification

	if (newstate === 'seeked') {
		send = true; // We need to notify about the seek right away
		newstate = 'playing';
	}

	if (send) {
		lastStateSent = newstate;
		lastMediaItem = Object.assign({}, mediaItem);
		Server.updatePlaybackState(newstate, mediaItem, Playback.getCurrentTime());
	}
});

// == Playback ==

var state = {
	activeAVPlayer: null,
	mediaItem: null,
	getPlaying: function () { return castingClientID ? this.castingPlaying : this.activeAVPlayer && !this.activeAVPlayer.ended && !this.activeAVPlayer.paused; },
	getActive: function () { return castingClientID ? this.castingActive : this.activeAVPlayer && !this.activeAVPlayer.ended; },
	castingPlaying: false,
	castingActive: false,
	castingCurrentTime: null,
	castingLastUpdate: null,
};

var hls;
var lastHlsRecoverMedia;
var lastHlsAudioCodecSwap;

function isHLSMimeType(mimeType) {
	return ['application/x-mpegurl', 'application/vnd.apple.mpegurl', 'audio/mpegurl', 'video/mpegurl', 'audio/hls', 'video/hls'].indexOf(mimeType.toLowerCase()) > -1;
}

class LocalPlayback {

	// HLS playback start
	static startHls(video, url) {
		if (Hls.isSupported()) {
			hls = new Hls(/*{debug: true}*/);
			hls.loadSource(url);
			hls.attachMedia(video);

			hls.on(Hls.Events.MANIFEST_PARSED, function () {
				debug('HLS manifest parsed, going to play');

				const playRes = video.play();
				if (playRes)	// The Promise isn't returned by all browsers (e.g. Edge, atm).
					playRes.catch((error) => {
						debugError(`HLS playback failed (${error.details})`);
						if (error.name !== 'NotAllowedError')	// Don't stop, so that user can restart playback on mobile devices, where play() fails beause it's execute async (not in click event).
							LocalPlayback.stop();
					});
			});

			hls.on(Hls.Events.ERROR, (msg, error) => {
				debugError(`HLS playback failed (${error.details}, fatal=${error.fatal})`);
				if (error.fatal) {
					switch (error.type) {
						case Hls.ErrorTypes.MEDIA_ERROR:
							// HLS.js doesn't sometimes like the seeked transcoded streams, we try to recover from these problems here
							if (!lastHlsRecoverMedia || Date.now() - lastHlsRecoverMedia > 3000) {
								lastHlsRecoverMedia = Date.now();
								debug('HLS recovering media error');
								hls.recoverMediaError();
								video.play();
								break;
							}
							if (!lastHlsAudioCodecSwap || Date.now() - lastHlsAudioCodecSwap > 3000) {
								lastHlsAudioCodecSwap = Date.now();
								debug('HLS swapping audio codec');
								hls.swapAudioCodec();
								video.play();
							}
							break;

						case Hls.ErrorTypes.NETWORK_ERROR:
							hls.destroy();
							hls.startLoad();
							break;

						default:
							LocalPlayback.stop();
					}
				}
			});
		}
		// hls.js is not supported on platforms that do not have Media Source Extensions (MSE) enabled.
		// When the browser has built-in HLS support (check using `canPlayType`), we can provide an HLS manifest (i.e. .m3u8 URL) directly to the video element throught the `src` property.
		// This is using the built-in support of the plain video element, without using hls.js.
		else if (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL')) {
			video.src = url;
			video.addEventListener('canplay', function () {
				const playRes = video.play();
				if (playRes)	// The Promise isn't returned by all browsers (e.g. Edge, atm).
					playRes.catch((error) => {
						debugError(`Native HLS playback failed (${error})`);
						if (error.name !== 'NotAllowedError')	// Don't stop, so that user can restart playback on mobile devices, where play() fails beause it's execute async (not in click event).
							LocalPlayback.stop();
					});
			});
		}
	}

	static playItem(mediaItem, params) {
		debug(`playItem: ${mediaItem}`);

		if (state.getActive())
			LocalPlayback.stop(); // To close any existing player

		// Prepare audio or video player
		var video = mediaItem.mimeType.startsWith('video/');
		if (video) {
			state.activeAVPlayer = videoPlayer;
			notifyVideoShow();
		} else {
			state.activeAVPlayer = audioPlayer;
		}

		state.mediaItem = mediaItem;

		notifyPlaybackState('playing', state.mediaItem);

		// Get info about the format
		Server.getMediaStreamInfo(mediaItem, params).then(info => {

			if (isHLSMimeType(info.stream.mimeType)) {
				// HLS is handled by the hls.js library
				state.playingHLS = true;
				LocalPlayback.startHls(state.activeAVPlayer, Server.getMediaStreamURL(mediaItem, { forceHLS: true }));
			} else {
				state.playingHLS = false;
				// Everything else is handled natively by HTML5 <audio>/<video> elements
				state.activeAVPlayer.src = Server.getMediaStreamURL(mediaItem);//mediaItem.streamURL;
				const playRes = state.activeAVPlayer.play();
				if (playRes)	// The Promise isn't returned by all browsers (e.g. Edge, atm).
					playRes.catch((error) => {
						debugError(`Playback failed (${error})`);
						if (error.name !== 'NotAllowedError')	// Don't stop, so that user can restart playback on mobile devices, where play() fails beause it's execute async (not in click event).
							LocalPlayback.stop();
					});
			}
		}).catch((err) => {
			debugError(`Playback info not received (${err})`);
			LocalPlayback.stop();
		});
	}

	static pause() {
		debug('Local playback pause');

		if (!state.activeAVPlayer) {
			// We are in 'stopped' state
			if (state.mediaItem) {
				// There was an item played, restart the playback
				LocalPlayback.playItem(state.mediaItem);
			}
			return;
		}

		if (state.activeAVPlayer.paused) {
			state.activeAVPlayer.play();
		} else {
			state.activeAVPlayer.pause();
		}

		notifyPlaybackState(state.getPlaying() ? 'playing' : 'paused', state.mediaItem);
	}

	static stop() {
		debug('Local playback stop');

		if (!state.activeAVPlayer)
			return;

		state.activeAVPlayer.pause();
		if (state.activeAVPlayer === videoPlayer)
			notifyVideoHide();

		if (hls) {
			hls.detachMedia();
			hls.destroy();
			hls = undefined;
		} else {
			// JH: Disabled in order to not cause an error (empty src). It probably isn't needed anyway?
			// if (state.activeAVPlayer)
			// 	state.activeAVPlayer.src = '';
		}

		state.activeAVPlayer = null;

		notifyPlaybackState('stopped');
	}

	static seek(newTime) {
		if (!state.activeAVPlayer)
			return;
		state.activeAVPlayer.currentTime = newTime;
	}
}

// == Global Playback ==   (including Casting)

class Playback {
	static playMediaItem(mediaItem) {
		if (castingClientID) {
			// Temporarily set the casting state, until we're notified from the target player about the actual state
			state.mediaItem = mediaItem;
			state.currentCurrentTime = 0;
			state.castingLastUpdate = performance.now();
			state.castingActive = true;
			state.castingPlaying = true;

			Server.playItem(castingClientID, mediaItem);
		} else {
			LocalPlayback.playItem(mediaItem);
		}
	}

	static playPause() {
		if (castingClientID) {
			Server.playPause(castingClientID);
		} else {
			LocalPlayback.pause();
		}
	}

	static stop() {
		if (castingClientID) {
			Server.stop(castingClientID);
		} else {
			LocalPlayback.stop();
		}
	}

	static getPlaying() {
		return state.getPlaying();
	}

	static getActive() {
		return state.getActive();
	}

	static isPlayingHLS() {
		return state.playingHLS;
	}

	static getCurrentMediaItem() {
		return state.mediaItem;
	}

	static getDuration() {
		var res = null;
		if (castingClientID) {
			if (state.mediaItem)
				res = state.mediaItem.duration;
		} else {
			if (state.activeAVPlayer) {
				res = state.activeAVPlayer.duration;
			}
		}
		return res;
	}

	static getCurrentTime() {
		var res = null;
		if (castingClientID) {
			res = state.castingCurrentTime + (state.castingPlaying ? performance.now() - state.castingLastUpdate : 0) / 1000;
		} else {
			if (state.activeAVPlayer) {
				res = state.activeAVPlayer.currentTime;
			}
		}
		return res;
	}

	static setCurrentTime(newTime) {
		if (castingClientID) {
			Server.seek(castingClientID, newTime);
		} else {
			if (state.activeAVPlayer) {
				state.activeAVPlayer.currentTime = newTime;
			}
		}
	}
}

// == HTML Playback events ==

export function addPlayerListeners(player) {
	player.addEventListener('paused', () => notifyPlaybackState('paused'), true);
	player.addEventListener('play', () => notifyPlaybackState('playing'), true);
	player.addEventListener('seeked', () => notifyPlaybackState('seeked'), true);

	player.addEventListener('playing', () => {
		// Update duration from the player (in case is isn't known yet, or incorrectly).
		if (player.duration) {
			const mediaItem = Playback.getCurrentMediaItem();
			if (mediaItem)
				mediaItem.duration = player.duration;
		}

		notifyPlaybackState('playing');
	}, true);

	player.addEventListener('ended', () => {
		notifyVideoHide();
		notifyPlaybackState('stopped');
	}, true);

	player.addEventListener('error', () => {
		notifyVideoHide();
		notifyPlaybackState('stopped');
		if (!Playback.isPlayingHLS()) {
			LocalPlayback.playItem(Playback.getCurrentMediaItem(), { forceHLS: true });
		}
	}, true);
}

export default Playback;