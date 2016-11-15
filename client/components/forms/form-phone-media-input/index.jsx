/**
 * External dependencies
 */
import React from 'react';
import classnames from 'classnames';
import omit from 'lodash/omit';

/** Internal dependencies */
import PhoneInput from 'components/phone-input';
import FormLabel from 'components/forms/form-label';
import FormInputValidation from 'components/forms/form-input-validation';

export default React.createClass( {
	displayName: 'FormPhoneMediaInput',

	getDefaultProps: function() {
		return {
			isError: false
		};
	},

	getCountry() {
		return this.refs.input.getCountry();
	},

	setCountry( countryCode ) {
		return this.refs.input.setCountry( countryCode );
	},

	render: function() {
		const classes = classnames( this.props.className, {
			'is-error': this.props.isError
		} );
		return (
			<div className={ classnames( this.props.additionalClasses, 'phone' ) }>
				<div>
					<FormLabel htmlFor={ this.props.name }>{ this.props.label }</FormLabel>
					<PhoneInput
						{ ...omit( this.props, 'className' ) }
						ref="input"
						className={ classes } />
				</div>
				{ this.props.errorMessage && <FormInputValidation text={ this.props.errorMessage } isError /> }
			</div>
		);
	}
} );
