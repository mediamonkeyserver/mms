import PubSub from 'pubsub-js';
import Server from 'server';
import { audioPlayer } from 'Fragments/AudioPlayer';

// == Casting ==

var castingClientID;

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

Server.addEventHandler('playback_state', (playerID) => {
	if (playerID === castingClientID) {
		Server.getPlayers().then(players => {
			for (var player of players) {
				if (player.id === playerID) {
					state.audioPlaying = player.status === 'playing';
					state.mediaItem = player.mediaItem;
					notifyPlaybackState();
				}
			}
		});
	}
});

// == Playback ==

var state = {
	audioPlaying: false,
	mediaItem: null,
};

function notifyPlaybackState() {
	PubSub.publish('PLAYBACK_STATE', state);
}

class LocalPlayback {
	static playItem(mediaItem) {
		audioPlayer.src = mediaItem.streamURL;
		audioPlayer.play();
		state.audioPlaying = true;
		state.mediaItem = mediaItem;
		notifyPlaybackState();
		Server.updatePlaybackState('play', state.mediaItem);
	}

	static pause() {
		if (audioPlayer.paused) {
			audioPlayer.play();
			state.audioPlaying = true;
		} else {
			audioPlayer.pause();
			state.audioPlaying = false;
		}
		notifyPlaybackState();
		Server.updatePlaybackState(state.audioPlaying ? 'play' : 'pause', state.mediaItem);
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

	static getAudioPlaying() {
		return state.audioPlaying;
	}

	static getCurrentMediaItem() {
		return state.mediaItem;
	}

	static subscribePlaybackStateChange(callback) {
		return PubSub.subscribe('PLAYBACK_STATE', (msg, data) => callback(data));
	}
}

export default Playback;