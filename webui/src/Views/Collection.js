import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import "react-virtualized/styles.css";
import { AutoSizer } from "react-virtualized";
import { Table, Column } from "react-virtualized";
import Avatar from "@material-ui/core/Avatar";

import Input from "@material-ui/core/Input";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import ListItemText from "@material-ui/core/ListItemText";
import Checkbox from "@material-ui/core/Checkbox";
import Select from "@material-ui/core/Select";

import Server from "server";
import Playback from "playback";
import {
  subscribeCollectionSort,
  subscribeCollectionChangeFilters,
  getCollectionFilters
} from "actions";

const styles = theme => ({
  root: {
    position: "absolute", // For correct positioning of the virtual table
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden"
  },
  table: {
    boxSizing: "border-box",
    border: `0px solid ${theme.palette.divider}`,
    fontSize: theme.typography.pxToRem(14),
    color: theme.palette.text.primary
  },
  grid: {
    outline: 0
  },
  row: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    outline: 0,
    cursor: "pointer"
  },
  artwork: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center center",
    maxWidth: "100%",
    maxHeight: "100%"
  },
  cellArtwork: {
    padding: "2px 0px 2px 0px",
    height: 48 // Not sure why this is needed explicitly here, otherwise image is offset few pixels up
  },
  cell: {
    textAlign: "left",
    padding: "4px 2px 4px 4px"
  },
  cellRight: {
    textAlign: "right",
    padding: "4px 10px 4px 4px"
  },
  cellHeader: {
    fontSize: theme.typography.pxToRem(12),
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.palette.text.secondary
  },
  cellInLastColumn: {
    paddingRight: theme.spacing.unit * 3
  },
  cellInLastRow: {
    borderBottom: "none"
  },
  footer: {
    borderTop: `1px solid ${theme.palette.text.divider}`
  },
  albumAvatar: {
    margin: 4
  }
});

class Collection extends Component {
  state = {
    tracks: [],
    headerHeight: 40,
    displayedColumns: [],
    columns: {
      title: {
        name: "title",
        label: "Title",
        display: true
      },
      artist: {
        name: "artist",
        label: "Artist",
        display: true
      },
      album: {
        name: "album",
        label: "Album",
        display: true
      },
      duration: {
        name: "duration",
        label: "Duration",
        display: true
      },
      genre: {
        name: "genre",
        label: "Genre",
        display: true
      },
      year: {
        name: "year",
        label: "Year",
        display: true
      },
      bpm: {
        name: "bpm",
        label: "BPM",
        display: true
      },
      path: {
        name: "path",
        label: "Path",
        display: true
      },
      size: {
        name: "size",
        label: "Size",
        display: true
      }
    }
  };
  collectionID = null;
  sort = null;
  filters = [];

  updateContent = () => {
    this.setState({ tracks: [] });
    if (this.props.search) {
      Server.search(this.props.searchTerm, this.sort, this.filters).then(
        tracklist => this.setState({ tracks: tracklist })
      );
    } else {
      Server.getTracklist(this.collectionID, this.sort, this.filters).then(
        tracklist => this.setState({ tracks: tracklist })
      );
    }
  };

  componentDidMount = () => {
    this.collectionID = this.props.collectionID;
    this.filters = getCollectionFilters();
    this.updateContent();
    subscribeCollectionSort(this.handleChangeSort);
    subscribeCollectionChangeFilters(this.handleChangeFilters);
  };

  componentDidUpdate = prevProps => {
    if (
      this.props.collectionID !== prevProps.collectionID ||
      this.props.search !== prevProps.search ||
      this.props.searchTerm !== prevProps.searchTerm
    ) {
      this.collectionID = this.props.collectionID;
      this.updateContent();
    }
  };

  handleChangeSort = data => {
    this.sort = data.newSort;
    this.updateContent();
  };

  handleChangeFilters = data => {
    this.filters = data.filters;
    this.updateContent();
  };

  getArtistCellData = ({ rowData }) => {
    if (rowData.artists) return rowData.artists.join("; ");
    else return "";
  };

  getFileSizeCellData = ({ rowData }) => {
    let fileSize = rowData.size;
    if (fileSize > 1024 && fileSize < 1048576) {
      return (fileSize / 1024).toFixed(2) + " KB";
    } else if (fileSize > 1048576) {
      return (fileSize / 1048576).toFixed(2) + " MB";
    }
  };

  getDurationCellData = ({ rowData }) => {
    var duration = rowData.duration;
    if (duration >= 0) {
      var min = String(Math.trunc(duration / 60) + ":");
      var sec = String(Math.trunc(duration % 60));
      while (sec.length < 2) sec = "0" + sec;
      return min + sec;
    } else return "";
  };

  renderArtwork = ({ rowData }) => {
    if (rowData.artworkURL)
      return (
        <img
          src={rowData.artworkURL}
          alt="artwork"
          className={this.props.classes.artwork}
        />
      );
    else {
      var short = (rowData.album || "").slice(0, 2);
      return (
        <Avatar className={this.props.classes.albumAvatar}>{short}</Avatar>
      );
    }
  };

  renderColumnSelectionHeader = () => {
    return (
      <div>
        <FormControl>
          <Select
            value={this.state.displayedColumns}
            multiple
            onChange={this.onColumnSelectionChange}
            input={<Input id="select-multiple-checkbox" />}
            renderValue={selected => selected.join(", ")}
          >
            {Object.keys(this.state.columns).map(key => (
              <MenuItem
                key={this.state.columns[key].name}
                value={this.state.columns[key].display}
              >
                <Checkbox checked={this.state.columns[key].display} />
                <ListItemText primary={this.state.columns[key].label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    );
  };

  onColumnSelectionChange = (e, child) => {
    let newColumns = this.state.columns;
    newColumns[child.key].display = !newColumns[child.key].display;
    this.setState({
      columns: newColumns
    });
  };

  handleTrackClick = ({ rowData, e }) => {
    Playback.playMediaItem(rowData);
  };

  render() {
    const { classes } = this.props;
    const { headerHeight } = this.state;

    return (
      <div className={classes.root}>
        <AutoSizer>
          {({ height, width }) => (
            <Table
              width={width}
              height={height}
              className={classes.table}
              gridClassName={classes.grid}
              disableHeader={false}
              headerHeight={headerHeight}
              rowHeight={48}
              rowCount={this.state.tracks.length}
              rowGetter={({ index }) => this.state.tracks[index]}
              rowClassName={classes.row}
              onRowClick={this.handleTrackClick}
            >
              <Column
                label="Artwork"
                dataKey="artworkURL"
                className={classes.cellArtwork}
                width={48}
                flexGrow={0}
                flexShrink={0}
                cellRenderer={this.renderArtwork}
              />
              {this.state.columns.title.display ? (
                <Column
                  label="Track Title"
                  dataKey="title"
                  headerHeight={headerHeight}
                  className={classes.cell}
                  width={250}
                  flexGrow={10}
                />
              ) : null}
              {this.state.columns.artist.display ? (
                <Column
                  label="Artist"
                  dataKey="artists"
                  width={250}
                  flexGrow={10}
                  className={classes.cell}
                  cellDataGetter={this.getArtistCellData}
                />
              ) : null}
              {this.state.columns.album.display ? (
                <Column
                  label="Album"
                  dataKey="album"
                  width={250}
                  flexGrow={10}
                  className={classes.cell}
                />
              ) : null}
              {this.state.columns.genre.display ? (
                <Column
                  label="Genre"
                  dataKey="genres"
                  width={100}
                  flexGrow={10}
                  className={classes.cell}
                />
              ) : null}
              {this.state.columns.year.display ? (
                <Column
                  label="Year"
                  dataKey="year"
                  width={15}
                  flexGrow={10}
                  className={classes.cell}
                />
              ) : null}
              {this.state.columns.duration.display ? (
                <Column
                  label="Duration"
                  dataKey="duration"
                  width={30}
                  flexGrow={20}
                  flexShrink={0}
                  className={classes.cellRight}
                  cellDataGetter={this.getDurationCellData}
                />
              ) : null}
              {this.state.columns.bpm.display ? (
                <Column
                  label="BPM"
                  dataKey="bpm"
                  width={10}
                  flexGrow={10}
                  flexShrink={0}
                  className={classes.cell}
                />
              ) : null}
              {this.state.columns.size.display ? (
                <Column
                  label="File Size"
                  dataKey="size"
                  width={80}
                  flexGrow={10}
                  flexShrink={0}
                  className={classes.cell}
                  cellDataGetter={this.getFileSizeCellData}
                />
              ) : null}
              {this.state.columns.path.display ? (
                <Column
                  label="Path"
                  dataKey="path"
                  width={200}
                  flexGrow={40}
                  flexShrink={0}
                  className={classes.cell}
                />
              ) : null}

              {/*Column Selection Empty Column */}
              <Column
                headerRenderer={this.renderColumnSelectionHeader}
                width={15}
                flexGrow={0}
                flexShrink={0}
                dataKey=""
                className={classes.cellInLastColumn}
              />
            </Table>
          )}
        </AutoSizer>
      </div>
    );
  }

}

Collection.propTypes = {
  classes: PropTypes.object.isRequired,
  collectionID: PropTypes.string,
  search: PropTypes.bool,
  searchTerm: PropTypes.string
};

export default withStyles(styles)(Collection);
