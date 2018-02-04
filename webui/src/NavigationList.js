import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import ListSubheader from 'material-ui/List/ListSubheader';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import Collapse from 'material-ui/transitions/Collapse';
import Divider from 'material-ui/Divider';

import Server from './server';

// icons
import SettingsIcon from 'material-ui-icons/Settings';
import ExpandLess from 'material-ui-icons/ExpandLess';
import ExpandMore from 'material-ui-icons/ExpandMore';
import MusicIcon from 'material-ui-icons/MusicNote';
import MovieIcon from 'material-ui-icons/Movie';
import PlaylistIcon from 'material-ui-icons/PlaylistPlay';


const styles = theme => ({
  root: {
    width: '100%',
    maxWidth: 400,
    minWidth: 250,
    backgroundColor: theme.palette.background.paper,
  },
  nested: {
    paddingLeft: theme.spacing.unit * 4,
  },
});

class NavigationList extends React.Component {
  state = {
    configOpen: true,
    serverName: "",
    collections: []
  };

  componentDidMount = () => {
    Server.getInfo().then((info) => {
      this.setState({ serverName: info.serverName });
      this.setState({ collections: info.collections.map(x => { return { id: x.id, name: x.name, type: x.type } }) });
    });
  }

  handleConfigClick = () => {
    this.setState({ configOpen: !this.state.configOpen });
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <List
          component="nav"
          subheader={<ListSubheader component="div" color="primary">{this.state.serverName}</ListSubheader>}
        >
          {/* Collections */}
          <ListSubheader>Collections</ListSubheader>
          {this.state.collections.map((col) => {
            var icon = 
              (col.type === 'music' ? <MusicIcon /> : 
              (col.type === 'movies' ? <MovieIcon /> : <PlaylistIcon />));
            return <ListItem button>
              <ListItemIcon>
                {icon}
              </ListItemIcon>
              <ListItemText inset primary={col.name} />
            </ListItem>;
          })}

          <Divider />

          {/* Settings */}
          <ListItem button onClick={this.handleConfigClick}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText inset primary="Configuration" />
            {this.state.configOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={this.state.configOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem button className={classes.nested}>
                <ListItemText inset primary="Server" />
              </ListItem>
            </List>
          </Collapse>
        </List>
      </div>
    );
  }
}

NavigationList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(NavigationList);
