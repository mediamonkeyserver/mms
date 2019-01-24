import React, { Component } from 'react';
//import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@material-ui/core/styles';


import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import Select from '@material-ui/core/Select';

const styles = theme => ({
    width: '50px'
});

class ColumnSelection extends Component {

    state = {
        displayedColumns: []
    }

    render() {
        const { classes } = this.props;

        return (
            <div>
                <FormControl className={classes.width}>
                    <InputLabel htmlFor="select-multiple-checkbox">Fields</InputLabel>
                    <Select
                        value={this.state.displayedColumns}
                        multiple
                        onChange={this.props.onChange}
                        input={<Input id="select-multiple-checkbox" />}
                        renderValue={selected => selected.join(', ')}
                    >
                        {this.props.columns.map(column => (
                            <MenuItem key={column.name} value={column.display}>
                                <Checkbox checked={column.display} />
                                <ListItemText primary={column.label} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

            </div >
        )
    }

}

export default withTheme()(withStyles(styles)(ColumnSelection));