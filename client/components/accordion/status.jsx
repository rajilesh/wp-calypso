/**
 * External dependencies
 */
import React, { PureComponent, PropTypes } from 'react';
import classNames from 'classnames';

/**
 * Internal dependencies
 */
import Gridicon from 'components/gridicon';
import Tooltip from 'components/tooltip';

/**
 * Constants
 */
const STATUS_GRIDICON = {
	info: 'info',
	warning: 'notice',
	error: 'notice'
};

export default class AccordionStatus extends PureComponent {
	static propTypes = {
		type: PropTypes.oneOf( [
			'info',
			'warning',
			'error'
		] ),
		text: PropTypes.node,
		url: PropTypes.string,
		position: PropTypes.string,
		onClick: PropTypes.func
	};

	static defaultProps = {
		type: 'info',
		onClick: () => {}
	};

	state = {};

	constructor() {
		super( ...arguments );

		this.showTooltip = this.toggleTooltip.bind( this, true );
		this.hideTooltip = this.toggleTooltip.bind( this, false );
	}

	setTooltipContext = ( tooltipContext ) => {
		if ( tooltipContext ) {
			this.setState( { tooltipContext } );
		}
	};

	onClick = ( event ) => {
		event.stopPropagation();
		this.props.onClick();
	};

	toggleTooltip( isTooltipVisible ) {
		this.setState( { isTooltipVisible } );
	}

	render() {
		const { type, text, url, position } = this.props;

		return (
			<a
				href={ url }
				onClick={ this.onClick }
				ref={ this.setTooltipContext }
				onMouseEnter={ this.showTooltip }
				onMouseLeave={ this.hideTooltip }
				className={ classNames( 'accordion__status', `is-${ type }` ) }>
				<Gridicon icon={ STATUS_GRIDICON[ type ] } />
				{ text && (
					<Tooltip
						position={ position }
						isVisible={ this.state.isTooltipVisible }
						context={ this.state.tooltipContext }>
						{ text }
					</Tooltip>
				) }
			</a>
		);
	}
}
