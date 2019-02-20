// ts-check

const shell = require('shelljs');

shell.cd('scripts');

// Prepare a generic Synology crosscompiler
shell.exec('docker build -t mms/crosscompiler ./crossSynology.docker');

// Run
shell.exec('docker run --rm -v %CD%/crossSynology.docker:/nodepkg mms/crosscompiler bash /nodepkg/build-rtd1296-nodepkg.sh');