import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
// import Button from 'material-ui/Button';
// import Grid from 'material-ui/Grid';
import { MenuItem } from 'material-ui/Menu';
import Typography from 'material-ui/Typography';
import SimpleDropdown from 'Fragments/SimpleDropdown';

import LogList from 'Fragments/LogList';

const styles = {
	headerRow: {
		display: 'flex',
		flexFlow: 'row',
	}
};

const logTypes = {
	messages: 'Log messages',
	verbose: 'Verbose messages',
	debug: 'Debug messages',
};

class Log extends Component {
	state = {
		logType: null,
		openTypeDrop: false,
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
				</div>
				<LogList maxItems={1000} />
			</div>
		);
	}
}

Log.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Log);