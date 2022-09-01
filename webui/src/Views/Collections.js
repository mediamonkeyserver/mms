//@ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';

import CollectionsList from '../Fragments/CollectionsList';

const styles = ({
});

class Collections extends Component {
	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<Paper className='paper'>
						<CollectionsList click='edit' />
					</Paper>
				</Grid>
			</Grid>
		);
	}
}

Collections.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(Collections, styles);

