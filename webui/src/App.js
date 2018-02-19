import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
import { withStyles } from 'material-ui/styles';
import AppHeader from './AppHeader';
import MainDrawer from './MainDrawer';
import Dialogs from './Dialogs';
import MainContent from './MainContent';
import Player from './Player';

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
	}
});

class App extends Component {
	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<AppHeader />
				<div className={classes.mainContent}>
					<MainContent />
				</div>
				<Player />
				<MainDrawer />
				<Dialogs />
			</div>
		);
	}
}

App.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);