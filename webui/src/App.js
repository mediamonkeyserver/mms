import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
import { withStyles } from 'material-ui/styles';
import AppHeader from './AppHeader';
import MainDrawer from './MainDrawer';
import Dialogs from './Dialogs';
import MainContent from './MainContent';
import Player from './Player';
import Paper from 'material-ui/Paper';

import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles';

const styles = {
	root: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		display: 'flex',
		'flex-direction': 'column',
	},
	mainContent: {
		'flex-grow': 100,
		marginTop: 10,
		padding: 10,
		overflowX: 'hidden',
		overflowY: 'auto',
		position: 'relative',
	}
};

const theme = createMuiTheme({
	// palette: {
	//   primary: {
	//     light: '#d05ce3',
	//     main: '#9c27b0',
	//     dark: '#6a0080',
	//     contrastText: '#fff',
	//   },
	//   secondary: {
	//     light: '#9fffe0',
	//     main: '#69f0ae',
	//     dark: '#2bbd7e',
	//     contrastText: '#000',
	//   },
	//   type: 'dark',    
	// },
	// status: {
	//   danger: 'orange',
	// },
});

class App extends Component {
	render() {
		const { classes } = this.props;

		return (
			<MuiThemeProvider theme={theme}>
				<div className={classes.root}>
					<AppHeader />
					<Paper elevation={0} square className={classes.mainContent}>
						<MainContent />
					</Paper>
					<Player />
					<MainDrawer />
					<Dialogs />
				</div>
			</MuiThemeProvider>
		);
	}
}

App.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);