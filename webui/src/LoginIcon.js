import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import IconButton from '@material-ui/core/IconButton';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Server from './server';

const styles = {
};

class LoginIcon extends React.Component {
	state = {
		auth: true,
		anchorEl: null,
		notImpDialog: false
	};

	handleMenu = event => {
		this.setState({ anchorEl: event.currentTarget });
	};

	handleMenuClose = () => {
		this.setState({ anchorEl: null });
	};

	onLogout = () => {
		this.handleMenuClose();
		Server.logout();
	}

	showProfile = () => {
		this.handleMenuClose();
		this.setState({ notImpDialog: true });
	}

	handleDialogClose = () => {
		this.setState({ notImpDialog: false });
	}

	render() {
		const { auth, anchorEl } = this.state;
		const open = Boolean(anchorEl);

		return (
			auth && (
				<div>
					<IconButton
						aria-owns={open ? 'menu-appbar' : null}
						aria-haspopup="true"
						onClick={this.handleMenu}
						color="inherit"
					>
						<AccountCircle />
					</IconButton>

					<Menu
						id="menu-appbar"
						anchorEl={anchorEl}
						anchorOrigin={{
							vertical: 'top',
							horizontal: 'right',
						}}
						transformOrigin={{
							vertical: 'top',
							horizontal: 'right',
						}}
						open={open}
						onClose={this.handleMenuClose}
					>
						{this.props.user &&
							<MenuItem onClick={this.onLogout}>{'Logout'}</MenuItem>
						}
						<MenuItem onClick={this.showProfile}>Profile</MenuItem>
						<MenuItem onClick={this.showProfile}>My account</MenuItem>
					</Menu>
					
					<Dialog
						open={this.state.notImpDialog}
						onClose={this.handleDialogClose}>
						<DialogTitle>{'Not implemented'}</DialogTitle>
						<DialogContent>
							<DialogContentText>{'User and session management isn\'t implemented yet. It will be! ;-)'}</DialogContentText>
						</DialogContent>
						<DialogActions>
							<Button onClick={this.handleDialogClose} color="primary" autoFocus>Close</Button>
						</DialogActions>
					</Dialog>
				</div>
			)
		);
	}
}

LoginIcon.propTypes = {
	classes: PropTypes.object.isRequired,
	user: PropTypes.object,
};

export default withStyles(styles)(LoginIcon);
