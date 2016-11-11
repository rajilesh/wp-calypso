/**
 * External dependencies
 */
import React, { PropTypes } from 'react';
import { localize } from 'i18n-calypso';
import { connect } from 'react-redux';
import { get } from 'lodash';

/**
 * Internal dependencies
 */
import SectionHeader from 'components/section-header';
import Card from 'components/card';
import Button from 'components/button';
import FormSelect from 'components/forms/form-select';
import FormLabel from 'components/forms/form-label';
import FormCheckbox from 'components/forms/form-checkbox';
import JetpackModuleToggle from '../jetpack-module-toggle';
import FormFieldset from 'components/forms/form-fieldset';
import InfoPopover from 'components/info-popover';
import ExternalLink from 'components/external-link';

import { isModuleActive, getModule } from 'state/jetpack-settings/modules/selectors';

const MediaSettings = ( props ) => {
	return (
		<div>
			<SectionHeader label={ props.translate( 'Media' ) }>
				<Button
					compact
					primary
					onClick={ props.submitFormAndActivateCustomContentModule }
					disabled={ props.fetchingSettings || props.submittingForm }>
					{ props.submittingForm ? props.translate( 'Saving…' ) : props.translate( 'Save Settings' ) }
				</Button>
			</SectionHeader>
			<Card className="media-settings__card site-settings">
				<FormFieldset>
					<div className="media-settings__info-link-container">
						<InfoPopover position={ 'left' }>
							<ExternalLink icon={ true } href={ 'https://jetpack.com/support/photon' } >
								{ props.translate( 'Learn more about Photon' ) }
							</ExternalLink>
						</InfoPopover>
					</div>
					<JetpackModuleToggle
						siteId={ props.site.ID }
						moduleSlug="photon"
						label={ props.translate( 'Speed up your images and photos with Photon.' ) }
						description="Enabling Photon is required to use Tiled Galleries."
						/>
				</FormFieldset>
				<FormFieldset className="has-divider is-top-only">
					<div className="media-settings__info-link-container">
						<InfoPopover position={ 'left' }>
							<ExternalLink icon={ true } href={ 'https://jetpack.com/support/carousel' } >
								{ props.translate( 'Learn more about Carousel' ) }
							</ExternalLink>
						</InfoPopover>
					</div>
					<JetpackModuleToggle
						siteId={ props.site.ID }
						moduleSlug="carousel"
						label={ props.translate( 'Transform image galleries into full screen slideshows.' ) }
						/>
					{
						( props.jetpackCarouselModuleActive && (
								<div className="media-settings__module-settings is-indented">
								<FormLabel>
									<FormCheckbox
										disabled={ props.submittingForm }
										name="carousel_display_exif" />
									<span>{ props.translate( 'Show photo metadata (Exif) in carousel, when available' ) }</span>
								</FormLabel>
								<FormLabel htmlFor="carousel_background_color">
									{ props.translate( 'Background color' ) }
								</FormLabel>
								<FormSelect
									disabled={ props.submittingForm }
									name="carousel_background_color"
									id="carousel_background_color" >
									<option value={ 'black' } key={ 'carousel_background_color_black' }>
										{ props.translate( 'Black' ) }
									</option>
									<option value={ 'white' } key={ 'carousel_background_color_white' }>
										{ props.translate( 'White' ) }
									</option>
								</FormSelect>
							</div>
						) )
					}
				</FormFieldset>
			</Card>
		</div>
	);
};

MediaSettings.propTypes = {
	submitFormAndActivateCustomContentModule: PropTypes.func.isRequired,
	jetpackCarouselModuleActive: PropTypes.bool.isRequired,
	fetchingSettings: PropTypes.bool.isRequired,
	submittingForm: PropTypes.bool,
	site: PropTypes.object.isRequired
};

const mapStateToProps = ( state, ownProps ) => {
	return {
		jetpackCarouselModuleActive: !! isModuleActive( state, ownProps.site.ID, 'carousel' ),
		photonDescription: get( getModule( state, ownProps.site.ID, 'photon' ), 'description' ),
		carouselDescription: get( getModule( state, ownProps.site.ID, 'carousel' ), 'description' )
	};
};

export default connect(
	mapStateToProps
)( localize( MediaSettings ) );
