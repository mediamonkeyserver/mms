// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Fab from '@material-ui/core/Fab';
import Slider from 'rc-slider'; // We use this non-Material UI Slider until there's one included in the material-ui library.
import { withTheme } from '@material-ui/core/styles';

import PlayIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import StopIcon from '@material-ui/icons/Stop';

import Playback from './playback';
import { subscribePlaybackStateChange } from './actions';

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
	},
	slider: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: -5,
		height: 10,
	}
};

const SEEK_STEPS = 10000;

class Player extends React.Component {
	state = {
		playing: false,
		playbackActive: false,
		trackTitle: '',
		seekPosition: 20,
	};

	componentDidMount() {
		subscribePlaybackStateChange(this.playbackStateChange);
	}

	playbackStateChange = () => {
		var mediaItem = Playback.getCurrentMediaItem();
		this.setState({
			playing: Playback.getPlaying(),
			playbackActive: Playback.getActive(),
			trackTitle: mediaItem ? (mediaItem.artists ? mediaItem.artists.join('; ') : '') + ' - ' + mediaItem.title : '',
		});
		this.setSeekUpdater();
	}

	setSeekUpdater = () => {
		var playing = Playback.getPlaying();
		if (playing && !this.seekUpdater) {
			this.seekUpdater = setInterval(this.updateSeekPosition, 30);
		} else {
			if (!playing && this.seekUpdater) {
				clearInterval(this.seekUpdater);
				this.seekUpdater = null;
			}
		}
	}

	updateSeekPosition = () => {
		var duration = Playback.getDuration();
		var position = null;
		if (duration) {
			var currTime = Playback.getCurrentTime();
			position = currTime / duration * SEEK_STEPS;
		}
		this.setState({ seekPosition: position });
	}

	handleSeeked = (value) => {
		var duration = Playback.getDuration();
		if (duration) {
			var position = value / SEEK_STEPS * duration;
			Playback.setCurrentTime(position);
		}
		this.updateSeekPosition();
	}

	handlePlayPauseClick = () => {
		Playback.playPause();
	}

	handleStopClick = () => {
		Playback.stop();
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<AppBar position='static'>
					<Toolbar>
						{/* Seekbar */}
						{this.state.playbackActive ?
							<Slider
								className={classes.slider}
								value={this.state.seekPosition}
								max={SEEK_STEPS}
								railStyle={{
									backgroundColor: this.props.theme.palette.primary.light,
								}}
								trackStyle={{
									backgroundColor: this.props.theme.palette.secondary.main,
								}}
								handleStyle={{
									backgroundColor: this.props.theme.palette.secondary.main,
									border: 'none',
									width: 12,
									height: 12,
									marginTop: -4,
								}}
								onChange={this.handleSeeked} />
							: null}

						{/* Play button */}
						<Fab size='small' color='secondary' aria-label='play' className={classes.playButton} onClick={this.handlePlayPauseClick}>
							{this.state.playing ? <PauseIcon /> : <PlayIcon />}
						</Fab>

						{/* Track title */}
						<Typography color='inherit' className={classes.flex}>
							{this.state.trackTitle}
						</Typography>

						{/* Stop button */}
						{this.state.playbackActive ?
							<Fab size='small' color='secondary' aria-label='stop' className={classes.playButton} onClick={this.handleStopClick}>
								<StopIcon />
							</Fab> : null}
					</Toolbar>
				</AppBar>
			</div>
		);
	}
}

Player.propTypes = {
	classes: PropTypes.object.isRequired,
	theme: PropTypes.object.isRequired,
};

// @ts-ignore
export default withTheme()(withStyles(styles)(Player));
