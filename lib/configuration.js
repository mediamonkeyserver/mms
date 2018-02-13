/*jslint node: true, sub:true, esversion: 6 */
"use strict";

const os = require('os');
const events = require('events');

var config = {
	serverName: 'MediaMonkey Server',
	collections: [
		 {
		 	id: "1",
		 	name: "Music",
		 	type: "music",
		 	folders: [
				os.homedir() + "/Music"
		 	]
		 },
		 {
		 	id: "2",
		 	name: "Video",
		 	type: 'movies',
		 	folders: [
				os.homedir() + "/Video"
		 	]
		 }		
	]
}

var configObserver = new events.EventEmitter;

class Configuration {

	getBasicConfig() {
		return config;
	}

	getConfigObserver() {
		return configObserver;
	}

	saveConfig(cfg) {
		// TODO: Process all incoming structures
		config.serverName = cfg.serverName || config.serverName;
		configObserver.emit('change');
	}

	saveCollection(collection) {
		var orig = config.collections.find(col => col.id === collection.id);
		if (orig) {
			// type isn't editable
			orig.name = collection.name;
			orig.folders = collection.folders; // TODO: Scan these folders!
		} else {
			var last_id = 0;
			config.collections.forEach((x) => {
				if (x.id > last_id)
					last_id = x.id;
			});
			collection.id = String(++last_id);
			config.collections.push(collection);
		}
		configObserver.emit('change');
		configObserver.emit('collectionchange');
		return true;
	}

	deleteCollection(collection) {
		config.collections = config.collections.filter(col => col.id !== collection.id);
		configObserver.emit('change');
		configObserver.emit('collectionchange');
		return true;
	}
}

module.exports = new Configuration();