// ts-check

const shell = require('shelljs');
const fs = require('fs');

const version = JSON.parse(fs.readFileSync('package.json')).version;

const npm = 'npm '; //(shell.which('yarn') ? 'yarn ' : 'npm ');
console.log(`Using ${npm}for building arm64.`); // eslint-disable-line no-console

shell.mkdir('-p', 'dist/armv8-synology');
shell.rm('-r', 'dist/armv8-synology/*');

// Prepare docker
shell.cd('scripts');
shell.exec('docker build -t mms/arm64v8 arm64v8.docker');

// Prepare node/pkg image
shell.cp('../binaries/node/node-arm64-rtd1296-synology', 'arm64v8.docker/node-arm64');

// Compile MMS package
shell.exec('docker run --rm -v %CD%/arm64v8.docker:/buildTarget mms/arm64v8 bash /buildTarget/buildMMS.sh');

shell.mv('arm64v8.docker/mms-arm64', '../dist/armv8-synology/mms');
// Clean up
shell.rm('arm64v8.docker/node-arm64');
shell.rm('-r', 'arm64v8.docker/node-v57-linux-arm64');

// Back to the mms root
shell.cd('..');

shell.cp('../binaries/linux-armv8/*', 'dist/armv8-synology');
shell.cp('../binaries/sqlite/4.2.0/napi-v6-linux-armv8/node_sqlite3.node', 'dist/armv8-synology'); // Use our custom pre-build node-sqlite3 for synology (normal armv8 doesn't work there)

// Package it
shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "cd /dist/armv8-synology; tar cfz ../MMS-armv8-${version}.tar.gz *"`);
