//@ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Typography from '@material-ui/core/Typography';

const styles = {
	card: {
	}
};

class Playlist extends Component {
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

Playlist.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Playlist);