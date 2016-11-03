/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';
import { filter, some } from 'lodash';

/**
 * Internal dependencies
 */
var ServiceTip = require( './service-tip' ),
	ServiceDescription = require( './service-description' ),
	ServiceExamples = require( './service-examples' ),
	ServiceAction = require( './service-action' ),
	ServiceConnectedAccounts = require( './service-connected-accounts' ),
	notices = require( 'notices' ),
	observe = require( 'lib/mixins/data-observe' ),
	analytics = require( 'lib/analytics' ),
	FoldableCard = require( 'components/foldable-card' ),
	SocialLogo = require( 'components/social-logo' );

import AccountDialog from './account-dialog';
import {
	createSiteConnection,
	deleteSiteConnection,
	fetchConnections,
	updateSiteConnection,
} from 'state/sharing/publicize/actions';
import { getKeyringConnectionsByName } from 'state/sharing/keyring/selectors';
import {
	getRemovableConnections,
	getSiteUserConnectionsForService,
	isFetchingConnections } from 'state/sharing/publicize/selectors';
import { getAvailableExternalAccounts } from 'state/sharing/selectors';
import { getCurrentUser, getCurrentUserId } from 'state/current-user/selectors';
import { getSelectedSite, getSelectedSiteId } from 'state/ui/selectors';
import PopupMonitor from 'lib/popup-monitor';
import services from './services';
import { warningNotice } from 'state/notices/actions';

const SharingService = React.createClass( {
	displayName: 'SharingService',

	propTypes: {
		site: React.PropTypes.object,                    // The site for which connections are created
		user: React.PropTypes.object,                    // A user object
		service: React.PropTypes.object.isRequired,      // The single service object
		connections: React.PropTypes.object,             // A collections-list instance
	},

	mixins: [ observe( 'connections' ) ],

	/**
	 * Returns the available connections for the current user.
	 *
	 * @return {Array} Available connections.
	 */
	getConnections: function() {
		return this.filter( 'getConnections', this.props.service.ID, this.props.siteUserConnections, arguments );
	},

	/**
	 * Given an array of connection objects which are desired to be destroyed,
	 * returns a filtered set of connection objects to be destroyed. This
	 * enables service-specific handlers to react to destroy events.
	 *
	 * @param {Array|Object} connections A connection or array of connections
	 * @return {Array} Filtered set of connection objects to be destroyed
	 */
	filterConnectionsToRemove: function( connections ) {
		if ( ! Array.isArray( connections ) ) {
			connections = [ connections ];
		}

		return connections.filter( ( connection ) => this.filter( 'filterConnectionToRemove', connection.service, true, arguments ), this );
	},

	/**
	 * Given a service name and optional site ID, returns whether the Keyring
	 * authorization attempt succeeded in creating new Keyring account options.
	 *
	 * @param {string} service The name of the service
	 * @param {int}    siteId  An optional site ID
	 * @return {Boolean} Whether the Keyring authorization attempt succeeded
	 */
	didKeyringConnectionSucceed: function( service, siteId = 0 ) {
		const availableExternalAccounts = this.props.availableExternalAccounts,
			isAnyConnectionOptions = some( availableExternalAccounts, { isConnected: false } );

		if ( ! availableExternalAccounts.length ) {
			// At this point, if there are no available accounts to
			// select, we must assume the user closed the popup
			// before completing the authorization step.
			this.props.connections.emit( 'create:error', { cancel: true } );
		} else if ( ! isAnyConnectionOptions ) {
			// Similarly warn user if all options are connected
			this.props.connections.emit( 'create:error', { connected: true } );
		}

		return this.filter( 'didKeyringConnectionSucceed', service, availableExternalAccounts.length && isAnyConnectionOptions, [
			...arguments,
			availableExternalAccounts,
			siteId,
		] );
	},

	/**
	 * Passes value through a service-specific handler if one exists, allowing
	 * for service logic to be performed or the value to be modified.
	 *
	 * @param  {string} functionName      A function name to invoke
	 * @param  {string} serviceName       The name of the service
	 * @param  {*}      value             The value returned by original logic
	 * @param  {object} functionArguments An Array-like arguments object
	 * @return {*} The value returned by original logic.
	 */
	filter: function( functionName, serviceName, value, functionArguments ) {
		if ( serviceName in services && services[ serviceName ][ functionName ] ) {
			return services[ serviceName ][ functionName ].apply(
				this, [ value ].concat( Array.prototype.slice.call( functionArguments ) )
			);
		}

		return value;
	},

	getInitialState: function() {
		return {
			isOpen: false,          // The service is visually opened
			isConnecting: false,    // A pending connection is awaiting authorization
			isDisconnecting: false, // A pending disconnection is awaiting completion
			isRefreshing: false,    // A pending refresh is awaiting completion
			isSelectingAccount: false,
		};
	},

	componentWillReceiveProps: function( nextProps ) {
		if ( this.getConnections().length !== nextProps.siteUserConnections.length ) {
			this.setState( {
				isConnecting: false,
				isDisconnecting: false,
				isSelectingAccount: false,
			} );
		}
	},

	componentWillUnmount: function() {
		this.props.connections.off( 'refresh:success', this.onRefreshSuccess );
		this.props.connections.off( 'refresh:error', this.onRefreshError );
	},

	onRefreshSuccess: function() {
		this.setState( { isRefreshing: false } );
		this.props.connections.off( 'refresh:error', this.onRefreshError );

		notices.success( this.translate( 'The %(service)s account was successfully reconnected.', {
			args: { service: this.props.service.label },
			context: 'Sharing: Publicize reconnection confirmation'
		} ) );
	},

	onRefreshError: function() {
		this.setState( { isRefreshing: false } );
		this.props.connections.off( 'refresh:success', this.onRefreshSuccess );

		notices.error( this.translate( 'The %(service)s account was unable to be reconnected.', {
			args: { service: this.props.service.label },
			context: 'Sharing: Publicize reconnection confirmation'
		} ) );
	},

	refresh: function( oldConnection ) {
		this.setState( { isRefreshing: true } );
		this.props.connections.once( 'refresh:success', this.onRefreshSuccess );
		this.props.connections.once( 'refresh:error', this.onRefreshError );

		if ( ! oldConnection ) {
			// When triggering a refresh from the primary action button, find
			// the first broken connection owned by the current user.
			oldConnection = this.getConnections().filter( ( connection ) => ( 'broken' === connection.status ) );
		}
		this.refreshConnection( oldConnection );
	},

	performAction: function() {
		const connectionStatus = this.getConnectionStatus( this.props.service.ID );

		// Depending on current status, perform an action when user clicks the
		// service action button
		if ( 'connected' === connectionStatus && this.props.removableConnections.length ) {
			this.removeConnection();
			analytics.ga.recordEvent( 'Sharing', 'Clicked Disconnect Button', this.props.service.ID );
		} else if ( 'reconnect' === connectionStatus ) {
			this.refresh();
			analytics.ga.recordEvent( 'Sharing', 'Clicked Reconnect Button', this.props.service.ID );
		} else {
			this.connect();
			analytics.ga.recordEvent( 'Sharing', 'Clicked Connect Button', this.props.service.ID );
		}
	},

	addConnection: function( service, keyringConnectionId, externalUserId = false ) {
		const _this = this,
			siteId = this.props.site.ID;

		if ( service ) {
			if ( keyringConnectionId ) {
				// Since we have a Keyring connection to work with, we can immediately
				// create or update the connection
				const keyringConnections = filter( this.props.fetchConnections( siteId ), { keyringConnectionId: keyringConnectionId } );

				if ( siteId && keyringConnections.length ) {
					// If a Keyring connection is already in use by another connection,
					// we should trigger an update. There should only be one connection,
					// so we're correct in using the connection ID from the first
					this.props.updateSiteConnection( siteId, keyringConnections[ 0 ].ID, { external_user_ID: externalUserId } );
				} else {
					this.props.createSiteConnection( siteId, keyringConnectionId, externalUserId );
				}

				analytics.ga.recordEvent( 'Sharing', 'Clicked Connect Button in Modal', this.props.service.ID );
			} else {
				// Attempt to create a new connection. If a Keyring connection ID
				// is not provided, the user will need to authorize the app
				const popupMonitor = new PopupMonitor();

				popupMonitor.open( service.connect_URL, null, 'toolbar=0,location=0,status=0,menubar=0,' +
					popupMonitor.getScreenCenterSpecs( 780, 500 ) );

				popupMonitor.once( 'close', () => {
					// When the user has finished authorizing the connection
					// (or otherwise closed the window), force a refresh
					_this.props.fetchConnections( siteId );

					// In the case that a Keyring connection doesn't exist, wait for app
					// authorization to occur, then display with the available connections
					if ( this.didKeyringConnectionSucceed( service.ID, siteId ) && 'publicize' === service.type ) {
						_this.setState( { isSelectingAccount: true } );
					}
				} );
			}
		} else {
			// If an account wasn't selected from the dialog or the user cancels
			// the connection, the dialog should simply close
			this.props.warningNotice( this.translate( 'The connection could not be made because no account was selected.', {
				context: 'Sharing: Publicize connection confirmation'
			} ) );
			analytics.ga.recordEvent( 'Sharing', 'Clicked Cancel Button in Modal', this.props.service.ID );
		}

		// Reset active account selection
		this.setState( { isSelectingAccount: false } );
	},

	refreshConnection: function( connection ) {
		this.props.connections.refresh( connection );
	},

	/**
	 * Deletes the passed connections.
	 *
	 * @param {Array} connections Optional. Connections to be deleted.
	 *                            Default: All connections for this service.
	 */
	removeConnection: function( connections = this.props.removableConnections ) {
		this.setState( { isDisconnecting: true } );

		connections = this.filterConnectionsToRemove( connections );
		connections.map( this.props.deleteSiteConnection );
	},

	toggleSitewideConnection: function( connection, isSitewide ) {
		this.props.connections.update( connection, { shared: isSitewide } );
	},

	/**
	 * Given a service name and optional site ID, returns the current status of the
	 * service's connection.
	 *
	 * @param {string} service The name of the service to check
	 * @return {string} Connection status.
	 */
	getConnectionStatus: function( service ) {
		let status;

		if ( this.props.isFetching ) {
			// When connections are still loading, we don't know the status
			status = 'unknown';
		} else if ( ! some( this.getConnections(), { service } ) ) {
			// If no connections exist, the service isn't connected
			status = 'not-connected';
		} else if ( some( this.getConnections(), { status: 'broken' } ) ) {
			// A problematic connection exists
			status = 'reconnect';
		} else {
			// If all else passes, assume service is connected
			status = 'connected';
		}

		return this.filter( 'getConnectionStatus', service, status, arguments );
	},

	render: function() {
		const connectionStatus = this.getConnectionStatus( this.props.service.ID ),
			elementClass = [
				'sharing-service',
				this.props.service.ID,
				connectionStatus,
				this.state.isOpen ? 'is-open' : ''
			].join( ' ' ),
			iconsMap = {
				Facebook: 'facebook',
				Twitter: 'twitter',
				'Google+': 'google-plus',
				LinkedIn: 'linkedin',
				Tumblr: 'tumblr',
				Path: 'path',
				Eventbrite: 'eventbrite'
			},
			accounts = this.state.isSelectingAccount ? this.props.availableExternalAccounts : [];

		const header = (
			<div>
				<SocialLogo
					icon={ iconsMap[ this.props.service.label ] }
					size={ 48 }
					className="sharing-service__logo" />

				<div className="sharing-service__name">
					<h2>{ this.props.service.label }</h2>
					<ServiceDescription
						service={ this.props.service }
						status={ connectionStatus }
						numberOfConnections={ this.getConnections().length } />
				</div>
			</div>
		);

		const content = (
			<div
				className={ 'sharing-service__content ' + ( this.props.isFetching ? 'is-placeholder' : '' ) }>
				<ServiceExamples service={ this.props.service } site={ this.props.site } />
				<ServiceConnectedAccounts
					site={ this.props.site }
					user={ this.props.user }
					service={ this.props.service }
					connections={ this.props.siteUserConnections }
					onAddConnection={ this.connect }
					onRemoveConnection={ this.removeConnection }
					isDisconnecting={ this.state.isDisconnecting }
					onRefreshConnection={ this.refresh }
					onToggleSitewideConnection={ this.toggleSitewideConnection } />
				<ServiceTip service={ this.props.service } />
			</div> );

		const action = (
			<ServiceAction
				status={ connectionStatus }
				service={ this.props.service }
				onAction={ this.performAction }
				isConnecting={ this.state.isConnecting }
				isRefreshing={ this.state.isRefreshing }
				isDisconnecting={ this.state.isDisconnecting }
				removableConnections={ this.props.removableConnections } />
		);
		return (
			<div>
				<AccountDialog
					isVisible={ this.state.isSelectingAccount }
					service={ this.props.service }
					accounts={ accounts }
					onAccountSelected={ this.addConnection } />
				<FoldableCard
					className={ elementClass }
					header={ header }
					clickableHeader
					compact
					summary={ action }
					expandedSummary={ action } >
					{ content }
				</FoldableCard>
			</div>
		);
	}
} );

export default connect(
	( state, { service } ) => ( {
		availableExternalAccounts: getAvailableExternalAccounts( state, service.ID ),
		isFetching: isFetchingConnections( state, getSelectedSiteId( state ) ),
		keyringConnections: getKeyringConnectionsByName( state, service.ID ),
		removableConnections: getRemovableConnections( state, service.ID ),
		site: getSelectedSite( state ),
		siteUserConnections: getSiteUserConnectionsForService(
			state, getSelectedSiteId( state ), getCurrentUserId( state ), service.ID
		),
		user: getCurrentUser( state ),
	} ),
	{
		createSiteConnection,
		deleteSiteConnection,
		fetchConnections,
		updateSiteConnection,
		warningNotice,
	},
)( SharingService );
