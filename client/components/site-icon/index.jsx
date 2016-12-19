/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';
import { get, includes } from 'lodash';
import { parse as parseUrl } from 'url';
import classNames from 'classnames';

/**
 * Internal dependencies
 */
import QuerySites from 'components/data/query-sites';
import { getSite } from 'state/sites/selectors';
import { getSiteIconUrl } from 'state/selectors';
import resizeImageUrl from 'lib/resize-image-url';
import Gridicon from 'components/gridicon';

const SiteIcon = React.createClass( {
	getDefaultProps() {
		return {
			// Cache a larger image so there's no need to download different
			// assets to display the site icons in different contexts.
			imgSize: 120,
			size: 32
		};
	},

	propTypes: {
		imgSize: React.PropTypes.number,
		siteId: React.PropTypes.number,
		site: React.PropTypes.object,
		size: React.PropTypes.number
	},

	getIconSrcUrl() {
		const { iconUrl } = this.props;
		if ( ! iconUrl ) {
			return;
		}

		const { host } = parseUrl( iconUrl, true, true );
		const sizeParam = includes( host, 'gravatar.com' ) ? 's' : 'w';

		return resizeImageUrl( iconUrl, {
			[ sizeParam ]: this.props.imgSize
		} );
	},

	render() {
		const { site, siteId } = this.props;

		// Set the site icon path if it's available
		const iconSrc = this.getIconSrcUrl();

		const iconClasses = classNames( {
			'site-icon': true,
			'is-blank': ! iconSrc
		} );

		// Size inline styles
		const style = {
			height: this.props.size,
			width: this.props.size,
			lineHeight: this.props.size + 'px',
			fontSize: this.props.size + 'px'
		};

		return (
			<div className={ iconClasses } style={ style }>
				{ ! site && siteId > 0 && <QuerySites siteId={ siteId } /> }
				{ iconSrc
					? <img className="site-icon__img" src={ iconSrc } />
					: <Gridicon icon="globe" size={ Math.round( this.props.size / 1.3 ) } />
				}
			</div>
		);
	}
} );

export default connect( ( state, { site, siteId, imgSize } ) => {
	// Until sites state is completely within Redux, we provide compatibility
	// in cases where site object is passed to use the icon.img property as URL
	if ( site ) {
		return {
			iconUrl: get( site, 'icon.img' )
		};
	}

	// Otherwise, assume we want to perform the lookup in Redux state
	// exclusively using the site ID
	return {
		site: getSite( state, siteId ),
		iconUrl: getSiteIconUrl( state, siteId, imgSize )
	};
} )( SiteIcon );
