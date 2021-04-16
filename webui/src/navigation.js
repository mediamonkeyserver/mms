//@ts-check
import qs from 'query-string';

var history;
// var path = '/';
var state = {};

export default class Navigation {
	static update(aLocation, aHistory) {
		// path = aLocation.pathname;
		state = qs.parse(aLocation.search);
		history = aHistory;
	}

	static init(aLocation, aHistory) {
		Navigation.update(aLocation, aHistory);
	}

	static go(newPath, replace) {
		const params = {
			pathname: newPath,
			search: qs.stringify(state),
		};

		if (replace)
			history.replace(params);
		else
			history.push(params);
	}

	static goProfile() {
		Navigation.go('/profile');
	}
	
	static goHome() {
		Navigation.go('/');
	}
}

