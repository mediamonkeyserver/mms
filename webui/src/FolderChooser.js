import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import FolderList from './FolderList';
import TextField from '@material-ui/core/TextField';

const styles = theme => ({
	textField: {
		width: '100%',
	},
	folderList: {
		width: '100%',
	},
	textFieldRoot: {
		padding: 0,
		'label + &': {
			marginTop: theme.spacing.unit * 3,
		},
	},
	textFieldInput: {
		borderRadius: 4,
		backgroundColor: theme.palette.borderColor,
		border: '1px solid #ced4da',
		padding: '10px 12px',
		transition: theme.transitions.create(['border-color', 'box-shadow']),
		'&:focus': {
			borderColor: '#80bdff',
			boxShadow: '0 0 0 0.2rem rgba(0,123,255,.25)',
		},
	},
});

class FolderChooser extends React.Component {
	state = {
		path: '/'
	};

	constructor(props) {
		super();
		this.state.path = props.path;
	}

	componentDidMount = () => {
		this.setState({ path: this.props.path });
	}

	componentWillReceiveProps = (newProps) => {
		if (this.props.path !== newProps.path) {
			this.setState({ path: newProps.path });
		}
	}

	onPathChange = (newPath) => {
		this.setState({ path: newPath });
		if (this.props.onPathChange)
			this.props.onPathChange(newPath);
	}

	render() {
		const { classes } = this.props;

		return (
			<div>
				<TextField
					id='name'
					className={classes.textField}
					value={this.state.path}
					// onChange={this.handleChange('name')}
					margin='normal'
					InputProps={{
						disableUnderline: true,
						classes: {
							root: classes.textFieldRoot,
							input: classes.textFieldInput,
						},
					}}
				/>
				<FolderList
					path={this.state.path}
					className={classes.folderList}
					onPathChange={this.onPathChange} />
			</div>
		);
	}
}

FolderChooser.propTypes = {
	classes: PropTypes.object.isRequired,
	path: PropTypes.string,
	onPathChange: PropTypes.function,
};

export default withStyles(styles)(FolderChooser);
