import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import SimpleDropdown from 'Fragments/SimpleDropdown';
import MenuItem from '@material-ui/core/MenuItem';
import { changeCollectionSort } from 'actions';

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
	classes: PropTypes.object.isRequired,
	collectionID: PropTypes.string.isRequired,
};

export default withStyles()(CollectionSorting);