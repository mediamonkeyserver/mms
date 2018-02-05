import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import FolderList from './FolderList';
import TextField from 'material-ui/TextField';
import Paper from 'material-ui/Paper';
import Grid from 'material-ui/Grid';

const styles = theme => ({
    textField: {
        width: '100%',
    },
    folderList: {
        width: '100%',
    }
});

class FolderChooser extends React.Component {
    state = {
        path: '/'
    };

    componentDidMount = () => {
    }

    onPathChange = (newPath) => {
        this.setState({ path: newPath });
    }

    render() {
        const { classes } = this.props;

        return (
            <div>
                <TextField
                    id='name'
                    label='Path:'
                    className={classes.textField}
                    value={this.state.path}
                    // onChange={this.handleChange('name')}
                    margin='normal'
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
};

export default withStyles(styles)(FolderChooser);
