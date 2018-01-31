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

}

module.exports = SQLLayer;
