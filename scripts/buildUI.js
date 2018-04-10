const shell = require('shelljs');

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');

console.log(`Using ${npm}for processing.`); // eslint-disable-line no-console

shell.rm('-r', 'build-webui');
shell.cd('webui');
shell.exec(npm + 'install');
shell.exec(npm + 'build');
// shell.cp('-r', 'build/', '../build-webui/');
shell.mv('build', '../build-webui');
shell.cd('..');
