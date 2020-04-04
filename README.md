[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] 

# mediamonkey server
![upnpserver icon](icon/icon_120.png)

MediaMonkey Server is a cross-platform media server written in Node.js.

The code is based on upnpserver package.

## Installation

    $ git clone https://github.com/mediamonkeyserver/mms.git

or just download and unpack https://github.com/mediamonkeyserver/mms/archive/master.zip

Run installation script then

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
