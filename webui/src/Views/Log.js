//@ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';
// import Button from '@mui/material/Button';
// import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import SimpleDropdown from '../Fragments/SimpleDropdown';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';

import LogList from '../Fragments/LogList';

import { forceLogRefresh } from '../actions';

const styles = {
	headerRow: {
		display: 'flex',
		flexFlow: 'row',
		alignItems: 'center',
	},
	flexGrow: {
		flexGrow: 1,
	}
};

const logTypes = {
	messages: 'Log messages',
	verbose: 'Verbose messages',
	debug: 'Debug messages',
};

class Log extends Component {
	state = {
		logType: 'messages',
		openTypeDrop: false,
		reversed: true,
	}

	closeTypeDrop = (event) => {
		event.preventDefault();
		event.stopPropagation();
		this.setState({ openTypeDrop: false });
	};

	handleTypeClick = (event) => {
		this.closeTypeDrop(event);
		this.setState({ logType: event.currentTarget.dataset.id });
	};

	handleReverseClick = (event) => {
		event.stopPropagation();
		this.setState({ reversed: event.target.checked });
	}

	handleRefresh = () => {
		forceLogRefresh();
	}

	handleDropdownClick = () => {
		this.setState({ openTypeDrop: !this.state.openTypeDrop });
	}

	render() {
		const { classes } = this.props;
		var logType = this.state.logType || 'messages';

		return (
			<div>
				<div className={classes.headerRow}>
					{/* Left  side */}
					<Typography variant='body2'>Show: &nbsp;</Typography>
					<SimpleDropdown 
						text={logTypes[logType]} 
						open={this.state.openTypeDrop}
						onClick={this.handleDropdownClick}
					>
						{Object.keys(logTypes).map(logtype => (
							<MenuItem
								key={logtype}
								data-id={logtype}
								selected={logType === logtype}
								onClick={this.handleTypeClick}>
								{logTypes[logtype]}
							</MenuItem>
						))}
					</SimpleDropdown>
					{logType === 'messages' ? null : <IconButton aria-label='Refresh' onClick={this.handleRefresh}><RefreshIcon /></IconButton>}

					<div className={classes.flexGrow} />

					{/* Right side */}
					<FormControlLabel
						control={
							<Switch
								checked={this.state.reversed}
								onChange={this.handleReverseClick}
								color='primary'
							/>
						}
						label='Reverse'
					/>
				</div>
				<LogList logType={logType} maxItems={10000} reversed={this.state.reversed} dense />
			</div>
		);
	}
}

Log.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(Log, styles);