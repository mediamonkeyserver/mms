import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import IconButton from 'material-ui/IconButton';
import AccountCircle from 'material-ui-icons/AccountCircle';
import Menu, { MenuItem } from 'material-ui/Menu';

import Button from 'material-ui/Button';
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from 'material-ui/Dialog';

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
            <MenuItem onClick={this.showProfile}>Profile</MenuItem>
            <MenuItem onClick={this.showProfile}>My account</MenuItem>
          </Menu>
          <Dialog
            open={this.state.notImpDialog}
            onClose={this.handleDialogClose}>
            <DialogTitle>{"Not implemented"}</DialogTitle>
            <DialogContent>
              <DialogContentText>User and session management isn't implemented yet. It will be! ;-)</DialogContentText>
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
};

export default withStyles(styles)(LoginIcon);
