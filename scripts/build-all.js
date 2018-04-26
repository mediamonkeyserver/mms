// ts-check

const shell = require('shelljs');

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');
console.log(`Using ${npm}for building all platforms.`); // eslint-disable-line no-console

shell.mkdir('-p', 'dist/win64');
shell.exec(npm + 'run pkg -t node8-win-x64 -o dist/win64/mms.exe .');
shell.cp('../sqlitebinaries/node-v57-win32-x64/*', 'dist/win64'); // Currently stored out of this git repository, change it later.
shell.cp('../ffmpegbinaries/win64/*', 'dist/win64'); // Currently stored out of this git repository, change it later.

shell.mkdir('-p', 'dist/win32');
shell.exec(npm + 'run pkg -t node8-win-x86 -o dist/win32/mms.exe .');
shell.cp('../sqlitebinaries/node-v57-win32-ia32/*', 'dist/win32');
shell.cp('../ffmpegbinaries/win32/*', 'dist/win32');

shell.mkdir('-p', 'dist/mac64');
shell.exec(npm + 'run pkg -t node8-macos-x64 -o dist/mac64/mms .');
shell.cp('../sqlitebinaries/node-v57-darwin-x64/*', 'dist/mac64');
shell.cp('../ffmpegbinaries/macOS/*', 'dist/mac64');

// We don't have sqlite for linux 32bit build yet.
// shell.mkdir('-p', 'dist/linux32');
// shell.exec(npm + 'run pkg -t node8-linux-x86 -o dist/linux32/mms .');
// shell.cp('../sqlitebinaries/node-v57-linux-x86/*', 'dist/linux32');
// shell.cp('../ffmpegbinaries/linux32/*', 'dist/linux32');

shell.mkdir('-p', 'dist/linux64');
shell.exec(npm + 'run pkg -t node8-linux-x64 -o dist/linux64/mms .');
shell.cp('../sqlitebinaries/node-v57-linux-x64/*', 'dist/linux64');
shell.cp('../ffmpegbinaries/linux64/*', 'dist/linux64');

// ARM building is in build-arm.js, since it can't be currently crosscompiled, has to be executed on another machine