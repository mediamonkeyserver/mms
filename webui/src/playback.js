import Server from 'server';
import { audioPlayer } from 'Fragments/AudioPlayer';
import { videoPlayer } from 'Fragments/VideoPlayer';
import { notifyPlaybackState, notifyVideoShow, notifyVideoHide } from 'actions';

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

Server.addEventHandler('playback_state', (playerID) => {
	if (playerID === castingClientID) {
		Server.getPlayers().then(players => {
			for (var player of players) {
				if (player.id === playerID) {
					state.castingPlaying = (player.status === 'playing');
					state.castingActive = (player.status === 'playing' || player.status === 'paused');
					state.mediaItem = player.mediaItem;
					notifyPlaybackState();
				}
			}
		});
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
		notifyPlaybackState();
		Server.updatePlaybackState('playing', state.mediaItem);
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
		notifyPlaybackState();
		Server.updatePlaybackState(state.getPlaying() ? 'playing' : 'paused', state.mediaItem);
	}

	static stop() {
		if (!state.activeAVPlayer)
			return;

		state.activeAVPlayer.pause();
		if (state.activeAVPlayer === videoPlayer)
			notifyVideoHide();
		state.activeAVPlayer = null;

		notifyPlaybackState();
		Server.updatePlaybackState('stopped', state.mediaItem);
	}
}

class Playback {
	static playMediaItem(mediaItem) {
		if (castingClientID) {
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
			res = null;
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
			res = null;
		} else {
			if (state.activeAVPlayer) {
				res = state.activeAVPlayer.currentTime;
			}
		}
		return res;
	}

	static setCurrentTime(newTime) {
		if (castingClientID) {
			//
		} else {
			if (state.activeAVPlayer) {
				state.activeAVPlayer.currentTime = newTime;
			}
		}
	}
}

export default Playback;