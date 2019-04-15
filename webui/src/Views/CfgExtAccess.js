//@ts-check
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';

import Server from '../server';

const styles = ({
});

class CfgExtAccess extends Component {
	state = {
		modified: false,

		extAccess: false,
		performNAT: true,
		extHttpsPort: '',
	}

	updateContent = () => {
		Server.getInfo().then((info) => {
			this.setState({
				extAccess: info.extAccess,
				performNAT: info.performNAT,
				extHttpsPort: info.extHttpsPort,
			});
		});
	}

	componentDidMount = () => {
		this.updateContent();
	}

	handleSave = () => {
		this.setState({
			modified: false,
		});
		Server.saveCongif({
			extAccess: this.state.extAccess,
			performNAT: this.state.performNAT,
			extHttpsPort: this.state.extHttpsPort,
		});
	}

	onChangeExtAccess = (event) => {
		this.setState({
			extAccess: event.currentTarget.checked,
			modified: true,
		});
	}

	onChangePerformNAT = (event) => {
		this.setState({
			performNAT: event.currentTarget.checked,
			modified: true,
		});
	}

	handleTextChange = (event) => {
		const change = { modified: true };
		change[event.currentTarget.id] = event.currentTarget.value;
		this.setState(change);
	}

	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<Grid container direction='column'>
						{/* Allow external access */}
						<Grid item style={{ marginBottom: '3em' }}>
							<FormControlLabel
								control={
									<Switch
										checked={this.state.extAccess}
										onChange={this.onChangeExtAccess}
									/>}
								label='Allow external access to this server'
							/>
							<FormHelperText>
								{'Allows external connections from the internet. If disabled, only local network connections are allowed.'}
							</FormHelperText>
						</Grid>

						{/* Perform NAT */}
						<Grid item style={{ marginBottom: '1em' }}>
							<FormControlLabel
								control={
									<Switch
										checked={this.state.performNAT}
										onChange={this.onChangePerformNAT}
										color='primary'
									/>}
								label='Configure router automatically'
							/>
							<FormHelperText>
								{'Tries to set up router so that the public port is mapped to the local port of this server. May not work with some routes and needs to be done manually then.'}
							</FormHelperText>
						</Grid>

						{/* Public HTTPS port */}
						<Grid item style={{ marginTop: '0.6em' }}>
							<TextField
								id='extHttpsPort'
								value={this.state.extHttpsPort}
								label='Public HTTPS port'
								onChange={this.handleTextChange}
							/>
						</Grid>

						{/* Save button */}
						<Grid item style={{ marginTop: '1em' }}>
							<Grid container justify='flex-end'>
								<Button
									onClick={this.handleSave}
									disabled={!this.state.modified}
									color='secondary'
									variant='contained'
								>
									{'Save changes'}
								</Button>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
		);
	}
}

export default withStyles(styles)(CfgExtAccess);

