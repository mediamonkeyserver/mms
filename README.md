[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] 

# MediaMonkey Server
![upnpserver icon](icon/icon_120.png)

MediaMonkey Server is a cross-platform media server written in Node.js.

It is built upon a fork of [upnpserver](https://www.npmjs.com/package/upnpserver)

## Binaries

You can find pre-compiled binaries for various platforms at https://www.mediamonkey.com/forum/viewtopic.php?f=31&t=90809. Use these if you want to avoid Node.js installation and other steps below.

## Requirements
- Node.js >10.x and Node Package Manager (npm)
- Python (Version 3.8 is known to work)
    - If you do not add Python to system path, then run: `npm config set python /path/to/executable/python`
- Node-gyp build tools (https://github.com/nodejs/node-gyp)
    - On an elevated command prompt run: `npm install -global windows-build-tools`
    - Then, run `npm config set msvs_version 2017`

## Installation

    $ git clone https://github.com/mediamonkeyserver/mms.git

or just download and unpack https://github.com/mediamonkeyserver/mms/archive/master.zip

Run installation script

    $ npm install

## Running
    $ npm start
    Server will start on port 10222

## Running as a Service with Systemd
Below is a systemd script that can be created and placed in /etc/systemd/system/mediamonkeyserver.service so that the server can be run on system startup.  Make sure you change your paths/variables for your system. 

    [Unit]
    Description=MediaMonkeyServer

    [Service]
    #Path for Node and your individual server location may be different, change paths appropriately
    ExecStart=/usr/bin/node /home/username/programs/mms/server.js

    # Required on some systems
    #WorkingDirectory=/opt/nodeserver
    Restart=always
    # Restart service after 10 seconds if node service crashes
    RestartSec=10
    # Output to syslog
    StandardOutput=syslog
    StandardError=syslog
    SyslogIdentifier=mm-server

    #Change user and group names as necessary
    User=username
    Group=groupname

    [Install]
    WantedBy=multi-user.target


Finish the setup with the following steps: 

* Enable the service
```bash
systemctl enable mediamonkeyserver.service
```

* Verify its status
```bash
systemctl status mediamonkeyserver.service
```

If all went well your service should be running.

* Configuration changes

If you make any changes to this file, you'll need to reload the daemon with this command:
```bash
systemctl daemon-reload
```

and then restart the service with: 
```bash
systemctl restart mediamonkeyserver.service
```


## Testing
For testing purposes used *mocha* framework. To run tests, you should do this:
```bash
make test
```

## Troubleshooting
There are some known issues.
1. `"Error: Could not locate the bindings file."`: If you get an error saying that a module could not locate the bindings file, chances are there was an issue with node-gyp when the module was being installed. This has occurred a few times to the `windows-trayicon` module. If you have node-gyp and all its build dependencies installed, try running `npm install windows-trayicon` again. It will rebuild and it should work.

## Author

- MediaMonkey team

- [Olivier Oeuillot](https://github.com/oeuillot) (Original author of the upnpserver package)

## Contributors

https://github.com/mediamonkeyserver/mms/graphs/contributors

[npm-url]: https://npmjs.org/package/upnpserver
[npm-image]: https://badge.fury.io/js/upnpserver.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/upnpserver.svg

[travis-url]: https://travis-ci.org/oeuillot/upnpserver
[travis-image]: https://api.travis-ci.org/oeuillot/upnpserver.svg?branch=master
