import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';

import MusicIcon from 'material-ui-icons/MusicNote';
import MovieIcon from 'material-ui-icons/Movie';
import PlaylistIcon from 'material-ui-icons/PlaylistPlay';

import { ListItemIcon } from 'material-ui/List';

const styles = {
};

class CollectionIcon extends Component {
	rendericon() {
		switch (this.props.type) {
			case 'music':
			case 'classical': return (<MusicIcon />);
			case 'movies': return (<MovieIcon />);
			case 'playlists': return (<PlaylistIcon />);
			default: return (<MusicIcon />);
		}
	}

	render() {
		switch (this.props.variant) {
			case 'list': return (
				<ListItemIcon>
					{this.rendericon()}
				</ListItemIcon>
			);
			case 'icon':
			default: return this.rendericon();
		}
	}
}

export default withStyles(styles)(CollectionIcon);