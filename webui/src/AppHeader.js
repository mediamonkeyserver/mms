import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import IconButton from 'material-ui/IconButton';
import CollectionSorting from 'Fragments/CollectionSorting';
import CollectionFilter from 'Fragments/CollectionFilter';
import CollectionFilterButton from 'Fragments/CollectionFilterButton';

import MenuIcon from 'material-ui-icons/Menu';
import LoginIcon from './LoginIcon';
import CastingButton from 'Fragments/CastingButton';

import PubSub from 'pubsub-js';
import Server from './server';
import { subscribeViewChange } from './actions';

const styles = theme => ({
	root: {
		width: '100%',
		zIndex: 100,
	},
	expand: {
		flex: 1,
		display: 'flex',
		alignItems: 'center',
	},
	menuButton: {
		marginLeft: -1.5 * theme.spacing.unit,
		marginRight: 1.5 * theme.spacing.unit,
	},
	toolbarItem: {
		marginLeft: theme.spacing.unit,
		marginRight: theme.spacing.unit,
	}
});

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
		}).catch(() => { });
	}

	componentDidMount = () => {
		this.updateServerName();
		PubSub.subscribe('CONFIG_CHANGE', this.update);
		subscribeViewChange(this.handleViewChange);
	}

	handleViewChange = (data) => {
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
		switch (this.state.view) {
			case 'collection':
				return (
					<Typography variant='title' color='inherit' className={this.props.classes.toolbarItem}>
						{this.state.viewProps.collection.name}
					</Typography>
				);
			case 'log':
				return (
					<Typography variant='title' color='inherit' className={this.props.classes.toolbarItem}>
						{'Server Log'}
					</Typography>
				);
			default:
				return (
					<Typography variant='title' color='inherit' className={this.props.classes.toolbarItem}>
						{this.state.serverName}
					</Typography>
				);
		}
	}

	renderCollectionSort() {
		if (this.state.view === 'collection') {
			return (
				<div className={this.props.classes.toolbarItem}>
					<CollectionSorting collection={this.state.viewProps.collection} />
				</div>
			);
		}
	}

	renderFilterState() {
		if (this.state.view === 'collection') {
			return (
				<div className={this.props.classes.toolbarItem}>
					<CollectionFilter collection={this.state.viewProps.collection} />
				</div>
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
						<div className={classes.expand}>
							{this.renderTitle()}
							{this.renderFilterState()}
						</div>

						{this.renderCollectionSort()}
						{this.state.view === 'collection' ? <CollectionFilterButton collection={this.state.viewProps.collection} /> : null}
						<CastingButton />
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
