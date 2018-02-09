import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import { ListItem, ListItemText } from 'material-ui/List';
import Avatar from 'material-ui/Avatar';
import IconButton from 'material-ui/IconButton';
import Menu, { MenuItem } from 'material-ui/Menu';

import CollectionIcon from 'Fragments/CollectionIcon';
import MenuIcon from 'material-ui-icons/MoreVert';

const styles = {
};

// TODO: The hover effect is currently hacked by global CSS, should probably better be handled locally, but how?

class CollectionListItem extends Component {
	state = {
		anchorEl: null,
	}

	handleMenuClick(event) {
		event.stopPropagation();
		event.preventDefault();
		this.setState({ anchorEl: event.currentTarget });
	}

	handleMenuClose() {
		this.setState({ anchorEl: null });
	}

	handleDelete(event) {
		event.stopPropagation();
		event.preventDefault();
		this.handleMenuClose();
	}

	render() {
		return (
			<ListItem
				button
				key={this.props.id}
				className='listItem'
				onClick={this.props.onClick}>
				<Avatar>
					<CollectionIcon type={this.props.type} />
				</Avatar>
				<ListItemText
					primary={this.props.name}
					secondary={this.props.folder ? 'Folder: ' + this.props.folder : ''}
				/>
				<IconButton aria-label='ItemMenu' className='itemButtonOnHover' onClick={this.handleMenuClick.bind(this)}>
					<MenuIcon />
				</IconButton>
				<Menu
					id="collectionmenu"
					anchorEl={this.state.anchorEl}
					open={Boolean(this.state.anchorEl)}
					onClose={this.handleMenuClose.bind(this)}
				>
					<MenuItem onClick={this.handleDelete.bind(this)}>Delete</MenuItem>
				</Menu>
			</ListItem>
		);
	}
}

export default withStyles(styles)(CollectionListItem);