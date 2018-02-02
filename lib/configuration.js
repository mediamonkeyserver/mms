/*jslint node: true, sub:true, esversion: 6 */
"use strict";

var basicConfig = {
    serverName: "Testing MediaMonkey server",
    collections: [
        {
            id: "1234",
            name: "Music",
            type: "music"
        },
        {
            id: "1465",
            name: "Classical",
            type: "music"
        },
        {
            id: "5678",
            name: "Movies",
            type: 'movies'
        },
        {
            id: "54678",
            name: "Home videos",
            type: 'movies'
        },
        {
            id: "1290",
            name: "Playlists",
            type: 'playlists'
        }
    ]
}

class Configuration {
    getBasicConfig() {
        return basicConfig;
    }
}

module.exports = new Configuration();