// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CollectionSorting from './Fragments/CollectionSorting';
import CollectionFilter from './Fragments/CollectionFilter';
import CollectionFilterButton from './Fragments/CollectionFilterButton';
import SearchBar from './SearchBar';
// import SearchBar from 'material-ui-search-bar';

import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from './LoginIcon';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CastingButton from './Fragments/CastingButton';

import PubSub from 'pubsub-js';
import Server from './server';

import { withRouter } from 'react-router-dom';

import { Route, Switch } from 'react-router-dom';
import { Box } from '@mui/material';

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
		marginLeft: theme.spacing(-1.5),
		marginRight: theme.spacing(1.5),
	},
	toolbarItem: {
		marginLeft: theme.spacing(1),
		marginRight: theme.spacing(1),
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
	collections = [];
	IDCol = null;

	updateServerName = () => {
		Server.getInfo().then((info) => {
			this.setState({ serverName: info.serverName });
		}).catch(() => { });
	}

	updateCollections = () => {
		Server.getCollections().then((cols) => {
			this.setState({ collections: cols });
			this.collections = cols;
			if (this.IDCol)
				this.getCollectionTitle(this.IDCol);
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
		return; 
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
		this._IDCol = id;
		const title = (this.collections.filter(col => String(col.id) === String(id))[0] || { name: '' }).name;
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
				<Box sx={{
					mx: 1,
				}}>
					<CollectionSorting collectionID={colID} />
				</Box>
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
			<Box sx={{
				mx: 1
			}}>
				<CollectionFilter collectionID={colID} />
			</Box>
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
		// const { classes } = this.props;
		
		return (
			<Box sx={{
				width: '100%',
				zIndex: 100,
			}}>
				<AppBar position='static'>
					<Toolbar className='HELLO TESTING'>
						<IconButton color='inherit' aria-label='Menu' onClick={this.handleMainDrawer}
							sx={{
								ml: -1.5,
								mr: 1.5
							}}
						>
							<MenuIcon />
						</IconButton>
						<Box 
							sx={{
								flex: 1,
								display: 'flex',
								alignItems: 'center',
							}}
						>
							<Typography variant='h6' color='inherit' 
								sx={{
									mx: 1,
								}}
							>
								{this.renderTitle()}
							</Typography>
							{this.renderFilterState()}
						</Box>
			
						{/* Search bar todo: our own version? */}
						{
							<SearchBar
								// @ts-ignore -- something weird with the import
								onRequestSearch={() => this.handleSearch()} 
								onChange={() => this.handleSearchChange()}
								value={this.state.search}
								style={{
									marginRight: 16,
									maxWidth: 800,
									backgroundColor: '#5c6bc0',
									boxShadow: 'none',
								}}
								inputProps={{
									'style': {
										color: 'white',
									}
								}}
								searchIcon={<SearchIcon style={{ color: 'white' }} />}
								closeIcon={<ClearIcon style={{ color: 'white' }} />}
							/>
						}

						{this.renderCollectionSort()}

						<CastingButton />
						<LoginIcon user={this.props.user} />
					</Toolbar>
				</AppBar>
			</Box>
		);
	}
}

AppHeader.propTypes = {
	// classes: PropTypes.object.isRequired,
	history: PropTypes.object.isRequired,
	location: PropTypes.object.isRequired,
	user: PropTypes.object,
};

export default withRouter(AppHeader);
