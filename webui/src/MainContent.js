import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';

import Home from './Views/Home';
import Collections from './Views/Collections';
import Collection from './Views/Collection';

import PubSub from 'pubsub-js';

const styles = {
};

const pages = {
	home: {
		component: React.createElement(Home)
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
		view: 'home',
	}

	componentDidMount = () => {
		PubSub.subscribe('SHOW_VIEW', this.handleShowView.bind(this));
	}

	handleShowView = (msg, data) => {
		this.setState({ view: data.view});
	}

	render() {
		var activeview = pages[this.state.view].component;

		return (
			<div>
				{activeview}
			</div>
		);
	}
}

export default withStyles(styles)(MainContent);