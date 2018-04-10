const shell = require('shelljs');

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');

shell.mkdir('-p', 'dist/linux-armv7');
shell.exec(npm + 'pkg -t node8-linux-armv7 -o dist/linux-armv7/mms .');