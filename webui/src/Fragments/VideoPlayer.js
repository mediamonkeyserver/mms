import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import { addPlayerListeners } from 'playback';

export var videoPlayer;

var initialized = false;
function initVideoPlayer() {
	if (!initialized && videoPlayer) {
		initialized = true;
		addPlayerListeners(videoPlayer);
	}
}

const styles = {
	root: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		objectFit: 'cover',
	},
};

class VideoPlayer extends React.Component {
	render() {
		return (
			<video className={this.props.classes.root}
				ref={(video) => { videoPlayer = video; initVideoPlayer(); }}>
			</video>
		);
	}
}

VideoPlayer.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(VideoPlayer);
