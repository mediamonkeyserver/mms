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
	playItemLocally(mediaItem);
});

// == Playback ==

var state = {
	audioPlaying: false,
	mediaItem: null,
};

function notifyPlaybackState() {
	PubSub.publish('PLAYBACK_STATE', state);	
}

function playItemLocally(mediaItem) {
	audioPlayer.src = mediaItem.streamURL;
	audioPlayer.play();
	state.audioPlaying = true;
	state.mediaItem = mediaItem;
	notifyPlaybackState();
}

class Playback {
	static playMediaItem(mediaItem) {
		if (castingClientID) {
			Server.playItem(castingClientID, mediaItem);
		} else {
			playItemLocally(mediaItem);
		}
	}
	
	static playPause() {
		if (audioPlayer.paused) {
			audioPlayer.play();
			state.audioPlaying = true;
		} else {
			audioPlayer.pause();
			state.audioPlaying = false;
		}
		notifyPlaybackState();
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