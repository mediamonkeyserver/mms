import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';

const styles = {
  root: {
    width: '100%',
  },
  flex: {
    flex: 1,
  },
};

class Player extends React.Component {
  state = {
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Toolbar>
            <Typography type="title" color="inherit" className={classes.flex}>
              {"Player (tbd.)"}
            </Typography>
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}

Player.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Player);
