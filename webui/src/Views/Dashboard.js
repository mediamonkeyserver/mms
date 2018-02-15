import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Button from 'material-ui/Button';
import Grid from 'material-ui/Grid';
import Card, { CardActions, CardContent, CardHeader } from 'material-ui/Card';

import LogList from 'Fragments/LogList';
import CollectionsList from 'Fragments/CollectionsList';

import PubSub from 'pubsub-js';

const styles = {
	cardActions: {
		justifyContent: 'flex-end',
	}
};

class Dashboard extends Component {
	state = {
	}

	handleNewCollection() {
		PubSub.publish('ADD_COLLECTION');
	}

	render() {
		const { classes } = this.props;

		return (
			<Grid container justify='space-around'>
				{/* Collections */}
				<Grid item xs={12} sm={6}>
					<Card>
						<CardHeader title='Collections' />
						<CardContent>
							<CollectionsList hideCreate click='show'/>
						</CardContent>
						<CardActions className={classes.cardActions}>
							<Button onClick={this.handleNewCollection} color='primary' autoFocus>Create Collection</Button>
						</CardActions>
					</Card>
				</Grid>

				{/* Server log */}
				<Grid item xs={12} sm={6}>
					<Card>
						<CardHeader title='Server Activity' />
						<CardContent>
							<LogList />
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		);
	}
}

Dashboard.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Dashboard);