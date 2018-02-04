import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import List, { ListItem, ListItemText } from 'material-ui/List';
import Path from './utils';

import Server from './server';

const styles = theme => ({
    root: {
        width: '100%',
        maxWidth: 400,
        minWidth: 250,
    }
});

class FolderList extends React.Component {
    state = {
        folders: []
    };

    updateList = (path) => {
        Server.getFolderList(path).then((folders) => {
            this.setState({ folders: folders.map(x => x) });
        });
    }

    componentDidMount = () => {
        this.updateList(this.props.path);
    }

    componentWillUpdate = (nextProps) => {
        if (this.props.path !== nextProps.path) {
            this.updateList(nextProps.path);
        }
    }

    onFolderClick = (e) => {
        var folder = e.currentTarget.dataset.folder;
        var newfolder = (folder === '..') ? Path.levelUp(this.props.path) : Path.join(this.props.path, folder);
        this.props.onPathChange(newfolder);
    }

    render() {
        const { classes } = this.props;

        return (
            <div className={classes.root}>
                <List component="nav" dense>
                    {this.state.folders.map((folder) => {
                        return <ListItem button key={folder} data-folder={folder} onClick={this.onFolderClick}>
                            <ListItemText primary={folder} />
                        </ListItem>;
                    })}
                </List>
            </div>
        );
    }
}

FolderList.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(FolderList);
