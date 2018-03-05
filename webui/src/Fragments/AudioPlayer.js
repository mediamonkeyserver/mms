import React from 'react';

export var audioPlayer;

class AudioPlayer extends React.Component {
	render() {
		return (
			<audio
				ref={(audio) => audioPlayer = audio}>
			</audio>
		);
	}
}

AudioPlayer.propTypes = {
};

export default (AudioPlayer);
