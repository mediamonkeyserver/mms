import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import Button from 'material-ui/Button';
import Grid from 'material-ui/Grid';
import Card, { CardActions, CardContent, CardHeader } from 'material-ui/Card';
import Typography from 'material-ui/Typography';

import PubSub from 'pubsub-js';

const styles = {
	card: {
	},
	cardActions: {
		justifyContent: 'flex-end',
	}
};

class Collection extends Component {
	state = {
	}

	handleEditCollections = () => {
		PubSub.publish('SHOW_VIEW', { view: 'cfgCollections' });
	}

	render() {
		const { classes } = this.props;

		return (
			<div>
				<Grid container justify='center'>
					<Grid item>
						<Card className={classes.card}>
							<CardHeader title='Not implemented' />
							<CardContent>
								<Typography component="p">
									Collection browsing isn't implemented yet. But it will be! ;-)
                </Typography>
								<p />
								<Typography component="p">
									You can configure collections though...
                </Typography>
							</CardContent>
							<CardActions className={classes.cardActions}>
								<Button onClick={this.handleEditCollections} color="primary" autoFocus>Edit Collections</Button>
							</CardActions>
						</Card>
					</Grid>
				</Grid>
			</div>
		);
	}
}

export default withStyles(styles)(Collection);

