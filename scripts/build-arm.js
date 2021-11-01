// ts-check
// This is for compilation on raspberry, not for crosscompiling

// Step to prepare the environment:
//# install nvm
//curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
//export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
//[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

//#install mms
//nvm install 10.23.1
//git clone https://github.com/mediamonkeyserver/mms.git
//cd mms
//npm install

//#prepare node for pkg
//npm install -g pkg
//git clone https://github.com/nodejs/node.git
//cd /node
//git checkout v10.21.0
//wget https://raw.githubusercontent.com/zeit/pkg-fetch/master/patches/node.v10.21.0.cpp.patch
//git apply node.v10.21.0.cpp.patch
//./configure
//export LDFLAGS=-latomic && make -j4
//mkdir -p ~/.pkg-cache/v2.6
//cp out/Release/node ~/.pkg-cache/v2.6/fetched-v10.21.0-linux-armv7

const shell = require('shelljs');
const fs = require('fs');

const version = JSON.parse(fs.readFileSync('package.json')).version;

shell.mkdir('-p', 'dist/linux-armv7');
shell.exec('pkg -t node16-linux-armv7 -o dist/linux-armv7/mms .');
shell.cp('node_modules/sqlite3/lib/binding/node-v64-linux-arm/*', 'dist/linux-armv7');
shell.cp('binaries/linux-armv7/*', 'dist/linux-armv7');
shell.cd('dist/linux-armv7');
shell.exec(`tar cfz ../MMS-armv7-${version}.tar.gz *`);
shell.cd('../..');