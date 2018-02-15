import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import { AutoSizer } from 'react-virtualized';
import MuiTable from 'mui-table';

import Server from 'server';

const styles = {
	card: {
	},
	cardActions: {
		justifyContent: 'flex-end',
	}
};

class Collection extends Component {
	state = {
		tracks: [],
	}

	updateContent = (collection) => {
		this.setState({ tracks: [] });
		Server.getTracklist(collection).then(tracklist =>
			this.setState({ tracks: tracklist })
		);
	}

	componentDidMount = () => {
		this.updateContent(this.props.collection);
	}

	componentWillReceiveProps = (nextProps) => {
		if (this.props.collection.id !== nextProps.collection.id) {
			this.updateContent(nextProps.collection);
		}
	}

	renderArtists = (track) => {
		return track.artists ? track.artists.join('; ') : '';
	}

	renderLength = (track) => {
		if (track.duration >= 0) {
			var min = String(Math.trunc(track.duration / 60) + ':');
			var sec = String(Math.trunc(track.duration % 60));
			while (sec.length < 2)
				sec = '0' + sec;
			return min + sec;
		} else
			return '';
	}

	render() {
		// const { classes } = this.props;

		return (
			<AutoSizer>
				{({ height, width }) => (
					<MuiTable
						data={this.state.tracks}
						columns={[
							{ name: 'title' },
							{ name: 'artist', cell: this.renderArtists },
							{ name: 'album' },
							{ name: 'duration', cell: this.renderLength }
						]}
						width={width}
						height={height} />
				)}
			</AutoSizer>
		);
	}
}

Collection.propTypes = {
	classes: PropTypes.object.isRequired,
	collection: PropTypes.object.isRequired,
};

export default withStyles(styles)(Collection);