// ts-check
// Package the Windows build -- for testing/development only

const shell = require('shelljs');

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');

shell.mkdir('-p', 'dist/win64/icon');
shell.exec(npm + 'run pkg -t node8-win-x64 -o dist/win64/mms.exe .');
shell.cp('icon/mm.ico', 'dist/win64/icon');

// So that mms.exe works with native tray icon module
// More info at https://www.ironsrc.com/blog/rename-import-dll/ and https://github.com/parro-it/libui-node/issues/120#issuecomment-425627593
const bin = 'node_modules\\windows-trayicon\\build\\Release\\nbind.node';
const binBack = bin+'.back';
shell.cp(bin, binBack);
shell.exec(`scripts\\rid.exe ${bin} node.exe mms.exe`);
shell.cp(bin, 'dist/win64');
shell.cp(binBack, bin);