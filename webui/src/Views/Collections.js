import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';

import CollectionsList from 'Fragments/CollectionsList';

const styles = ({
});

class Collections extends Component {
	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
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

