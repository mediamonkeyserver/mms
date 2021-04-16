// ts-check

'use strict';

const Util = require('util');
const assert = require('assert');
const rangeParser = require('range-parser');
const os = require('os');
const fs = require('fs');
const Configuration = require('./configuration');
const MediaProvider = require('./mediaProvider');

const debugFactory = require('debug');
const debug = debugFactory('upnpserver:contentDirectoryService');
const debugDIDL = debugFactory('upnpserver:contentDirectoryService:didl');
const debugStack = debugFactory('upnpserver:stack');
const debugMetas = debugFactory('upnpserver:contentDirectoryService:metas');

const Async = require('async');
const send = require('send');

const logger = require('./logger');
const Service = require('./service');
const Xmlns = require('./xmlns');

var Node;
const jstoxml = require('./util/jstoxml');
const NodeWeakHashmap = require('./util/nodeWeakHashmap');
const URL = require('./util/url');
const xmlFilters = require('./util/xmlFilters');

const UpnpItem = require('./class/object.item');
const UpnpContainer = require('./class/object.container');

const FilterSearchEngine = require('./filterSearchEngine');

const AlphaNormalizer = require('./util/alphaNormalizer');

const PathNormalizer = require('./util/pathNormalizer');

const PROTOCOL_SPLITTER = /^([A-Z0-9_-]+):(.*)/i;

class ContentDirectoryService extends Service {
	constructor(configuration) {

		Node = require('./node');

		super({
			serviceType: 'urn:schemas-upnp-org:service:ContentDirectory:1',
			serviceId: 'urn:upnp-org:serviceId:ContentDirectory',
			route: 'cds'
		});

		this.addAction('Browse', [{
			name: 'ObjectID',
			type: 'A_ARG_TYPE_ObjectID'
		}, {
			name: 'BrowseFlag',
			type: 'A_ARG_TYPE_BrowseFlag'
		}, {
			name: 'Filter',
			type: 'A_ARG_TYPE_Filter'
		}, {
			name: 'StartingIndex',
			type: 'A_ARG_TYPE_Index'
		}, {
			name: 'RequestedCount',
			type: 'A_ARG_TYPE_Count'
		}, {
			name: 'SortCriteria',
			type: 'A_ARG_TYPE_SortCriteria'
		}], [{
			name: 'Result',
			type: 'A_ARG_TYPE_Result'
		}, {
			name: 'NumberReturned',
			type: 'A_ARG_TYPE_Count'
		}, {
			name: 'TotalMatches',
			type: 'A_ARG_TYPE_Count'
		}, {
			name: 'UpdateID',
			type: 'A_ARG_TYPE_UpdateID'
		}]);

		this.addAction('GetSortCapabilities', [], [{
			name: 'SortCaps',
			type: 'SortCapabilities'
		}]);

		this.addAction('GetSystemUpdateID', [], [{
			name: 'Id',
			type: 'SystemUpdateID'
		}]);

		this.addAction('GetSearchCapabilities', [], [{
			name: 'SearchCaps',
			type: 'SearchCapabilities'
		}]);

		this.addAction('Search', [{
			name: 'ContainerID',
			type: 'A_ARG_TYPE_ObjectID'
		}, {
			name: 'SearchCriteria',
			type: 'A_ARG_TYPE_SearchCriteria'
		}, {
			name: 'Filter',
			type: 'A_ARG_TYPE_Filter'
		}, {
			name: 'StartingIndex',
			type: 'A_ARG_TYPE_Index'
		}, {
			name: 'RequestedCount',
			type: 'A_ARG_TYPE_Count'
		}, {
			name: 'SortCriteria',
			type: 'A_ARG_TYPE_SortCriteria'
		}], [{
			name: 'Result',
			type: 'A_ARG_TYPE_Result'
		}, {
			name: 'NumberReturned',
			type: 'A_ARG_TYPE_Count'
		}, {
			name: 'TotalMatches',
			type: 'A_ARG_TYPE_Count'
		}, {
			name: 'UpdateID',
			type: 'A_ARG_TYPE_UpdateID'
		}]);

		// addType (name, type, value, valueList, ns, evented,
		// moderation_rate, additionalProps, preEventCb, postEventCb)
		this.addType('A_ARG_TYPE_BrowseFlag', 'string', '', ['BrowseMetadata',
			'BrowseDirectChildren'
		]);
		this.addType('ContainerUpdateIDs', 'string', 0, [], null, true, 2, [],
			() => { // concatenate ContainerUpdateIDs before event
				var updateIds = this.updateIds;
				this.updateIds = {};
				var concat = [];
				for (var container in updateIds) {
					var updateId = updateIds[container];
					if (!updateId) {
						continue;
					}
					concat.push(container, updateId);
				}
				this.stateVars['ContainerUpdateIDs'].value = concat.join(',');

			}, () => { // clean ContainerUpdateIDs after event
				this.stateVars['ContainerUpdateIDs'].value = '';
			});

		this.addType('SystemUpdateID', 'ui4', 0, [], {
			dt: Xmlns.MICROSOFT_DATATYPES
		}, true, 2);

		this.addType('A_ARG_TYPE_Count', 'ui4', 0);

		this.addType('A_ARG_TYPE_SortCriteria', 'string', '');

		this.addType('A_ARG_TYPE_SearchCriteria', 'string', '');

		this.addType('SortCapabilities', 'string', ['dc:title', 'upnp:genre',
			'upnp:artist', 'upnp:author', 'upnp:album', 'upnp:rating', 'upnp:originalTrackNumber', 'upnp:originalDiscNumber'
		].join(','), [], {
			upnp: Xmlns.UPNP_METADATA,
			dc: Xmlns.PURL_ELEMENT
		});
		this.addType('A_ARG_TYPE_Index', 'ui4', 0);
		this.addType('A_ARG_TYPE_ObjectID', 'string');
		this.addType('A_ARG_TYPE_UpdateID', 'ui4', 0);
		this.addType('A_ARG_TYPE_Result', 'string');
		this._searchableFields = ['dc:title', 'dc:creator', 'upnp:genre', 'upnp:artist', 'upnp:albumArtist', 'upnp:author', 'upnp:album', 'upnp:actor', 'upnp:director', 'upnp:producer', 'upnp:publisher'];
		this.addType('SearchCapabilities', 'string', this._searchableFields.join(','), [], {
			upnp: Xmlns.UPNP_METADATA,
			dc: Xmlns.PURL_ELEMENT
		});
		this.addType('A_ARG_TYPE_Filter', 'string');

		this.jasminFileMetadatasSupport = (configuration.jasminFileMetadatasSupport !== false);
		this.jasminMusicMetadatasSupport = (configuration.jasminMusicMetadatasSupport !== false);
		this.jasminMovieMetadatasSupport = (configuration.jasminMovieMetadatasSupport !== false);

		this.dlnaSupport = (configuration.dlnaSupport !== false);
		this.microsoftSupport = (configuration.microsoftSupport !== false);
		this.secDlnaSupport = (configuration.secDlnaSupport !== false);

		this._childrenWeakHashmap = new NodeWeakHashmap('childrenList', 5000, true);
		this._childrenByTitleWeakHashmap = new NodeWeakHashmap('childrenListByTitle', 5000, true);

		this.repositories = [];
		// this.systemUpdateId = 0;
		this._previousSystemUpdateId = -1;
		this.updateIds = {};
		this.contentPath = '/' + this.route + '/content/';

		this.upnpClasses = configuration.upnpClasses;
		this.contentHandlers = configuration.contentHandlers;
		this.contentProviders = configuration.contentProviders;
		this.contentHandlersByName = {};
		this._contentProvidersByProtocol = {};

		this.upnpClassesByMimeType = {};
		_setupContentHandlerMimeTypes(this.upnpClassesByMimeType, this.upnpClasses, false);
	}

	/**
	 *
	 */
	initialize(upnpServer, callback) {

		super.initialize(upnpServer, (error) => {
			if (error) {
				return callback(error);
			}

			var contentProvidersByProtocol = this._contentProvidersByProtocol;

			Async.eachSeries(this.contentProviders, (contentProvider, callback) => {
				var protocol = contentProvider.protocol;
				debug('initialize', 'Initialize contentProvider', contentProvider.name, 'for protocol', protocol);

				contentProvidersByProtocol[protocol.toLowerCase()] = contentProvider;

				// debug("Protocol=",contentProvider.protocol,"platform=",os.platform());

				if (protocol === 'file' && os.platform() === 'win32') {
					for (var i = 0; i < 26; i++) {
						// Map all drives letter
						contentProvidersByProtocol[String.fromCharCode(97 + i)] = contentProvider;
					}
				}

				contentProvider.initialize(this, callback);

			}, (error) => {
				if (error) {
					logger.error('Initialize content handlers error', error);

					return callback(error);
				}

				Async.eachSeries(this.contentHandlers, (contentHandler, callback) => {
					debug('initialize', 'Initialize contentHandler', contentHandler.name, 'for mimeTypes', contentHandler.mimeTypes);
					this.contentHandlersByName[contentHandler.name] = contentHandler;

					contentHandler.initialize(this, callback);

				}, (error) => {
					if (error) {
						logger.error('Initialize content handlers error', error);

						return callback(error);
					}

					this._installRoot((error /*, root*/ ) => {
						if (error) {
							return callback(error);
						}

						var repositories = upnpServer.configuration.repositories;
						this.addRepositories(repositories, (error) => {
							if (error) {
								return callback(error);
							}

							// Kept here for Intel upnp toolkit, but not in upnp spec
							if (upnpServer.configuration.enableIntelToolkitSupport) {
								this._intervalTimer = setInterval(() => this._sendItemChangesEvent(), 1500);
							}

							this._initConfiguredCollections(() => {
								callback(null, this);
							});
						});
						return;
					});
				});
			});
		});
	}

	_initConfiguredCollections(callback) {
		var config = Configuration.getBasicConfig();
		var observer = Configuration.getConfigObserver();
		observer.on('collectionchange', (operation, collection, collections) => {
			switch (operation) {
				case 'added':
					this._rescanCollection(collection, {});
					break;
				case 'changed':
					this._garbageNonCollectionFiles(collections, () => {
						this._rescanCollection(collection, {});
					});
					break;
				case 'removed':
					this._garbageNonCollectionFiles(collections);
					break;
			}
		});
		this._initCollections(config.collections, callback);
	}

	_initCollections(collections, callback) {
		this._rescanCollections(collections, {
			useCachedContent: true // indicates that the scan will read cached content from DB (not the real content from HDD)
		});
		// and add predefined 'Playlists' collection for playlists browsing:
		this._getRepositoryForCollection({
			name: 'Playlists',
			type: 'playlist'
		}, callback);
	}

	_rescanCollections(collections, scan_options, callback) {
		var list = collections || [];
		Async.eachSeries(list, (itm, cbk) => {
			this._rescanCollection(itm, scan_options, cbk);
		}, callback);
	}

	_garbageNonCollectionFiles(collections, callback) {
		var folders = [];
		for (var col of collections) {
			for (var fld of col.folders)
				folders.push(fld);
		}
		this.nodeRegistry.garbageFilesOutOfFolders(folders, (err, files) => {
			Async.eachSeries(files, (f, cbk) => {
				var node_id = this.nodeRegistry._getNodeIdForFile(f);
				this.getNodeById(node_id, (err, node) => {
					if (!err && node)
						node.remove(true, cbk);
					else
						cbk();
				});
			}, callback);
		});
	}

	_getRepositoryForCollection(collection, callback) {

		var repository;
		this.repositories.forEach((item) => {
			if (item.collectionID == collection.id)
				repository = item;
		});

		if (repository) {
			callback(repository);
		} else { // LS: repository for this collection doesn't exist yet, create one:
			var rep_type = collection.type;
			if (collection.type == 'movies')
				rep_type = 'movie';
			if (collection.type == 'classical')
				rep_type = 'music';

			var clazz = require('./repositories/' + rep_type);
			if (!clazz) {
				logger.error('Class of repository ' + rep_type + 'not found');
				return;
			}

			var defaultPath = os.homedir() + collection.name;
			if (collection.folders && collection.folders.length)
				defaultPath = PathNormalizer.normalize(collection.folders[0]);
			var mountPath = collection.name;
			repository = new clazz(mountPath, {
				mountPoint: mountPath,
				path: defaultPath,
				type: rep_type
			});
			repository.runInitialScan = false;
			this.addRepository(repository, (err, repository) => {
				repository.originalPath = defaultPath || repository._directoryURL.path;
				repository.collectionID = collection.id;
				callback(repository);
			});
		}
	}

	_rescanCollection(collection, scan_options, callback) {
		this._getRepositoryForCollection(collection, (repository) => {
			var list = collection.folders || [];
			repository.useCachedContent = (scan_options && scan_options.useCachedContent);
			Async.eachSeries(list, (path, cbk) => {
				this.rescanPath(path, repository, cbk);
			}, () => {
				repository.useCachedContent = false;
				if (callback)
					callback();
			});
		});
	}

	/**
	 *
	 */
	_installRoot(callback) {
		if (this.root) {
			return callback(null, this.root);
		}

		this.initializeRegistry((error) => {
			if (error) {
				logger.error('Can not initialize registry ' + error.message, error);
				return callback(error);
			}

			this._nodeRegistry.getNodeById(0, (error, node) => {
				if (error) {
					return callback(error);
				}
				if (node) {
					debug('_installRoot', 'Set root to #', node.id);
					this.root = node;
					return callback(null, node);
				}

				var i18n = this.upnpServer.configuration.i18n;

				this.createNode('root', UpnpContainer.UPNP_CLASS, {
					searchable: false,
					restricted: true,
					title: i18n.ROOT_NAME,
					metadatas: [{
						name: 'upnp:writeStatus',
						content: 'NOT_WRITABLE'
					}]

				}, (node) => {
					node._path = '/';
					node._id = 0; // Force id to 0
					node._parentId = -1;

				}, (error, node) => {
					if (error) {
						return callback(error);
					}

					this.root = node;

					callback(null, node);
				});
			});
		});
	}

	/**
	 *
	 */
	addRepositories(repositories, callback) {

		if (!repositories || !repositories.length) {
			return callback();
		}

		repositories = repositories.slice(0); // clone
		repositories.sort((r1, r2) => r1.mountPath.length - r2.mountPath.length);

		debug('addRepositories', 'Adding', repositories.length, 'repositories');

		Async.eachSeries(repositories, (repository, callback) => {

			debug('addRepositories', 'Adding repository', repository.mountPath);

			this.addRepository(repository, callback);

		}, callback);
	}

	/**
	 *
	 */
	initializeRegistry(callback) {	
		this._nodeRegistry = Configuration.getRegistry();
		this._nodeRegistry._service = this;				
		callback(null);		
	}

	/**
	 *
	 */
	addRepository(repository, callback) {

		var hashKey = JSON.stringify(repository.hashKey);

		debug('addRepository', 'Add repository', hashKey);

		this._nodeRegistry.registerRepository(repository, hashKey, (error, repository) => {
			if (error) {
				logger.error('Can not register repository', error);
				return callback(error);
			}

			this._installRoot((error /*, root*/ ) => {
				if (error) {
					logger.error('Can not install root', error);
					return callback(error);
				}

				debug('addRepository', 'Initialize repository', repository);

				repository.initialize(this, (error) => {
					if (error) {
						return callback(error);
					}

					this.repositories.push(repository);

					callback(null, repository);
				});
			});
		});
	}

	/**
	 *
	 */
	processSoap_Search(xml, request, response, callback) {
		// Browse support Search parameter !
		this.processSoap_Browse(xml, request, response, callback);
	}

	/**
	 *
	 */
	_newDidlJxml() {
		var attrs = {
			['xmlns']: Xmlns.DIDL_LITE,
			['xmlns:dc']: Xmlns.PURL_ELEMENT,
			['xmlns:upnp']: Xmlns.UPNP_METADATA
		};

		if (this.dlnaSupport) {
			attrs['xmlns:dlna'] = Xmlns.DLNA_METADATA;
		}

		if (this.secDlnaSupport) {
			attrs['xmlns:sec'] = Xmlns.SEC_DLNA;
		}

		if (this.jasminFileMetadatasSupport) {
			attrs['xmlns:fm'] = Xmlns.JASMIN_FILEMETADATA;
		}
		if (this.jasminMusicMetadatasSupport) {
			attrs['xmlns:mm'] = Xmlns.JASMIN_MUSICMETADATA;
		}
		if (this.jasminMovieMetadatasSupport) {
			attrs['xmlns:mo'] = Xmlns.JASMIN_MOVIEMETADATA;
		}

		var xmlDidl = {
			_name: 'DIDL-Lite',
			_attrs: attrs
		};

		return xmlDidl;
	}

	/**
	 *
	 */
	_newRepositoryRequest(request) {

		var localhost = request.myHostname;
		var localport = request.socket.localPort;

		var repositoryRequest = {
			contentURL: 'http://' + localhost + ':' + localport + this.contentPath,
			request: request,
			contentDirectoryService: this,
			microsoftSupport: this.microsoftSupport,
			dlnaSupport: this.dlnaSupport,
			secDlnaSupport: this.secDlnaSupport,
			jasminFileMetadatasSupport: this.jasminFileMetadatasSupport,
			jasminMusicMetadatasSupport: this.jasminMusicMetadatasSupport,
			jasminMovieMetadatasSupport: this.jasminMovieMetadatasSupport
		};

		return repositoryRequest;
	}

	/**
	 *
	 */
	responseSearch(response, request,
		containerId, filterCallback, startingIndex, requestedCount, sortCriteria,
		searchCriteria, callback) {

		if (debug.enabled) {
			debug('responseSearch', 'Request containerId=' + containerId + ' filterCallback=' + !!filterCallback + ' startingIndex=' + startingIndex +
				' requestedCount=' + requestedCount + ' sortCriteria=' + sortCriteria +
				' searchCallback=' + !!searchCriteria);
		}

		var added_names = {};

		this.getNodeById(containerId, (error, item) => {

			if (error) {
				logger.error('CDS: Can not getNodeById for id', containerId);
				return callback(501, error);
			}

			if (!item) {
				return callback(710, 'CDS: Browser Can not find item ' +
					containerId);
			}

			this.emit('Search', request, item);

			var processList = (list, node) => {

				debug('responseSearch', 'Emit filterList');

				this.emit('filterList', request, node, list);

				var lxml = [];

				var xmlDidl = this._newDidlJxml();

				var repositoryRequest = this._newRepositoryRequest(request);

				Async.eachSeries(list, (child, callback) => {
					if (!child) {
						logger.warn('ALERT not a node ', child);
						return callback(null, list);
					}

					this._getNodeJXML(child, null, repositoryRequest,
						filterCallback, (error, itemJXML) => {
							if (error) {
								return callback(error);
							}

							lxml.push(itemJXML);
							setImmediate(callback);
						});

				}, (error) => {
					if (error) {
						return callback(501, error);
					}
					debug('responseSearch', 'Get all nodes', lxml);

					sortCriteria = sortCriteria || node.attributes.defaultSort || node.upnpClass.defaultSort;
					if (sortCriteria) {
						_applySortCriteria(lxml, sortCriteria);
					}

					debug('responseSearch', 'SortCriteria=', sortCriteria);

					var total = lxml.length;

					if (startingIndex > 0) {
						if (startingIndex > lxml.length) {
							lxml = [];
						} else {
							lxml = lxml.slice(startingIndex);
						}
					}
					if (requestedCount > 0) {
						lxml = lxml.slice(0, requestedCount);
					}

					if (filterCallback) {
						lxml.forEach((x) => filterCallback(x));
					}

					xmlDidl._content = lxml;

					var didl = jstoxml.toXML(xmlDidl, {
						header: false,
						indent: '',
						filter: xmlFilters
					});

					debugDIDL('responseSearch', 'SearchContainer didl=', didl);

					this.responseSoap(response, 'Search', {
						_name: 'u:SearchResponse',
						_attrs: {
							'xmlns:u': this.type
						},
						_content: {
							Result: didl,
							NumberReturned: lxml.length,
							TotalMatches: total,
							UpdateID: (node.id) ? node.updateId : this.stateVars['SystemUpdateID'].get()
						}
					}, (error) => {
						if (error) {
							return callback(501, error);
						}

						debug('responseSearch', 'Search end #' + containerId);

						callback(null);
					});
				});
			};

			var search = this.parseSearchCriteria(searchCriteria.val);

			this.doFullTextSearch(search, () => {
				var filter = (node) => {
					var res;
					if (node.upnpClass && node.upnpClass.name && search.classAccepted(node.upnpClass.name) && search.fieldsAccepted(node))
						res = true;
					if (res && node.isUpnpContainer) {
						if (added_names[node.name])
							res = false; // to eliminate duplicates of albums (same album nodes are under artists too)
						added_names[node.name] = true;
					}
					return res;
				};

				if (item.refId) {
					this.getNodeById(item.refId, (error, refItem) => {

						if (error) {
							logger.error('CDS: Can not getNodeById for REF id',
								item.refId);
							return callback(701, error);
						}
						if (!refItem) {
							return callback(701, 'CDS: Browser Can not find REF item ' +
								item.refId);
						}

						refItem.filterChildNodes(filter, (error, list) => {
							if (error) {
								logger.warn('Can not scan repositories: ', error);
								return callback(710, error);
							}
							return processList(list, item);
						});

					});
					return;
				}

				debug('Browser node #', item.id, 'error=', error);

				item.filterChildNodes(filter, (error, list) => {
					debug('responseSearch', 'Browser node #', item.id, 'filtred error=', error);

					if (error) {
						logger.warn('Can not scan repositories: ', error);
						return callback(710, error);
					}
					return processList(list, item);
				});
			});
		});
	}

	_extractBetween(from, to, value) {
		// extracts text between two strings an returns array of all occurences
		var re = new RegExp('(?:' + from + ')(.*?)(?:' + to + ')', 'gi'); //set ig flag for global search and case insensitive
		var ar = value.match(re);
		if (ar) {
			for (var i = 0; i < ar.length; i++)
				ar[i] = ar[i].substring(from.length, ar[i].length - to.length).trim();
		}
		return ar;
	}

	_newSearchField(field, operator, value) {
		return {
			field: field,
			operator: operator,
			value: value
		};
	}

	_getCountOfChar(char, str) {
		var result = 0;
		for (var i = 0; i < str.length; i++)
			if (str[i] == char)
				result++;
		return result;
	}

	_extractSearchField(field, operator, value) {
		var from = field + ' ' + operator + ' "';
		var to = '"';
		var terms = this._extractBetween(from, to, value);
		if (terms) {
			// this field and operator is presented, use it and get further info:
			var sf = this._newSearchField(field, operator, terms[terms.length - 1]);
			// check brackets (nest level) and concatenation operator:
			var whole = from + sf.value + to;
			var idx = value.indexOf(whole);
			var pre = value.substring(0, idx);
			sf.bracketNestLevel = this._getCountOfChar('(', pre) - this._getCountOfChar(')', pre);
			var concatOperator = value.substring(idx + whole.length, idx + whole.length + 4).trim().toLowerCase(); // ' or ', ' and'
			if (concatOperator == 'or' || concatOperator == 'and')
				sf.concatOperator = concatOperator;
			else
				sf.concatOperator = 'or';
			return sf;
		}
	}

	_parseSearchField(field_id, value, fields) {
		var f_c = this._extractSearchField(field_id, 'contains', value);
		if (f_c)
			fields.push(f_c);
		var f_e = this._extractSearchField(field_id, '=', value);
		if (f_e)
			fields.push(f_e);
	}

	parseSearchCriteria(value) {
		// value examples in case of MMA are
		//      '(upnp:class derivedfrom "object.item.audioItem" or upnp:class derivedfrom "object.item.videoItem ") and (dc:title contains "hh" or dc:creator contains "hh" or upnp:artist contains "hh" or upnp:albumArtist contains "hh" or upnp:album contains "hh" or upnp:author contains "hh" or upnp:genre contains "hh" )'
		//      '(upnp:class = "object.container.album.musicAlbum") and (dc:title contains "ggg" or dc:creator contains "ggg" or upnp:artist contains "ggg" or upnp:genre contains "ggg" )'
		// value examples for Roku Soundbridge:
		//      '(upnp:class derivedfrom="object.item.audioItem" and @refIDexists = false and upnp:artist="U2")'
		//      '(upnp:class = "object.container.person.musicArtist" and upnp:genre = "Jazz" and @refID exists false)'
		//      '(upnp:class derivedfrom "object.item.audioItem" and @refID exists false and upnp:album = "The Joshua Tree (U2)")'
		var res = {};

		res.classes = this._extractBetween('upnp:class = "', '"', value) || [];
		res.derived_classes = this._extractBetween('upnp:class derivedfrom "', '"', value) || [];
		res.classAccepted = function (clsName) {
			for (var cls of this.classes) {
				if (clsName == cls)
					return true;
			}
			for (var clsd of this.derived_classes) {
				if (clsName.startsWith(clsd))
					return true;
			}
		};

		res.fields = [];
		for (var field_id of this._searchableFields)
			this._parseSearchField(field_id, value, res.fields);

		res.fieldsAccepted = function (node) {
			var title = node.name;
			if (node.attributes.title)
				title = node.attributes.title;
			if (node.attributes.db_id && this.hashed_db_ids[node.attributes.db_id]) // db_id hashed in doFullTextSearch bellow
				return true;

			for (var f of this.fields) {
				if (f.field == 'dc:title' && f.operator == 'contains' && title.indexOf(f.value) > 0)
					return true;
				if (f.field == 'dc:title' && f.operator == '=' && f.value == title)
					return true;
			}
		};

		return res;
	}

	doFullTextSearch(search, callback) {

		// compose full text search phrase from fields:
		var phrase = '';
		var lastField;
		for (var f of search.fields) {
			var db_field = f.field.substring(f.field.indexOf(':') + 1); // strip 'dc:' and 'upnp":' prefixes and map upnp fields to db fields
			if (db_field == 'albumArtist')
				db_field = 'album_artist';
			if (db_field == 'author' || db_field == 'creator')
				db_field = 'composer';
			if (phrase != '')
				phrase = phrase + ' ' + f.concatOperator.toUpperCase() + ' ';
			if (lastField && f.bracketNestLevel > lastField.bracketNestLevel)
				for (var i = lastField.bracketNestLevel; i < f.bracketNestLevel; i++)
					phrase = phrase + '(';
			var value = this._nodeRegistry.validateFTS(f.value);
			phrase = phrase + db_field + ': ' + value;
			if (f.operator == 'contains')
				phrase = phrase + '*';
			if (lastField && f.bracketNestLevel < lastField.bracketNestLevel)
				for (var i2 = lastField.bracketNestLevel; i2 < f.bracketNestLevel; i2++)
					phrase = phrase + ')';
			lastField = f;
		}

		this._nodeRegistry.getFilesBy({
			searchPhrase: phrase
		}, (err, files) => {
			search.hashed_db_ids = {};
			for (var f of files)
				search.hashed_db_ids[f.db_id] = true;
			callback();
		});
	}

	/**
	 *
	 */
	processSoap_Browse(xml, request, response, callback) {

		var childNamed = (name, xmlns) => Service._childNamed(xml, name, xmlns);

		var browseFlag = null;
		var node = childNamed('BrowseFlag', Xmlns.UPNP_SERVICE);
		if (node) {
			browseFlag = node.val;
		}

		var searchCriteria = childNamed('SearchCriteria', Xmlns.UPNP_SERVICE);
		var filterNode = childNamed('Filter', Xmlns.UPNP_SERVICE);

		var filterSearchEngine = new FilterSearchEngine(this, filterNode, searchCriteria);

		var objectId = this.root.id;
		node = childNamed('ObjectID', Xmlns.UPNP_SERVICE);
		if (node) {
			objectId = this._nodeRegistry.keyFromString(node.val);
		}

		debug('processSoap_Browse', 'Browse starting  (flags=', browseFlag, ') of item #', objectId);

		var startingIndex = -1;
		node = childNamed('StartingIndex', Xmlns.UPNP_SERVICE);
		if (node) {
			startingIndex = parseInt(node.val, 10);
		}

		var requestedCount = -1;
		node = childNamed('RequestedCount', Xmlns.UPNP_SERVICE);
		if (node) {
			requestedCount = parseInt(node.val, 10);
		}

		var sortCriteria = null;
		node = childNamed('SortCriteria', Xmlns.UPNP_SERVICE);
		if (node) {
			sortCriteria = node.val;
		}
		debug('processSoap_Browse', 'Browse sortCriteria=', sortCriteria, 'browseFlag=', browseFlag,
			'requestedCount=', requestedCount, 'objectId=', objectId,
			'startingIndex=', startingIndex);

		if (browseFlag === 'BrowseMetadata') {
			this.processBrowseMetadata(response, request, objectId,
				filterSearchEngine, callback);
			return;
		}

		if (browseFlag === 'BrowseDirectChildren') {
			this.processBrowseDirectChildren(response, request, objectId,
				filterSearchEngine, startingIndex, requestedCount, sortCriteria, !!searchCriteria, callback);
			return;
		}

		if (searchCriteria) {
			this.responseSearch(response, request, objectId, filterSearchEngine.func, startingIndex, requestedCount, sortCriteria, searchCriteria, callback);
			return;
		}

		var error = new Error('Unknown browseFlag \'' + browseFlag + '\'');
		callback(error);
	}

	/**
	 *
	 */
	processBrowseMetadata(response, request, objectId, filterSearchEngine, callback) {
		debug('processBrowseMetadata', 'Browse objectId=', objectId);

		// logger.info("Request ObjectId=" + objectId);

		this.getNodeById(objectId, (error, node) => {

			if (error) {
				return callback(701, error);
			}

			if (!node) {
				return callback(701, 'CDS: BrowseObject Can not find node ' +
					objectId);
			}

			debug('processBrowseMetadata', 'BrowseObject node=#', node.id, ' error=', error);

			this.emit('BrowseMetadata', request, node);

			var repositoryRequest = this._newRepositoryRequest(request);

			var produceDidl = (node, nodeXML) => {

				var xmlDidl = this._newDidlJxml();
				xmlDidl._content = nodeXML;

				var didl = jstoxml.toXML(xmlDidl, {
					header: false,
					indent: ' ',
					filter: xmlFilters
				});

				if (debugDIDL.enabled) {
					debugDIDL('processBrowseMetadata', 'BrowseObject didl=', didl);
				}

				this.responseSoap(response, 'Browse', {
					_name: 'u:BrowseResponse',
					_attrs: {
						'xmlns:u': this.type
					},
					_content: {
						Result: didl,
						NumberReturned: 1,
						TotalMatches: 1,
						UpdateID: (node.id) ? node.updateId : this.stateVars['SystemUpdateID']
							.get()
					}
				}, (code, error) => {
					if (error) {
						return callback(code, error);
					}

					debug('processBrowseDirectChildren', 'Browse end #', node.id);

					// logger.debug("CDS: Browse end " + containerId);
					callback(null);
				});
			};

			filterSearchEngine.start(node);

			this._getNodeJXML(node, null, repositoryRequest,
				filterSearchEngine.func, (error, nodeJXML) => {
					if (error) {
						return callback(500, error);
					}

					nodeJXML = filterSearchEngine.end(nodeJXML);

					produceDidl(node, nodeJXML, callback);
				});
		});
	}

	/**
	 *
	 */
	_getNodeJXML(node, inheritedAttributes, repositoryRequest, filterCallback, callback) {

		debug('_getNodeJXML of #', node.id, 'upnpClass=', node.upnpClass);

		var refId = node.refId;
		if (refId) {
			node.resolveLink((error, refNode) => {
				if (error) {
					return callback(error);
				}

				var linkAttributes = node.attributes;

				this._getNodeJXML(refNode, linkAttributes, repositoryRequest,
					filterCallback, (error, refNodeJXML) => {
						if (error) {
							return callback(error);
						}

						refNodeJXML._attrs.id = node.id;
						refNodeJXML._attrs.refID = refNode.id;
						refNodeJXML._attrs.parentID = node.parentId;

						return callback(null, refNodeJXML);
					});
			});
			return;
		}

		var itemClass = node.upnpClass;
		assert(itemClass, 'ItemClass is not defined for node');

		var attributes = node.attributes || {};
		if (inheritedAttributes) {
			attributes = Object.assign({}, attributes, inheritedAttributes);

			// console.log("Merged attribute of #" + node.id + " ", attributes, "from=", node.attributes, "inherit=",
			// inheritedAttributes);
		}

		itemClass.toJXML(node, attributes, repositoryRequest, filterCallback, (error, itemJXML) => {
			if (error) {
				return callback(error);
			}

			this._emitToJXML(node, attributes, repositoryRequest,
				filterCallback, itemJXML, (error) => callback(error, itemJXML));
		});
	}

	/**
	 *
	 */
	processBrowseDirectChildren(response, request, containerId, filterSearchEngine, startingIndex,
		requestedCount, sortCriteria, searchMode, callback) {

		debug('processBrowseDirectChildren', 'Request containerId=', containerId, 'startingIndex=', startingIndex,
			'requestedCount=', requestedCount, 'sortCriteria=', sortCriteria);

		this.getNodeById(containerId, (error, node) => {

			if (error) {
				logger.error('CDS: Can not getNodeById for id #', containerId);
				return callback(501, error);
			}
			if (!node) {
				return callback(710, 'CDS: Browser Can not find node #' + containerId);
			}

			this.emit('BrowseDirectChildren', request, node);

			var processList = (list, node) => {

				this.emit('filterList', request, node, list);

				var lxml = [];

				var xmlDidl = this._newDidlJxml();

				var repositoryRequest = this._newRepositoryRequest(request);

				Async.eachSeries(list, (child, callback) => {
					if (!child) {
						logger.warn('ALERT not a node ', child);
						return callback(null, list);
					}

					filterSearchEngine.start(child);

					this._getNodeJXML(child, null, repositoryRequest,
						filterSearchEngine.func, (error, nodeJXML) => {
							if (error) {
								return callback(error);
							}

							nodeJXML = filterSearchEngine.end(nodeJXML);
							if (nodeJXML) {
								lxml.push(nodeJXML);
							}
							setImmediate(callback);
						});

				}, (error) => {
					if (error) {
						return callback(501, error);
					}

					sortCriteria = sortCriteria || (node.attributes && node.attributes.defaultSort) || node.upnpClass.defaultSort;
					if (sortCriteria) {
						_applySortCriteria(lxml, sortCriteria);
					}

					var total = lxml.length;

					if (startingIndex > 0) {
						if (startingIndex > lxml.length) {
							lxml = [];
						} else {
							lxml = lxml.slice(startingIndex);
						}
					}
					if (requestedCount > 0) {
						lxml = lxml.slice(0, requestedCount);
					}

					xmlDidl._content = lxml;

					var didl = jstoxml.toXML(xmlDidl, {
						header: false,
						indent: '',
						filter: xmlFilters
					});

					if (debugDIDL.enabled) {
						debugDIDL('processBrowseDirectChildren', 'BrowseContainer didl=', didl);
					}

					this.responseSoap(response,
						(searchMode) ? 'Search' : 'Browse', {
							_name: (searchMode) ? 'u:SearchResponse' : 'u:BrowseResponse',
							_attrs: {
								'xmlns:u': this.type
							},
							_content: {
								Result: didl,
								NumberReturned: lxml.length,
								TotalMatches: total,
								UpdateID: (node.id) ? node.updateId : this.stateVars['SystemUpdateID']
									.get()
							}
						}, (error) => {
							if (error) {
								return callback(501, error);
							}

							debug('processBrowseDirectChildren', 'Browse end #', containerId);
							callback(null);
						});
				});
			};

			if (node.refId) {
				this.getNodeById(node.refId, (error, refNode) => {

					if (error) {
						logger.error('CDS: Can not getNodeById for REF id',
							node.refId);
						return callback(701, error);
					}
					if (!refNode) {
						return callback(701, 'CDS: Browser Can not find REF node ' +
							node.refId);
					}

					refNode.listChildren((error, list) => {
						if (error) {
							logger.warn('Can not scan repositories: ', error);
							return callback(501, error);
						}

						processList(list, refNode);
					});

				});
				return;
			}

			debug('Browser node #', node.id, 'error=', error);

			node.browseChildren({
				request: request
			}, (error, list) => {
				if (error) {
					logger.error('Can not scan repositories: ', error);
					return callback(710, error);
				}

				debug('List children =>', list.length, 'nodes');

				processList(list, node);
			});
		});
	}

	/**
	 *
	 */
	browseNode(node, options, callback) {
		if (arguments.length === 2) {
			callback = options;
			options = undefined;
		}
		options = options || {};
		var path = node.path;

		debug('browseNode nodeID=#', node.id, 'path=', path, 'repositories.count=', this.repositories.length);

		var list = [];

		this.asyncEmit('browse', list, node, options, (error) => {
			if (error) {
				logger.error('CDS: browseNode path=\'' + path + '\' returns error', error);
				return callback(error);
			}

			debug('browseNode #', node.id, 'path=', path, 'returns=', list.length, 'elements.');

			callback(null, list);
		});
	}

	/**
	 *
	 */
	createNodeRef(targetNode, name, initCallback, callback) {
		assert(targetNode instanceof Node, 'Invalid targetNode parameter');
		assert(name === undefined || name === null || typeof (name) === 'string', 'Invalid name parameter');
		assert(initCallback === undefined || initCallback === null || typeof (initCallback) === 'function',
			'Invalid initCallback parameter');
		assert(typeof (callback) === 'function', 'Invalid callback parameter');

		if (name === targetNode.name) {
			// no need to have a name if the referenced has the same !
			name = undefined;
		}

		Node.createRef(targetNode, name, (error, node) => {
			if (error) {
				return callback(error);
			}

			if (initCallback) {
				initCallback(node);
			}

			this.registerNode(node, callback);
		});
	}

	/**
	 *
	 */
	createNode(name, upnpClass, attributes, initCallback, callback) {

		// assert(!attributes, "Invalid attributes parameter"); // It can be undefined ! (link)
		assert(upnpClass, 'Invalid upnpClass parameter');
		assert(initCallback === undefined || initCallback === null || typeof (initCallback) === 'function',
			'Invalid initCallback parameter');
		assert(typeof (callback) === 'function', 'Invalid callback parameter');

		if (typeof (upnpClass) === 'string') {
			var uc = this.upnpClasses[upnpClass];
			assert(uc, 'Item class is not defined for ' + upnpClass);

			upnpClass = uc;
		}

		assert(upnpClass instanceof UpnpItem, 'Upnpclass must be an item (name=' +
			name + ' upnpClass=' + upnpClass + ')');

		Node.create(this, name, upnpClass, attributes, (error, node) => {
			if (error) {
				return callback(error);
			}

			if (initCallback) {
				initCallback(node);
			}

			this.registerNode(node, callback);
		});
	}

	/**
	 *
	 */
	newNodeRef(parent, targetNode, name, initCallback, before, callback) {

		this.createNodeRef(targetNode, name, initCallback, (error, node) => {
			if (error) {
				debug('newNodeRef: createNodeRef error=', error);
				return callback(error);
			}

			parent.insertBefore(node, before, (error) => {
				if (error) {
					debug('newNodeRef: insertBefore error=', error);
					return callback(error);
				}

				return callback(null, node, node.id);
			});
		});
	}

	/**
	 *
	 */
	newNode(parentNode, name, upnpClass, attributes, initCallback, before, callback) {

		assert(parentNode instanceof Node, 'Invalid parentNode parameter');
		assert(typeof (name) === 'string', 'Invalid name parameter');
		assert(typeof (callback) === 'function', 'Invalid callback parameter');

		attributes = attributes || {};

		upnpClass = upnpClass || UpnpItem.UPNP_CLASS;

		this.createNode(name, upnpClass, attributes, initCallback, (error, node) => {
			if (error) {
				logger.error('Can not create node name=', name, 'error=', error);
				return callback(error);
			}

			parentNode.insertBefore(node, before, (error) => {
				if (error) {
					logger.error('Append child error #', node.id, 'error=', error);
					return callback(error);
				}

				callback(null, node, node.id);
			});
		});
	}

	/**
	 *
	 */
	registerUpdate(node) {

		// Very expensive, this function is called very very often
		this.updateIds[node.id] = node.updateId;
		this.stateVars['SystemUpdateID'].set(this.stateVars['SystemUpdateID'].get() + 1);
		this.stateVars['ContainerUpdateIDs'].moderate();
	}

	/**
	 *
	 */
	registerNode(node, callback) {
		this._nodeRegistry.registerNode(node, (error) => {
			if (error) {
				return callback(error);
			}

			this.asyncEmit('newNode', node, () => callback(null, node));
		});
	}

	/**
	 *
	 */
	saveNode(node, modifiedProperties, callback) {
		var upnpServer = this.upnpServer;
		if (upnpServer.logActivity && node.contentURL) {
			upnpServer.logActivity('Processed ' + node.contentURL.path);
		}

		this._nodeRegistry.saveNode(node, modifiedProperties, (error) => {
			if (error) {
				return callback(error);
			}

			this.asyncEmit('saveNode', node, modifiedProperties, callback);
		});
	}

	/**
	 *
	 */
	getNodeById(id, options, callback) {
		if (arguments.length === 2) {
			callback = options;
			options = null;
		}

		this._nodeRegistry.getNodeById(id, callback);
	}

	/**
	 *
	 */
	allocateNodeId(node, callback) {
		this._nodeRegistry.allocateNodeId(node, callback);
	}

	/**
	 *
	 */
	unregisterNode(node, callback) {
		assert(node instanceof Node, 'Invalid node parameter');
		assert(typeof (callback) === 'function', 'Invalid callback parameter');

		this.asyncEmit('deleteNode', node, (error) => {
			if (error) {
				return callback(error);
			}

			this._nodeRegistry.unregisterNode(node, callback);
		});
	}

	/**
	 *
	 */
	processRequest(request, response, path, callback) {

		this._lastRequestDate = Date.now();
		request.contentDirectoryService = this;

		var reg = /([^/]+)(\/.*)?/.exec(path);
		if (!reg) {
			return callback('Invalid path (' + path + ')');
		}
		var segment = reg[1];
		var action = reg[2] && reg[2].slice(1);

		switch (segment) {
			case 'content':
				var parameters = action.split('/');
				var nid = parameters.shift();

				var id = this._nodeRegistry.keyFromString(nid);

				debug('processRequest: Request node=', id, 'requestId=', nid, 'parameters=', parameters, 'request=', path);

				this.getNodeById(id, (error, node) => {
					if (error) {
						logger.error('processRequest: GetNodeById id=', id, ' throws error=', error);
						return callback(error);
					}

					if (!node || !node.id) {
						logger.error('Send content of node=#', id, 'not found');

						this.emit('request-error', request, id);

						response.writeHead(404, 'Node #' + id + ' not found');
						response.end();
						return callback(null, true);
					}

					node.resolveLink((error, nodeRef) => {
						if (error) {
							logger.error('processRequest: ResolveLink error node=', id, 'error=', error);
							return callback(error);
						}

						this.emit('request', request, nodeRef, node, parameters);

						if (request.method == 'DELETE')
							this.processNodeDeletion(nodeRef, request, response, parameters, callback);
						else
							this.processNodeContent(nodeRef, request, response, path, parameters, callback);
					});
				});
				return;

			case 'desc':
				id = 0;
				if (action) {
					parameters = action.split('/');
					nid = parameters.shift();

					id = this._nodeRegistry.keyFromString(nid);
				}

				this.getNodeById(id, (error, node) => {
					if (error) {
						logger.error('/tree get node #', id, 'returns error', error);
						return callback(error);
					}
					if (!node) {
						return callback('Node not found !');
					}

					var string = JSON.stringify(node.attributes, null, 2);

					response.setHeader('Content-Type', 'application/json; charset="utf-8"');
					response.end(string, 'UTF8');
					callback(null, true);
				});
				return;

			case 'tree':
				id = 0;
				if (action) {
					parameters = action.split('/');
					nid = parameters.shift();

					id = this._nodeRegistry.keyFromString(nid);
				}

				this.getNodeById(id, (error, node) => {
					if (error) {
						logger.error('/tree get node #', id, 'returns error', error);
						return callback(error);
					}
					if (!node) {
						return callback('Node not found !');
					}

					node.browseChildren({
						request: request
					}, (error /*, children*/ ) => {
						if (error) {
							logger.error('/tree list children of #', id, 'returns error', error);
							return callback(error);
						}

						node.treeString((error, string) => {
							if (error) {
								logger.error('/tree treeString() returns error', error);
								return callback(error);
							}

							response.setHeader('Content-Type', 'text/plain; charset="utf-8"');
							response.end(string, 'UTF8');
							callback(null, true);
						});
					});
				});
				return;

		}

		super.processRequest(request, response, path, callback);
	}

	getRepositoryForPath(path) {
		var mt = PathNormalizer.getMime(path);
		var repository = this.repositories[0];
		this.repositories.forEach((item) => {
			if (mt.startsWith('audio') && (item.type == 'music'))
				repository = item;
			if (mt.startsWith('video') && (item.type == 'movie'))
				repository = item;
		});
		return repository;
	}

	rescanPath(path, repository, callback) {
		path = PathNormalizer.normalize(PathNormalizer.removeLastSlash(path));
		var dt = Date.now();

		repository._directoryURL = this.newURL(path);
		repository.scan(this, repository._mountPathNode, (error) => {
			if (error) {
				logger.info('Scanning of ' + path + ' has failed: ' + error);
			} else {
				var s = ((Date.now() - dt) / 1000).toFixed(2);
				logger.info(`Scan of repository ${path} has been finished in ${s} seconds`);
			}
			repository._directoryURL = this.newURL(repository.originalPath);
			if (callback)
				callback( /*error*/ ); // don't bubble the error so that other locations are processed
		});
	}

	insertFile(path, repository, metas /* optional */ , callback) {
		path = PathNormalizer.normalize(path);
		var dt = Date.now();
		var infos = {};
		infos.contentURL = this.newURL(path);
		infos.mimeType = PathNormalizer.getMime(path);
		if (metas) {
			if (!metas.mimeType)
				metas.mimeType = PathNormalizer.getMime(path);
			infos.attributes = metas; // this assignment causes that the metas will be used in processFile (and not read from the file tag)
			infos.mimeType = metas.mimeType;
		}
		repository.processFile(repository._mountPathNode, infos, (error, attributes) => {
			if (error) {
				logger.error('Scanning of ' + path + ' has failed: ' + error);
			} else {
				var s = Math.floor((Date.now() - dt) / 1000);
				logger.debug(`Scan of file ${path} has been finished in ${s} second${(s > 1) ? 's' : ''}`);
			}
			if (callback)
				callback(error, attributes);
		});
	}

	processNodeDeletion(node, request, response, parameters, callback) {

		if (!node.isUpnpContainer) {
			// this is a file deletion	
			var contentURL = node.contentURL;
			if (!contentURL) {
				logger.error('Resource not found for node #', node.id);

				response.writeHead(404, 'Resource not found for node #' + node.id);
				response.end();
				return callback(null, true);
			}

			var path = contentURL.path;
			fs.unlink(path, (err) => {
				if (!err) {
					this.nodeRegistry.deleteMetas(node.attributes);
					node.remove(true, () => {
						response.writeHead(200, 'OK');
						response.end();
						callback(null, true);
					});
				} else {
					response.writeHead(423, 'Locked');
					response.end(err);
					callback(err, true);
				}
			});
		} else {
			// this is a container deletion (like playlist)
			var _failure = function (error_description) {
				logger.error(error_description);
				response.writeHead(400, 'Bad Request');
				response.end(error_description);
				callback(null, true);
			};
			if (node.upnpClass.name == 'object.container.playlistContainer') {
				this.getNodeById(node.parentId, (err, parent) => {
					if (!err && parent) {
						this.nodeRegistry.deletePlaylist({
							guid: node.guid,
							parent_guid: parent.guid
						}, (err) => {
							if (!err) {
								node.remove(false, () => {
									response.writeHead(200, 'OK');
									response.end();
									callback(null, true);
								});
							} else {
								_failure(err);
							}
						});
					} else {
						_failure(err);
					}
				});
			} else {
				_failure('Deletion not supported for class ' + node.upnpClass.name);
			}
		}
	}

	/**
	 *
	 */
	processNodeContent(node, request, response, path, parameters, callback) {

		var contentHandlerName = parameters[0];
		if (contentHandlerName !== undefined) {
			var contentHandler = this.contentHandlersByName[contentHandlerName];

			debug('Process request: contentHandler key=', contentHandlerName); // , " handler=",contentHandler);

			if (!contentHandler) {
				logger.error('Content handler not found: ' + contentHandlerName + ' for node #' + node.id);

				response.writeHead(404, 'Content handler not found: ' + contentHandlerName);
				response.end();
				return callback(null, true);
			}

			parameters.shift();

			contentHandler.processRequest(node, request, response, path, parameters, callback);
			return;
		}

		var contentURL = node.contentURL;

		if (!contentURL) {
			logger.error('Resource not found for node #', node.id);

			response.writeHead(404, 'Resource not found for node #' + node.id);
			response.end();
			return callback(null, true);
		}

		var attributes = node.attributes || {};

		if (attributes.db_id) {
			// this is audio/video file, go through MediaProvider to use Transcoder
			MediaProvider.getFileStream(attributes.db_id, request, response, callback);
		} else {
			this.sendContentURL({
				contentURL: contentURL,
				mtime: node.contentTime,
				hash: node.contentHash,
				size: attributes.size,
				mimeType: attributes.mimeType
			}, request, response, callback);
		}
	}

	sendContentStream(attributes, request, response, callback) {
		debug('sendContentStream', 'headers=', request.headers, 'headersSent=', response.headersSent);
		const stream = attributes.stream;

		if (attributes.mimeType !== undefined) {
			response.setHeader('Content-Type', attributes.mimeType);
		}
		if (request.headers && request.headers.origin)
			response.setHeader('Access-Control-Allow-Origin', request.headers.origin);

		response.setHeader('Content-Length', attributes.size);

		if (attributes.duration !== undefined) {
			response.setHeader('Content-Duration', attributes.duration);
			response.setHeader('X-Content-Duration', attributes.duration); // Older Mozilla version
		}

		// var opts = {};
		// var ranges = request.headers.range;
		// if (ranges) {
		// 	// var rs = rangeParser(attributes.size /*999999999*/ /*todo*/, ranges);
		// 	var rs = rangeParser(999999999 /*todo*/, ranges);
		// 	debug('sendContentURL', 'RangeParser=', rs, 'ranges=', ranges, 'headersSent=', response.headersSent);

		// 	if (rs === -1) {
		// 		debug('sendContentURL', 'range unsatisfiable rs=', rs, 'ranges=', ranges, 'size=', attributes.size);
		// 		response.setHeader('Content-Range', 'bytes */' + attributes.size);
		// 		response.writeHead(416, 'Range unsatisfiable');
		// 		response.end();
		// 		return callback(null, true);
		// 	}

		// 	opts.start = rs[0].start;
		// 	opts.end = rs[0].end;

		// 	// response.setHeader('Content-Range', 'bytes ' + opts.start + '-' + opts.end + '/' + attributes.size);
		// 	response.setHeader('Content-Range', 'bytes */*');
		// 	response.statusCode = 206;
		// 	response.statusMessage = 'Range OK';
		// }

		stream.on('end', () => {
			response.end();
			callback(null, true);
		});

		stream.pipe(response);
	}

	/**
	 *
	 */
	sendContentURL(attributes, request, response, callback) {
		var contentURL = attributes.contentURL;
		debug('sendContentURL', 'contentURL=', contentURL, 'headers=', request.headers, 'headersSent=', response.headersSent);

		var fillHeader = () => {
			if (attributes.mtime) {
				var m = attributes.mtime;
				if (typeof (m) === 'number') {
					m = new Date(m);
				}
				response.setHeader('Last-Modified', m.toUTCString());
			}
			if (attributes.contentHash) {
				response.setHeader('ETag', attributes.contentHash);
			}
			if (attributes.size !== undefined) {
				response.setHeader('Content-Length', attributes.size);
			}
			if (attributes.mimeType !== undefined) {
				response.setHeader('Content-Type', attributes.mimeType);
			}
			response.setHeader('Cache-Control', 'public,  max-age=604800');
		};

		if (contentURL.contentProvider.isLocalFilesystem) {
			var stream = send(request, contentURL.path);

			fillHeader();

			stream.pipe(response);

			stream.on('end', () => callback(null, true));
			return;
		}

		if (!attributes.mimeType || attributes.size === undefined) {
			contentURL.stat((error, stats) => {
				if (error) {
					logger.error('Can not stat contentURL=', contentURL);

					response.writeHead(404, 'Stream not found for linked content');
					response.end();
					return callback(null, true);
				}

				attributes.mimeType = stats.mimeType;
				attributes.size = stats.size;
				attributes.mtime = stats.mtime;

				this.sendContentURL(attributes, request, response, callback);
			});
			return;
		}

		var opts = {};

		var ranges = request.headers.range;
		if (ranges) {
			var rs = rangeParser(attributes.size, ranges);
			debug('sendContentURL', 'RangeParser=', rs, 'ranges=', ranges, 'headersSent=', response.headersSent);

			if (rs === -1) {
				debug('sendContentURL', 'range unsatisfiable rs=', rs, 'ranges=', ranges, 'size=', attributes.size);
				response.setHeader('Content-Range', 'bytes */' + attributes.size);
				response.writeHead(416, 'Range unsatisfiable');
				response.end();
				return callback(null, true);
			}

			opts.start = rs[0].start;
			opts.end = rs[0].end;

			response.setHeader('Content-Range', 'bytes ' + opts.start + '-' + opts.end + '/' + attributes.size);
			response.statusCode = 206;
			response.statusMessage = 'Range OK';
		}

		contentURL.createReadStream(null, opts, (error, stream) => {
			if (error) {
				logger.error('No stream for contentURL=', contentURL);

				if (!response.headersSent) {
					response.writeHead(404, 'Stream not found for linked content');
				}
				response.end();
				return callback(null, true);
			}

			fillHeader();

			stream.pipe(response);

			stream.on('end', () => callback(null, true));
		});
	}

	//kept for Intel upnp toolkit, but not in upnp spec
	/**
	 *
	 */
	_sendItemChangesEvent() {
		var systemUpdateId = this.stateVars['SystemUpdateID'].get();
		if (this._previousSystemUpdateId == systemUpdateId) {
			// return; // We must always send message !
		}
		this._previousSystemUpdateId = systemUpdateId;

		var xmlProps = [];

		this.stateVars['SystemUpdateID'].pushEventJXML(xmlProps);

		var message = this.stateVars['ContainerUpdateIDs'].get();
		if (message.length) {
			this.stateVars['ContainerUpdateIDs'].pushEventJXML(xmlProps);
		}

		this.makeEvent(xmlProps);
	}

	/**
	 *
	 */
	newURL(url) {
		assert.equal(typeof (url), 'string', 'Invalid url parameter');

		if (os.platform() === 'win32') {
			url = url.replace(/\\/g, '/');
		}

		if (url.charAt(0) === '/') {
			return new URL(this._contentProvidersByProtocol.file, url);
		}

		var reg = PROTOCOL_SPLITTER.exec(url);
		if (!reg) {
			return new URL(this._contentProvidersByProtocol.file, url);
		}

		var protocol = reg[1].toLowerCase();

		var contentProvider = this._contentProvidersByProtocol[protocol];
		if (!contentProvider) {
			logger.error('Can not find a contentProvider with protocol \'' + protocol + '\'');
			throw new Error('Unknown protocol: \'' + protocol + '\'');
		}

		debug('newURL', 'GetContentProvider type of ', url, '=>', contentProvider.name);

		if (contentProvider === this._contentProvidersByProtocol.file) {
			return new URL(contentProvider, url);
		}

		return new URL(contentProvider, reg[2]);
	}

	/**
	 *
	 */
	_emitPrepare(mime, contentInfos, attributes, callback) {
		attributes = attributes || {};

		// console.log("Emit 'prepare:'" + mime+" "+node.attributes.contentURL);
		this.asyncEmit('prepare:' + mime, contentInfos, attributes, (error) => {
			if (error === false) {
				// setImmediate(callback);
				// return;
			}

			var reg = /^([^/]+)\/(.+)$/.exec(mime);
			if (!reg || reg[2] === '*') {
				return callback(error, attributes);
			}

			var mime2 = reg[1] + '/*';

			// console.log("Emit 'prepare:'" + mime2);

			if (debugStack.enabled) {
				debugStack('prepareNodeAttributes depth=' + _stackDepth());
			}

			this.asyncEmit('prepare:' + mime2, contentInfos, attributes, (error2) => {
				callback(error2 || error, attributes);
			});
		});
	}

	/**
	 *
	 */
	_emitToJXML(node, attributes, request, filterCallback, xml, callback) {
		var mimeType = attributes.mimeType;
		if (!mimeType) {
			return callback();
		}

		var eventName = 'toJXML:' + mimeType;

		var mime2 = mimeType.split('/')[0] + '/*';
		var eventName2 = 'toJXML:' + mime2;

		if (!this.hasListeners(eventName) && !this.hasListeners(eventName2)) {
			return callback();
		}

		this.asyncEmit(eventName, node, attributes, request, filterCallback, xml,
			(error) => {
				if (error === false) {
					return callback();
				}

				this.asyncEmit(eventName2, node, attributes, request, filterCallback,
					xml, (error) => {
						if (error !== false) {
							return callback(error);
						}

						callback();
					});
			});
	}

	/**
	 *
	 */
	searchUpnpClass(fileInfos, callback) {
		var list = [];

		if (fileInfos.stats) {
			if (fileInfos.stats.isDirectory()) {
				list.push({
					upnpClass: this.upnpClasses[UpnpContainer.UPNP_CLASS],
					priority: 0
				});
			}
		}

		if (fileInfos.mimeType) {
			var byMimeType = this.upnpClassesByMimeType;

			var upnpClasses = byMimeType[fileInfos.mimeType];
			if (upnpClasses) {
				upnpClasses.forEach((upnpClass) => {
					list.push({
						upnpClass: upnpClass,
						priority: 20
					});
				});
			}

			var mimeParts = fileInfos.mimeType.split('/');
			upnpClasses = byMimeType[mimeParts[0] + '/*'];
			if (upnpClasses) {
				upnpClasses.forEach((upnpClass) => {
					list.push({
						upnpClass: upnpClass,
						priority: 10
					});
				});
			}
		}

		Async.eachSeries(this.contentHandlers || [], (contentHandler, callback) => {
			contentHandler.searchUpnpClass(fileInfos, (error, ret) => {
				if (error) {
					return callback(error);
				}

				if (!ret || !ret.length) {
					return callback();
				}

				if (!Util.isArray(ret)) {
					if (ret.upnpClass) {
						list.push(ret);
					}
					return callback();
				}

				list = list.concat(ret);

				callback();
			});

		}, (error) => {
			if (error) {
				return callback(error);
			}

			if (list.length > 1) {
				list.sort((s1, s2) => {
					var d = s2.priority - s1.priority;
					if (d) {
						return d;
					}
					return s2.upnpClass.name.length - s1.upnpClass.name.length;
				});
			}

			/*
			if (false && debug.enabled) {
				debug('searchUpnpClass: Return list=', Util.inspect(list, {
					depth: null
				}));
			}
			*/

			callback(null, list);
		});
	}

	/**
	 *
	 */
	get nodeRegistry() {
		return this._nodeRegistry;
	}

	/**
	 *
	 */
	loadMetas(infos, callback) {

		var mimeType = infos.mimeType;
		var contentURL = infos.contentURL;
		if (!mimeType) {
			mimeType = contentURL.mimeLookup();
		}

		var lm = (stats) => {
			var mtime = stats.mtime.getTime();

			this.nodeRegistry.getMetas(contentURL.path, mtime, (error, metas) => {
				debugMetas('getMetas of key=', contentURL, 'mtime=', mtime, '=>', metas, 'error=', error);
				if (error) {
					logger.error('Can not get metas of', contentURL, error);
				}

				if (metas) {
					assert(metas.db_id, 'db_id missing for ' + contentURL.path);
					return callback(null, metas);
				}

				this._emitPrepare(mimeType, infos, {}, (error, metas) => {
					if (error) {
						logger.error('Can not compute metas of', contentURL, error);
						//          return foundCallback(error);
						metas = {
							error: true
						};
					}

					metas.mimeType = mimeType;
					if (!metas.title)
						metas.title = infos.contentURL.basename; // LS: assign filename for videos with unknown title
					if (stats.size)
						metas.size = stats.size;

					debugMetas('getMetas: prepare metas=>', metas);

					this.nodeRegistry.putMetas(contentURL.path, mtime, metas, (error1) => {
						if (error1) {
							logger.error('Can not put metas of', contentURL, error1);
						}

						assert(metas.db_id, 'db_id missing for ' + contentURL.path);

						callback(error || error1, metas);
					});
				});
			});
		};

		if (infos.stats) {
			return lm(infos.stats);
		}

		debugMetas('getMetas: load stats of', contentURL);

		contentURL.stat((error, stats) => {
			if (error) {
				logger.error('Can not stat', contentURL, error);
				return callback(error);
			}

			infos.stats = stats;
			lm(stats);
		});
	}
}

/*
function mimeTypeMatch(mime, chs) {

	var s1 = mime.split('/');

	return chs.find((ch) => {
		var s2 = ch.split('/');

		if (s2[0] !== '*' && s1[0] !== s2[0]) {
			return false;
		}

		if (s2[1] !== '*' && s1[1] !== s2[1]) {
			return false;
		}

		return true;
	});
}
*/

function _stackDepth() {
	return new Error().stack.split('\n').length - 1;
}

function _setupContentHandlerMimeTypes(cht, handlers /*, mergeWildcard*/ ) {
	Object.keys(handlers).forEach((key) => {
		var handler = handlers[key];
		var mimeTypes = handler.mimeTypes;
		if (!mimeTypes) {
			return;
		}

		mimeTypes.forEach((mimeType) => {
			var cmt = cht[mimeType];
			if (!cmt) {
				cmt = [];
				cht[mimeType] = cmt;
			}

			cmt.push(handler);
		});
	});

	Object.keys(cht).forEach((mimeType4) => {
		var mts2 = cht[mimeType4];

		mts2.sort((ch1, ch2) => {
			var p1 = ch1.priority || 0;
			var p2 = ch2.priority || 0;

			return p2 - p1;
		});
	});

	if (debug.enabled) {
		for (var mimeType5 in cht) {
			debug('Handler Mime \'' + mimeType5 + '\' => ' + cht[mimeType5]);
		}
	}
}

function _applySortCriteria(lxml, sortCriteria) {

	if (typeof (sortCriteria) === 'string') {
		sortCriteria = sortCriteria.split(',');
	}

	// console.log("Sort criteria = ", sortCriteria, " upnpClass=", node.upnpClass);

	var sortFunction = null;
	sortCriteria.forEach(function (c) {
		c = c.trim();

		var descending = (c.charAt(0) === '-');

		sortFunction = _createSortCriteria(sortFunction, c.substring(1), descending);
	});

	lxml.sort(sortFunction);
}

function _createSortCriteria(func, criteria, descending) {
	return (x1, x2) => {
		if (func) {
			var ret = func(x1, x2);
			if (ret) {
				return ret;
			}
		}

		var n1 = _getNodeContent(x1, criteria, descending);
		var n2 = _getNodeContent(x2, criteria, descending);

		// console.log("Compare ", n1, "<>", n2, " ", descending);

		if (isNaN(n1))
			n1 = AlphaNormalizer.normalize(n1).replace('the ', '').trim();
		if (isNaN(n2))
			n2 = AlphaNormalizer.normalize(n2).replace('the ', '').trim();

		if (n1 == n2)
			return 0;
		if (isNaN(n2) && n2 == '')
			return (descending) ? 1 : -1;
		if (isNaN(n1) && n1 == '')
			return (descending) ? -1 : 1;
		if (n1 < n2)
			return (descending) ? 1 : -1;
		if (n1 > n2)
			return (descending) ? -1 : 1;
	};
}

function _getNodeContent(node, name, descending) {
	var contents = node._content;
	var found;

	// console.log("Get ", name, descending, " of node ", node);

	for (var i = 0; i < contents.length; i++) {
		var content = contents[i];
		if (content._name !== name) {
			continue;
		}

		var c = content._content;

		if (found === undefined) {
			found = c;
			continue;
		}

		if ((!descending && found < c) || (descending && found > c)) {
			continue;
		}

		found = c;
	}

	// console.log("Get node '" + name + "' of ", node, " => ", found);

	return found || '';
}

module.exports = ContentDirectoryService;