// ts-check

const shell = require('shelljs');

shell.cd('scripts');

// Prepare a generic Synology crosscompiler
shell.exec('docker build -t mms/crosscompiler ./crossSynology.docker');

// Run
shell.exec('docker run --rm -v %CD%/crossSynology.docker:/nodepkg mms/crosscompiler bash /nodepkg/build-rtd1296-nodepkg.sh');
shell.exec('docker run --rm -v %CD%/crossSynology.docker:/local mms/crosscompiler bash /local/build-rtd1296-nodesqlite3.sh');

shell.mv('crossSynology.docker/node-arm64-rtd1296-synology', '../binaries/node/node-arm64-rtd1296-synology');
shell.mkdir('-p', '../binaries/sqlite/4.2.0/napi-v3-linux-armv8/');
shell.mv('crossSynology.docker/binding/napi-v3-linux-arm/*', '../binaries/sqlite/4.2.0/napi-v3-linux-armv8/');