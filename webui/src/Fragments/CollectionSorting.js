import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SimpleDropdown from './SimpleDropdown';
import MenuItem from '@mui/material/MenuItem';
import { changeCollectionSort } from '../actions';

const audioSorts = {
	title: 'by Title',
	artist: 'by Artist',
	album: 'by Album',
	duration: 'by Length',
};

class CollectionSorting extends Component {
	state = {
		sort: null,
		openDrop: false,
	}

	handleSortClick = (event) => {
		event.stopPropagation();

		var newSort = event.currentTarget.dataset.id;
		this.setState({
			sort: newSort,
			openDrop: false
		});
		changeCollectionSort(this.props.collectionID, newSort);
	}

	handleDropdownClick = () => {
		this.setState({ openDrop: !this.state.openDrop });
	}

	render() {
		var sort = this.state.sort || 'title';

		return (
			<SimpleDropdown 
				text={audioSorts[sort]} 
				open={this.state.openDrop}
				onClick={this.handleDropdownClick}
			>
				{Object.keys(audioSorts).map(srt => (
					<MenuItem
						key={srt}
						data-id={srt}
						selected={sort === srt}
						onClick={this.handleSortClick}
					>
						{audioSorts[srt]}
					</MenuItem>
				))}
			</SimpleDropdown>
		);
	}
}

CollectionSorting.propTypes = {
	collectionID: PropTypes.oneOfType([
		PropTypes.string, PropTypes.number
	]).isRequired,
};

export default CollectionSorting;