import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';

import CollectionsList from 'Fragments/CollectionsList';

const styles = ({
});

class Collections extends Component {
	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<Grid container justify='center'>
						<Typography variant='display1'>Collections</Typography>
					</Grid>

					<CollectionsList click='edit'/>
				</Grid>
			</Grid>
		);
	}
}

Collections.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Collections);

