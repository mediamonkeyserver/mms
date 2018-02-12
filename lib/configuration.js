/*jslint node: true, sub:true, esversion: 6 */
"use strict";

var config = {
	serverName: "Testing MediaMonkey server",
	collections: [
		// {
		// 	id: "1234",
		// 	name: "Music",
		// 	type: "music",
		// 	folders: [
		// 		'/music'
		// 	]
		// },
		// {
		// 	id: "1465",
		// 	name: "Classical",
		// 	type: "music",
		// 	folders: [
		// 		'/classical'
		// 	]
		// },
		// {
		// 	id: "5678",
		// 	name: "Movies",
		// 	type: 'movies',
		// 	folders: [
		// 		'/movies'
		// 	]
		// },
		// {
		//     id: "1290",
		//     name: "Playlists",
		//     type: 'playlists'
		// }
	]
}

var id = 0;

class Configuration {
	getBasicConfig() {
		return config;
	}

	saveCollection(collection) {
		var orig = config.collections.find(col => col.id === collection.id);
		if (orig) {
			// type isn't editable
			orig.name = collection.name;
			orig.folders = collection.folders; // TODO: Scan these folders!
		} else {
			collection.id = String(++id);
			config.collections.push(collection);
		}
		return true;
	}

	deleteCollection(collection) {
		config.collections = config.collections.filter(col => col.id !== collection.id);
		return true;
	}
}

module.exports = new Configuration();