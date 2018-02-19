import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import IconButton from 'material-ui/IconButton';
import CollectionSorting from 'Fragments/CollectionSorting';

import MenuIcon from 'material-ui-icons/Menu';
import LoginIcon from './LoginIcon';

import PubSub from 'pubsub-js';
import Server from './server';
import { subscribeViewChange } from './actions';

const styles = {
	root: {
		width: '100%',
		zIndex: 100,
	},
	flex: {
		flex: 1,
	},
	menuButton: {
		marginLeft: -12,
		marginRight: 20,
	},
};

class AppHeader extends React.Component {
	state = {
		auth: true,
		anchorEl: null,
		serverName: '',
		view: 'dashboard',
		viewProps: null,
	};

	updateServerName = () => {
		Server.getInfo().then((info) => {
			this.setState({ serverName: info.serverName });
		});
	}

	componentDidMount = () => {
		this.updateServerName();
		PubSub.subscribe('CONFIG_CHANGE', this.update);
		subscribeViewChange(this.handleViewChange);
	}

	handleViewChange = (msg, data) => {
		this.setState({
			view: data.view,
			viewProps: data.props,
		});
	}

	handleChange = (event, checked) => {
		this.setState({ auth: checked });
	};

	handleMenu = event => {
		this.setState({ anchorEl: event.currentTarget });
	};

	handleClose = () => {
		this.setState({ anchorEl: null });
	};

	handleMainDrawer = () => {
		PubSub.publish('TOGGLE_MAIN_DRAWER');
	}

	renderTitle = () => {
		const { classes } = this.props;

		switch (this.state.view) {
			case 'collection':
				return (
					<Typography variant='title' color='inherit' className={classes.flex}>
						{this.state.viewProps.collection.name}
					</Typography>
				);
			default:
				return (
					<Typography variant='title' color='inherit' className={classes.flex}>
						{this.state.serverName}
					</Typography>
				);
		}
	}

	renderCollectionSort() {
		if (this.state.view === 'collection') {
			return (
				<CollectionSorting collection={this.state.viewProps.collection} />
			);
		}
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<AppBar position='static'>
					<Toolbar>
						<IconButton className={classes.menuButton} color='inherit' aria-label='Menu' onClick={this.handleMainDrawer}>
							<MenuIcon />
						</IconButton>
						{this.renderTitle()}

						{this.renderCollectionSort()}
						<LoginIcon />
					</Toolbar>
				</AppBar>
			</div>
		);
	}
}

AppHeader.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(AppHeader);
