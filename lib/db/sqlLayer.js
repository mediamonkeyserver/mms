"use strict";

var sqlite3 = require('@mmserver/sqlite3').verbose();

class SQLLayer {

    init(path, callback) {
        if (!path)
            path = ':memory:';
        this.db = new sqlite3.Database(path);
        callback();
    }

    exec(sql, callback) {
        this.db.run(sql, callback);
    }

    open(sql, row_fetch_callback, complete_callback) {
        this.db.each(sql, row_fetch_callback, complete_callback);
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
