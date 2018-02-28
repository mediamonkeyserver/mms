import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import ListSubheader from 'material-ui/List/ListSubheader';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import Collapse from 'material-ui/transitions/Collapse';
import Divider from 'material-ui/Divider';
import CollectionIcon from 'Fragments/CollectionIcon';

import Server from './server';
import PubSub from 'pubsub-js';
import { showView, VIEWS } from 'actions';

// icons
import SettingsIcon from 'material-ui-icons/Settings';
import ExpandLess from 'material-ui-icons/ExpandLess';
import ExpandMore from 'material-ui-icons/ExpandMore';
import DashboardIcon from 'material-ui-icons/Dashboard';

const styles = theme => ({
	root: {
		width: '100%',
		maxWidth: 400,
		minWidth: 250,
		backgroundColor: theme.palette.background.paper,
	},
	nested: {
		paddingLeft: theme.spacing.unit * 4,
	},
});

class NavigationList extends React.Component {
	state = {
		configOpen: false,
		serverName: '',
		collections: []
	};

	updateContent = () => {
		Server.getInfo().then((info) => {
			this.setState({ serverName: info.serverName });
			this.setState({ collections: info.collections.map(x => x) });
		});
	}

	componentDidMount = () => {
		this.updateContent();
		PubSub.subscribe('COLLECTIONS_CHANGE', this.updateContent.bind(this));
	}

	handleConfigClick = () => {
		this.setState({ configOpen: !this.state.configOpen });
	};

	handleSelectView = (event) => {
		showView(event.currentTarget.dataset.id);
		if (this.props.onItemClicked)
			this.props.onItemClicked(event);
	}

	handleShowCollection = (event) => {
		showView(VIEWS.Collection, { collection: this.state.collections[event.currentTarget.dataset.index] });
		if (this.props.onItemClicked)
			this.props.onItemClicked(event);
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<List
					component='nav'
					subheader={<ListSubheader component='div' color='primary'>{this.state.serverName}</ListSubheader>}
				>
					{/* Dashboard */}
					<ListItem button data-id='dashboard' onClick={this.handleSelectView}>
						<ListItemIcon>
							<DashboardIcon />
						</ListItemIcon>
						<ListItemText inset primary='Dashboard' />
					</ListItem>

					<Divider />

					{/* Collections */}
					<ListSubheader>Collections</ListSubheader>
					{this.state.collections.map((col, index) => {
						return <ListItem
							button
							data-index={index}
							key={'navcol' + col.id}
							onClick={this.handleShowCollection}>
							<CollectionIcon type={col.type} variant='list' />
							<ListItemText inset primary={col.name} />
						</ListItem>;
					})}

					<ListItem button data-id='playlists' onClick={this.handleSelectView}>
						<CollectionIcon type={'playlists'} variant='list' />
						<ListItemText inset primary={'Playlists'} />
					</ListItem>

					{/* Server */}
					<Divider />
					<ListSubheader>Server</ListSubheader>

					<ListItem button data-id={VIEWS.Log} onClick={this.handleSelectView}>
						<ListItemText inset primary={'Log'} />
					</ListItem>

					{/* Settings */}
					<ListItem button onClick={this.handleConfigClick}>
						<ListItemIcon>
							<SettingsIcon />
						</ListItemIcon>
						<ListItemText inset primary='Configuration' />
						{this.state.configOpen ? <ExpandLess /> : <ExpandMore />}
					</ListItem>
					<Collapse in={this.state.configOpen} timeout='auto' unmountOnExit>
						<List component='div' disablePadding>
							<ListItem button className={classes.nested} data-id='cfgServer' onClick={this.handleSelectView}>
								<ListItemText inset primary='Server' />
							</ListItem>
							<ListItem button className={classes.nested} data-id='cfgCollections' onClick={this.handleSelectView}>
								<ListItemText inset primary='Collections' />
							</ListItem>
						</List>
					</Collapse>
				</List>
			</div>
		);
	}
}

NavigationList.propTypes = {
	classes: PropTypes.object.isRequired,
	onItemClicked: PropTypes.func.isRequired,
};

export default withStyles(styles)(NavigationList);
