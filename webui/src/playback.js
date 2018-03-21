import Server from 'server';
import { audioPlayer } from 'Fragments/AudioPlayer';
import { videoPlayer } from 'Fragments/VideoPlayer';
import { notifyPlaybackState, subscribePlaybackStateChange, notifyVideoShow, notifyVideoHide } from 'actions';

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

class LocalPlayback {
	static playItem(mediaItem) {
		if (state.getActive())
			LocalPlayback.stop(); // To close any existing player

		var video = mediaItem.mimeType.startsWith('video/');

		if (video) {
			state.activeAVPlayer = videoPlayer;
			notifyVideoShow();
		} else {
			state.activeAVPlayer = audioPlayer;
		}
		state.activeAVPlayer.src = mediaItem.streamURL;
		state.activeAVPlayer.play();
		state.mediaItem = mediaItem;

		notifyPlaybackState('playing', state.mediaItem);
	}

	static pause() {
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
		if (!state.activeAVPlayer)
			return;

		state.activeAVPlayer.pause();
		if (state.activeAVPlayer === videoPlayer)
			notifyVideoHide();
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
	}, true);
}

export default Playback;