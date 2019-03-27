//@ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';

import LogList from '../Fragments/LogList';
import CollectionsList from '../Fragments/CollectionsList';

import PubSub from 'pubsub-js';

import { withRouter } from 'react-router-dom';

const MAX_LOG_ITEMS = 15;

const styles = {
	cardActions: {
		justifyContent: 'flex-end',
	}
};

class Dashboard extends Component {
	state = {
	}

	handleNewCollection() {
		PubSub.publish('ADD_COLLECTION', null);
	}

	handleShowLog = () => {
		this.props.history.push({
			pathname: '/log',
		});
	}

	render() {
		const { classes, user } = this.props;

		return (
			<Grid container justify='space-around' spacing={16}>
				{/* Collections */}
				{user &&
					<Grid item xs={12} sm={6}>
						<Card>
							<CardHeader title='Collections' />
							<CardContent>
								<CollectionsList hideCreate click='show' />
							</CardContent>
							<CardActions className={classes.cardActions}>
								<Button onClick={this.handleNewCollection} color='primary'>Create Collection</Button>
							</CardActions>
						</Card>
					</Grid>
				}

				{/* Server log */}
				{user &&
					<Grid item xs={12} sm={6}>
						<Card>
							<CardHeader title='Server Activity' />
							<CardContent>
								<LogList maxItems={MAX_LOG_ITEMS} />
							</CardContent>
							<CardActions className={classes.cardActions}>
								<Button onClick={this.handleShowLog} color='primary'>Show Full Log</Button>
							</CardActions>
						</Card>
					</Grid>
				}
			</Grid>
		);
	}
}

Dashboard.propTypes = {
	classes: PropTypes.object.isRequired,
	history: PropTypes.object.isRequired,
	user: PropTypes.object,
};

export default withStyles(styles)(withRouter(Dashboard));