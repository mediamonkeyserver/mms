// ts-check

const shell = require('shelljs');
const fs = require('fs');

const exec = 'bun'; //(shell.which('yarn') ? 'yarn ' : 'npm ');

console.log(`Using ${exec} for building UI.`); // eslint-disable-line no-console

shell.rm('-r', 'build-webui');
shell.cd('webui');
console.log('Installing necessary build modules. This may take a few minutes... Do not terminate the process.'); // eslint-disable-line no-console
shell.exec(`${exec} install`);
console.log('Building web UI. This may take a few minutes... Do not terminate the process.'); // eslint-disable-line no-console
shell.exec(`${exec} run build`);
shell.mv('build', '../build-webui');
shell.cd('..');

// Remove .map files, to make the distribution smaller
for (file of (shell.find('build-webui').filter(f => f.match(/\.map$/))))
	shell.rm(file);

// Prepare sources for cordova
shell.rm('-r', 'cordova/www');
shell.mkdir('cordova/www');
shell.cp('-r', 'build-webui/*', 'cordova/www/');
for (var file of (shell.find('cordova/www').filter(f => f.match(/\.br$/))))
	shell.rm(file);
for (file of shell.find('cordova/www').filter(f => f.match(/\.gz$/)))
	shell.rm(file);
for (file of shell.find('cordova/www').filter(f => f.match(/\.map$/)))
	shell.rm(file);	

var index = fs.readFileSync('cordova/www/index.html', 'utf8');
index = index.replace(/"\/web\/static/g, '"./static');
fs.writeFileSync('cordova/www/index.html', index, 'utf8');
