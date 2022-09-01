// @ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';
import '@enykeev/react-virtualized/styles.css';
import { AutoSizer } from '@enykeev/react-virtualized';
import { Table, Column } from '@enykeev/react-virtualized';
import Avatar from '@mui/material/Avatar';

import Server from '../server';
import Playback from '../playback';
import { subscribeCollectionSort, subscribeCollectionChangeFilters, getCollectionFilters } from '../actions';

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
		paddingRight: theme.spacing(3)
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
	collectionID = null;
	sort = null;
	filters = [];

	updateContent = () => {
		this.setState({ tracks: [] });
		if (this.props.search) {
			Server.search(this.props.searchTerm, this.sort, this.filters).then(tracklist =>
				this.setState({ tracks: tracklist })
			);
		} else {
			Server.getTracklist(this.collectionID, this.sort, this.filters).then(tracklist =>
				this.setState({ tracks: tracklist })
			);
		}
	}

	componentDidMount = () => {
		this.collectionID = this.props.collectionID;
		this.filters = getCollectionFilters();
		this.updateContent();
		subscribeCollectionSort(this.handleChangeSort);
		subscribeCollectionChangeFilters(this.handleChangeFilters);
	}

	componentDidUpdate = (prevProps) => {
		if (this.props.collectionID !== prevProps.collectionID ||
			this.props.search !== prevProps.search ||
			this.props.searchTerm !== prevProps.searchTerm) {
			this.collectionID = this.props.collectionID;
			this.updateContent();
		}
	}

	handleChangeSort = (data) => {
		this.sort = data.newSort;
		this.updateContent();
	}

	handleChangeFilters = (data) => {
		this.filters = data.filters;
		this.updateContent();
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
		Playback.playMediaItem(rowData);
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
							headerHeight={20}
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
	collectionID: PropTypes.string,
	search: PropTypes.bool,
	searchTerm: PropTypes.string,
};

export default withStyles(Collection, styles);