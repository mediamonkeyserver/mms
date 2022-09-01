import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';

import IconButton from '@mui/material/IconButton';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

import Server from './server';
import Navigation from './navigation';

const styles = {
};

class LoginIcon extends React.Component {
	state = {
		anchorEl: null,
	};

	handleMenu = event => {
		this.setState({ anchorEl: event.currentTarget });
	};

	handleMenuClose = () => {
		this.setState({ anchorEl: null });
	};

	onLogout = () => {
		// 2020-09-11 JL: Now navigates home after logging out
		this.handleMenuClose();
		Server.logout()
			.then(() => {
				Navigation.goHome();
			});
	}

	showProfile = () => {
		this.handleMenuClose();
		Navigation.goProfile();
	}

	render() {
		const { anchorEl } = this.state;
		const open = Boolean(anchorEl);

		return (
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
						<MenuItem onClick={this.showProfile}>{'Profile'}</MenuItem>
					}
					{this.props.user &&
						<Divider />
					}
					{this.props.user &&
						<MenuItem onClick={this.onLogout}>{'Logout'}</MenuItem>
					}
				</Menu>
			</div>
		);
	}
}

LoginIcon.propTypes = {
	classes: PropTypes.object.isRequired,
	user: PropTypes.object,
};

export default withStyles(LoginIcon, styles);
