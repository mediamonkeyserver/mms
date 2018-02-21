class Path {
	static assertLastSeparator = (path) => {
		if (path.endsWith('/'))
			return path;
		else
			return path + '/';
	}

	static removeLastSeparator = (path) => {
		if (path.endsWith('/'))
			return path.substr(0, path.length - 1);
		else
			return path;
	}

	static join = (path1, path2) => {
		return Path.assertLastSeparator(path1) + path2;
	}

	static levelUp = (path) => {
		return path.substr(0, Path.removeLastSeparator(path).lastIndexOf('/') + 1);
	}
}

export default Path;