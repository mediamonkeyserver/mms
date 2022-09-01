// @ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';

import MusicIcon from '@mui/icons-material/MusicNote';
import MovieIcon from '@mui/icons-material/Movie';
import PlaylistIcon from '@mui/icons-material/PlaylistPlay';

import ListItemIcon from '@mui/material/ListItemIcon';

const styles = ({
});

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

CollectionIcon.propTypes = {
	classes: PropTypes.object.isRequired,
	type: PropTypes.string.isRequired,
	variant: PropTypes.string,
};

export default withStyles(CollectionIcon, styles);