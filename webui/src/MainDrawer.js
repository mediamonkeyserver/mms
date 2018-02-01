import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Drawer from 'material-ui/Drawer';
import PubSub from 'pubsub-js';
import NavigationList from './NavigationList';

const styles = {
};

class MainDrawer extends React.Component {
  state = {
    drawerOpen: false
  };

  handleDrawerToggle = () => {
    this.setState({ drawerOpen: !this.state.drawerOpen });
  };

  componentDidMount = () => {
    PubSub.subscribe('TOGGLE_MAIN_DRAWER', this.handleDrawerToggle.bind(this));
  }

  render() {
    return (
      <Drawer
        open={this.state.drawerOpen}
        onClose={this.handleDrawerToggle}
        type="temporary">
        <NavigationList />
      </Drawer>
    );
  }
}

MainDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MainDrawer);
