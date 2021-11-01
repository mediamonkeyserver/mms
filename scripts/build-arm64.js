// ts-check
// This is for compilation on raspberry, not for crosscompiling

const shell = require('shelljs');
const fs = require('fs');

const version = JSON.parse(fs.readFileSync('package.json')).version;

shell.mkdir('-p', 'dist/linux-arm64');
shell.exec('pkg -t node16-linux-arm64 -o dist/linux-arm64/mms .');
shell.cp('node_modules/better-sqlite3/build/Release/*', 'dist/linux-arm64');
shell.cp('binaries/linux-arm64/*', 'dist/linux-arm64');
shell.cd('dist/linux-arm64');
shell.exec(`tar cfz ../MMS-arm64-${version}.tar.gz *`);
shell.cd('../..');