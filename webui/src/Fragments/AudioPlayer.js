// @ts-check
import React from 'react';
import { addPlayerListeners } from '../playback';

export var audioPlayer;

var initialized = false;
function initAudioPlayer() {
	if (!initialized && audioPlayer) {
		initialized = true;
		addPlayerListeners(audioPlayer);
	}
}

class AudioPlayer extends React.Component {
	render() {
		return (
			<audio autoPlay={false} crossOrigin="anonymous" // eslint-disable-line
				ref={(audio) => { audioPlayer = audio; initAudioPlayer(); }}>
			</audio>
		);
	}
}

AudioPlayer.propTypes = {
};

export default (AudioPlayer);
