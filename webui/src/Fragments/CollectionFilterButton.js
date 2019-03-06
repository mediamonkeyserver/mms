// @ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import TextField from '@material-ui/core/TextField';

import FilterIcon from '@material-ui/icons/FilterList';
import StarIcon from '@material-ui/icons/Star';
import BackArrow from '@material-ui/icons/KeyboardBackspace';
import DurationIcon from '@material-ui/icons/AccessTime';
import CheckIcon from '@material-ui/icons/Check';

import { addCollectionFilter } from '../actions';

var style = theme => ({
	durationItem: {
		height: 32,
	},
	durationLabel: {
		width: theme.spacing.unit * 10,
		marginRight: theme.spacing.unit * 1.5,
	},
	durationSeconds: {
		marginTop: 8,
		marginRight: theme.spacing.unit * 1.5,
	}
});

class CollectionFilterButton extends Component {
	state = {
		menuAnchorEl: null,
		showMenu: false,

		showRatingMenu: false,
		ratingAtLeast: true,

		showDurationMenu: false,
		durationFrom: '',
		durationTo: '',
	}

	handleMenuOpen = (event) => {
		event.stopPropagation();
		this.setState({
			menuAnchorEl: event.currentTarget,
			showMenu: true
		});
	}

	handleMenuClose = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.setState({ showMenu: false });
	}

	toggleRatingMenu = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.setState({
			showMenu: !this.state.showMenu,
			showRatingMenu: !this.state.showRatingMenu,
		});
	}

	toggleDurationMenu = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.setState({
			showMenu: !this.state.showMenu,
			showDurationMenu: !this.state.showDurationMenu,
		});
	}

	handleRatingClose = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.setState({ showRatingMenu: false });
	}

	handleDurationClose = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.setState({ showDurationMenu: false });
	}

	toggleRatingAtLeast = (event) => {
		event.stopPropagation();
		event.preventDefault();
		this.setState({ ratingAtLeast: !this.state.ratingAtLeast });
	}

	addRatingFilter = (event) => {
		this.handleRatingClose(event);
		addCollectionFilter(this.props.collectionID, {
			field: 'rating',
			operator: (this.state.ratingAtLeast ? '>=' : '='),
			value: event.currentTarget.dataset.stars,
		});
	}

	addDurationFilter = (event) => {
		var from = event.currentTarget.dataset.from * 60;
		var to = event.currentTarget.dataset.to * 60;
		if (event.currentTarget.dataset.custom) {
			from = Number(this.state.durationFrom);
			to = Number(this.state.durationTo);
		}
		if (from || to) {
			addCollectionFilter(this.props.collectionID, {
				field: 'duration',
				operator: ('..'),
				value: [from, to],
			});
			this.handleDurationClose(event);
		}
	}

	updateDurationFrom = (event) => {
		this.setState({ durationFrom: event.currentTarget.value });
	}

	updateDurationTo = (event) => {
		this.setState({ durationTo: event.currentTarget.value });
	}

	render() {
		var { classes } = this.props;

		return (
			<div>
				<IconButton
					// aria-owns={open ? 'menu-appbar' : null}
					// aria-haspopup='true'
					onClick={this.handleMenuOpen}
					color='inherit'
				>
					<FilterIcon />
				</IconButton>

				{/* Main popup menu */}
				<Menu
					id='add-filter'
					anchorEl={this.state.menuAnchorEl}
					// anchorOrigin={{
					// 	vertical: 'bottom',
					// 	horizontal: 'left',
					// }}
					// transformOrigin={{
					// 	vertical: 'top',
					// 	horizontal: 'right',
					// }}
					open={this.state.showMenu}
					onClose={this.handleMenuClose}
				>
					<MenuItem dense disabled>Filter By:</MenuItem>
					<MenuItem onClick={this.toggleRatingMenu}><ListItemIcon><StarIcon /></ListItemIcon>Rating</MenuItem>
					<MenuItem onClick={this.toggleDurationMenu}><ListItemIcon><DurationIcon /></ListItemIcon>Duration</MenuItem>
				</Menu>

				{/* Rating popup menu */}
				<Menu
					id='add-rating'
					anchorEl={this.state.menuAnchorEl}
					open={this.state.showRatingMenu}
					onClose={this.handleRatingClose}
				>
					<MenuItem onClick={this.toggleRatingMenu} dense><BackArrow /></MenuItem>
					<Divider />
					<MenuItem onClick={this.toggleRatingAtLeast} selected={this.state.ratingAtLeast}>{'at least (≥)'}</MenuItem>
					<MenuItem onClick={this.toggleRatingAtLeast} selected={!this.state.ratingAtLeast}>{'equal (=)'}</MenuItem>
					<Divider />
					<MenuItem onClick={this.addRatingFilter} data-stars={5}><StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon /></MenuItem>
					<MenuItem onClick={this.addRatingFilter} data-stars={4}><StarIcon /><StarIcon /><StarIcon /><StarIcon /></MenuItem>
					<MenuItem onClick={this.addRatingFilter} data-stars={3}><StarIcon /><StarIcon /><StarIcon /></MenuItem>
					<MenuItem onClick={this.addRatingFilter} data-stars={2}><StarIcon /><StarIcon /></MenuItem>
					<MenuItem onClick={this.addRatingFilter} data-stars={1}><StarIcon /></MenuItem>
				</Menu>

				{/* Duration popup menu */}
				<Menu
					id='add-duration'
					anchorEl={this.state.menuAnchorEl}
					open={this.state.showDurationMenu}
					onClose={this.handleDurationClose}
				>
					<MenuItem onClick={this.toggleDurationMenu} dense><BackArrow /></MenuItem>
					<Divider />
					<MenuItem onClick={this.addDurationFilter} data-to={1}>less than 1 minute</MenuItem>
					<MenuItem onClick={this.addDurationFilter} data-from={1} data-to={2}>1 to 2 minutes</MenuItem>
					<MenuItem onClick={this.addDurationFilter} data-from={2} data-to={3}>2 to 3 minutes</MenuItem>
					<MenuItem onClick={this.addDurationFilter} data-from={3} data-to={4}>3 to 4 minutes</MenuItem>
					<MenuItem onClick={this.addDurationFilter} data-from={4} data-to={5}>4 to 5 minutes</MenuItem>
					<MenuItem onClick={this.addDurationFilter} data-from={5}>more than 5 minutes</MenuItem>
					<Divider />
					<MenuItem classes={{ root: classes.durationItem }}>
						<TextField id='dur-from' label='From' value={this.state.durationFrom} classes={{ root: classes.durationLabel }} onChange={this.updateDurationFrom} />
						<TextField id='dur-to' label='to' value={this.state.durationTo} classes={{ root: classes.durationLabel }} onChange={this.updateDurationTo} />
						<span className={classes.durationSeconds}>{' seconds'}</span>
						<Button variant="fab" mini onClick={this.addDurationFilter} data-custom={true}>
							<CheckIcon />
						</Button>
					</MenuItem>
				</Menu>
			</div>
		);
	}
}

CollectionFilterButton.propTypes = {
	classes: PropTypes.object.isRequired,
	collectionID: PropTypes.string.isRequired,
};

export default withStyles(style)(CollectionFilterButton);