"use strict";

var sqlite3 = require('@mmserver/sqlite3').verbose();
const Logger = require('../logger');

class SQLLayer {

    init(path, callback) {
        if (!path)
            path = ':memory:';
        this.db = new sqlite3.Database(path);
        callback();
    }

    exec(sql, callback) {
        Logger.verbose('SQL exec: ' + sql);
        var dt = Date.now();
        this.db.run(sql, (err) => {
            if (err) {
                Logger.error('SQL exec: ' + err, err);
            } else {
                var s = Math.floor((Date.now() - dt));
                Logger.verbose('SQL: ' + sql + ' took ' + s + ' milliseconds');
            }
            callback(err);
        });
    }

    open(sql, row_fetch_callback, complete_callback) {
        Logger.verbose('SQL open: ' + sql);
        var dt = Date.now();
        this.db.each(sql, row_fetch_callback, (err) => {
            if (err)
                Logger.error('SQL open: ' + err, err);
            else {
                var s = Math.floor((Date.now() - dt));
                Logger.verbose('SQL: ' + sql + ' took ' + s + ' milliseconds');
            }
            complete_callback(err);
        });
    }

    prepare(sql) {
        return this.db.prepare(sql);
    }

    close(sql, callback) {
        this.db.close();
        callback();
    }

    execQueriesSequence(queries, callback) {
        var _this = this;
        var _runQuery = function (idx) {
            if (idx >= queries.length)
                callback();
            else { 
                var q = queries[idx];
                _this.exec(q, (err) => {
                    if (err)
                        callback(err);
                    else
                        _runQuery(idx + 1);
                });
            }
        }
        _runQuery(0);
    }

}

module.exports = SQLLayer;
