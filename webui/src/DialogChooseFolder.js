import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import Button from 'material-ui/Button';
import Dialog, {
  DialogActions,
  DialogContent,
  DialogTitle,
  withMobileDialog,
} from 'material-ui/Dialog';
import FolderChooser from './FolderChooser';

import PubSub from 'pubsub-js';

const styles = theme => ({
});

class DialogChooseFolder extends React.Component {
  state = {
    open: false,
    path: '/'
  };

	componentDidMount = () => {
		PubSub.subscribe('ADD_FOLDER', this.handleAddFolder.bind(this));
  }
  
  handleAddFolder = (msg, data) => {
    this.setState({
      open: true,
      path: '/',
      callback: data.callback,
    });
  }

  handleDialogOK = () => {
    this.setState({ open: false });
    if (this.state.callback)
      this.state.callback(this.state.path);
  }

  handleDialogClose = () => {
    this.setState({ open: false });
  }

  handlePathChange = (newPath) => {
    this.setState({ path: newPath});
  }

  render() {
    return (
      <Dialog
        open={this.state.open}
        onClose={this.handleDialogClose}>
        <DialogTitle>{'Choose Folder'}</DialogTitle>
        <DialogContent>
          <FolderChooser 
            path={this.state.path}
            onPathChange={this.handlePathChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={this.handleDialogClose}>Close</Button>
          <Button onClick={this.handleDialogOK} color='primary' autoFocus>Add</Button>          
        </DialogActions>
      </Dialog>
    );
  }
}

DialogChooseFolder.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(withMobileDialog()(DialogChooseFolder));
