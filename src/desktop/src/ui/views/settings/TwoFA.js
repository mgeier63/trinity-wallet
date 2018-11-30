import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withI18n } from 'react-i18next';

import TwoFaOtp from 'ui/views/settings/TwoFAOtp';
import TwoFaYubikey from 'ui/views/settings/TwoFAYubikey';
import Button from 'ui/components/Button';

import css from './twoFa.scss';

/**
 * Two-factor authentication type chooser
 */
class TwoFA extends React.Component {
    static propTypes = {
        /** @ignore */
        is2FAEnabledOtp: PropTypes.bool.isRequired,
        /** @ignore */
        is2FAEnabledYubikey: PropTypes.bool.isRequired,
        /** @ignore */
        t: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            userSelectedOtp: false,
            userSelectedYubikey: false,
        };
    }

    onChildClosed = () => {
        this.setState({ userSelectedOtp: false, userSelectedYubikey: false });
    };

    enableSettingsView() {
        const { is2FAEnabledYubikey, is2FAEnabledOtp } = this.props;
        const { userSelectedYubikey, userSelectedOtp } = this.state;

        return (
            <div>
                {(is2FAEnabledOtp || userSelectedOtp) && <TwoFaOtp onChildClosed={this.onChildClosed} />}
                {(is2FAEnabledYubikey || userSelectedYubikey) && <TwoFaYubikey onChildClosed={this.onChildClosed} />}
            </div>
        );
    }

    enableChooserView() {
        const { t } = this.props;
        return (
            <div className={css.twoFa}>
                <h1>{t('twoFA:selectMethod')}</h1>
                <h2> {t('twoFA:twoFaMethod_otp')}</h2>
                <p>{t('twoFA:twoFaMethod_otp_explanation')}</p>
                <h2> {t('twoFA:twoFaMethod_yubikey')}</h2>
                <p>{t('twoFA:twoFaMethod_yubikey_explanation')}</p>
                <br />
                <br />

                <fieldset>
                    <Button
                        onClick={() => {
                            this.setState({ userSelectedOtp: true, userSelectedYubikey: false });
                        }}
                        variant="primary"
                    >
                        {t('twoFA:twoFaMethod_otp')}
                    </Button>
                    &nbsp;&nbsp;
                    <Button
                        onClick={() => {
                            this.setState({ userSelectedYubikey: true, userSelectedOtp: false });
                        }}
                        variant="primary"
                    >
                        {t('twoFA:twoFaMethod_yubikey')}
                    </Button>
                </fieldset>
            </div>
        );
    }

    render() {
        const { is2FAEnabledYubikey, is2FAEnabledOtp } = this.props;
        const { userSelectedYubikey, userSelectedOtp } = this.state;

        return (
            <div>
                {is2FAEnabledYubikey || is2FAEnabledOtp || userSelectedYubikey || userSelectedOtp
                    ? this.enableSettingsView()
                    : this.enableChooserView()}
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    is2FAEnabledOtp: state.settings.is2FAEnabled,
    is2FAEnabledYubikey: state.settings.is2FAEnabledYubikey,
});

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(withI18n()(TwoFA));
