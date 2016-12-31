/**
 * External dependencies
 */
import { combineReducers } from 'redux';

/**
 * Internal dependencies
 */
import MediaQueryManager from 'lib/query-manager/media';
import { createReducer } from 'state/utils';
import { MEDIA_ITEMS_RECEIVE, MEDIA_ITEMS_REQUESTING } from 'state/action-types';

export function queryRequests( state = {}, { type, siteId, query } ) {
	switch ( type ) {
		case MEDIA_ITEMS_REQUESTING:
		case MEDIA_ITEMS_RECEIVE:
			return {
				...state,
				[ siteId + ':' + MediaQueryManager.QueryKey.stringify( query ) ]: MEDIA_ITEMS_REQUESTING === type
			};
	}

	return state;
}

export const queries = ( () => {
	function applyToManager( state, siteId, method, createDefault, ...args ) {
		if ( ! state[ siteId ] ) {
			if ( ! createDefault ) {
				return state;
			}

			return {
				...state,
				[ siteId ]: ( new MediaQueryManager() )[ method ]( ...args )
			};
		}

		const nextManager = state[ siteId ][ method ]( ...args );

		if ( nextManager === state[ siteId ] ) {
			return state;
		}

		return {
			...state,
			[ siteId ]: nextManager
		};
	}

	return createReducer( {}, {
		[ MEDIA_ITEMS_RECEIVE ]: ( state, { siteId, query, items, found } ) => {
			return applyToManager( state, siteId, 'receive', true, items, { query, found } );
		}
	} );
} )();

export default combineReducers( {
	queries,
	queryRequests
} );
