/*jslint node: true, esversion: 6 */
'use strict';

const logger = require('../logger');
var crypto = require('crypto');
const fs = require('fs');
const Path = require('path');
const Mime = require('mime');


class PathNormalizer {

	static normalize(path) {
		return path.replace(/\\/g, '/'); // convert '\' -> '/'
	}

	static compare(path1, path2) {
		var p1 = this.normalize(path1);
		var p2 = this.normalize(path2);
		return (p1 == p2);
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

	static getFileFolder(path) {
		var res = this.normalize(path);
		var slash_pos = res.lastIndexOf('/');
		if (slash_pos > 0)
			return res.substr(0, slash_pos + 1);
		else
			return '';
	}

	static getFilename(path) {
		var res = this.normalize(path);
		var slash_pos = res.lastIndexOf('/');
		if (slash_pos > 0)
			return res.substr(slash_pos + 1);
		else
			return '';
	}

	static getCommonPathsPart(path1, path2) {
		var p1 = this.normalize(path1);
		var p2 = this.normalize(path2);
		var last_common_pos = 0;
		for (var i = 0; i < p1.length; i++) {
			if (p1[i] == p2[i])
				last_common_pos = i;
			else
				break;
		}
		if (last_common_pos > 0)
			return p1.substr(0, last_common_pos + 1);
		else
			return '';
	}

	static getMime(path) {
		var mt = Mime.getType(path);
		var ext = PathNormalizer.getFileExt(path);
		if (ext == 'mpc')
			mt = 'audio/x-musepack';
		else	
		if (ext == 'ape')
			mt = 'audio/ape';
		else	
		if (ext == 'thm')
			mt = 'image/thm';
		else	
		if (ext == 'm4a' || ext == 'm4b' || ext == 'm4p')	
			mt = 'audio/mp4a-latm';
		else	
		if (ext == 'm4u')
			mt = 'video/vnd.mpegurl';
		else	
		if (ext == 'm4v')
			mt = 'video/x-m4v';
						
		if (!mt)
			mt = '';
		return mt;
	}

	static createHash(path) {
		var hash = crypto.createHash('md5').update(path).digest('hex');
		return hash;
	}

	static makedir(osPath, callback) {
		logger.debug('makedir', 'path=', osPath);

		fs.access(osPath, fs.R_OK | fs.W_OK, (error) => {
			if (error) {
				if (error.code === 'ENOENT') {
					var parent = Path.dirname(osPath);
					this.makedir(parent, (error) => {
						if (error) {
							logger.debug('makedir', 'parent=', osPath, 'error=', error);
							return callback(error);
						}

						fs.mkdir(osPath, callback);
					});
				} else {
					logger.error('makedir', 'parent=', osPath, 'access problem=', error);
					return callback(error);
				}
			}
			callback();
		});
	}

}

module.exports = PathNormalizer;