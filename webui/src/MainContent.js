import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import Dashboard from './Views/Dashboard';
import Collections from './Views/Collections';
import Collection from './Views/Collection';
import Playlists from './Views/Playlists';
import CfgServer from './Views/CfgServer';

import PubSub from 'pubsub-js';

const styles = {
	root: {
		marginTop: 20,
	}
};

const pages = {
	dashboard: {
		component: Dashboard
	},
	collection: {
		component: Collection
	},
	playlists: {
		component: Playlists
	},
	cfgCollections: {
		component: Collections
	},
	cfgServer: {
		component: CfgServer
	}
};

class MainContent extends Component {
	state = {
		view: 'dashboard',
		props: {},
	}

	componentDidMount = () => {
		PubSub.subscribe('SHOW_VIEW', this.handleShowView.bind(this));
	}

	handleShowView = (msg, data) => {
		this.setState({
			view: data.view,
			props: data.props,
		});
	}

	render() {
		var { classes } = this.props;
		var activeview = React.createElement(pages[this.state.view].component, this.state.props);

		return (
			<div className={classes.root}>
				{activeview}
			</div>
		);
	}
}

MainContent.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MainContent);