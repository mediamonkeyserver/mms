// ts-check

const shell = require('shelljs');

// const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');

shell.mkdir('-p', 'dist/linux-armv7');
// shell.exec(npm + 'run pkg -t node8-linux-armv7 -o dist/linux-armv7/mms .'); // JH: Not sure why this doesn't work on my Raspberry?
shell.exec('node node_modules/.bin/pkg -t node8-linux-armv7 -o dist/linux-armv7/mms .');
shell.cp('node_modules/@mmserver/sqlite3/lib/binding/node-v57-linux-arm/*', 'dist/linux-armv7');
shell.cp('../ffmpegbinaries/linux-armv7/*', 'dist/linux-armv7');