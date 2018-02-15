import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import { ListItem, ListItemText } from 'material-ui/List';
import Avatar from 'material-ui/Avatar';
import IconButton from 'material-ui/IconButton';
import Menu, { MenuItem } from 'material-ui/Menu';
import Button from 'material-ui/Button';
import Dialog, {
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from 'material-ui/Dialog';

import CollectionIcon from 'Fragments/CollectionIcon';
import MenuIcon from 'material-ui-icons/MoreVert';

import PubSub from 'pubsub-js';
import Server from 'server';

const styles = {
};

// TODO: The hover effect is currently hacked by global CSS, should probably better be handled locally, but how?

class CollectionListItem extends Component {
	state = {
		anchorEl: null,
		confirmOpen: false,
	}

	handleMenuClick = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.setState({ anchorEl: event.currentTarget });
	}

	handleMenuClose = () => {
		this.setState({ anchorEl: null });
	}

	handleShowConfirm = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.handleMenuClose();
		this.setState({ confirmOpen: true });
	}

	handleDelete = () => {
		Server.deleteCollection({ id: this.props.id });
		PubSub.publish('SHOW_SNACKBAR', {
			message: 'Collection "' + this.props.name + '" was deleted.',
			autoHide: 5000,
		});
	}

	handleConfirmClose = () => {
		this.setState({ confirmOpen: false });
	}

	formatFoldersString = () => {
		var res = '';
		const folders = this.props.folders;
		if (folders) {
			res += (folders.length > 1 ? 'Folders:' : 'Folder:') + ' ';
			res += folders.join(', ');
		}
		return res;
	}

	render() {
		return (
			<div>
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
						secondary={this.formatFoldersString()}
					/>
					<IconButton aria-label='ItemMenu' className='itemButtonOnHover' onClick={this.handleMenuClick}>
						<MenuIcon />
					</IconButton>

					{/* Menu */}
					<Menu
						id='collectionmenu'
						anchorEl={this.state.anchorEl}
						open={Boolean(this.state.anchorEl)}
						onClose={this.handleMenuClose}
					>
						<MenuItem onClick={this.handleShowConfirm}>Delete</MenuItem>
					</Menu>
				</ListItem>

				{/* Confirmation */}
				<Dialog
					open={this.state.confirmOpen}
					onClose={this.handleConfirmClose}
				>
					<DialogTitle>{'Delete collection "' + this.props.name + '"?'}</DialogTitle>
					<DialogContent>
						<DialogContentText>
							This cannot be undone, the collection will be deleted permanently with all the stored metadata.
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={this.handleConfirmClose}>
							Cancel
						</Button>
						<Button onClick={this.handleDelete} color='primary' autoFocus>
							Delete
						</Button>
					</DialogActions>
				</Dialog>
			</div>
		);
	}
}

CollectionListItem.propTypes = {
	classes: PropTypes.object.isRequired,
	id: PropTypes.number.isRequired,
	name: PropTypes.string.isRequired,
	type: PropTypes.string.isRequired,
	folders: PropTypes.array.isRequired,
	onClick: PropTypes.func.isRequired,
};

export default withStyles(styles)(CollectionListItem);