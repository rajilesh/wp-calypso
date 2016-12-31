/**
 * Internal dependencies
 */
import { MEDIA_ITEMS_RECEIVE, MEDIA_ITEMS_REQUEST, MEDIA_ITEMS_REQUESTING } from 'state/action-types';

export function receiveMediaItems( siteId, query, items, found ) {
	return {
		type: MEDIA_ITEMS_RECEIVE,
		siteId,
		query,
		items,
		found
	};
}

export function requestMediaItems( siteId, query ) {
	return {
		type: MEDIA_ITEMS_REQUEST,
		siteId,
		query
	};
}

export function requestingMediaItems( siteId, query ) {
	return {
		type: MEDIA_ITEMS_REQUESTING,
		siteId,
		query
	};
}
