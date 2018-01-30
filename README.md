[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] 

# mediamonkey server
![upnpserver icon](icon/icon_128.png)

MediaMonkey Server is a cross-platform media server written in Node.js.

The code is based on upnpserver package.

## Installation

    $ npm install mediamonkeyserver

## API Usage

```javascript
var Server = require("mediamonkeyserver");

var server = new Server({ /* configuration, see below */ }, [
  '/home/disk1',
  { path: '/home/myDisk' },
  { path: '/media/movies', mountPoint: '/My movies'},
  { path: '/media/albums', mountPoint: '/Personnal/My albums', type: 'music' }
]);

server.start();
```

##Configuration
Server constructor accepts an optional configuration object. At the moment, the following is supported:

- `log` _Boolean_ Enable/disable logging. Default: false.
- `logLevel` _String_ Specifies log level to print. Possible values: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`. Defaults to `ERROR`.
- `name` _String_ Name of server. Default 'Node Server'
- `uuid` _String_ UUID of server. (If not specified, a UUID v4 will be generated)
- `hostname` _String_ Hostname to bind the server. Default: 0.0.0.0
- `httpPort` _Number_ Http port. Default: 10293
- `dlnaSupport` _Boolean_ Enable/disable dlna support. Default: true
- `strict` _Boolean_ Use only official UPnP attributes. Default: false
- `lang` _String_ Specify the language (en, fr) for virtual folder names. Default: en
- `ssdpLog` _Boolean_ Enable log of ssdp layer. Default: false
- `ssdpLogLevel` _String_ Log level of ssdp layer.

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
