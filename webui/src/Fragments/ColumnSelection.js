import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';

class ColumnSelection extends Component {

    state = {
        columns: [{
            name: 'title',
            label: 'Title',
            display: true
        }, {
            name: 'artist',
            label: 'Artist',
            display: true
        }, {
            name: 'album',
            label: 'Album',
            display: true
        }, {
            name: 'duration',
            label: 'Duration',
            display: true
        }, {
            name: 'genre',
            label: 'Genre',
            display: false
        },
        {
            name: 'year',
            label: 'Year',
            display: false
        }, {
            name: 'bpm',
            label: 'BPM',
            display: false
        }, {
            name: 'path',
            label: 'Path',
            display: false
        }]
    }

}