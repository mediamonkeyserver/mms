import PubSub from 'pubsub-js';

// export const toggleMainDrawer = () => {return {type: 'TOGGLE_MAIN_DRAWER'}}

export function subscribeViewChange(callback) {
	return PubSub.subscribe('SHOW_VIEW', callback);
}

export function changeCollectionSort(collection, newSort) {
	PubSub.publish('COLLECTION_SORT', {collection: collection, newSort: newSort});
	// TODO: update server state with the sort choice
}

export function subscribeCollectionSort(callback) {
	return PubSub.subscribe('COLLECTION_SORT', callback);
}