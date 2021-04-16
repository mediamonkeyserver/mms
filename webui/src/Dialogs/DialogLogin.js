// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import withMobileDialog from '@material-ui/core/withMobileDialog';
import TextField from '@material-ui/core/TextField';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import CircularProgress from '@material-ui/core/CircularProgress';
// import Typography from '@material-ui/core/Typography';

import Server from '../server';

const styles = ({

});

class DialogLogin extends React.Component {
	state = {
		username: localStorage.getItem('username') || '',
		password: '',
		rememberUsername: true,

		checking: false,
		error: false,
	};

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

	render() {
		return (
			<Dialog
				open={!this.props.user}
				disableBackdropClick
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

// @ts-ignore
export default withStyles(styles)(withMobileDialog({ breakpoint: 'xs' })(DialogLogin));
