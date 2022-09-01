//@ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

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

export default withStyles(Playlist, styles);