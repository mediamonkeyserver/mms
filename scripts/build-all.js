// ts-check

// Requirements:
// 1. Winrar installed
// 2. Docker installed
// 3. FFMPEG present in 'binaries/ffmpeg/{platform}

const shell = require('shelljs');
const fs = require('fs');
const nABI = require('node-abi-version').getABIVersion() || 93;  // ABI version
const nVer = process.version.match(/^v(\d+)\./)[1];  // Node version
const nSQLite = require('../node_modules/better-sqlite3/package.json').version;
const winrar = '"c:/Program Files/WinRAR/WinRAR"';
const fetch = require('node-fetch');
const pipeline = require('stream').pipeline;
const promisify = require('util').promisify;

const pkgPath = 'node node_modules\\pkg\\lib-es5\\bin.js';

async function download(url, dest) {
	const response = await fetch(url);
	const streamPipeline = promisify(pipeline);
	await streamPipeline(response.body, fs.createWriteStream(dest));
}

async function getSQLitePath(arch) {
	const folder = `binaries/better-sqlite3/${nSQLite}/node-v${nABI}-${arch}`;
	if (!shell.test('-e', folder)) {
		shell.mkdir('-p', folder);
		// const fname = `binaries/better-sqlite3/${nSQLite}/node-v${nABI}-${arch}.tar.gz`;
		// await download(`http://mapbox-node-binary.s3.amazonaws.com/sqlite3/v${nSQLite}/node-v${nABI}-${arch}.tar.gz`, fname);
		const fname = folder + '.tar.gz';
		const path = `https://github.com/JoshuaWise/better-sqlite3/releases/download/v${nSQLite}/better-sqlite3-v${nSQLite}-node-v${nABI}-${arch}.tar.gz`;
		await download(path, fname);
		shell.exec(`${winrar} x ${fname} binaries/better-sqlite3/temp/`);
		shell.mv('binaries/better-sqlite3/temp/build/Release/*', folder);
	}
	return folder + '/*';
}

async function main() {
	const npm = 'npm '; //(shell.which('yarn') ? 'yarn ' : 'npm ');
	console.log(`Using ${npm}for building all platforms.`); // eslint-disable-line no-console

	const version = JSON.parse(fs.readFileSync('package.json')).version;

	// *** Win 64 bit ***
	shell.mkdir('-p', 'dist/win64/icon');
	shell.exec(`${pkgPath} -t node${nVer}-win-x64 -o dist/win64/mms.exe . --options max_old_space_size=8192`);
	shell.cp(await getSQLitePath('win32-x64'), 'dist/win64');
	shell.cp('binaries/ffmpeg/win64/*', 'dist/win64');
	shell.cp('icon/mm.ico', 'dist/win64/icon');

	// So that mms.exe works with native tray icon module
	// More info at https://www.ironsrc.com/blog/rename-import-dll/ and https://github.com/parro-it/libui-node/issues/120#issuecomment-425627593
	const bin = 'node_modules\\windows-trayicon\\build\\Release\\addon.node';
	const binBack = bin + '.back';
	shell.cp(bin, binBack);
	shell.exec(`scripts\\rid.exe ${bin} node.exe mms.exe`);
	shell.cp(bin, 'dist/win64');
	shell.cp(binBack, bin);

	shell.cd('dist/win64');
	shell.exec(`${winrar} a ../MMS-win64-${version}.rar * -s -md64 -ma`);
	shell.cd('../..');

	// *** Win 32 bit (removed as no longer supported - we'd have to add pkg support) ***
	// shell.mkdir('-p', 'dist/win32');
	// shell.exec(`pkg -t node${nVer}-win-x86 -o dist/win32/mms.exe .`);
	// shell.cp(await getSQLitePath('win32-ia32'), 'dist/win32');
	// shell.cp('binaries/ffmpeg/win32/*', 'dist/win32');
	// shell.cd('dist/win32');
	// shell.exec(`${winrar} a ../MMS-win32-${version}.rar * -s -md64 -ma`);
	// shell.cd('../..');

	// *** Mac ***
	shell.mkdir('-p', 'dist/mac64');
	shell.exec(`${pkgPath} -t node${nVer}-macos-x64 -o dist/mac64/mms . --options max_old_space_size=8192`);
	shell.cp(await getSQLitePath('darwin-x64'), 'dist/mac64');
	shell.cp('binaries/ffmpeg/macOS/*', 'dist/mac64');
	shell.cd('dist/mac64');
	shell.exec(`${winrar} a ../MMS-mac64-${version}.rar * -s -md64 -ma`);
	shell.cd('../..');

	// *** Linux ***
	shell.mkdir('-p', 'dist/linux64');
	shell.exec(`${pkgPath} -t node${nVer}-linux-x64 -o dist/linux64/mms . --options max_old_space_size=8192`);
	shell.cp(await getSQLitePath('linux-x64'), 'dist/linux64');
	shell.cp('binaries/ffmpeg/linux64/*', 'dist/linux64');
	shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "cd /dist/linux64; tar cfz ../MMS-linux64-${version}.tar.gz *"`);
	shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "apt-get update; apt-get install xz-utils; cd /dist/linux64; tar cfJ ../MMS-linux64-${version}.tar.xz *"`);

	// *** QNAP x86 ***
	//	const nodelinux64 = '~/.pkg-cache/v2.5/fetched-v8.11.3-linux-x64';
	//	shell.mv(nodelinux64, nodelinux64 + '.back');
	//	shell.cp('binaries/node/node-linux64-QNAPx86', nodelinux64);
	//	shell.mkdir('-p', 'dist/QNAPx86');
	//	shell.exec(`${pkgPath} -t node${nVer}-linux-x64 -o dist/QNAPx86/mms .`);
	//	shell.cp(`binaries/sqlite/node-v${nABI}-linux-x64-QNAPx86/*`, 'dist/QNAPx86');
	//	shell.cp('binaries/ffmpeg/linux64/*', 'dist/QNAPx86');
	//	shell.exec(`docker run --rm -v %CD%/dist/:/dist ubuntu /bin/bash -c "cd /dist/QNAPx86; tar cfz ../MMS-QNAPx86-${version}.tar.gz *"`);
	//	shell.rm(nodelinux64);
	//	shell.mv(nodelinux64 + '.back', nodelinux64);


	// We don't have sqlite for linux 32bit build yet.
	// shell.mkdir('-p', 'dist/linux32');
	// shell.exec(npm + 'run pkg -t node8-linux-x86 -o dist/linux32/mms .');
	// shell.cp('../sqlitebinaries/node-v57-linux-x86/*', 'dist/linux32');
	// shell.cp('../ffmpegbinaries/linux32/*', 'dist/linux32');


	// ARM building is in build-arm.js, since it can't be currently crosscompiled, has to be executed on another machine
}

main();