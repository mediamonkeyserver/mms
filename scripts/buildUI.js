const shell = require('shelljs');

const npm = (shell.which('yarn') ? 'yarn ' : 'npm ');

console.log(`Using ${npm}for building UI.`); // eslint-disable-line no-console

shell.rm('-r', 'build-webui');
shell.cd('webui');
shell.exec(npm + 'install');
shell.exec(npm + 'run build');
shell.mv('build', '../build-webui');
shell.cd('..');
