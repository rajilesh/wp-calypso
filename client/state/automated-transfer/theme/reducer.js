/**
 * External dependencies
 */
import { combineReducers } from 'redux';
import { get, has } from 'lodash';

/**
 * Internal dependencies
 */
import uploadData from '../upload-data/reducer';
import {
	AUTOMATED_TRANSFER_INITIATE as INITIATE,
	AUTOMATED_TRANSFER_STATUS_UPDATE as UPDATE,
} from 'state/action-types';

export const id = ( state = '', action ) => get( {
	[ INITIATE ]: get( action, 'theme.id', state ),
	[ UPDATE ]: action.themeId || state,
}, action.type, state );

export default combineReducers( {
	id,
	uploadData: uploadData( ( state, action ) => has( action, 'themeId' ) ),
} );
