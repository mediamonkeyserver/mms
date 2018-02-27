import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
// import Button from 'material-ui/Button';
// import Grid from 'material-ui/Grid';
import { MenuItem } from 'material-ui/Menu';
import Typography from 'material-ui/Typography';
import SimpleDropdown from 'Fragments/SimpleDropdown';
import { FormControlLabel } from 'material-ui/Form';
import Switch from 'material-ui/Switch';

import LogList from 'Fragments/LogList';

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

	render() {
		const { classes } = this.props;
		var logType = this.state.logType || 'messages';

		return (
			<div>
				<div className={classes.headerRow}>
					<Typography variant='body2'>Show: &nbsp;</Typography>
					<SimpleDropdown text={logTypes[logType]} open={this.state.openTypeDrop}>
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
					<div className={classes.flexGrow} />
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
				<LogList logType={logType} maxItems={1000} reversed={this.state.reversed} dense />
			</div>
		);
	}
}

Log.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Log);