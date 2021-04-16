/*jslint node: true, plusplus:true, nomen: true, esversion: 6 */
'use strict';

const assert = require('assert');
const debug = require('debug')('upnpserver:repositories:ScannerCached');

const ScannerRepository = require('./scanner');
//const logger = require('../logger');

class ScannerCachedRepository extends ScannerRepository {

	_scanDirectory(rootNode, parentInfos, files, callback) {

		if (!this.useCachedContent) {
			super._scanDirectory(rootNode, parentInfos, files, callback);
		} else {
			debug('_scanDirectory', 'Scan directory: using cached content for: ', parentInfos.contentURL);

			assert(parentInfos, 'Parent infos is null');
			assert(parentInfos.contentURL, 'ContentURL of Parent infos is undefined');

			this.service.nodeRegistry.getFiles((err, _files) => {

				if (!err) {
					var parent_path = parentInfos.contentURL.path;
					for (var file of _files) {
						assert(file.path, 'file.path is null' + file.title);
						if (file.path.startsWith(parent_path)) {
							var url = parentInfos.contentURL.contentProvider.newURL(file.path);
							files.push({
								contentURL: url,                
								attributes: file,
								mimeType: file.mimeType,
							});
						}
					}
					if (!files.length) {
						debug('_scanDirectory: No cached files found.');
						// no files in DB yet?, probably a clean DB, run the ordinary scan:
						// This also occurs when there are no files in the first (default) collection 
						//	(C:/users/(name)/music and C:/Users/(name)/Videos)
						this.useCachedContent = false;
						super._scanDirectory(rootNode, parentInfos, files, callback);
					} else
						callback();
				} else
					callback(err);
			});
		}
	}

}
module.exports = ScannerCachedRepository;

