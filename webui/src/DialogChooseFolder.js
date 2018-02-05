import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import Button from 'material-ui/Button';
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  withMobileDialog,
} from 'material-ui/Dialog';
import FolderChooser from './FolderChooser';

const styles = theme => ({
});

class DialogChooseFolder extends React.Component {
  state = {
    open: true
  };

  handleDialogClose = () => {
    this.setState({ open: false });
  }

  render() {
    const { classes } = this.props;

    return (
      <Dialog
        className={classes.dlg}
        open={this.state.open}
        onClose={this.handleDialogClose}>
        <DialogTitle>{"Choose Folder"}</DialogTitle>
        <DialogContent>
          <FolderChooser />
        </DialogContent>
        <DialogActions>
          <Button onClick={this.handleDialogClose} color="primary" autoFocus>Add</Button>
          <Button onClick={this.handleDialogClose} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    );
  }
}

DialogChooseFolder.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(withMobileDialog()(DialogChooseFolder));
