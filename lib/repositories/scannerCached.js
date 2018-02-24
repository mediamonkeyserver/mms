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

      this.service.nodeRegistry.getFiles((err, paths) => {

        if (!err) {
          var parent_path = parentInfos.contentURL.path;
          for (var path of paths) {
            if (path.startsWith(parent_path)) {
              var url = parentInfos.contentURL.contentProvider.newURL(path);
              var infos = {
                contentURL: url,
                // stats : {mtime: 0},
                mimeType: 'audio/mpeg',
                //parentInfos : parentInfos
              };
              files.push(infos);
            }
          }
        }
        callback(err);
      });
    }
  }

}
module.exports = ScannerCachedRepository;
