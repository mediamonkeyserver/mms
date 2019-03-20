// ts-check
// Package the Windows build -- for testing/development only

const shell = require('shelljs');

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');

shell.mkdir('-p', 'dist/win64');
shell.exec(npm + 'run pkg -t node8-win-x64 -o dist/win64/mms.exe .');