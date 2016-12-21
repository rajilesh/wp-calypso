/**
 * External dependencies
 */
import {
	flowRight as compose,
	get,
} from 'lodash';

export const getAutomatedTransfer = ( state, siteId ) =>
	get( state, [ 'automatedTransfer', siteId ], {} );

/**
 * Helper to get status state from local transfer state sub-tree
 *
 * @param {Object} transferState automated transfer state sub-tree for a site
 * @returns {string} status of transfer
 */
export const getStatusData = transferState => get( transferState, 'status', null );

/**
 * Returns status info for transfer
 *
 * @param {Object} state global app state
 * @param {number} siteId requested site for transfer info
 * @returns {string|null} status if available else `null`
 */
export const getAutomatedTransferStatus = compose(
	getStatusData,
	getAutomatedTransfer,
);

/**
 * Helper to get eligibility state from local transfer state sub-tree
 *
 * @param {Object} transferState automated transfer state sub-tree for a site
 * @returns {Object} eligibility information for site
 */
export const getEligibilityData = transferState => get( transferState, 'eligibility', { lastUpdate: 0 } );

/**
 * Returns eligibility info for transfer
 *
 * @param {Object} state global app state
 * @param {number} siteId requested site for transfer info
 * @returns {object} eligibility data if available else empty info
 */
export const getEligibility = compose(
	getEligibilityData,
	getAutomatedTransfer,
);

export const getPluginData = transferState => get( transferState, 'plugin', null );

export const getPlugin = compose(
	getPluginData,
	getAutomatedTransfer,
);

export const getThemeData = transferState => get( transferState, 'theme', null );

export const getTheme = compose(
	getThemeData,
	getAutomatedTransfer,
);
