// @ts-check
import React, { Component } from 'react';
// import ReactDOM from 'react-dom';

import cookie from 'js-cookie';
import App from './App';
import Server from './server';
import PubSub from 'pubsub-js';

class User extends Component {
	state = {
		user: null,
	}

	constructor(props) {
		super(props);

		const token = cookie.get('token');
		if (token) {
			Server.setAuth(token);

			this.state.user = {
				token: token,
			};

			this.getUserInfo();
		}

		PubSub.subscribe('UPDATE_GLOBAL', (msg, data) => {
			if (data.user !== undefined)
				this.setState({ user: data.user });
		});
	}

	async getUserInfo() {
		const user = await Server.getUserInfo();
		this.setState({ user: user });
	}

	render() {
		return <App {...this.props} user={this.state.user} />;
	}
}

export default User;