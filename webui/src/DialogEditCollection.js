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
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';

import InputLabel from '@material-ui/core/InputLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';

// import MusicIcon from '@material-ui/icons/MusicNote';
// import MovieIcon from '@material-ui/icons/Movie';
// import PlaylistIcon from '@material-ui/icons/PlaylistPlay';
import RemoveIcon from '@material-ui/icons/Clear';

import PubSub from 'pubsub-js';
import Server from './server';

const styles = ({
	root: {
	},
	colType: {
	},
	colName: {
	},
	folders: {
	},
	formControl: {
	},
	folder: {
		marginTop: 5,
		marginBottom: 5
	}
});

const colTypes = {
	music: 'Music',
	classical: 'Classical',
	movies: 'Movies',
};

class DialogEditCollection extends React.Component {
	state = {
		open: false,
		add: true,
		id: undefined,
		colType: '',
		colName: '',
		folders: []
	};

	handleDialogClose = () => {
		this.setState({ open: false });
	}

	handleDialogOK = () => {
		Server.saveCollection({
			id: this.state.id,
			type: this.state.colType,
			name: this.state.colName,
			folders: this.state.folders,
		});
		this.handleDialogClose();
		PubSub.publish('SHOW_SNACKBAR', {
			message: 'New Collection "' + this.state.colName + '" was created.',
			autoHide: 5000,
		});
	}

	componentDidMount = () => {
		PubSub.subscribe('ADD_COLLECTION', this.handleAddCollection.bind(this));
		PubSub.subscribe('EDIT_COLLECTION', this.handleEditCollection.bind(this));
	}

	handleAddCollection = () => {
		this.setState({
			open: true,
			add: true,
			id: undefined,
			colType: '',
			colName: '',
			folders: []
		});
	}

	handleEditCollection = (msg, data) => {
		this.setState({
			open: true,
			add: false,
			id: data.collection.id,
			colType: data.collection.type,
			colName: data.collection.name,
			folders: data.collection.folders.map(x => x),
		});
	}

	handleColTypeChange = (e) => {
		if (this.state.colName === '' || colTypes[this.state.colType] === this.state.colName) {
			// Update collection name based on chosen type
			this.setState({ colName: colTypes[e.target.value] });
		}
		this.setState({ [e.target.name]: e.target.value });
	}

	handleColNameChange = (e) => {
		this.setState({ colName: e.target.value });
	}

	handleAddFolder = () => {
		PubSub.publish('ADD_FOLDER', { callback: this.handleAddedFolder.bind(this) });
	}

	handleAddedFolder = (path) => {
		this.setState({ folders: this.state.folders.concat(path) });
	}

	handleFolderRemove = (event) => {
		this.setState({ folders: this.state.folders.filter((el, i) => i !== Number(event.currentTarget.dataset.index)) });
	}

	render() {
		const { classes } = this.props;

		return (
			<Dialog
				open={this.state.open}
				onClose={this.handleDialogClose}
				disableBackdropClick
				fullWidth
			>
				<DialogTitle>{this.state.add ? 'Create Collection' : 'Edit Collection'}</DialogTitle>

				<DialogContent className={classes.root}>
					{/* Collection type */}
					<Grid container spacing={3}>
						<Grid item xs={12} sm={4}>
							<FormControl fullWidth className={classes.colType}>
								<InputLabel>Collection type</InputLabel>
								<Select
									value={this.state.colType}
									disabled={!this.state.add}
									onChange={this.handleColTypeChange}
									inputProps={{
										name: 'colType',
										id: 'colType',
									}}
								>
									<MenuItem value={'music'}>
										{/* TODO: Icons commented out, since their rendering in Select isn't perfect yet. */}
										{/* <ListItemIcon><MusicIcon /></ListItemIcon> */}
										Music
									</MenuItem>
									<MenuItem value={'classical'}>
										{/* <ListItemIcon><MusicIcon /></ListItemIcon> */}
										Classical
									</MenuItem>
									<MenuItem value={'movies'}>
										{/* <ListItemIcon><MovieIcon /></ListItemIcon> */}
										Movies
									</MenuItem>
								</Select>
							</FormControl>
						</Grid>

						{/* Collection name */}
						<Grid item xs={12} sm={8}>
							<TextField className={classes.colName}
								fullWidth
								id='colName'
								label='Name'
								value={this.state.colName}
								onChange={this.handleColNameChange}
							/>
						</Grid>

						{/* Folders */}
						<Grid item xs={12} className={classes.folders}>
							<Typography>Folders in this collection:</Typography>

							{this.state.folders.map((folder, index) => {
								return <TextField className={classes.folder}
									fullWidth
									disabled
									spellCheck={false}
									value={folder}
									id={'folder' + index}
									key={'folder' + index}
									InputProps={{
										endAdornment: (<InputAdornment position={'end'}>
											<IconButton onClick={this.handleFolderRemove} data-index={index}>
												<RemoveIcon />
											</IconButton>
										</InputAdornment>)
									}}
								/>;
							})}

							<Button
								onClick={this.handleAddFolder}
								color='primary'
								variant='contained'
							// disabled={this.state.colType === ''}
							>
								Add folder
							</Button>

						</Grid>
					</Grid>
				</DialogContent>

				<DialogActions>
					<Button onClick={this.handleDialogClose}>Cancel</Button>
					<Button
						onClick={this.handleDialogOK}
						color='primary'
						disabled={this.state.colType === '' || this.state.colName === '' || this.state.folders.length === 0}
						autoFocus>
						{this.state.add ? 'Create' : 'OK'}
					</Button>
				</DialogActions>
			</Dialog>
		);
	}
}

DialogEditCollection.propTypes = {
	classes: PropTypes.object.isRequired
};

// @ts-ignore
export default withStyles(styles)(withMobileDialog({ breakpoint: 'xs' })(DialogEditCollection));
