/*jslint node: true, esversion: 6 */
"use strict";

const Logger = require('../logger');

const sorters = {
    path: (A, B) => {
        return (A.path ? A.path.localeCompare(B.path) : (B.path ? 1 : 0));
    },
    title: (A, B) => {
        var res = (A.title ? (B.title ? A.title.localeCompare(B.title) : -1) : (B.title ? 1 : 0));
        return res ? res : sorters.path(A, B);
    },
    album: (A, B) => {
        var res = (A.album ? (B.album ? A.album.localeCompare(B.album) : -1) : (B.album ? 1 : 0));
        return res ? res : sorters.title(A, B);
    },
    artist: (A, B) => {
        var a1 = A.artists ? A.artists[0] : undefined;
        var a2 = B.artists ? B.artists[0] : undefined;
        var res = (a1 ? (a2 ? a1.localeCompare(a2) : -1) : (a2 ? 1 : 0));
        return res ? res : sorters.title(A, B);
    },
    duration: (A, B) => {
        var res = (A.duration ? (B.duration ? A.duration - B.duration : -1) : (B.duration ? 1 : 0));
        return res ? res : sorters.path(A, B);
    }
}

const filterers = {
    'rating': {        
        '=': function (track) { return (track.rating > 20*this.value[0] - 10) && (track.rating < 20*this.value[0] + 10);},
        '>=': function (track) { return (track.rating >= 20*this.value[0]); },
    },
    'duration': {
        '..': function (track) { return (track.duration >= this.value[0] && track.duration <= this.value[1]); },
        '>=': function (track) { return (track.duration >= this.value[0]); },
    }
}

class TrackSorters {

    static getSortFunc(params) {
        return sorters[params];
    }

    static filterTracks(tracks, filters) {
        var res = tracks;
        for (var filter of filters) {
            Logger.debug('Applying filter: ' + JSON.stringify(filter));

            var field = filterers[filter.field];
            if (!field) {
                Logger.warn('Filter field ' + filter.field + ' not found.');
                continue;
            }

            var operator = filter.operator;
            if (operator === '..' && !filter.value[1]) {
                operator = '>='; // Interval with undefined upper bound
            }
            var operatorFn = field[operator];
            if (!operatorFn) {
                Logger.warn('Filter operator ' + operator + ' not found.');
                continue;
            }
            res = res.filter(operatorFn, filter);
        }
        return res;
    }
}

module.exports = TrackSorters;