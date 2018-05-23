import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import Dashboard from './Views/Dashboard';
import Collections from './Views/Collections';
import Collection from './Views/Collection';
import Playlists from './Views/Playlists';
import CfgServer from './Views/CfgServer';
import Log from './Views/Log';

import { Route, Switch } from 'react-router-dom';

const styles = {
};

class MainContent extends Component {
	render() {
		return (
			<Switch>
				<Route exact path='/' component={Dashboard} />
				<Route exact path='/col' component={Collections} />
				<Route path='/col/:idCol' render={props => (<Collection {...props} collectionID={props.match.params.idCol}/>)} />
				<Route path='/plst' component={Playlists} />
				<Route path='/cfg' component={CfgServer} />
				<Route path='/log' component={Log} />
			</Switch>
		);
	}
}

MainContent.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MainContent);