import PubSub from 'pubsub-js';

// export const toggleMainDrawer = () => {return {type: 'TOGGLE_MAIN_DRAWER'}}

// == View changes ==

export const VIEWS = {
	Log: 'log',
	Collection: 'collection',
};

export function showView(view, props) {
	PubSub.publish('SHOW_VIEW', { view: view, props: props });
}

export function subscribeViewChange(callback) {
	return PubSub.subscribe('SHOW_VIEW', (msg, data) => callback(data));
}

// == Collection sorting ==

export function changeCollectionSort(collection, newSort) {
	PubSub.publish('COLLECTION_SORT', { collection: collection, newSort: newSort });
	// TODO: update server state with the sort choice
}

export function subscribeCollectionSort(callback) {
	return PubSub.subscribe('COLLECTION_SORT', (msg, data) => callback(data));
}

// == Collection filtering ==

var filters = [];

export function addCollectionFilter(collection, newFilter) {
	var replace = filters.findIndex(f => f.field === newFilter.field);
	if (replace < 0)
		filters.push(newFilter);
	else
		filters[replace] = newFilter;
	PubSub.publish('COLLECTION_CHANGE_FILTERS', { collection: collection, filters: filters });
}

export function subscribeCollectionChangeFilters(callback) {
	return PubSub.subscribe('COLLECTION_CHANGE_FILTERS', (msg, data) => callback(data));
}

export function getCollectionFilters() {
	return filters;
}

export function removeCollectionFilter(collection, index) {
	filters.splice(index, 1);
	PubSub.publish('COLLECTION_CHANGE_FILTERS', { collection: collection, filters: filters });
}

// == Logs ==

export function subscribeLogChanges(callback) {
	return PubSub.subscribe('NEW_LOG_ITEM', (msg, data) => callback(data));
}

export function forceLogRefresh() {
	PubSub.publish('NEW_LOG_ITEM');
}

// == Playback ==

export function notifyPlaybackState() {
	PubSub.publish('PLAYBACK_STATE');
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