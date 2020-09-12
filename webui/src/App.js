// @ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
import 'rc-slider/assets/index.css';
import { withStyles } from '@material-ui/core/styles';
import AppHeader from './AppHeader';
import MainDrawer from './MainDrawer';
import Dialogs from './Dialogs';
import DialogLogin from './Dialogs/DialogLogin';
import MainContent from './MainContent';
import Player from './Player';
import Server from './server';
import AudioPlayer from './Fragments/AudioPlayer';
import VideoPlayer from './Fragments/VideoPlayer';
import screenfull from 'screenfull';

import { subscribeVideoState } from './actions';

import { withRouter } from 'react-router-dom';
import PubSub from 'pubsub-js';

const styles = ({
	root: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		display: 'flex',
		'flex-direction': 'column',
		backgroundColor: '#f0f0f0',
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
		opacity: 0.7,
		zIndex: 10001,
	}
});

var videoWrapper;

class App extends Component {
	state = {
		video: false,
	}

	constructor(props) {
		super(props);
		subscribeVideoState(this.onVideoState);
	}

	componentDidMount() {
		document.body.addEventListener('keyup', this.handleKeyUp);
		Server.checkIfLoggedIn();
	}

	handleKeyUp = (event) => {
		if (event.key === 'Escape') {
			PubSub.publish('QUICKSEARCH', { term: '' }); // To clean up the search box
			if (this.props.location.pathname.startsWith('/search'))
				this.props.history.goBack();
		}
	}

	onVideoState = (state) => {
		this.setState({ video: (state === 'show') });
		if (state === 'show')
			// @ts-ignore
			screenfull.request(videoWrapper);
		else
			// @ts-ignore
			screenfull.exit();
	}

	render() {
		const { classes } = this.props;
		const videoShown = this.state.video ? '' : 'none';

		return (

			<div className={classes.root}>
				{/* Standard view */}
				<React.Fragment>
					<AppHeader user={this.props.user} />
					<div className={classes.mainContent}>
						<MainContent user={this.props.user} />
					</div>
					<Player />
				</React.Fragment>

				{/* Video playback layer */}
				<div className={classes.videoWrapper} style={{ display: videoShown }} ref={(div) => videoWrapper = div}>
					<VideoPlayer />
					{
						// @ts-ignore
						<Player classes={{ root: classes.bottomBar }} />
					}
				</div>

				{/* Items not visible by default */}
				<MainDrawer />
				<Dialogs />
				<DialogLogin user={this.props.user} />
				<AudioPlayer />
			</div >
		);
	}
}

App.propTypes = {
	classes: PropTypes.object.isRequired,
	history: PropTypes.object.isRequired,
	location: PropTypes.object.isRequired,
	user: PropTypes.object,
};

// @ts-ignore
export default withStyles(styles)(withRouter(App));