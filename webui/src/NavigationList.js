import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import ListSubheader from 'material-ui/List/ListSubheader';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import Collapse from 'material-ui/transitions/Collapse';
import Divider from 'material-ui/Divider';

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
  state = { open: true };

  handleClick = () => {
    this.setState({ open: !this.state.open });
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <List
          component="nav"
          subheader={<ListSubheader component="div" color="primary">MediaMonkey Server</ListSubheader>}
        >
          <ListSubheader>Collections</ListSubheader>
          <ListItem button>
            <ListItemIcon>
              <MusicIcon />
            </ListItemIcon>
            <ListItemText inset primary="Music" />
          </ListItem>
          <ListItem button>
            <ListItemIcon>
              <MovieIcon />
            </ListItemIcon>
            <ListItemText inset primary="Movies" />
          </ListItem>
          <ListItem button>
            <ListItemIcon>
              <PlaylistIcon />
            </ListItemIcon>
            <ListItemText inset primary="Playlists" />
          </ListItem>
          <Divider />

          {/* Settings */}
          <ListItem button onClick={this.handleClick}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText inset primary="Configuration" />
            {this.state.open ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={this.state.open} timeout="auto" unmountOnExit>
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
