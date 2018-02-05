import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import Home from './Views/Home'

const styles = {
};

const pages = {
    home: {
        component: React.createElement(Home)
    },

}

class MainContent extends Component {
    state = {
        view: 'home',
    }

    render() {
        var activeview = pages[this.state.view].component;

        return (
            <div>
                {activeview}
            </div>
        );
    }
}

export default withStyles(styles)(MainContent);