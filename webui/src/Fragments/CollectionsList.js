// @ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';

import List from '@mui/material/List';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import CollectionListItem from './CollectionListItem';

import PubSub from 'pubsub-js';
import Server from '../server';

const styles = ({
	emptyBox: {
		marginTop: 30,
		marginBottom: 30,
	}
});

class CollectionsList extends Component {
	state = {
		collections: [],
	}

	updateList = () => {
		Server.getCollections().then((collections) => {
			this.setState({ collections: collections.map(x => x) });
		});
	}

	componentDidMount = () => {
		this.updateList();
		PubSub.subscribe('COLLECTIONS_CHANGE', this.updateList.bind(this));
	}

	handleNewCollection = () => {
		PubSub.publish('ADD_COLLECTION', null);
	}

	handleEditCollection = (index) => {
		PubSub.publish('EDIT_COLLECTION', { collection: this.state.collections[index] });
	}

	renderEmpty() {
		return (
			<Grid container justify='center' className={this.props.classes.emptyBox}>
				<Typography>
					{'There isn\'t any Collection configured yet. Please create a new one.'}
				</Typography>
			</Grid>
		);
	}

	renderCreate() {
		if (!this.props.hideCreate) {
			return (
				<Grid container justify='center'>
					<Button onClick={this.handleNewCollection} color='primary' autoFocus>Create new Collection</Button>
				</Grid>
			);
		}
	}

	render() {
		return (
			<div>
				<List>
					{this.state.collections.map((collection) => {
						return <CollectionListItem
							collection={collection}
							key={'col' + collection.id}
							click={this.props.click}
						/>;
					})}
				</List>

				{this.state.collections.length === 0 ? this.renderEmpty() : ''}

				{this.renderCreate()}
			</div>
		);
	}
}

CollectionsList.propTypes = {
	classes: PropTypes.object.isRequired,
	hideCreate: PropTypes.bool,
	click: PropTypes.string,
};

export default withStyles(CollectionsList, styles);

