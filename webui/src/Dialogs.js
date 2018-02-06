import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';

import DialogEditCollection from './DialogEditCollection';
import DialogChooseFolder from './DialogChooseFolder';

const styles = theme => ({
});

class Dialogs extends React.Component {
	state = {

	}

	render() {
		return (
			<div>
				<DialogEditCollection />
				<DialogChooseFolder />
			</div>
		);
	}
}

Dialogs.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Dialogs);
