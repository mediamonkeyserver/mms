import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Grid from 'material-ui/Grid';
import Card, { CardContent, CardHeader } from 'material-ui/Card';
import Typography from 'material-ui/Typography';

const styles = {
	card: {
	}
};

class Collection extends Component {
	state = {
	}

	render() {
		const { classes } = this.props;

		return (
			<Grid container justify='center'>
				<Grid item>
					<Card className={classes.card}>
						<CardHeader title='Not implemented' />
						<CardContent>
							<Typography component='p'>
								{'Playlists browsing isn\'t implemented yet. But it will be! ;-)'}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		);
	}
}

Collection.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Collection);