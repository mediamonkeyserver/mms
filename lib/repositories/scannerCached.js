/*jslint node: true, plusplus:true, nomen: true, esversion: 6 */
"use strict";

const assert = require('assert');
const Util = require('util');
const debug = require('debug')('upnpserver:repositories:ScannerCached');

const ScannerRepository = require('./scanner');
const logger = require('../logger');

class ScannerCachedRepository extends ScannerRepository {

  _scanDirectory(rootNode, parentInfos, files, callback) {

    if (!this.useCachedContent) {
      super._scanDirectory(rootNode, parentInfos, files, callback);
    } else {
      debug("_scanDirectory", "Scan directory: using cached content for: ", parentInfos.contentURL);

      assert(parentInfos, "Parent infos is null");
      assert(parentInfos.contentURL, "ContentURL of Parent infos is undefined");

      this.service.nodeRegistry.getFiles((err, _files) => {

        if (!err) {
          var parent_path = parentInfos.contentURL.path;
          for (var file of _files) {
            assert(file.path, "file.path is null" + file.title);
            if (file.path.startsWith(parent_path)) {
              var url = parentInfos.contentURL.contentProvider.newURL(file.path);
              files.push({
                contentURL: url,                
                attributes: file,
                mimeType: 'audio/mpeg',                
              });
            }
          }
          if (!_files.length) {
            // no files in DB yet, probably a clean DB, run the ordinary scan:
            this.useCachedContent = false;
            super._scanDirectory(rootNode, parentInfos, files, callback);
          }
        }
        callback(err);
      });
    }
  }

}
module.exports = ScannerCachedRepository;
