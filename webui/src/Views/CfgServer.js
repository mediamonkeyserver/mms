import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';

import Grid from 'material-ui/Grid';
import Button from 'material-ui/Button';
import TextField from 'material-ui/TextField';

import Server from 'server';

const styles = ({
});

class Collections extends Component {
	state = {
		serverName: '',
		origServerName: '',
	}

	updateContent = () => {
		Server.getInfo().then((info) => {
			this.setState({
				serverName: info.serverName,
				origServerName: info.serverName,
			});
		});
	}

	componentDidMount = () => {
		this.updateContent();
	}

	handleServerNameChange = (event) => {
		this.setState({ serverName: event.currentTarget.value });
	}

	handleSave = () => {
		this.setState({
			origServerName: this.state.serverName,
		});
		Server.saveCongif({
			serverName: this.state.serverName,
		});
	}

	render() {
		return (
			<Grid container justify='center'>
				<Grid item xs={12} sm={6} lg={4}>
					<Grid container direction='column'>
						<Grid item>
							<TextField
								id='servername'
								value={this.state.serverName}
								label='Server name'
								placeholder='MediaMonkey Server'
								onChange={this.handleServerNameChange}
								fullWidth
							/>
						</Grid>
						<Grid item>
							<Grid container justify='flex-end'>
								<Button
									onClick={this.handleSave}
									disabled={this.state.serverName === this.state.origServerName}
									color='primary'>
									Save changes
								</Button>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
		);
	}
}

export default withStyles(styles)(Collections);

