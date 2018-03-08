import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
import { withStyles } from 'material-ui/styles';
import AppHeader from './AppHeader';
import MainDrawer from './MainDrawer';
import Dialogs from './Dialogs';
import MainContent from './MainContent';
import Player from './Player';
import AudioPlayer from './Fragments/AudioPlayer';
import VideoPlayer from './Fragments/VideoPlayer';

import { subscribeVideoState } from 'actions';

const styles = theme => ({
	root: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		display: 'flex',
		'flex-direction': 'column',
		backgroundColor: theme.palette.background.paper,
	},
	mainContent: {
		'flex-grow': 100,
		marginTop: 10,
		padding: 10,
		overflowX: 'hidden',
		overflowY: 'auto',
		position: 'relative',
	},
	videoWrapper: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'black',
		zIndex: 10000,
	},
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		opacity: 0.5,
		zIndex: 10001,
	}
});

class App extends Component {
	state = {
		video: false,
	}

	constructor(props) {
		super(props);
		subscribeVideoState(this.onVideoState);
	}

	onVideoState = (state) => {
		this.setState({ video: (state === 'show') });
	}

	render() {
		const { classes } = this.props;
		const videoShown = this.state.video ? '' : 'none';

		return (

			<div className={classes.root}>
				{/* Standard view */}
				<React.Fragment>
					<AppHeader />
					<div className={classes.mainContent}>
						<MainContent />
					</div>
					<Player />
				</React.Fragment>

				{/* Video playback layer */}
				<div className={classes.videoWrapper} style={{ display: videoShown }}>
					<VideoPlayer />
					<Player classes={{ root: classes.bottomBar }} />
				</div>

				{/* Items not visible by default */}
				<MainDrawer />
				<Dialogs />
				<AudioPlayer />
			</div>
		);
	}
}

App.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);