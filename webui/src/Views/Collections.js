import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';

import List from 'material-ui/List';
import Grid from 'material-ui/Grid';
import Button from 'material-ui/Button';
import Typography from 'material-ui/Typography';

import AddIcon from 'material-ui-icons/Add';

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
});

class Collections extends Component {
	state = {
		collections: [],
	}

	updateList = (path) => {
		Server.getCollections().then((collections) => {
			this.setState({ collections: collections.map(x => x) });
		});
	}

	componentDidMount = () => {
		this.updateList();
	}

	handleNewCollection = () => {
		PubSub.publish('ADD_COLLECTION');
	}

	handleEditCollection = (index) => {
		PubSub.publish('EDIT_COLLECTION', {collection: this.state.collections[index]});
	}

	render() {
		const { classes } = this.props;

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
								type={collection.type}
								name={collection.name}
								folder={collection.folders ? collection.folders[0] : ''}
								onClick={this.handleEditCollection.bind(this, index)}
							/>;
						})}
					</List>

					<Grid container justify='center'>
						<Button onClick={this.handleNewCollection} color="primary" autoFocus>Create new Collection</Button>					
					</Grid>
				</Grid>
			</Grid>
		);
	}
}

export default withStyles(styles)(Collections);

