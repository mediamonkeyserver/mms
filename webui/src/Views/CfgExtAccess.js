//@ts-check
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';
import Paper from '@material-ui/core/Paper';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';

import Server from '../server';
import PubSub from 'pubsub-js';

const styles = ({
	paper: {
		margin: '1em 0px',
		padding: '1em',
	}
});

class CfgExtAccess extends Component {
	state = {
		modified: false,

		extAccess: false,
		performNAT: true,
		extHttpsPort: '',
		certPemFile: '',
		keyPemFile: '',
	}

	updateContent = () => {
		Server.getInfo().then((info) => {
			this.setState({
				extAccess: info.extAccess,
				performNAT: info.performNAT,
				extHttpsPort: info.extHttpsPort,
				certPemFile: info.certPemFile,
				keyPemFile: info.keyPemFile,
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
		Server.saveConfig({
			extAccess: this.state.extAccess,
			performNAT: this.state.performNAT,
			extHttpsPort: this.state.extHttpsPort,
			certPemFile: this.state.certPemFile,
			keyPemFile: this.state.keyPemFile,
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

	selectedPrivKey = (value) => {
		this.setState({
			keyPemFile: value,
			modified: true,
		});
	}

	selectPrivKey = () => {
		PubSub.publish('SELECT_FILE', { callback: this.selectedPrivKey });
	}

	selectedCertKey = (value) => {
		this.setState({
			certPemFile: value,
			modified: true,
		});
	}

	selectCertKey = () => {
		PubSub.publish('SELECT_FILE', { callback: this.selectedCertKey });
	}

	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<Grid container direction='column'>
						{/* Allow external access */}
						<Paper className='paper'>
							<Grid item style={{ marginBottom: '1em' }}>
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
						</Paper>

						<Paper className='paper'>
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
									{'Tries to set up router so that the public port is mapped to the local port of this server. May not work with some routers and needs to be done manually then.'}
								</FormHelperText>
							</Grid>

							{/* Public HTTPS port */}
							<Grid item style={{ marginTop: '0.6em', marginBottom: '1em' }}>
								<TextField
									id='extHttpsPort'
									value={this.state.extHttpsPort}
									label='Public HTTPS port'
									onChange={this.handleTextChange}
								/>
							</Grid>
						</Paper>

						<Paper className='paper'>
							{/* PEM Certificate */}
							<Grid item style={{ marginTop: '1em', display: 'flex', flexDirection: 'row' }}>
								<TextField
									id='certPemFile'
									value={this.state.certPemFile}
									label='Certificate path'
									onChange={this.handleTextChange}
									helperText='Path to the PEM file with certificate'
									style={{ flexGrow: 1 }}
								/>
								<Button style={{ alignSelf: 'center', marginLeft: '1em' }} color='primary' onClick={this.selectCertKey}>
									{'Browse'}
								</Button>
							</Grid>

							{/* PEM Private Key */}
							<Grid item style={{ marginTop: '2em', marginBottom: '1em', display: 'flex', flexDirection: 'row' }}>
								<TextField
									id='keyPemFile'
									value={this.state.keyPemFile}
									label='Private key path'
									onChange={this.handleTextChange}
									helperText='Path to the PEM file with the private key'
									style={{ flexGrow: 1 }}
								/>
								<Button style={{ alignSelf: 'center', marginLeft: '1em' }} color='primary' onClick={this.selectPrivKey}>
									{'Browse'}
								</Button>
							</Grid>

							<FormHelperText style={{ margin: '2em 0px' }}>
								{'If you don\'t provide your certificate, MediaMonkey Server will automatically create a self-signed certificate for you. '}
								{'You will get security warnings in web browsers then though.'}
							</FormHelperText>
						</Paper>

						{/* Save button */}
						<Grid item style={{ marginTop: '0.7em' }}>
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

