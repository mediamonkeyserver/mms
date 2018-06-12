import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import CollectionSorting from 'Fragments/CollectionSorting';
import CollectionFilter from 'Fragments/CollectionFilter';
import CollectionFilterButton from 'Fragments/CollectionFilterButton';

import MenuIcon from '@material-ui/icons/Menu';
import LoginIcon from './LoginIcon';
import CastingButton from 'Fragments/CastingButton';

import PubSub from 'pubsub-js';
import Server from './server';

import { Route, Switch } from 'react-router-dom';

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
		collections: [],
	};

	updateServerName = () => {
		Server.getInfo().then((info) => {
			this.setState({ serverName: info.serverName });
		}).catch(() => { });
	}

	updateCollections = () => {
		Server.getCollections().then((cols) => {
			this.setState({ collections: cols });
		}).catch(() => { });
	}

	componentDidMount = () => {
		this.updateServerName();
		this.updateCollections();
		PubSub.subscribe('CONFIG_CHANGE', this.update);
		PubSub.subscribe('COLLECTIONS_CHANGE', this.update);
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

	setDocumentTitle(title) {
		document.title = title + ' (MediaMonkey Server)';
		return title;
	}

	getCollectionTitle = (id) => {
		const title = (this.state.collections.filter(col => col.id === id)[0] || {name: null}).name;
		this.setDocumentTitle(title);
		return title;
	}

	renderTitle = () => {
		return (
			<Typography variant='title' color='inherit' className={this.props.classes.toolbarItem}>
				<Switch>
					<Route path='/col/:idCol' render={(props) => this.getCollectionTitle(props.match.params.idCol)} />
					<Route path='/log' render={() => this.setDocumentTitle('Server Log')} />
					<Route path='/col' render={() => this.setDocumentTitle('Collections')} />
					<Route path='/cfg' render={() => this.setDocumentTitle('Server Configuration')} />
					<Route path='/plst' render={() => this.setDocumentTitle('Playlists')} />
					<Route path='/' render={() => {this.setDocumentTitle('Dashboard'); return this.state.serverName;}} />
					<Route render={() => this.setDocumentTitle(this.state.serverName)}/>
				</Switch>
			</Typography>
		);
	}

	renderCollectionSort() {
		return (
			<Route path='/col/:idCol' render={props => (
				<div className={this.props.classes.toolbarItem}>
					<CollectionSorting {...props} collectionID={props.match.params.idCol} />
				</div>
			)} />
		);
	}

	renderFilterState() {
		return (
			<Route path='/col/:idCol' render={props => (
				<div className={this.props.classes.toolbarItem}>
					<CollectionFilter collectionID={props.match.params.idCol} />
				</div>
			)} />
		);
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
						<Route path='/col/:idCol' render={props => (
							<CollectionFilterButton {...props} collectionID={props.match.params.idCol} />
						)} />

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
