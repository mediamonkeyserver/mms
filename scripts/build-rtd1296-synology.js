// ts-check

const shell = require('shelljs');

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');
console.log(`Using ${npm}for building arm64.`); // eslint-disable-line no-console

shell.mkdir('-p', 'dist/rtd1296-synology');
shell.rm('-r', 'dist/rtd1296-synology/*');

// Prepare docker
shell.cd('scripts');
shell.exec('docker build -t mms/arm64v8 arm64v8.docker');

// Prepare node/pkg image
shell.cp('../../nodebinaries/node-arm64-rtd1296-synology', 'arm64v8.docker/node-arm64');

// Compile MMS package
shell.exec('docker run --rm -v %CD%/arm64v8.docker:/buildTarget mms/arm64v8 bash /buildTarget/buildMMS.sh');

shell.mv('arm64v8.docker/mms-arm64', '../dist/rtd1296-synology/mms');
shell.mv('arm64v8.docker/node-v57-linux-arm64/node_sqlite3.node', '../dist/rtd1296-synology/node_sqlite3.node');
// Clean up
shell.rm('arm64v8.docker/node-arm64');
shell.rm('-r', 'arm64v8.docker/node-v57-linux-arm64');

shell.cd('..');