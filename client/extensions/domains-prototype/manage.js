/**
 * External dependencies
 */
import React, { PropTypes } from 'react';
import withStyles from 'isomorphic-style-loader/lib/withStyles';

/**
 * Internal dependencies
 */
import Button from 'components/button';
import Card from 'components/card';
import Gridicon from 'components/gridicon';
import Main from 'components/main';
import styles from './styles';

class Manage extends React.Component {
	render() {
		const { domain } = this.props;
		return (
			<Main>
				<h2 className={ styles.header }>What do you want to use { domain } for?</h2>
				<div className={ styles.manageContainer }>
					<Card>
						<h3>Landing page</h3>
						<Button href={ '/domains-prototype/manage/landing-page/' + domain } primary>
							<Gridicon icon="house" /> Edit
						</Button>
					</Card>
					<Card>
						<h3>Start a site</h3>
						<Button href={ '/domains-prototype/manage/start/' + domain } primary>
							<Gridicon icon="add" /> Get started
						</Button>
					</Card>
					<Card>
						<h3>Connect to existing site</h3>
						<Button href={ '/domains-prototype/manage/connect/' + domain } primary>
							<Gridicon icon="plugins" /> Connect
						</Button>
					</Card>
					<Card>
						<h3>Add email</h3>
						<Button href={ '/domains/manage/email/' + domain } primary>
							<Gridicon icon="mention" /> Set up email
						</Button>
					</Card>
					<Card>
						<h3>Something else</h3>
						<Button href={ '/domains/manage/' + domain } primary>
							<Gridicon icon="cog" /> Configure settings
						</Button>
					</Card>
				</div>
			</Main>
		);
	}
}

Manage.propTypes = {
	domain: PropTypes.string.required
};

export default withStyles( styles )( Manage );
