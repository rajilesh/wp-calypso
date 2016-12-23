/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import Main from 'components/main';
import CompactCard from 'components/card/compact';
import Notice from 'components/notice';
import QueryAccountRecoverySettings from 'components/data/query-account-recovery-settings';

import MeSidebarNavigation from 'me/sidebar-navigation';
import SecuritySectionNav from 'me/security-section-nav';
import ReauthRequired from 'me/reauth-required';

import twoStepAuthorization from 'lib/two-step-authorization';
import observe from 'lib/mixins/data-observe';

import RecoveryEmail from './recovery-email';
import RecoveryPhone from './recovery-phone';
import RecoveryEmailValidationNotice from './recovery-email-validation-notice';
import RecoveryPhoneValidationNotice from './recovery-phone-validation-notice';

import {
	updateAccountRecoveryEmail,
	updateAccountRecoveryPhone,
	deleteAccountRecoveryPhone,
	deleteAccountRecoveryEmail,
	resendAccountRecoveryEmailValidation,
	resendAccountRecoveryPhoneValidation,
	validateAccountRecoveryPhone,
} from 'state/account-recovery/settings/actions';

import {
	getAccountRecoveryEmail,
	getAccountRecoveryPhone,
	isAccountRecoverySettingsReady,
	isUpdatingAccountRecoveryEmail,
	isUpdatingAccountRecoveryPhone,
	isDeletingAccountRecoveryEmail,
	isDeletingAccountRecoveryPhone,
	isValidatingAccountRecoveryPhone,
	isAccountRecoveryEmailValidated,
	isAccountRecoveryPhoneValidated,
	hasSentAccountRecoveryEmailValidation,
	hasSentAccountRecoveryPhoneValidation,
} from 'state/account-recovery/settings/selectors';
import { getCurrentUserId } from 'state/current-user/selectors';
import { getUser } from 'state/users/selectors';

const SecurityCheckup = React.createClass( {
	displayName: 'SecurityCheckup',

	mixins: [ observe( 'userSettings' ) ],

	componentDidMount: function() {
		this.props.userSettings.getSettings();
	},

	isRecoveryEmailLoading: function() {
		const {
			accountRecoverySettingsReady,
			accountRecoveryEmailActionInProgress,
		} = this.props;

		return ! accountRecoverySettingsReady || accountRecoveryEmailActionInProgress;
	},

	isRecoveryPhoneLoading: function() {
		const {
			accountRecoverySettingsReady,
			accountRecoveryPhoneActionInProgress,
		} = this.props;

		return ! accountRecoverySettingsReady || accountRecoveryPhoneActionInProgress;
	},

	shouldShowEmailValidationNotice: function() {
		const {
			accountRecoveryEmail,
			accountRecoveryEmailValidated,
			hasSentEmailValidation,
		} = this.props;

		return ! this.isRecoveryEmailLoading() && accountRecoveryEmail && ! accountRecoveryEmailValidated && ! hasSentEmailValidation;
	},

	shouldShowPhoneValidationNotice: function() {
		const {
			accountRecoveryPhone,
			accountRecoveryPhoneValidated,
		} = this.props;

		return ! this.isRecoveryPhoneLoading() && accountRecoveryPhone && ! accountRecoveryPhoneValidated;
	},

	render: function() {
		const twoStepEnabled = this.props.userSettings.isTwoStepEnabled();

		const {
			translate,
		} = this.props;

		const twoStepNoticeMessage = translate(
			'To edit your SMS Number, go to {{a}}Two-Step Authentication{{/a}}.', {
				components: {
					a: <a href="/me/security/two-step" />
				},
			} );

		return (
			<Main className="security-checkup">
				<QueryAccountRecoverySettings />

				<MeSidebarNavigation />

				<SecuritySectionNav path={ this.props.path } />

				<ReauthRequired twoStepAuthorization={ twoStepAuthorization } />

				<CompactCard>
					<p className="security-checkup__text">
						{ this.props.translate( 'Keep your account safe by adding a backup email address and phone number. ' +
								'If you ever have problems accessing your account, WordPress.com will use what ' +
								'you enter here to verify your identity.' ) }
					</p>
				</CompactCard>

				<CompactCard>
					<RecoveryEmail
						primaryEmail={ this.props.primaryEmail }
						email={ this.props.accountRecoveryEmail }
						updateEmail={ this.props.updateAccountRecoveryEmail }
						deleteEmail={ this.props.deleteAccountRecoveryEmail }
						isLoading={ this.isRecoveryEmailLoading() }
					/>
					{ this.shouldShowEmailValidationNotice() &&
						<RecoveryEmailValidationNotice
							onResend={ this.props.resendAccountRecoveryEmailValidation }
						/>
					}
				</CompactCard>

				<CompactCard>
					<RecoveryPhone
						phone={ this.props.accountRecoveryPhone }
						updatePhone={ this.props.updateAccountRecoveryPhone }
						deletePhone={ this.props.deleteAccountRecoveryPhone }
						isLoading={ this.isRecoveryPhoneLoading() }
						disabled={ twoStepEnabled }
					/>
					{ twoStepEnabled &&
						<Notice
							status="is-error"
							text={ twoStepNoticeMessage }
							showDismiss={ false }
						/>
					}
					{ this.shouldShowPhoneValidationNotice() &&
						<RecoveryPhoneValidationNotice
							onResend={ this.props.resendAccountRecoveryPhoneValidation }
							onValidate={ this.props.validateAccountRecoveryPhone }
							hasSent={ this.props.hasSentPhoneValidation }
							isValidating={ this.props.validatingAccountRecoveryPhone }
						/>
					}
				</CompactCard>

			</Main>
		);
	},
} );

export default connect(
	( state ) => ( {
		accountRecoveryEmail: getAccountRecoveryEmail( state ),
		accountRecoveryEmailActionInProgress: isUpdatingAccountRecoveryEmail( state ) || isDeletingAccountRecoveryEmail( state ),
		accountRecoveryEmailValidated: isAccountRecoveryEmailValidated( state ),
		hasSentEmailValidation: hasSentAccountRecoveryEmailValidation( state ),
		accountRecoverySettingsReady: isAccountRecoverySettingsReady( state ),
		accountRecoveryPhone: getAccountRecoveryPhone( state ),
		accountRecoveryPhoneActionInProgress: isUpdatingAccountRecoveryPhone( state ) || isDeletingAccountRecoveryPhone( state ),
		accountRecoveryPhoneValidated: isAccountRecoveryPhoneValidated( state ),
		validatingAccountRecoveryPhone: isValidatingAccountRecoveryPhone( state ),
		hasSentPhoneValidation: hasSentAccountRecoveryPhoneValidation( state ),
		primaryEmail: getUser( state, getCurrentUserId( state ) ).email,
	} ),
	{
		updateAccountRecoveryEmail,
		deleteAccountRecoveryEmail,
		updateAccountRecoveryPhone,
		deleteAccountRecoveryPhone,
		resendAccountRecoveryEmailValidation,
		resendAccountRecoveryPhoneValidation,
		validateAccountRecoveryPhone,
	}
)( localize( SecurityCheckup ) );
