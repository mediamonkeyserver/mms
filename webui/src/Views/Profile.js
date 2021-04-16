//@ts-check
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';

import Collapse from '@material-ui/core/Collapse';
import Button from '@material-ui/core/Button';
import Server from '../server';

const PubSub = require('pubsub-js');

const styles = {
};

class Profile extends Component {
	state = {
		username: '',
		displayName: '',
		password: '',
		passwordConf: '',

		changed: false,
		checkPassword: false,
	}

	constructor(props) {
		super(props);
		Object.assign(this.state, this.getState(props));
		
		Server.getUserInfo()
		.then(userInfo => {
			this.setState({
				username: userInfo.name,
				displayName: userInfo.display_name
			});
		})
	}

	componentDidUpdate(prevProps) {
		if (prevProps.editUser !== this.props.editUser)
			this.setState(this.getState(this.props));
	}

	getState(props) {
		return { username: (props.editUser && props.editUser.name) || '' };
	}

	onUsernameChange = (event) => {
		this.setState({ username: event.currentTarget.value, changed: true });
	}
	
	onDisplayNameChange = (event) => {
		this.setState({ displayName: event.currentTarget.value, changed: true });
	}

	onPasswordChange = (event) => {
		this.setState({ password: event.currentTarget.value, changed: true });
	}

	onPasswordConfChange = (event) => {
		this.setState({ passwordConf: event.currentTarget.value, changed: true });
	}

	onPassConfExit = () => {
		this.setState({ checkPassword: true });
	}

	onSave = () => {
		const profile = {
			name: this.state.username,
			password: this.state.password,
			display_name: this.state.displayName,
		};
		Server.saveProfile(profile)
		.then(user => {
			this.setState({
				password: '',
				passwordConf: '',
				changed: false,
			});
			// 2020-09-11 JL: Show toast message when profile is updated
			PubSub.publish('SHOW_SNACKBAR', {
				message: `Profile updated.`,
				autoHide: 5000,
			});
		})
		.catch(err => {
			PubSub.publish('SHOW_SNACKBAR', {
				message: `An error occurred.`,
				autoHide: 5000,
			});
		})
	}

	onKeyPress = (event) => {
		if (event.key === 'Enter' && this.canSave()) {
			this.onSave();
		}
	}

	canSave() {
		return this.state.username && this.state.changed && (
			(this.state.username !== this.props.editUser.name) ||
			!this.state.password ||
			(this.state.password === this.state.passwordConf)
		);
	}

	render() {
		if (!this.props.editUser)
			return null;

		const canSave = this.canSave();
		const passMatch = !this.state.checkPassword || (this.state.password === this.state.passwordConf);

		return (
			<div
				style={{ maxWidth: 1024, marginLeft: 'auto', marginRight: 'auto' }}
				onKeyPress={this.onKeyPress}
			>
				<TextField
					label='Username'
					value={this.state.username}
					fullWidth
					onChange={this.onUsernameChange}
					style={{ marginBottom: '2em' }}
				/>
				
				<TextField
					label='Display Name'
					value={this.state.displayName}
					fullWidth
					onChange={this.onDisplayNameChange}
					style={{ marginBottom: '2em' }}
				/>

				<TextField
					label='New Password'
					placeholder='Enter a new password'
					value={this.state.password}
					type='password'
					onChange={this.onPasswordChange}
					fullWidth
					style={{ marginBottom: '1em' }}
				/>

				<Collapse in={Boolean(this.state.password)}>
					<TextField
						label='Confirm Password'
						placeholder='Reenter the new password'
						value={this.state.passwordConf}
						type='password'
						onChange={this.onPasswordConfChange}
						inputProps={{
							onBlur: this.onPassConfExit,
						}}
						error={!passMatch}
						helperText={passMatch ? '' : 'Passwords do not match'}
						fullWidth
					/>
				</Collapse>

				<Button
					variant='contained'
					color='secondary'
					disabled={!canSave}
					style={{ marginTop: '1em', float: 'right' }}
					onClick={this.onSave}
				>
					{'Save Changes'}
				</Button>
			</div>
		);
	}
}

Profile.propTypes = {
	classes: PropTypes.object.isRequired,
	user: PropTypes.object.isRequired,
	editUser: PropTypes.object.isRequired,
};

export default withStyles(styles)(Profile);