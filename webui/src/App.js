import React, { Component } from 'react';
import './App.css';
import { withStyles } from 'material-ui/styles';
import AppHeader from './AppHeader';
import MainDrawer from './MainDrawer';
import DialogChooseFolder from './DialogChooseFolder';
import MainContent from './MainContent';
import Player from './Player';

const styles = {
  root: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    'flex-direction': 'column',
  },
  mainContent: {
    'flex-grow': 100,
    padding: 10,
  }
};

class App extends Component {
  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <AppHeader />
        <div className={classes.mainContent}>
          <MainContent />
        </div>
        <Player/>
        <MainDrawer />
        <DialogChooseFolder />
      </div>
    );
  }
}

export default withStyles(styles)(App);