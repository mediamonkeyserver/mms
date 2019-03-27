// @ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Dashboard from './Views/Dashboard';
import Collections from './Views/Collections';
import Collection from './Views/Collection';
import Playlists from './Views/Playlists';
import CfgServer from './Views/CfgServer';
import Log from './Views/Log';

import { Route, Switch } from 'react-router-dom';
import PubSub from 'pubsub-js';
import { withRouter } from 'react-router-dom';

const styles = {
};

class MainContent extends Component {
	state = {
		search: '',
	}

	componentDidMount() {
		PubSub.subscribe('QUICKSEARCH', (msg, data) => {
			this.setState({ search: data.term });
		});
	}

	componentDidUpdate(prevProps) {
		if (this.props.location.pathname !== prevProps.location.pathname) {
			this.setState({ search: '' });
		}
	}

	render() {
		if (this.state.search) {
			return (<Collection search={true} searchTerm={this.state.search} />);
		} else {
			return (
				<Switch>
					<Route exact path='/col' component={Collections} />
					<Route path='/col/:idCol' render={props => (<Collection {...props} collectionID={props.match.params.idCol} />)} />
					<Route path='/search/:term' render={props => (<Collection {...props} search={true} searchTerm={props.match.params.term} />)} />
					<Route path='/plst' component={Playlists} />
					<Route path='/cfg' component={CfgServer} />
					<Route path='/log' component={Log} />
					<Route path='/' render={props => (<Dashboard {...props} user={this.props.user} />)} />
				</Switch>
			);
		}
	}
}

MainContent.propTypes = {
	classes: PropTypes.object.isRequired,
	location: PropTypes.object.isRequired,
	user: PropTypes.object,
};

export default withStyles(styles)(withRouter(MainContent));