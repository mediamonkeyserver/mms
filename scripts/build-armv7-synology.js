// ts-check

const shell = require('shelljs');
const fs = require('fs');

const version = JSON.parse(fs.readFileSync('package.json')).version;

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');
console.log(`Using ${npm}for building armv7 for synology.`); // eslint-disable-line no-console

shell.mkdir('-p', 'dist/armv7-synology');
shell.rm('-r', 'dist/armv7-synology/*');

// Prepare docker
shell.cd('scripts');
shell.exec('docker build -t mms/arm32v7 arm32v7.docker');

// Compile MMS package
shell.exec('docker run --rm -v %CD%/arm32v7.docker:/buildTarget mms/arm32v7 bash /buildTarget/buildMMS.sh');

shell.mv('arm32v7.docker/mms-arm', '../dist/armv7-synology/mms');
// Clean up
shell.rm('-r', 'arm32v7.docker/node-v57-linux-arm');

shell.cd('..'); // Back to mms root
shell.cp('../ffmpegbinaries/linux-armv7/*', 'dist/armv7-synology');
shell.cp('../sqlitebinaries/node-v57-linux-arm-synology/node_sqlite3.node', 'dist/armv7-synology'); // Use our custom pre-build node-sqlite3 for synology (normal armv7 doesn't work there)

// Package it
shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "cd /dist/armv7-synology; tar cfz ../MMS-armv7-${version}.tar.gz *"`);
// shell.exec(`docker run --rm -v %CD%/../dist/:/dist ubuntu /bin/bash -c "apt-get update; apt-get install xz-utils; cd /dist/armv7-synology; tar cfJ ../MMS-armv7-${version}.tar.xz *"');