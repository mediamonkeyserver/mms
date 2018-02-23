import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import List, { ListItem } from 'material-ui/List';
import Typography from 'material-ui/Typography';

import Server from 'server';

const DEFAULT_MAX_ITEMS = 100000;

const styles = ({
	root: {
	}
});

class LogList extends React.Component {
	state = {
		log: [],
	};

	updateList = () => {
		Server.getLog().then(log => {
			const maxItems = this.props.maxItems || DEFAULT_MAX_ITEMS;
			this.setState({ log: log.slice(-maxItems).reverse().map(x => x) });
		});
	}

	componentDidMount = () => {
		this.updateList();
	}

	render() {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<List component='div' dense>
					{this.state.log.map((logitem, index) => {
						return <ListItem key={'log' + index}>
							<Typography variant='body1'>
								{new Date(logitem.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} &nbsp; {logitem.message}
							</Typography>
						</ListItem>;
					})}
				</List>
			</div>
		);
	}
}

LogList.propTypes = {
	classes: PropTypes.object.isRequired,
	maxItems: PropTypes.number,
};

export default withStyles(styles)(LogList);
