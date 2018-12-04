// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import CollectionSorting from './Fragments/CollectionSorting';
import CollectionFilter from './Fragments/CollectionFilter';
import CollectionFilterButton from './Fragments/CollectionFilterButton';
import SearchBar from 'material-ui-search-bar';

import MenuIcon from '@material-ui/icons/Menu';
import LoginIcon from './LoginIcon';
import SearchIcon from '@material-ui/icons/Search';
import ClearIcon from '@material-ui/icons/Clear';
import CastingButton from './Fragments/CastingButton';

import PubSub from 'pubsub-js';
import Server from './server';

import { withRouter } from 'react-router-dom';

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
	},
});

class AppHeader extends React.Component {
	state = {
		auth: true,
		anchorEl: null,
		serverName: '',
		collections: [],
		search: '',
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
		PubSub.subscribe('CONFIG_CHANGE', this.updateServerName);
		PubSub.subscribe('COLLECTIONS_CHANGE', this.updateCollections);
		PubSub.subscribe('QUICKSEARCH', (msg, data) => {
			this.setState({ search: data.term });
		});
	}

	componentDidUpdate(prevProps) {
		if (this.props.location.pathname !== prevProps.location.pathname) {
			this.setState({ search: '' });
		}
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
		PubSub.publish('TOGGLE_MAIN_DRAWER', null);
	}

	setDocumentTitle(title) {
		document.title = title + ' (MediaMonkey Server)';
		return title;
	}

	getCollectionTitle = (id) => {
		const title = (this.state.collections.filter(col => String(col.id) === String(id))[0] || { name: null }).name;
		this.setDocumentTitle(title);
		return title;
	}

	renderTitle = () => {
		if (this.state.search) {
			return (
				this.setDocumentTitle(`Search "${this.state.search}"`)
			);
		} else {
			return (
				<Switch>
					<Route path='/col/:idCol' render={(props) => this.getCollectionTitle(props.match.params.idCol)} />
					<Route path='/log' render={() => this.setDocumentTitle('Server Log')} />
					<Route path='/col' render={() => this.setDocumentTitle('Collections')} />
					<Route path='/cfg' render={() => this.setDocumentTitle('Server Configuration')} />
					<Route path='/plst' render={() => this.setDocumentTitle('Playlists')} />
					<Route path='/search/:term' render={(props) => this.setDocumentTitle(`Search "${props.match.params.term}"`)} />
					<Route path='/' render={() => { this.setDocumentTitle('Dashboard'); return this.state.serverName; }} />
					<Route render={() => this.setDocumentTitle(this.state.serverName)} />
				</Switch>
			);
		}
	}

	renderCollectionSortBody(colID) {
		return (
			<React.Fragment>
				<div className={this.props.classes.toolbarItem}>
					<CollectionSorting collectionID={colID} />
				</div>
				<CollectionFilterButton collectionID={colID} />
			</React.Fragment>
		);
	}

	renderCollectionSort() {
		if (this.state.search) {
			return this.renderCollectionSortBody(0);
		} else {
			return (
				<React.Fragment>
					<Route path='/col/:idCol' render={props => this.renderCollectionSortBody(props.match.params.idCol)} />
					<Route path='/search' render={() => this.renderCollectionSortBody(0)} />
				</React.Fragment>
			);
		}
	}

	renderFilterStateBody(colID) {
		return (
			<div className={this.props.classes.toolbarItem}>
				<CollectionFilter collectionID={colID} />
			</div>
		);
	}

	renderFilterState() {
		if (this.state.search) {
			return this.renderFilterStateBody(0);
		} else {
			return (
				<React.Fragment>
					<Route path='/col/:idCol' render={props => this.renderFilterStateBody(props.match.params.idCol)} />
					<Route path='/search' render={() => this.renderFilterStateBody(0)} />
				</React.Fragment>
			);
		}
	}

	handleSearch = (value) => {
		this.props.history.push({
			pathname: `/search/${value}`,
		});
	}

	handleSearchChange = (value) => {
		PubSub.publish('QUICKSEARCH', { term: value });
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
							<Typography variant='title' color='inherit' className={this.props.classes.toolbarItem}>
								{this.renderTitle()}
							</Typography>
							{this.renderFilterState()}
						</div>

						<SearchBar
							onRequestSearch={this.handleSearch}
							onChange={this.handleSearchChange}
							value={this.state.search}
							style={{
								marginRight: 16,
								maxWidth: 800,
								backgroundColor: '#5c6bc0',
								boxShadow: 'none',
							}}
							// @ts-ignore
							inputProps={{
								'style': {
									color: 'white',
								}
							}}
							searchIcon={<SearchIcon style={{ color: 'white' }} />}
							closeIcon={<ClearIcon style={{ color: 'white' }} />}
						/>

						{this.renderCollectionSort()}

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
	history: PropTypes.object.isRequired,
	location: PropTypes.object.isRequired,
};

export default withStyles(styles)(withRouter(AppHeader));
