import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import Dashboard from './Views/Dashboard';
import Collections from './Views/Collections';
import Collection from './Views/Collection';
import Playlists from './Views/Playlists';
import CfgServer from './Views/CfgServer';
import Log from './Views/Log';

import PubSub from 'pubsub-js';

const styles = {
};

const pages = {
	dashboard: {component: Dashboard},
	collection: {component: Collection},
	playlists: {component: Playlists},
	cfgCollections: {component: Collections},
	cfgServer: {component: CfgServer},
	log: {component: Log},
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
		var activeview = React.createElement(pages[this.state.view].component, { key: this.state.view, ...this.state.props });

		return [activeview];
	}
}

MainContent.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MainContent);