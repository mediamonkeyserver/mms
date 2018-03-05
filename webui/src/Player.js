import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import Button from 'material-ui/Button';

import PlayIcon from 'material-ui-icons/PlayArrow';
import PauseIcon from 'material-ui-icons/Pause';

import Playback from 'playback';

const styles = {
	root: {
		width: '100%',
	},
	flex: {
		marginLeft: 10,
		flex: 1,
	},
	playButton: {
		margin: 0,
	}
};

class Player extends React.Component {
	state = {
		playing: false,
		trackTitle: '',
	};

	componentDidMount() {
		Playback.subscribePlaybackStateChange(this.stateChange);
	}

	stateChange = () => {
		var mediaItem = Playback.getCurrentMediaItem();
		this.setState({
			playing: Playback.getAudioPlaying(),
			trackTitle: (mediaItem.artists ? mediaItem.artists.join('; ') : '') + ' - ' + mediaItem.title,
		});
	}

	handlePlayPauseClick = () => {
		Playback.playPause();		
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<AppBar position='static'>
					<Toolbar>
						<Button variant='fab' mini color='secondary' aria-label='play' className={classes.playButton} onClick={this.handlePlayPauseClick}>
							{this.state.playing ? <PauseIcon /> : <PlayIcon />}
						</Button>
						<Typography type='title' color='inherit' className={classes.flex}>
							{this.state.trackTitle}
						</Typography>
					</Toolbar>
				</AppBar>
			</div>
		);
	}
}

Player.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Player);
