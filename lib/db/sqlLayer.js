'use strict';

var sqlite3 = require('sqlite3').verbose();
const Logger = require('../logger');
const performanceMonitor = require('./performanceMonitor');

class SQLLayer {

	init(path, callback) {
		Logger.debug(`SQL: path=${path}`);
		if (!path)
			path = ':memory:';
		// 2020-09-10 JL: Made SQLLayer.path a property of the object so it can be accessible by app.js
		this.path = path;
		this.db = new sqlite3.Database(path);
		callback();
	}

	exec(sql, params, callback) {
		Logger.debug('SQL exec: ' + sql);
		var dt = performanceMonitor.currentTimeMS();

		var _cbk = function (err) {
			if (err) {
				Logger.error('SQL exec: ' + err + ' for ' + sql, err);
			} else {
				var s = (performanceMonitor.currentTimeMS() - dt).toFixed(2);
				Logger.debug('SQL: ' + sql + ' took ' + Math.floor(s) + ' milliseconds');
				performanceMonitor.addItem({query: sql, time: s});
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
		var dt = performanceMonitor.currentTimeMS();
		
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
					var s = (performanceMonitor.currentTimeMS() - dt).toFixed(2);
					Logger.debug('SQL: ' + sql + ' took ' + Math.floor(s) + ' milliseconds');
					performanceMonitor.addItem({query: sql, time: s});
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
