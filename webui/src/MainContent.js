import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';

import Dashboard from './Views/Dashboard';
import Collections from './Views/Collections';
import Collection from './Views/Collection';

import PubSub from 'pubsub-js';

const styles = {
	root: {
		marginTop: 20,
	}
};

const pages = {
	dashboard: {
		component: React.createElement(Dashboard)
	},
	collection: {
		component: React.createElement(Collection)
	},
	cfgCollections: {
		component: React.createElement(Collections)
	}
}

class MainContent extends Component {
	state = {
		view: 'dashboard',
	}

	componentDidMount = () => {
		PubSub.subscribe('SHOW_VIEW', this.handleShowView.bind(this));
	}

	handleShowView = (msg, data) => {
		this.setState({ view: data.view });
	}

	render() {
		var { classes } = this.props;
		var activeview = pages[this.state.view].component;

		return (
			<div className={classes.root}>
				{activeview}
			</div>
		);
	}
}

export default withStyles(styles)(MainContent);