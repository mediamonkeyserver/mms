class Path {
	static assertLastSeparator = (path) =>
		path.endsWith('/') ?
			path :
			path + '/';

	static removeLastSeparator = (path) =>
		path.endsWith('/') ?
			path.substr(0, path.length - 1) :
			path;

	static isAbsolute = (path) => 
		(path.slice(0, 1) === '/') || (path.slice(1, 2) === ':');

	static join = (path1, path2) =>
		Path.isAbsolute(path2) ?
			path2 :
			Path.assertLastSeparator(path1) + path2;

	static levelUp = (path) =>
		path.substr(0, Path.removeLastSeparator(path).lastIndexOf('/') + 1);
}

export default Path;