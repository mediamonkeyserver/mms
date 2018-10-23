'use strict';

var sqlite3 = require('sqlite3').verbose();
const Logger = require('../logger');

class SQLLayer {

	init(path, callback) {
		if (!path)
			path = ':memory:';
		this.db = new sqlite3.Database(path);
		callback();
	}

	exec(sql, params, callback) {
		Logger.debug('SQL exec: ' + sql);
		var dt = Date.now();

		var _cbk = function (err) {
			if (err) {
				Logger.error('SQL exec: ' + err + ' for ' + sql, err);
			} else {
				var s = Math.floor((Date.now() - dt));
				Logger.debug('SQL: ' + sql + ' took ' + s + ' milliseconds');
			}
			var info = this; // includes 'changes' and 'lastID' info after INSERT
			if (callback)
				callback(err, info);
		};

		if (!callback && params instanceof Function) {
			callback = params;
			this.db.run(sql, _cbk);
		} else
			this.db.run(sql, params, _cbk);
	}

	open(sql, row_fetch_callback, complete_callback) {
		Logger.debug('SQL open: ' + sql);
		var dt = Date.now();
		this.db.each(sql,
			(err, row) => {
				var _err;
				if (err) {
					_err = err + ' for ' +sql;
					Logger.error('SQL open: ', err, sql);
				}
				row_fetch_callback(_err, row);
			},
			(err) => {
				var _err;
				if (err) {
					Logger.error('SQL open: ', err, sql);
					_err = err + ' for ' +sql;
				} else {
					var s = Math.floor((Date.now() - dt));
					Logger.debug('SQL: ' + sql + ' took ' + s + ' milliseconds');
				}
				complete_callback(_err);
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
		};
		_runQuery(0);
	}

}

module.exports = SQLLayer;
