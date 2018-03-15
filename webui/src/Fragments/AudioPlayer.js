import React from 'react';
import { notifyPlaybackState } from 'actions';

export var audioPlayer;

var initialized = false;
function initAudioPlayer() {
	if (!initialized && audioPlayer) {
		audioPlayer.addEventListener('paused', () => notifyPlaybackState(), true);
		audioPlayer.addEventListener('play', () => notifyPlaybackState(), true);
		audioPlayer.addEventListener('playing', () => notifyPlaybackState(), true);
		audioPlayer.addEventListener('ended', () => notifyPlaybackState(), true);
	}
}

class AudioPlayer extends React.Component {
	render() {
		return (
			<audio
				ref={(audio) => { audioPlayer = audio; initAudioPlayer(); }}>
			</audio>
		);
	}
}

AudioPlayer.propTypes = {
};

export default (AudioPlayer);
