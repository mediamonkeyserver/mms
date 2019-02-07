import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import Typography from "@material-ui/core/Typography";

import Server from "server";

const styles = {
  card: {}
};

class Collection extends Component {
  state = {};



  componentWillMount() {
    this.getPlaylists();
  }

  getPlaylists = async () => {
    let playlists = [];
    Server.getPlaylists().then(playlists => this.setState({ playlists }));
  }

  render() {
    const { classes } = this.props;

    return (
      <Grid container justify="center">
        <Grid item>
          <Card className={classes.card}>
            <CardHeader title="Not implemented" />
            <CardContent>

            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }
}

Collection.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Collection);
