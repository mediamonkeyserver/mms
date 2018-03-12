/*jslint node: true, nomen: true, esversion: 6 */
'use strict';

const logger = require('./logger');
const Cacher = require('./cacher');
const TrackSorters = require('./util/trackSorters');


class MediaProvider extends Cacher {

	constructor(registry) {
		super();
		this.registry = registry;
	}

	_getFilePresentationEntry(file, filter_fields) {
		// this creates filtered UI file presentation entry:
		// 1) with specified fields (in filter_fields param like ['title','album'])
		// 2) filters unknown fields (empty string, empty array, null values)
		// 3) including valid streamURL and artworkURL

		var cache = this._getCacheFor('filteredFileEntry');
		if (cache.entries && cache.entries[file.db_id] && (cache.filter_fields == JSON.stringify(filter_fields)))
			return cache.entries[file.db_id];
		else {
			var entry = {};
			var node_id = this.registry._getNodeIdForFile(file);
			var contentPath = this.registry._service.contentPath;
			entry.streamURL = contentPath + node_id;
			if (file.albumArts && file.albumArts.length)
				entry.artworkURL = contentPath + node_id + '/' + file.albumArts[0].contentHandlerKey + '/0';

			for (var key in file) {
				var addField = (key != 'ratings' /* already as rating there */ && key != 'albumArts' /* already as artworkURL*/ );
				if (filter_fields)
					addField = (filter_fields.indexOf(key) >= 0);
				if (addField) {
					var at = file[key];
					if (at && at != '' && at != [] && at != -1 /* like unrated*/ )
						entry[key] = file[key];
				}
			}
			cache.entries = cache.entries || {};
			cache.entries[file.db_id] = entry;
			cache.filter_fields = JSON.stringify(filter_fields);
			return entry;
		}
	}

	_fileIsInFolders(f, folders) {
		if (!folders)
			return true;
		for (var fld of folders)
			if (f.path.startsWith(fld))
				return true;
	}

	getTracklist(params, callback) {

		params = params || {};
		var dt = Date.now();
		var _log_point = function (name, item_count) {
			var s = Math.floor((Date.now() - dt));
			logger.verbose(name + ' of ' + item_count + ' files took ' + s + ' milliseconds');
			dt = Date.now();
		};

		var filter_fields;
		if (params.filter && params.filter.fields)
			filter_fields = params.filter.fields;

		var _getFinalEntries = function (files) {
			var res = [];
			for (var i = 0; i < files.length; i++) {
				var f = files[i];
				if (!params.starting_index || (params.starting_index <= i))
					if (!params.requested_count || (params.starting_index + params.requested_count > i)) {
						var ff = this._getFilePresentationEntry(f, filter_fields);
						res.push(ff);
					}
			}
			_log_point('Final entries', res.length);
			callback(res);
		}.bind(this);

		var cache = this._getCacheFor('getTracklist');
		if (cache.params && JSON.stringify(cache.params) == JSON.stringify(params)) {
			_getFinalEntries(cache.prepared_list);
			return;
		}

		this.registry.getFiles((err, files) => {

			_log_point('Fetching', files.length);

			var res = [];
			for (var f of files) {
				if (this._fileIsInFolders(f, params.folders))
					res.push(f);
			}

			_log_point('Filtering by folders', res.length);

			if (params.filters) {
				res = TrackSorters.filterTracks(res, params.filters);
			}

			_log_point('Filtering', res.length);

			logger.debug('Sorting by ' + params.sort);
			var sortfn = TrackSorters.getSortFunc(params.sort || 'title');
			if (sortfn)
				res.sort(sortfn);
			else
				logger.warn('Undefined sorting');

			_log_point('Sorting', res.length);

			cache.prepared_list = res;
			cache.params = params;
			_getFinalEntries(res);
		});
	}


}

module.exports = MediaProvider;