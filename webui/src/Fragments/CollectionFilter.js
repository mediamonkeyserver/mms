// @ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Chip from '@material-ui/core/Chip';
import Avatar from '@material-ui/core/Avatar';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

import StarIcon from '@material-ui/icons/Star';
import DurationIcon from '@material-ui/icons/AccessTime';

import { subscribeCollectionChangeFilters, getCollectionFilters, removeCollectionFilter } from '../actions';

var style = theme => ({
	filterChip: {
		marginRight: theme.spacing(1),
	}
});

class CollectionFilter extends Component {
	state = {
		filters: [],
		menuAnchorEl: null,
	}

	componentDidMount() {
		subscribeCollectionChangeFilters(this.updateFilters);
	}

	updateFilters = () => {
		this.setState({ filters: getCollectionFilters().map(x => x) });
	}

	handleFilterClick = (event) => {
		this.setState({
			menuAnchorEl: event.currentTarget,
		});
		this.menuIndex = event.currentTarget.dataset.index;
	}

	handleFilterRemove = (event) => {
		removeCollectionFilter(this.props.collectionID, this.menuIndex);
		this.handleMenuClose(event);
	}

	handleMenuClose = (event) => {
		event.preventDefault();
		event.stopPropagation();
		this.setState({ menuAnchorEl: null });
	}

	renderFilter(filter, index) {
		var icon = null;
		var text = '';
		switch (filter.field) {
			case 'rating':
				icon = <StarIcon />;
				text = (filter.operator === '=' ? '' : '≥') + filter.value + ' ' + (filter.value === 1 ? 'star' : 'stars');
				break;
			case 'duration':
				icon = <DurationIcon />;
				var v1, v2;
				if ((!filter.value[0] || (filter.value[0] % 60 === 0)) && (!filter.value[1] || (filter.value[1] % 60 === 0))) {
					text = ' minutes';
					v1 = filter.value[0] / 60;
					v2 = filter.value[1] / 60;
				} else {
					text = ' seconds';
					v1 = filter.value[0];
					v2 = filter.value[1];
				}
				if (v1) {
					text = (v2 ? v1 + '..' + v2 : '>' + v1) + text;
				} else {
					text = '<' + v2 + text;
				}
				break;
			default:
				text = 'unknown';
		}
		return (
			<Chip
				avatar={
					<Avatar>{icon}</Avatar>
				}
				key={'filter'+index}
				label={text}
				onClick={this.handleFilterClick}
				data-index={index}
				className={this.props.classes.filterChip}
			/>
		);
	}

	render() {
		return (
			<div>
				{this.state.filters.map((filter, index) => {
					return (this.renderFilter(filter, index));
				})}
				<Menu
					id='popup-filter'
					anchorEl={this.state.menuAnchorEl}
					// anchorOrigin={{
					// 	vertical: 'bottom',
					// 	horizontal: 'left',
					// }}
					// transformOrigin={{
					// 	vertical: 'top',
					// 	horizontal: 'right',
					// }}
					open={Boolean(this.state.menuAnchorEl)}
					onClose={this.handleMenuClose}
				>
					<MenuItem onClick={this.handleFilterRemove}>Remove</MenuItem>
				</Menu>
			</div>
		);
	}
}

CollectionFilter.propTypes = {
	classes: PropTypes.object.isRequired,
	collectionID: PropTypes.oneOfType([
		PropTypes.string, PropTypes.number
	]).isRequired,
};

export default withStyles(style)(CollectionFilter);