import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Button from 'material-ui/Button';
import Grid from 'material-ui/Grid';
import Card, { CardActions, CardContent, CardHeader } from 'material-ui/Card';
import Typography from 'material-ui/Typography';
import MuiTable from 'mui-table';

import PubSub from 'pubsub-js';
import Server from 'server';

const styles = {
	card: {
	},
	cardActions: {
		justifyContent: 'flex-end',
	}
};

class Collection extends Component {
	state = {
		tracks: [],
	}

	componentDidMount = () => {
		Server.getTracklist().then(tracklist =>
			this.setState({ tracks: tracklist })
		);
	}

	handleEditCollections = () => {
		PubSub.publish('SHOW_VIEW', { view: 'cfgCollections' });
	}

	renderNotImplemented() {
		const { classes } = this.props;

		return (
			<Grid container justify='center'>
				<Grid item>
					<Card className={classes.card}>
						<CardHeader title='Not implemented' />
						<CardContent>
							<Typography component='p'>
								{'Collection browsing isn\'t implemented yet. But it will be! ;-)'}
							</Typography>
							<p />
							<Typography component='p'>
								You can configure collections though...
							</Typography>
						</CardContent>
						<CardActions className={classes.cardActions}>
							<Button onClick={this.handleEditCollections} color='primary' autoFocus>Edit Collections</Button>
						</CardActions>
					</Card>
				</Grid>
			</Grid>
		);
	}

	render() {
		// const { classes } = this.props;

		return (
			<div>
				<MuiTable
					data={this.state.tracks} 
					columns={[
						{ name: 'title' },
						{ name: 'artist' },
						{ name: 'album' },
					]}
					width={800}
					height={500}/>
			</div>
		);
	}
}

Collection.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Collection);