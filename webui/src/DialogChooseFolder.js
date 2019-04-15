// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import withMobileDialog from '@material-ui/core/withMobileDialog';
import FolderChooser from './FolderChooser';

import PubSub from 'pubsub-js';

const styles = {
};

class DialogChooseFolder extends React.Component {
	state = {
		open: false,
		path: '/',
		showFiles: false,
		title: '',
		primaryAction: '',

		selectedFile: null,
	};

	componentDidMount = () => {
		PubSub.subscribe('ADD_FOLDER', this.handleAddFolder);
		PubSub.subscribe('SELECT_FILE', this.handleSelectFile);
	}

	handleAddFolder = (msg, data) => {
		this.setState({
			open: true,
			path: '/',
			callback: data.callback,
			showFiles: false,
			title: 'Choose Folder',
			primaryAction: 'Add',
		});
	}

	handleSelectFile = (msg, data) => {
		this.setState({
			open: true,
			path: '/',
			callback: data.callback,
			showFiles: true,
			title: 'Select a File',
			primaryAction: 'Select',

			selectedFile: null,
		});
	}

	handleDialogOK = () => {
		this.setState({ open: false });
		if (this.state.callback)
			this.state.callback(this.state.showFiles ? this.state.selectedFile : this.state.path);
	}

	handleDialogClose = () => {
		this.setState({ open: false });
	}

	handlePathChange = (newPath) => {
		this.setState({
			path: newPath,
			selectedFile: null,
		});
	}

	handleFileSelect = (newPath) => {
		this.setState({ selectedFile: newPath });
	}

	render() {
		return (
			<Dialog
				open={this.state.open}
				onClose={this.handleDialogClose}>
				<DialogTitle>{this.state.title}</DialogTitle>
				<DialogContent>
					<FolderChooser
						path={this.state.path}
						onPathChange={this.handlePathChange}
						onFileSelect={this.handleFileSelect}
						showFiles={this.state.showFiles}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={this.handleDialogClose}>{'Close'}</Button>
					<Button
						onClick={this.handleDialogOK}
						color='primary'
						autoFocus
						disabled={this.state.showFiles && !this.state.selectedFile}
					>
						{this.state.primaryAction}
					</Button>
				</DialogActions>
			</Dialog>
		);
	}
}

DialogChooseFolder.propTypes = {
	classes: PropTypes.object.isRequired,
};

// @ts-ignore
export default withStyles(styles)(withMobileDialog()(DialogChooseFolder));
