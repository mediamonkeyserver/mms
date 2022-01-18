// @ts-check
import PubSub from 'pubsub-js';

// export const toggleMainDrawer = () => {return {type: 'TOGGLE_MAIN_DRAWER'}}

// == View changes ==

export const VIEWS = {
	Log: 'log',
	Collection: 'collection',
};

// == Collection sorting ==

export function changeCollectionSort(collectionID, newSort) {
	PubSub.publish('COLLECTION_SORT', { collectionID: collectionID, newSort: newSort });
	// TODO: update server state with the sort choice
}

export function subscribeCollectionSort(callback) {
	return PubSub.subscribe('COLLECTION_SORT', (msg, data) => callback(data));
}

// == Collection filtering ==

var filters = [];

export function addCollectionFilter(collectionID, newFilter) {
	var replace = filters.findIndex(f => f.field === newFilter.field);
	if (replace < 0)
		filters.push(newFilter);
	else
		filters[replace] = newFilter;
	PubSub.publish('COLLECTION_CHANGE_FILTERS', { collectionID: collectionID, filters: filters });
}

export function subscribeCollectionChangeFilters(callback) {
	return PubSub.subscribe('COLLECTION_CHANGE_FILTERS', (msg, data) => callback(data));
}

export function getCollectionFilters() {
	return filters;
}

export function removeCollectionFilter(collectionID, index) {
	filters.splice(index, 1);
	PubSub.publish('COLLECTION_CHANGE_FILTERS', { collectionID: collectionID, filters: filters });
}

// == Logs ==

export function subscribeLogChanges(callback) {
	return PubSub.subscribe('NEW_LOG_ITEM', (msg, data) => callback(data));
}

export function unsubscribeLogChanges() {
	PubSub.unsubscribe('NEW_LOG_ITEM');
}

export function forceLogRefresh() {
	PubSub.publish('NEW_LOG_ITEM', null);
}

// == Playback ==

export function notifyPlaybackState(state, mediaItem) {
	PubSub.publish('PLAYBACK_STATE', {
		state: state,
		mediaItem: mediaItem,
	});
}

export function subscribePlaybackStateChange(callback) {
	return PubSub.subscribe('PLAYBACK_STATE', (msg, data) => callback(data));
}

export function subscribeVideoState(callback) {
	return PubSub.subscribe('VIDEO', (msg, data) => callback(data));
}

export function notifyVideoShow() {
	PubSub.publish('VIDEO', 'show');
}

export function notifyVideoHide() {
	PubSub.publish('VIDEO', 'hide');
}


// == Online/Offline State ==

export function subscribeOfflineStateChange(callback) {
	return PubSub.subscribe('OFFLINE_STATUS', (msg, data) => callback(data));
}

export function notifyOffline() {
	PubSub.publish('OFFLINE_STATUS', { offline: true });
}

export function notifyOnline() {
	PubSub.publish('OFFLINE_STATUS', { offline: false });
}


// == Global Vars ==

export function subscribeLoginStateChange(callback) {
	return PubSub.subscribe('LOGIN_STATE', (msg, data) => callback(data));
}

export function notifyLoginStateChange(data) {
	PubSub.publish('LOGIN_STATE', data);
}


// == Snackbar ==

export function subscribeSnackbarMessage(callback) {
	return PubSub.subscribe('SHOW_SNACKBAR', (msg, data) => callback(data));
}

/**
 * Show snackbar message.
 * @param {String} message Message to show 
 * @param {Object} [options] Options, such as autoHide timeout
 * @param {Number} [options.ttl=10000] Time-to-live for snackbar in milliseconds.
 */
export function showSnackbarMessage(message, options) {
	if (!options) options = {};
	PubSub.publish('SHOW_SNACKBAR', {
		message: message,
		autoHide: options.ttl
	});
}