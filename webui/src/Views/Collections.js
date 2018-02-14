import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import List from 'material-ui/List';
import Grid from 'material-ui/Grid';
import Button from 'material-ui/Button';
import Typography from 'material-ui/Typography';

import CollectionListItem from 'Fragments/CollectionListItem';

import PubSub from 'pubsub-js';
import Server from 'server';

const styles = theme => ({
	button: {
		margin: theme.spacing.unit,
		position: 'relative',
		bottom: 0,
		right: 0
	},
	emptyBox: {
		marginTop: 30,
		marginBottom: 30,
	}
});

class Collections extends Component {
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
		PubSub.publish('ADD_COLLECTION');
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

	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<Grid container justify='center'>
						<Typography variant='display1'>Collections</Typography>
					</Grid>

					<List>
						{this.state.collections.map((collection, index) => {
							return <CollectionListItem
								id={collection.id}
								key={'col'+collection.id}
								type={collection.type}
								name={collection.name}
								folders={collection.folders}
								onClick={this.handleEditCollection.bind(this, index)}
							/>;
						})}
					</List>

					{this.state.collections.length === 0 ? this.renderEmpty() : ''}

					<Grid container justify='center'>
						<Button onClick={this.handleNewCollection} color="primary" autoFocus>Create new Collection</Button>
					</Grid>
				</Grid>
			</Grid>
		);
	}
}

Collections.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Collections);

