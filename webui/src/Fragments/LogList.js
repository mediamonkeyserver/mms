// @ts-check
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Typography from '@material-ui/core/Typography';

import Server from '../server';
import { subscribeLogChanges } from '../actions';

const DEFAULT_MAX_ITEMS = 100000;

const styles = ({
});

class LogList extends React.Component {
	state = {
		log: [],
	};
	reversed = false;

	updateList = (logType) => {
		logType = logType || 'messages';
		Server.getLog(logType).then(log => {
			const maxItems = this.props.maxItems || DEFAULT_MAX_ITEMS;
			this.reversed = false;
			this.setState({ log: log.slice(-maxItems).map(x => x) });
		});
	}

	componentDidMount = () => {
		this.updateList(this.props.logType);
		subscribeLogChanges(this.logChanged);
	}

	componentDidUpdate = (prevProps) => {
		if (prevProps.logType !== this.props.logType) {
			this.updateList(this.props.logType);
		}
	}

	logChanged = () => {
		this.updateList(this.props.logType);
	}

	render() {
		var items = this.state.log;
		if (this.props.reversed !== this.reversed) {
			items = items.reverse();
			this.reversed = !this.reversed;
		}

		if (this.props.dense)
			return (
				<Typography variant='body1'>
					{items.map((logitem, index) => {
						return <span key={index}>
							{new Date(logitem.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} &nbsp; {logitem.message} <br />
						</span>;
					})}
				</Typography>
			);
		else
			return (
				<List component='div'>
					{items.map((logitem, index) => {
						return <ListItem key={'log' + index} dense>
							<Typography variant='body1'>
								{new Date(logitem.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} &nbsp; {logitem.message}
							</Typography>
						</ListItem>;
					})}
				</List>
			);
	}
}

LogList.propTypes = {
	classes: PropTypes.object.isRequired,
	logType: PropTypes.string,
	maxItems: PropTypes.number,
	reversed: PropTypes.bool,
	dense: PropTypes.bool,
};

export default withStyles(styles)(LogList);
