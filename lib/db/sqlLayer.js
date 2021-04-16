//@ts-check
'use strict';

const Database = require('better-sqlite3');
const logger = require('../logger');

class SqlLayer {
	/**
	 * Initialize BetterSQL database
	 * @param {String} path Path of database file
	 */
	constructor(path) {
		if (!path) path = ':memory:';
		logger.info(`SQL: path=${path}`);
		
		this.path = path;
		this.db = new Database( path, { 
		//	verbose: console.log,
			verbose: logger.trace,
		});
		this.statements = {};
		
		this.db.pragma('journal_mode = WAL');
		//this.db.pragma('SQLITE_DEFAULT_WAL_AUTOCHECKPOINT = 100');
	}
	
	/**
	 * Prepare an sql statement
	 * @param {String} sql SQL statement to prepare
	 * @returns {Database.Statement} Prepared statement
	 */
	prepare(sql) {
		return this.db.prepare(sql);
	}
	
	/**
	 * Prepare a statement and save it to the object.
	 * @param {String} name Name (label) of statement, for getting later
	 * @param {String} sql SQL statement.
	 */
	addStatement(name, sql) {
		if (typeof name != 'string' || typeof sql != 'string') throw new TypeError('Name and SQL must be of type string');
		
		var thisStatement = this.prepare(sql);
		this.statements[name] = thisStatement;
	}
	
	/**
	 * Gets a prepared statement
	 * @param {String} name Name (label) of statement
	 * @returns {Database.Statement} Prepared statement
	 */
	getStatement(name) {
		if (typeof name != 'string') throw new TypeError('Name must be of type string');
		
		if (!this.statements[name]) throw new Error(`Statement ${name} does not exist`);
		
		return this.statements[name];
	}
}

module.exports = SqlLayer;