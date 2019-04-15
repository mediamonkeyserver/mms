// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Path from './utils';
import LinearProgress from '@material-ui/core/LinearProgress';

import FolderIcon from '@material-ui/icons/Folder';

import Server from './server';

const styles = theme => ({
	root: {
		width: '100%',
		minWidth: 400,
		height: 450,
		'overflow-x': 'hidden',
		'overflow-y': 'auto',
	},

	selected: {
		color: theme.palette.secondary.main + ' !important;',
	},
});

class FolderList extends React.Component {
	state = {
		folders: [],
		files: [],
		loading: true,
		selectedFile: null,
	};

	updateList = (path) => {
		this.setState({ folders: [], loading: true }); // Clean the list until the content is loaded
		Server.getFolderList(path).then((content) => {
			this.setState({
				folders: content.folders.map(x => x),
				files: content.files.map(x => x),
				loading: false,
			});
		});
	}

	componentDidMount = () => {
		this.updateList(this.props.path);
	}

	componentDidUpdate = (prevProps) => {
		if (this.props.path !== prevProps.path) {
			this.updateList(this.props.path);
		}
	}

	onFolderClick = (e) => {
		var folder = e.currentTarget.dataset.folder;
		var newfolder = (folder === '..') ? Path.levelUp(this.props.path) : Path.join(this.props.path, folder);
		this.props.onPathChange(newfolder);
	}

	onFileClick = (event) => {
		const file = event.currentTarget.dataset.file;
		this.setState({ selectedFile: file });
		this.props.onFileSelect(Path.join(this.props.path, file));
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				{/* Loading progress */}
				{this.state.loading ? <LinearProgress /> : null}

				{/* The folder list */}
				<List component='nav' dense>
					{this.state.folders.map((folder) => {
						return <ListItem button key={folder} data-folder={folder} onClick={this.onFolderClick}>
							<ListItemIcon><FolderIcon /></ListItemIcon>
							<ListItemText primary={folder} />
						</ListItem>;
					})}

					{this.props.showFiles && this.state.files && this.state.files.map((file) => {
						return <ListItem button key={'file:' + file} data-file={file} onClick={this.onFileClick}>
							<ListItemText primary={
								<span className={file === this.state.selectedFile ? classes.selected : ''}>
									{file}
								</span>
							} />
						</ListItem>;
					})}
				</List>
			</div>
		);
	}
}

FolderList.propTypes = {
	classes: PropTypes.object.isRequired,
	path: PropTypes.string.isRequired,
	onPathChange: PropTypes.func,
	onFileSelect: PropTypes.func,
	showFiles: PropTypes.bool,
};

export default withStyles(styles)(FolderList);
