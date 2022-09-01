//@ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';

import LogList from '../Fragments/LogList';
import CollectionsList from '../Fragments/CollectionsList';

import PubSub from 'pubsub-js';

import { withRouter } from 'react-router-dom';
import { styled } from '@mui/material';

const MAX_LOG_ITEMS = 15;

const StyledCardActions = styled(CardActions)(({theme}) => ({
	justifyContent: 'flex-end',
}));

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
		const { user } = this.props;

		return (
			<Grid container justifyContent='space-around' spacing={2}>
				{/* Collections */}
				{user &&
					<Grid item xs={12} sm={6}>
						<Card>
							<CardHeader title='Collections' />
							<CardContent>
								<CollectionsList hideCreate click='show' />
							</CardContent>
							<StyledCardActions>
								<Button onClick={this.handleNewCollection} color='primary'>Create Collection</Button>
							</StyledCardActions>
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
							<StyledCardActions>
								<Button onClick={this.handleShowLog} color='primary'>Show Full Log</Button>
							</StyledCardActions>
						</Card>
					</Grid>
				}
			</Grid>
		);
	}
}

Dashboard.propTypes = {
	history: PropTypes.object.isRequired,
	user: PropTypes.object,
};

export default withRouter(Dashboard);