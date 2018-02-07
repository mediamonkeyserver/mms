import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import List from 'material-ui/List';
import Grid from 'material-ui/Grid';
import CollectionListItem from 'Fragments/CollectionListItem';

import Server from 'server';

const styles = {
};

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

	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<List>
						{this.state.collections.map((collection) => {
							return <CollectionListItem
								id={collection.id}
								type={collection.type}
								name={collection.name}
								folder={collection.folders ? collection.folders[0] : ''}
								/>;
						})}
					</List>
				</Grid>
			</Grid>
		);
	}
}

export default withStyles(styles)(Collections);

