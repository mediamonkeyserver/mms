// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'tss-react/mui';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
// import Typography from '@mui/material/Typography';

import Server from '../server';

const styles = ({

});

class DialogLogin extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.state = {
			username: localStorage.getItem('username') || '',
			password: '',
			rememberUsername: true,
	
			checking: false,
			error: false,
		};
	}

	handleLogin = async (/*event*/) => {
		this.setState({ checking: true });

		const res = await Server.login(this.state.username, this.state.password);

		this.setState({ checking: false });

		if (res && res.token && res.user) {
			if (this.state.rememberUsername) {
				//Set a localStorage item to save username permanently
				localStorage.setItem('username', res.user.name);
			}
			else {
				localStorage.removeItem('username');
			}
			// Success
			this.setState({
				username: res.user.name,
				password: '',
				error: false,
			});
		} else {
			// Failure
			this.setState({
				error: true,
			});
		}
	}

	onChangeUsername = (event) => {
		this.setState({ username: event.currentTarget.value });
	}

	onChangePassword = (event) => {
		this.setState({ password: event.currentTarget.value });
	}
	
	onCheckboxChange = (event) => {
		var isChecked = event.currentTarget.checked ? true : false;
		this.setState({ rememberUsername: isChecked });
	}

	handleKeyPress = (event) => {
		if (event.key === 'Enter') { // Save the new tag
			this.handleLogin();
		}
	}
	
	handleDialogClose = (reason) => {
		if (reason === 'backdropClick') return; // disableBackdropClick support was removed
		this.setState({ open: false });
	}

	render() {
		return (
			<Dialog
				open={!this.props.user}
				onClose={() => null}
				fullWidth
				onKeyPress={this.handleKeyPress}
			>
				<DialogTitle>{'Login'}</DialogTitle>

				<DialogContent>
					<TextField
						label={'Username'}
						value={this.state.username}
						onChange={this.onChangeUsername}
						fullWidth
						helperText={'The default username is \'admin\'.'}
						style={{ marginBottom: '1em' }}
					/>

					<TextField
						label={'Password'}
						value={this.state.password}
						onChange={this.onChangePassword}
						fullWidth
						type='password'
						error={this.state.error}
						helperText={
							(this.state.error ? 'Incorrect username or password. ' : '') +
							'The default password for \'admin\' is \'admin\''
						}
						style={{marginBottom: '1em'}}
					/>
					<FormControlLabel
						label={'Remember Me'}
						checked={this.state.rememberUsername}
						control={
							<Checkbox
								checked={this.state.rememberUsername}
								onChange={this.onCheckboxChange}
								key={'rememberUsername'}
							/>
						}
						onChange={this.onCheckboxChange}
					></FormControlLabel>
				</DialogContent>

				<DialogActions>
					{this.state.checking &&
						<CircularProgress color='secondary' size={24} style={{ marginLeft: '1em' }} />
					}
					<div style={{ flexGrow: 1 }} />
					<Button onClick={this.handleLogin} variant='contained' color='primary'>{'Login'}</Button>
				</DialogActions>
			</Dialog>
		);
	}
}

DialogLogin.propTypes = {
	classes: PropTypes.object.isRequired,
	user: PropTypes.object,
};

// todo: mobile dialog breakpoint xs
export default withStyles(DialogLogin, styles);
