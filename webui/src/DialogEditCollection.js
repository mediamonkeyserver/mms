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
import Grid from 'material-ui/Grid';

import Input, { InputLabel } from 'material-ui/Input';
import { MenuItem } from 'material-ui/Menu';
import { FormControl, FormHelperText } from 'material-ui/Form';
import Select from 'material-ui/Select';
import { ListItemIcon, ListItemText } from 'material-ui/List';
import TextField from 'material-ui/TextField';

import MusicIcon from 'material-ui-icons/MusicNote';
import MovieIcon from 'material-ui-icons/Movie';
import PlaylistIcon from 'material-ui-icons/PlaylistPlay';

import PubSub from 'pubsub-js';

const styles = theme => ({
	formControl: {
		margin: theme.spacing.unit,
		width: '100%',
		minWidth: 250,
	},
});

class DialogEditCollection extends React.Component {
	state = {
		open: false,
		add: true,
		colType: '',
		colName: '',
	};

	handleDialogClose = () => {
		this.setState({ open: false });
	}

	componentDidMount = () => {
		PubSub.subscribe('ADD_COLLECTION', this.handleAddCollection.bind(this));
	}

	handleAddCollection = () => {
		this.setState({ open: true, add: true });
	}

	handleColTypeChange = (e) => {
		this.setState({ [e.target.name]: e.target.value });
	}

	handleColNameChange = (e) => {
		this.setState({ colName: e.target.value });
	}

	render() {
		const { classes } = this.props;

		return (
			<Dialog
				open={this.state.open}
				onClose={this.handleDialogClose}
				disableBackdropClick>
				<DialogTitle>{this.state.add ? 'Create Collection' : 'Edit Collection'}</DialogTitle>

				<DialogContent>
					{/* Collection type */}
					<Grid container>
						<Grid item xs={12} sm={6}>
							<FormControl className={classes.formControl}>
								<InputLabel>Collection type</InputLabel>
								<Select
									value={this.state.colType}
									onChange={this.handleColTypeChange}
									inputProps={{
										name: 'colType',
										id: 'colType',
									}}
								>
									<MenuItem value={'music'}>
										<ListItemIcon><MusicIcon /></ListItemIcon>
										Music
                  </MenuItem>
									<MenuItem value={'classical'}>
										<ListItemIcon><MusicIcon /></ListItemIcon>
										Classical
                  </MenuItem>
									<MenuItem value={'movies'}>
										<ListItemIcon><MovieIcon /></ListItemIcon>
										Movies
                  </MenuItem>
								</Select>
							</FormControl>
						</Grid>

						{/* Collection name */}
						<Grid item xs={12} sm={6}>
							<FormControl className={classes.formControl}>
								<TextField
								  fullWidth
									id="colName"
									label="Name"
									className={classes.textField}
									value={this.state.colName}
									onChange={this.handleColNameChange}
								/>
							</FormControl>
						</Grid>


						{/* InputProps={{
        endAdornment: (<InputAdornment position={'end'}>
        <Icon>
          <Search />
        </Icon>
        </InputAdornment>)
      }} */}
					</Grid>
				</DialogContent>

				<DialogActions>
					<Button onClick={this.handleDialogClose} color="primary" autoFocus>Create</Button>
					<Button onClick={this.handleDialogClose}>Cancel</Button>
				</DialogActions>
			</Dialog>
		);
	}
}

DialogEditCollection.propTypes = {
	classes: PropTypes.object.isRequired,
	add: PropTypes.object.isRequired,
};

export default withStyles(styles)(withMobileDialog()(DialogEditCollection));
