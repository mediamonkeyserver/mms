// @ts-check
import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import cookie from 'js-cookie';
import Server from './server';
import { withRouter } from 'react-router-dom';
import Navigation from './navigation';
import {
	subscribeLoginStateChange,
	//notifyLoginStateChange,
} from './actions';

class User extends Component {
	state = {
		user: null,
	}

	constructor(props) {
		super(props);
		Navigation.init(props.location, props.history);

		const token = cookie.get('token');
		if (token) {
			Server.setAuth(token);

			this.state.user = {
				token: token,
			};

			this.getUserInfo();
		}

		subscribeLoginStateChange(data => {
			if (data.user !== undefined)
				this.setState({ user: data.user });
		});
	}

	componentDidUpdate(prevProps) {
		if (this.props.location !== prevProps.location) {
			Navigation.update(this.props.location, this.props.history);
		}
	}

	async getUserInfo() {
		const user = await Server.getUserInfo();
		this.setState({ user: user });
	}

	render() {
		// @ts-ignore
		return React.cloneElement(this.props.children, {
			...this.props,
			user: this.state.user,
		});

	}
}

User.propTypes = {
	children: PropTypes.element.isRequired,
	location: PropTypes.object.isRequired,
	history: PropTypes.object.isRequired,
};

export default withRouter(User);