import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Path from './utils';
import LinearProgress from '@material-ui/core/LinearProgress';

import Server from './server';

const styles = {
	root: {
		width: 400,
		height: 450,
		'overflow-x': 'hidden',
		'overflow-y': 'auto',
	}
};

class FolderList extends React.Component {
	state = {
		folders: [],
		loading: true,
	};

	updateList = (path) => {
		this.setState({ folders: [], loading: true }); // Clean the list until the content is loaded
		Server.getFolderList(path).then((folders) => {
			this.setState({
				folders: folders.map(x => x),
				loading: false,
			});
		});
	}

	componentDidMount = () => {
		this.updateList(this.props.path);
	}

	componentWillUpdate = (nextProps) => {
		if (this.props.path !== nextProps.path) {
			this.updateList(nextProps.path);
		}
	}

	onFolderClick = (e) => {
		var folder = e.currentTarget.dataset.folder;
		var newfolder = (folder === '..') ? Path.levelUp(this.props.path) : Path.join(this.props.path, folder);
		this.props.onPathChange(newfolder);
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
							<ListItemText primary={folder} />
						</ListItem>;
					})}
				</List>
			</div>
		);
	}
}

FolderList.propTypes = {
	classes: PropTypes.object.isRequired,
	path: PropTypes.string.required,
	onPathChange: PropTypes.function,
};

export default withStyles(styles)(FolderList);
