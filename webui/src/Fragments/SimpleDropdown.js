import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import DropdownIcon from '@material-ui/icons/KeyboardArrowDown';
import Menu from '@material-ui/core/Menu';

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

	componentWillReceiveProps = (newProps) => {
		if (!newProps.open) {
			this.setState({ menuAnchorEl: null });
		}
	}

	handleDropShow = (event) => {
		this.setState({ menuAnchorEl: event.currentTarget });
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
					open={Boolean(this.state.menuAnchorEl)}
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
	open: PropTypes.bool,
};

export default withStyles(styles)(SimpleDropdown);
