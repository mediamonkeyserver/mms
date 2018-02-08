import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import DialogEditCollection from './DialogEditCollection';
import DialogChooseFolder from './DialogChooseFolder';
import Snackbar from 'material-ui/Snackbar';

import PubSub from 'pubsub-js';

const styles = theme => ({
});

class Dialogs extends React.Component {
	state = {
		snackbarOpen: false,
		snackbarAutoHide: 10000,
		snackbarMessage: '',
	}

	componentDidMount() {
		PubSub.subscribe('SHOW_SNACKBAR', this.showSnackbar.bind(this));
	}

	showSnackbar(msg, data) {
		this.setState({
			snackbarOpen: true,
			snackbarAutoHide: data.autoHide || 10000,
			snackbarMessage: data.message,
		});
	}

	handleSnackbarClose() {
		this.setState({snackbarOpen: false});
	}

	render() {
		return (
			<div>
				<DialogEditCollection />
				<DialogChooseFolder />
				<Snackbar
					open={this.state.snackbarOpen}
					autoHideDuration={this.state.snackbarAutoHide}
					onClose={this.handleSnackbarClose.bind(this)}
					message={this.state.snackbarMessage}
					/>
			</div>
		);
	}
}

Dialogs.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Dialogs);
