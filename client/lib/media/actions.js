/**
 * External dependencies
 */
var debug = require( 'debug' )( 'calypso:media' ),
	assign = require( 'lodash/assign' ),
	uniqueId = require( 'lodash/uniqueId' ),
	path = require( 'path' );

/**
 * Internal dependencies
 */
var Dispatcher = require( 'dispatcher' ),
	wpcom = require( 'lib/wp' ),
	MediaUtils = require( './utils' ),
	PostEditStore = require( 'lib/posts/post-edit-store' ),
	MediaStore = require( './store' ),
	MediaListStore = require( './list-store' ),
	MediaValidationStore = require( './validation-store' );

/**
 * Module variables
 */
const MediaActions = {
	_fetching: {}
};

/**
 * Constants
 */
const ONE_YEAR_IN_MILLISECONDS = 31540000000;

MediaActions.setQuery = function( siteId, query ) {
	Dispatcher.handleViewAction( {
		type: 'SET_MEDIA_QUERY',
		siteId: siteId,
		query: query
	} );
};

// TODO: Once this entire module is converted to Redux,
// `updateShortcodes` shouldn't be passed as an argument anymore,
// but directly imported and dispatch()ed from inside `fetch()`,
// which needs to be turned into a Redux thunk.
MediaActions.fetch = function( siteId, itemId, updateShortcodes = null ) {
	var fetchKey = [ siteId, itemId ].join();
	if ( MediaActions._fetching[ fetchKey ] ) {
		return;
	}

	MediaActions._fetching[ fetchKey ] = true;
	Dispatcher.handleViewAction( {
		type: 'FETCH_MEDIA_ITEM',
		siteId: siteId,
		id: itemId
	} );

	debug( 'Fetching media for %d using ID %d', siteId, itemId );
	wpcom.site( siteId ).media( itemId ).get( function( error, data ) {
		Dispatcher.handleServerAction( {
			type: 'RECEIVE_MEDIA_ITEM',
			error: error,
			siteId: siteId,
			data: data
		} );

		if ( updateShortcodes ) {
			updateShortcodes( siteId, data );
		}

		delete MediaActions._fetching[ fetchKey ];
	} );
};

// TODO: Once this entire module is converted to Redux,
// `updateShortcodes` shouldn't be passed as an argument anymore,
// but directly imported and dispatch()ed from inside `fetchNextPage()`,
// which needs to be turned into a Redux thunk.
MediaActions.fetchNextPage = function( siteId, updateShortcodes = null ) {
	var query;

	if ( MediaListStore.isFetchingNextPage( siteId ) ) {
		return;
	}

	Dispatcher.handleViewAction( {
		type: 'FETCH_MEDIA_ITEMS',
		siteId: siteId
	} );

	query = MediaListStore.getNextPageQuery( siteId );

	debug( 'Fetching media for %d using query %o', siteId, query );
	wpcom.site( siteId ).mediaList( query, function( error, data ) {
		Dispatcher.handleServerAction( {
			type: 'RECEIVE_MEDIA_ITEMS',
			error: error,
			siteId: siteId,
			data: data,
			query: query
		} );

		if ( updateShortcodes ) {
			updateShortcodes( siteId, data );
		}
	} );
};

MediaActions.createTransientMedia = function( id, file, date ) {
	const transientMedia = { ID: id, 'transient': true };

	if ( date ) {
		transientMedia.date = date;
	}

	if ( 'string' === typeof file ) {
		// Generate from string
		assign( transientMedia, {
			file: file,
			title: path.basename( file ),
			extension: MediaUtils.getFileExtension( file ),
			mime_type: MediaUtils.getMimeType( file )
		} );
	} else {
		// Handle the case where a an object has been passed that wraps a
		// Blob and contains a fileName
		const fileContents = file.fileContents || file;
		const fileName = file.fileName || file.name;

		// Generate from window.File object
		const fileUrl = window.URL.createObjectURL( fileContents );

		assign( transientMedia, {
			URL: fileUrl,
			guid: fileUrl,
			file: fileName,
			title: file.title || path.basename( fileName ),
			extension: MediaUtils.getFileExtension( file.fileName || fileContents ),
			mime_type: MediaUtils.getMimeType( file.fileName || fileContents ),
			// Size is not an API media property, though can be useful for
			// validation purposes if known
			size: fileContents.size
		} );
	}

	return transientMedia;
};

// TODO: Once this entire module is converted to Redux,
// `updateShortcodes` shouldn't be passed as an argument anymore,
// but directly imported and dispatch()ed from inside `add()`,
// which needs to be turned into a Redux thunk.
MediaActions.add = function( siteId, files, updateShortcodes = null ) {
	if ( files instanceof window.FileList ) {
		files = [ ...files ];
	}

	if ( ! Array.isArray( files ) ) {
		files = [ files ];
	}

	// We offset the current time when generating a fake date for the transient
	// media so that the first uploaded media doesn't suddenly become newest in
	// the set once it finishes uploading. This duration is pretty arbitrary,
	// but one would hope that it would never take this long to upload an item.
	const baseTime = Date.now() + ONE_YEAR_IN_MILLISECONDS;

	return files.reduce( ( lastUpload, file, i ) => {
		// Generate a fake transient media item that can be rendered into the list
		// immediately, even before the media has persisted to the server
		const id = uniqueId( 'media-' );

		// Assign a date such that the first item will be the oldest at the
		// time of upload, as this is expected order when uploads finish
		const mediaDate = new Date( baseTime - ( files.length - i ) ).toISOString();

		const transientMedia = MediaActions.createTransientMedia( id, file, mediaDate );

		Dispatcher.handleViewAction( {
			type: 'CREATE_MEDIA_ITEM',
			siteId: siteId,
			data: transientMedia
		} );

		// Abort upload if file fails to pass validation.
		if ( MediaValidationStore.getErrors( siteId, id ).length ) {
			return Promise.resolve();
		}

		// Determine upload mechanism by object type
		const isUrl = 'string' === typeof file;
		const addHandler = isUrl ? 'addMediaUrls' : 'addMediaFiles';

		// Assign parent ID if currently editing post
		const post = PostEditStore.get();
		const title = file.title;
		if ( post && post.ID ) {
			file = {
				parent_id: post.ID,
				[ isUrl ? 'url' : 'file' ]: file
			};
		} else if ( file.fileContents ) {
			//if there's no parent_id, but the file object is wrapping a Blob
			//(contains fileContents, fileName etc) still wrap it in a new object
			file = {
				file: file
			};
		}

		if ( title ) {
			file.title = title;
		}

		debug( 'Uploading media to %d from %o', siteId, file );

		return lastUpload.then( () => {
			// Achieve series upload by waiting for the previous promise to
			// resolve before starting this item's upload
			const action = { type: 'RECEIVE_MEDIA_ITEM', id, siteId };
			return wpcom.site( siteId )[ addHandler ]( {}, file ).then( ( data ) => {
				Dispatcher.handleServerAction( Object.assign( action, {
					data: data.media[ 0 ]
				} ) );

				if ( updateShortcodes ) {
					updateShortcodes( siteId, data );
				}

				// also refetch media limits
				Dispatcher.handleServerAction( {
					type: 'FETCH_MEDIA_LIMITS',
					siteId: siteId
				} );
			} ).catch( ( error ) => {
				Dispatcher.handleServerAction( Object.assign( action, { error } ) );
			} );
		} );
	}, Promise.resolve() );
};

// TODO: Once this entire module is converted to Redux,
// `updateShortcodes` shouldn't be passed as an argument anymore,
// but directly imported and dispatch()ed from inside `edit()`,
// which needs to be turned into a Redux thunk.
MediaActions.edit = function( siteId, item, updateShortcodes = null ) {
	var newItem = assign( {}, MediaStore.get( siteId, item.ID ), item );

	Dispatcher.handleViewAction( {
		type: 'RECEIVE_MEDIA_ITEM',
		siteId: siteId,
		data: newItem
	} );

	if ( updateShortcodes ) {
		updateShortcodes( siteId, newItem );
	}
};

// TODO: Once this entire module is converted to Redux,
// `updateShortcodes` shouldn't be passed as an argument anymore,
// but directly imported and dispatch()ed from inside `update()`,
// which needs to be turned into a Redux thunk.
MediaActions.update = function( siteId, item, editMediaFile = false, updateShortcodes = null ) {
	if ( Array.isArray( item ) ) {
		item.forEach( singleItem => MediaActions.update( siteId, singleItem, editMediaFile, updateShortcodes ) );
		return;
	}

	const mediaId = item.ID;
	const newItem = assign( {}, MediaStore.get( siteId, mediaId ), item );

	// Let's update the media modal immediately
	// with a fake transient media item
	const updateAction = {
		type: 'RECEIVE_MEDIA_ITEM',
		siteId,
		data: newItem
	};

	if ( item.media ) {
		// Show a fake transient media item that can be rendered into the list immediately,
		// even before the media has persisted to the server
		updateAction.data = { ...newItem, ...MediaActions.createTransientMedia( mediaId, item.media ) };
	} else if ( editMediaFile && item.media_url ) {
		updateAction.data = { ...newItem, ...MediaActions.createTransientMedia( mediaId, item.media_url ) };
	}

	if ( editMediaFile && updateAction.data ) {
		// We need this to show a transient (edited) image in post/page editor after it has been edited there.
		updateAction.data.isDirty = true;
	}

	debug( 'Updating media for %o by ID %o to %o', siteId, mediaId, updateAction );
	Dispatcher.handleViewAction( updateAction );

	if ( updateShortcodes ) {
		updateShortcodes( siteId, updateAction.data );
	}

	const method = editMediaFile ? 'edit' : 'update';

	wpcom
		.site( siteId )
		.media( item.ID )
		[ method ]( item, function( error, data ) {
			Dispatcher.handleServerAction( {
				type: 'RECEIVE_MEDIA_ITEM',
				error: error,
				siteId: siteId,
				data: editMediaFile
					? { ...data, isDirty: true }
					: data
			} );

			if ( updateShortcodes ) {
				updateShortcodes( siteId, data );
			}
		} );
};

MediaActions.delete = function( siteId, item ) {
	if ( Array.isArray( item ) ) {
		item.forEach( MediaActions.delete.bind( null, siteId ) );
		return;
	}

	Dispatcher.handleViewAction( {
		type: 'REMOVE_MEDIA_ITEM',
		siteId: siteId,
		data: item
	} );

	debug( 'Deleting media from %d by ID %d', siteId, item.ID );
	wpcom.site( siteId ).media( item.ID ).delete( function( error, data ) {
		Dispatcher.handleServerAction( {
			type: 'REMOVE_MEDIA_ITEM',
			error: error,
			siteId: siteId,
			data: data
		} );
		// also refetch storage limits
		Dispatcher.handleServerAction( {
			type: 'FETCH_MEDIA_LIMITS',
			siteId: siteId
		} );
	} );
};

MediaActions.setLibrarySelectedItems = function( siteId, items ) {
	debug( 'Setting selected items for %d as %o', siteId, items );
	Dispatcher.handleViewAction( {
		type: 'SET_MEDIA_LIBRARY_SELECTED_ITEMS',
		siteId: siteId,
		data: items
	} );
};

MediaActions.clearValidationErrors = function( siteId, itemId ) {
	debug( 'Clearing validation errors for %d, with item ID %d', siteId, itemId );
	Dispatcher.handleViewAction( {
		type: 'CLEAR_MEDIA_VALIDATION_ERRORS',
		siteId: siteId,
		itemId: itemId
	} );
};

MediaActions.clearValidationErrorsByType = function( siteId, type ) {
	debug( 'Clearing validation errors for %d, by type %s', siteId, type );
	Dispatcher.handleViewAction( {
		type: 'CLEAR_MEDIA_VALIDATION_ERRORS',
		siteId: siteId,
		errorType: type
	} );
};

module.exports = MediaActions;
