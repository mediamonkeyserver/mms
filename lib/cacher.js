/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

class Cacher {

	constructor() {
		this._cache = {};
	}

	_getCacheFor(key) {
		if (!this._cache[key])
			this._cache[key] = {};
		return this._cache[key];
	}

	_cleanCacheFor(keys) {
		for (var key of keys)
			this._cache[key] = {};
	}
}

module.exports = Cacher;