import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import 'react-virtualized/styles.css';
import { AutoSizer } from 'react-virtualized';
import { Table, Column } from 'react-virtualized';
import Avatar from 'material-ui/Avatar';

import Server from 'server';
import PubSub from 'pubsub-js';
import { subscribeCollectionSort, subscribeCollectionChangeFilters, getCollectionFilters } from 'actions';

const styles = theme => ({
	root: {
		position: 'absolute', // For correct positioning of the virtual table
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
		overflow: 'hidden',
	},
	table: {
		boxSizing: 'border-box',
		border: `0px solid ${theme.palette.divider}`,
		fontSize: theme.typography.pxToRem(14),
		color: theme.palette.text.primary,
	},
	grid: {
		outline: 0,
	},
	row: {
		borderBottom: `1px solid ${theme.palette.divider}`,
		outline: 0,
		cursor: 'pointer',
	},
	artwork: {
		width: '100%',
		height: '100%',
		objectFit: 'contain',
		objectPosition: 'center center',
		maxWidth: '100%',
		maxHeight: '100%',
	},
	cellArtwork: {
		padding: '2px 0px 2px 0px',
		height: 48, // Not sure why this is needed explicitly here, otherwise image is offset few pixels up
	},
	cell: {
		textAlign: 'left',
		padding: '4px 2px 4px 4px',
	},
	cellRight: {
		textAlign: 'right',
		padding: '4px 10px 4px 4px',
	},
	cellHeader: {
		fontSize: theme.typography.pxToRem(12),
		fontWeight: theme.typography.fontWeightMedium,
		color: theme.palette.text.secondary,
	},
	cellInLastColumn: {
		paddingRight: theme.spacing.unit * 3
	},
	cellInLastRow: {
		borderBottom: 'none'
	},
	footer: {
		borderTop: `1px solid ${theme.palette.text.divider}`,
	},
	albumAvatar: {
		margin: 4,
	}
});

class Collection extends Component {
	state = {
		tracks: [],
	}
	collection = {};
	sort = null;
	filters = [];

	updateContent = () => {
		this.setState({ tracks: [] });
		Server.getTracklist(this.collection, this.sort, this.filters).then(tracklist =>
			this.setState({ tracks: tracklist })
		);
	}

	componentDidMount = () => {
		this.collection = this.props.collection;
		this.filters = getCollectionFilters();
		this.updateContent();
		subscribeCollectionSort(this.handleChangeSort);
		subscribeCollectionChangeFilters(this.handleChangeFilters);
	}

	componentWillReceiveProps = (nextProps) => {
		if (this.props.collection.id !== nextProps.collection.id) {
			this.collection = nextProps.collection;
			this.updateContent();
		}
	}

	handleChangeSort = (data) => {
		if (this.props.collection.id === data.collection.id) {
			this.sort = data.newSort;
			this.updateContent();
		}
	}

	handleChangeFilters = (data) => {
		if (this.props.collection.id === data.collection.id) {
			this.filters = data.filters;
			this.updateContent();
		}
	}

	getArtistCellData = ({ rowData }) => {
		if (rowData.artists)
			return rowData.artists.join('; ');
		else
			return '';
	}

	getDurationCellData = ({ rowData }) => {
		var duration = rowData.duration;
		if (duration >= 0) {
			var min = String(Math.trunc(duration / 60) + ':');
			var sec = String(Math.trunc(duration % 60));
			while (sec.length < 2)
				sec = '0' + sec;
			return min + sec;
		} else
			return '';
	}

	renderArtwork = ({ rowData }) => {
		if (rowData.artworkURL)
			return (<img
				src={rowData.artworkURL}
				alt='artwork'
				className={this.props.classes.artwork} />);
		else {
			var short = (rowData.album || '').slice(0, 2);
			return (
				<Avatar className={this.props.classes.albumAvatar}>{short}</Avatar>
			);
		}
	}

	handleTrackClick = ({ rowData }) => {
		PubSub.publish('PLAY', {
			url: rowData.streamURL,
			title: (rowData.artists ? rowData.artists.join('; ') : '') + ' - ' + rowData.title,
		});
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<AutoSizer>
					{({ height, width }) => (
						<Table
							width={width}
							height={height}
							className={classes.table}
							gridClassName={classes.grid}
							disableHeader
							// headerHeight={20}
							rowHeight={48}
							rowCount={this.state.tracks.length}
							rowGetter={({ index }) => this.state.tracks[index]}
							rowClassName={classes.row}
							onRowClick={this.handleTrackClick}
						>
							<Column
								label='Artwork'
								dataKey='artworkURL'
								className={classes.cellArtwork}
								width={48}
								flexGrow={0}
								flexShrink={0}
								cellRenderer={this.renderArtwork}
							/>
							<Column
								label='Name'
								dataKey='title'
								className={classes.cell}
								width={250}
								flexGrow={10}
							/>
							<Column
								label='Artist'
								dataKey='artists'
								width={250}
								flexGrow={10}
								className={classes.cell}
								cellDataGetter={this.getArtistCellData}
							/>
							<Column
								label='Album'
								dataKey='album'
								width={250}
								flexGrow={10}
								className={classes.cell}
							/>
							<Column
								label='Length'
								dataKey='duration'
								width={40}
								flexGrow={0}
								flexShrink={0}
								className={classes.cellRight}
								cellDataGetter={this.getDurationCellData}
							/>
						</Table>
					)}
				</AutoSizer>
			</div>
		);
	}
}

Collection.propTypes = {
	classes: PropTypes.object.isRequired,
	collection: PropTypes.object.isRequired,
};

export default withStyles(styles)(Collection);