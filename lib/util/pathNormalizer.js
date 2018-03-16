/*jslint node: true, esversion: 6 */
'use strict';

const logger = require('../logger');
var crypto = require('crypto');
const fs = require('fs');
const Path = require('path');


class PathNormalizer {

	static normalize(path) {
		return path.replace(/\\/g, '/'); // convert '\' -> '/'
	}

	static removeLastSlash(str) {
		var endChar = str.substr(-1);
		if (endChar === '/' || endChar === '\\') {
			return str.substr(0, str.length - 1);
		}
		return str;
	}

	static removeFileExt(path) {
		var dot_pos = path.lastIndexOf('.');
		var back_pos = path.lastIndexOf('\\');
		var slash_pos = path.lastIndexOf('/');
		if ((dot_pos > 0) && (dot_pos > back_pos) && (dot_pos > slash_pos))
			return path.substr(0, dot_pos);
		else
			return path;
	}

	static getFileExt(path) {
		var dot_pos = path.lastIndexOf('.');
		var back_pos = path.lastIndexOf('\\');
		var slash_pos = path.lastIndexOf('/');
		if ((dot_pos > 0) && (dot_pos > back_pos) && (dot_pos > slash_pos))
			return path.substr(dot_pos + 1);
		else
			return '';
	}

	static createHash(path) {
		var hash = crypto.createHash('md5').update(path).digest('hex');
		return hash;
	}

	static makedir(osPath, callback) {
		logger.debug('makedir', 'path=', osPath);
        
		fs.access(osPath, fs.R_OK | fs.W_OK, (error) => {  
			if (error) {            
				if (error.code==='ENOENT') {
					var parent=Path.dirname(osPath);    
					this.makedir(parent, (error) => {
						if (error) {
							logger.debug('makedir', 'parent=',osPath,'error=',error);
							return callback(error);
						}
                
						fs.mkdir(osPath, callback);
					});					
				} else {
					logger.error('makedir', 'parent=', osPath, 'access problem=',error);
					return callback(error);
				}            				
			}          
			callback();
		});
	}

}

module.exports = PathNormalizer;