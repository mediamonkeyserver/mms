import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import FolderList from './FolderList';


const styles = theme => ({
    root: {
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
        this.setState({path: newPath});
    }

    render() {
        return (
            <FolderList
                path={this.state.path}
                onPathChange={this.onPathChange}/>
        );
    }
}

FolderChooser.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(FolderChooser);
