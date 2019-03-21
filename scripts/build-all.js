// ts-check

const shell = require('shelljs');
const fs = require('fs');

const winrar = '"c:/Program Files/WinRAR/WinRAR"';

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');
console.log(`Using ${npm}for building all platforms.`); // eslint-disable-line no-console

const version = JSON.parse(fs.readFileSync('package.json')).version;

// *** Win 64 bit ***
shell.mkdir('-p', 'dist/win64/icon');
shell.exec(npm + 'run pkg -t node8-win-x64 -o dist/win64/mms.exe .');
shell.cp('../sqlitebinaries/node-v57-win32-x64/*', 'dist/win64'); // Currently stored out of this git repository, change it later.
shell.cp('../ffmpegbinaries/win64/*', 'dist/win64'); // Currently stored out of this git repository, change it later.
shell.cp('icon/mm.ico', 'dist/win64/icon');

// So that mms.exe works with native tray icon module
// More info at https://www.ironsrc.com/blog/rename-import-dll/ and https://github.com/parro-it/libui-node/issues/120#issuecomment-425627593
const bin = 'node_modules\\windows-trayicon\\build\\Release\\nbind.node';
const binBack = bin+'.back';
shell.cp(bin, binBack);
shell.exec(`scripts\\rid.exe ${bin} node.exe mms.exe`);
shell.cp(bin, 'dist/win64');
shell.cp(binBack, bin);

shell.cd('dist/win64');
shell.exec(`${winrar} a ../MMS-win64-${version}.rar * -s -md64 -ma`);
shell.cd('../..');

// *** Win 32 bit ***
shell.mkdir('-p', 'dist/win32');
shell.exec(npm + 'run pkg -t node8-win-x86 -o dist/win32/mms.exe .');
shell.cp('../sqlitebinaries/node-v57-win32-ia32/*', 'dist/win32');
shell.cp('../ffmpegbinaries/win32/*', 'dist/win32');
shell.cd('dist/win32');
shell.exec(`${winrar} a ../MMS-win32-${version}.rar * -s -md64 -ma`);
shell.cd('../..');

// *** Mac ***
shell.mkdir('-p', 'dist/mac64');
shell.exec(npm + 'run pkg -t node8-macos-x64 -o dist/mac64/mms .');
shell.cp('../sqlitebinaries/node-v57-darwin-x64/*', 'dist/mac64');
shell.cp('../ffmpegbinaries/macOS/*', 'dist/mac64');
shell.cd('dist/mac64');
shell.exec(`${winrar} a ../MMS-mac64-${version}.rar * -s -md64 -ma`);
shell.cd('../..');

// *** Linux ***
shell.mkdir('-p', 'dist/linux64');
shell.exec(npm + 'run pkg -t node8-linux-x64 -o dist/linux64/mms .');
shell.cp('../sqlitebinaries/node-v57-linux-x64/*', 'dist/linux64');
shell.cp('../ffmpegbinaries/linux64/*', 'dist/linux64');
shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "cd /dist/linux64; tar cfz ../MMS-linux64-${version}.tar.gz *"`);
shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "apt-get update; apt-get install xz-utils; cd /dist/linux64; tar cfJ ../MMS-linux64-${version}.tar.xz *"`);

// *** QNAP x86 ***
const nodelinux64 = '~/.pkg-cache/v2.5/fetched-v8.11.3-linux-x64';
shell.mv(nodelinux64, nodelinux64+'.back');
shell.cp('../nodebinaries/node-linux64-QNAPx86', nodelinux64);
shell.mkdir('-p', 'dist/QNAPx86');
shell.exec(npm + 'run pkg -t node8-linux-x64 -o dist/QNAPx86/mms .');
shell.cp('../sqlitebinaries/node-v57-linux-x64-QNAPx86/*', 'dist/QNAPx86');
shell.cp('../ffmpegbinaries/linux64/*', 'dist/QNAPx86');
shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "cd /dist/QNAPx86; tar cfz ../MMS-QNAPx86-${version}.tar.gz *"`);
shell.rm(nodelinux64);
shell.mv(nodelinux64+'.back', nodelinux64);


// We don't have sqlite for linux 32bit build yet.
// shell.mkdir('-p', 'dist/linux32');
// shell.exec(npm + 'run pkg -t node8-linux-x86 -o dist/linux32/mms .');
// shell.cp('../sqlitebinaries/node-v57-linux-x86/*', 'dist/linux32');
// shell.cp('../ffmpegbinaries/linux32/*', 'dist/linux32');


// ARM building is in build-arm.js, since it can't be currently crosscompiled, has to be executed on another machine