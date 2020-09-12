// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import ListSubheader from '@material-ui/core/ListSubheader';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import CollectionIcon from './Fragments/CollectionIcon';

import Server from './server';
import PubSub from 'pubsub-js';

import { withRouter } from 'react-router-dom';

// icons
import SettingsIcon from '@material-ui/icons/Settings';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import DashboardIcon from '@material-ui/icons/Dashboard';
import LogsIcon from '@material-ui/icons/Subject';
import ServerIcon from '@material-ui/icons/Storage';
import PermMediaIcon from '@material-ui/icons/PermMedia';
import SettingsEthernetIcon from '@material-ui/icons/SettingsEthernet';

const styles = theme => ({
	root: {
		width: '100%',
		maxWidth: 400,
		minWidth: 250,
		backgroundColor: theme.palette.background.paper,
	},
	nested: {
		paddingLeft: theme.spacing(4),
	},
	'.MuiListItemIcon-root': {
		marginTop: '-10px',
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
		if (this.props.onItemClicked)
			this.props.onItemClicked(event);

		this.props.history.push({
			pathname: event.currentTarget.dataset.id,
		});
	}

	handleShowCollection = (event) => {
		if (this.props.onItemClicked)
			this.props.onItemClicked(event);

		this.props.history.push({
			pathname: `/col/${event.currentTarget.dataset.id}`
		});
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
					<ListItem button data-id='/' onClick={this.handleSelectView}>
						<ListItemIcon className='iconBumpUp'>
							<DashboardIcon/>
						</ListItemIcon>
						<ListItemText primary='Dashboard' />
					</ListItem>

					<Divider />

					{/* Collections */}
					<ListSubheader>Collections</ListSubheader>
					{this.state.collections.map((col) => {
						return <ListItem
							button
							data-id={col.id}
							key={'navcol' + col.id}
							onClick={this.handleShowCollection}>
							<CollectionIcon type={col.type} variant='list' />
							<ListItemText primary={col.name} />
						</ListItem>;
					})}

					<ListItem button data-id='/plst' onClick={this.handleSelectView}>
						<CollectionIcon type={'playlists'} variant='list' />
						<ListItemText primary={'Playlists'} />
					</ListItem>

					{/* Server */}
					<Divider />
					<ListSubheader>Server</ListSubheader>

					<ListItem button data-id={'/log'} onClick={this.handleSelectView}>
						<ListItemIcon>
							<LogsIcon />
						</ListItemIcon>
						<ListItemText primary={'Logs'} />
					</ListItem>

					{/* Settings */}
					<ListItem button onClick={this.handleConfigClick}>
						<ListItemIcon className='iconBumpUp'>
							<SettingsIcon />
						</ListItemIcon>
						<ListItemText primary='Configuration' />
						{this.state.configOpen ? <ExpandLess /> : <ExpandMore />}
					</ListItem>
					<Collapse in={this.state.configOpen} timeout='auto' unmountOnExit>
						<List disablePadding>
							<ListItem button className={classes.nested} data-id='/cfg' onClick={this.handleSelectView}>
								<ListItemIcon>
									<ServerIcon/>
								</ListItemIcon>
								<ListItemText primary='Server' />
							</ListItem>
							<ListItem button className={classes.nested} data-id='/col' onClick={this.handleSelectView}>
								<ListItemIcon>
									<PermMediaIcon/>
								</ListItemIcon>
								<ListItemText primary='Collections' />
							</ListItem>
							<ListItem button className={classes.nested} data-id='/cfgExt' onClick={this.handleSelectView}>
								<ListItemIcon>
									<SettingsEthernetIcon/>
								</ListItemIcon>
								<ListItemText primary='External Access' />
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
	history: PropTypes.object.isRequired,
	onItemClicked: PropTypes.func.isRequired,
};

export default withStyles(styles)(withRouter(NavigationList));
