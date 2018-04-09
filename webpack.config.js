var path = require('path');

module.exports = {
	entry: './server.js',
	target: 'node',
	mode: 'development',
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: [
				],
			},
			{
				test: /\.json$/,
				include: [
				]
			}
		],
		noParse: [
			/[\\/]node-pre-gyp[\\/]lib[\\/]publish\.js$/,
			/[\\/]node-pre-gyp[\\/]lib[\\/]unpublish\.js$/,
			/[\\/]node-pre-gyp[\\/]lib[\\/]info\.js$/,
		],
	},
	externals: {
		'heapdump': 'commonjs heapdump',
		'@mmserver/sqlite3': 'commonjs @mmserver/sqlite3', // TODO: Should be better handled, so that all the reqs aren't needed to be included separately
		'socket.io-client': 'commonjs socket.io-client',
		'socket.io': 'commonjs socket.io',
	},
	output: {
		path: path.join(__dirname, 'dist'),
		filename: 'mms.js'
	}
};