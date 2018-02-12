import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import List, { ListItem, ListItemText } from 'material-ui/List';

import Server from 'server';

const styles = theme => ({
	root: {
		width: 400,
		height: 450,
		'overflow-x': 'hidden',
		'overflow-y': 'auto',
	}
});

class FolderList extends React.Component {
	state = {
		log: [],
	};

	updateList = () => {
		Server.getLog().then(log => {
			this.setState({ log: log.map(x => x) });
		});
	}

	componentDidMount = () => {
		this.updateList();
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<List component='div' dense>
					{this.state.log.map((logitem, index) => {
						return <ListItem key={'log' + index}>
							<ListItemText primary={logitem.message} />
						</ListItem>;
					})}
				</List>
			</div>
		);
	}
}

FolderList.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(FolderList);
