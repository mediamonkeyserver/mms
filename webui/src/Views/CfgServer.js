//@ts-check
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';

import Server from '../server';

const styles = ({
	paper: {
		margin: '1em 0px',
		padding: '1em',
	}
});

class CfgServer extends Component {
	state = {
		modified: false,

		serverName: '',

		localHttpPort: '',
		localHttpsPort: '',
	}

	updateContent = () => {
		Server.getInfo().then((info) => {
			this.setState({
				serverName: info.serverName,
				localHttpPort: info.httpPort,
				localHttpsPort: info.httpsPort,
			});
		});
	}

	componentDidMount = () => {
		this.updateContent();
	}

	handleTextChange = (event) => {
		const change = { modified: true };
		change[event.currentTarget.id] = event.currentTarget.value;
		this.setState(change);
	}

	handleSave = () => {
		this.setState({
			modified: false,
		});
		Server.saveCongif({
			serverName: this.state.serverName,
			httpPort: this.state.localHttpPort,
			httpsPort: this.state.localHttpsPort,
		});
	}

	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<Grid container direction='column'>
						<Paper className='paper'>
							{/* Server name */}
							<Grid item>
								<TextField
									id='serverName'
									value={this.state.serverName}
									label='Server name'
									placeholder='MediaMonkey Server'
									onChange={this.handleTextChange}
									fullWidth
								/>
							</Grid>
						</Paper>

						<Paper className='paper'>
							{/* HTTP Port */}
							<Grid item style={{ marginTop: '0.2em' }}>
								<TextField
									id='localHttpPort'
									value={this.state.localHttpPort}
									label='Local HTTP port'
									onChange={this.handleTextChange}
								/>
							</Grid>
							<Grid item style={{ marginTop: '1em' }}>
								<TextField
									id='localHttpsPort'
									value={this.state.localHttpsPort}
									label='Local HTTPS port'
									onChange={this.handleTextChange}
								/>
							</Grid>
						</Paper>

						{/* Save Button */}
						<Grid item style={{ marginTop: '0.6em' }}>
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

export default withStyles(styles)(CfgServer);

