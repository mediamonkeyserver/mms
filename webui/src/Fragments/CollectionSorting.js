import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SimpleDropdown from 'Fragments/SimpleDropdown';
import { MenuItem } from 'material-ui/Menu';
import { changeCollectionSort } from 'actions';

const audioSorts = {
	title: 'by Title',
	artist: 'by Artist',
	album: 'by Album',
	length: 'by Length',
};

export default class CollectionSorting extends Component {
	propTypes = {
		classes: PropTypes.object.isRequired,
		collection: PropTypes.object.isRequired,
	}

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
		changeCollectionSort(this.props.collection, newSort);
	}

	render() {
		var sort = this.state.sort || 'title';

		return (
			<SimpleDropdown text={audioSorts[sort]} open={this.state.openDrop}>
				{Object.keys(audioSorts).map(srt => (
					<MenuItem
						key={srt}
						data-id={srt}
						selected={sort === srt}
						onClick={this.handleSortClick}>
						{audioSorts[srt]}
					</MenuItem>
				))}
			</SimpleDropdown>
		);
	}
}