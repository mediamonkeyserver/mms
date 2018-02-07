import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import { ListItem, ListItemText } from 'material-ui/List';
import Avatar from 'material-ui/Avatar';

import CollectionIcon from 'Fragments/CollectionIcon';

const styles = {
};

class CollectionListItem extends Component {
	render() {
		return (
			<ListItem
				button
				key={this.props.id}>
				<Avatar>
					<CollectionIcon type={this.props.type} />
				</Avatar>
				<ListItemText
					primary={this.props.name}
					secondary={this.props.folder ? 'Folder: ' + this.props.folder : ''}
				/>
			</ListItem>
		);
	}
}

export default withStyles(styles)(CollectionListItem);