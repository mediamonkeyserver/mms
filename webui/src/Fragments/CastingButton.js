// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';

import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemIcon from '@mui/material/ListItemIcon';

import CastIcon from '@mui/icons-material/Cast';
import CastConnectedIcon from '@mui/icons-material/CastConnected';
import ComputerIcon from '@mui/icons-material/Computer';

import Server from '../server';
import { getCastingClientID, setCastingClientID } from '../playback';

const styles = {
	menuRoot: {
		minWidth: 250,
	},
	rootMenuHeader: {
		outline: 0, // TODO: Bug in Material UI? This shouldn't be needed, but currently is.
	}
};

class CastingButton extends React.Component {
	state = {
		anchorEl: null,
		players: [],
		castingID: null,
	};

	constructor(props) {
		super(props);
		this.state.castingID = getCastingClientID();
	}

	updatePlayers = () => {
		Server.getPlayers().then(players => {
			this.setState({ players: players.map(x => ({ id: x.id, name: x.name })) });
		});
	}

	handleOpen = event => {
		this.updatePlayers();
		this.setState({ anchorEl: event.currentTarget });
	};

	handleClose = () => {
		this.setState({ anchorEl: null });
	};

	handleChoosePlayer = (newID) => {
		// var newID = event.currentTarget.dataset.id;
		this.setState({
			castingID: newID,
			anchorEl: null,
		});
		setCastingClientID(newID);
	};

	render() {
		const open = Boolean(this.state.anchorEl);
		const { classes } = this.props;

		return (
			<div>
				{/* IconButton */}
				<IconButton
					aria-haspopup='true'
					onClick={this.handleOpen}
					color='inherit'
				>
					{this.state.castingID ? <CastConnectedIcon /> : <CastIcon />}
				</IconButton>

				{/* Popup Menu */}
				<Menu
					anchorEl={this.state.anchorEl}
					PopoverClasses={{ paper: classes.menuRoot }}
					open={open}
					onClose={this.handleClose}
				>
					{/* Header */}
					<ListSubheader className={classes.rootMenuHeader}>Play On:</ListSubheader>

					{/* Local */}
					<MenuItem
						key={'*'}
						selected={!this.state.castingID}
						onClick={() => this.handleChoosePlayer(null)}
					>
						<ListItemIcon>
							<ComputerIcon />
						</ListItemIcon>
						{'This device (local)'}
					</MenuItem>

					{/* Available devices */}
					{this.state.players.map(player => (
						<MenuItem
							key={player.id}
							selected={player.id === this.state.castingID}
							onClick={() => this.handleChoosePlayer(player.id)}
						>
							<ListItemIcon>
								<CastIcon />
							</ListItemIcon>
							{player.name}
						</MenuItem>
					))}
				</Menu>
			</div>
		);
	}
}

CastingButton.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(CastingButton, styles);
