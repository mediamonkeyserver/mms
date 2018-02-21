/*jslint node: true, esversion: 6 */
"use strict";

const debug= require('debug')('upnpserver:util:PathNormalizer');
const logger = require('../logger');
var crypto = require('crypto');


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
        var hash = crypto.createHash('md5').update(path).digest("hex");
        return hash;
    }

}

module.exports = PathNormalizer;