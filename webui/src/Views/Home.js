import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import Button from 'material-ui/Button';
import Grid from 'material-ui/Grid';
import Card, { CardActions, CardContent, CardHeader } from 'material-ui/Card';
import Typography from 'material-ui/Typography';

import PubSub from 'pubsub-js';

const styles = {
  card: {
  },
  cardActions: {
    justifyContent: 'flex-end',
  }
};

class Home extends Component {
  handleNewCollection = () => {
    PubSub.publish('ADD_COLLECTION');
  }

  render() {
    const { classes } = this.props;

    return (
      <div>
        <Grid container justify='center'>
          <Grid item>
            <Card className={classes.card}>
              <CardHeader title='New Server' />
              <CardContent>
                <Typography component="p">
                  There are no collections. Do you want to create one?
                </Typography>
              </CardContent>
              <CardActions className={classes.cardActions}>
                <Button onClick={this.handleNewCollection} color="primary" autoFocus>Create Collection</Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default withStyles(styles)(Home);