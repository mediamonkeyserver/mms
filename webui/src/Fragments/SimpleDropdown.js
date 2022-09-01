import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';
import Typography from '@mui/material/Typography';
import DropdownIcon from '@mui/icons-material/KeyboardArrowDown';
import Menu from '@mui/material/Menu';

const styles = ({
	root: {
		display: 'flex',
		cursor: 'pointer',
	}
});

class SimpleDropdown extends React.Component {
	state = {
		menuAnchorEl: null,
	};

	handleDropShow = (event) => {
		this.setState({ menuAnchorEl: event.currentTarget });
		this.props.onClick();
	}

	handleMenuClose = (event) => {
		event.stopPropagation();
		this.setState({ menuAnchorEl: null });
	}

	render() {
		const { classes } = this.props;

		return (
			<span className={classes.root} onClick={this.handleDropShow}>
				<Typography variant='body2' color='inherit' className={classes.flex}>
					{this.props.text}
				</Typography>
				<DropdownIcon />

				<Menu
					anchorEl={this.state.menuAnchorEl}
					open={this.props.open && Boolean(this.state.menuAnchorEl)}
					onClose={this.handleMenuClose}
				>
					{this.props.children}
				</Menu>
			</span>
		);
	}
}

SimpleDropdown.propTypes = {
	classes: PropTypes.object.isRequired,
	children: PropTypes.node.isRequired,
	text: PropTypes.string.isRequired,
	open: PropTypes.bool.isRequired,
	onClick: PropTypes.func.isRequired,
};

export default withStyles(SimpleDropdown, styles);
