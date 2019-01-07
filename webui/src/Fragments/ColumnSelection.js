import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@material-ui/core/styles';


import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Chip from '@material-ui/core/Chip';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import Select from '@material-ui/core/Select';

const styles = theme => ({});

class ColumnSelection extends Component {

    state = {
        displayedColumns: [],

        columns: [
            {
                name: 'title',
                label: 'Title',
                display: true
            }, 
             {
                name: 'artist',
                label: 'Artist',
                display: true
            }, 
             {
                name: 'album',
                label: 'Album',
                display: true
            }, 
             {
                name: 'duration',
                label: 'Duration',
                display: true
            }, 
             {
                name: 'genre',
                label: 'Genre',
                display: false
            },
             {
                name: 'year',
                label: 'Year',
                display: false
            }, 
             {
                name: 'bpm',
                label: 'BPM',
                display: false
            }, 
             {
                name: 'path',
                label: 'Path',
                display: false
            }
        ]
    }

    updateColumnDisplay = (columnKey) => {
        console.log(columnKey);
        //this.state.columns[columnKey].display = !this.state.columns[columnKey].display;
    }

    render(){
        const {classes} = this.props;

        return(
            <div>
                <Select
                            value={this.state.displayedColumns}
							multiple
							onChange={this.updateColumnDisplay()}
							input={<Input id="select-multiple-checkbox" />}
							renderValue={selected => selected.join(', ')}
						
          				>
							{this.state.columns.map(column => (
							<MenuItem key={column.name} value={column.display}>
								<Checkbox checked={column.display} />
								<ListItemText primary={column.label} />
							</MenuItem>
							))}
						</Select>
            </div>
        )
    }

}

export default withTheme()(withStyles(styles)(ColumnSelection));