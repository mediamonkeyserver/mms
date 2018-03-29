[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] 

# mediamonkey server
![upnpserver icon](icon/icon_128.png)

MediaMonkey Server is a cross-platform media server written in Node.js.

The code is based on upnpserver package.

## Installation

    $ npm install mediamonkeyserver

* 'uws' package needs binary modules, for platforms where we can't compile (some NAS devices) we might want to replace it by 'ws' in engine.io

## Testing
For testing purposes used *mocha* framework. To run tests, you should do this:
```bash
make test
```

## Author

MediaMonkey team
Olivier Oeuillot (Original author of the upnpserver package)

## Contributors

https://github.com/mediamonkeyserver/mms/graphs/contributors

[npm-url]: https://npmjs.org/package/upnpserver
[npm-image]: https://badge.fury.io/js/upnpserver.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/upnpserver.svg

[travis-url]: https://travis-ci.org/oeuillot/upnpserver
[travis-image]: https://api.travis-ci.org/oeuillot/upnpserver.svg?branch=master
