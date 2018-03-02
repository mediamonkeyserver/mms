import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import Button from 'material-ui/Button';

import PlayIcon from 'material-ui-icons/PlayArrow';
import PauseIcon from 'material-ui-icons/Pause';

import PubSub from 'pubsub-js';

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

var castingClientID;

export function getCastingClientID() {
	return castingClientID;
}

export function setCastingClientID(newClientID) {
	castingClientID = newClientID;
}

class Player extends React.Component {
	state = {
		playing: false,
		trackTitle: '',
	};

	componentDidMount() {
		PubSub.subscribe('PLAY', this.playAudio);
	}

	playAudio = (msg, data) => {
		this.audioPlayer.src = data.url;
		this.audioPlayer.play();
		this.setState({
			playing: true,
			trackTitle: data.title,
		});
	}

	handlePlayPauseClick = () => {
		var newPlaying = this.state.playing;
		if (this.audioPlayer.paused) {
			this.audioPlayer.play();
			newPlaying = true;
		} else {
			this.audioPlayer.pause();
			newPlaying = false;
		}
		this.setState({
			playing: newPlaying,
		});
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
				<audio
					ref={(audio) => this.audioPlayer = audio}>
				</audio>
			</div>
		);
	}
}

Player.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Player);
