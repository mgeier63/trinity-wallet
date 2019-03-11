import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withI18n } from 'react-i18next';
import { connect } from 'react-redux';
import { zxcvbn } from 'libs/exports';

import { generateAlert } from 'actions/alerts';
import { setPassword } from 'actions/wallet';

import { passwordReasons } from 'libs/password';
import SeedStore from 'libs/SeedStore';
import { hash } from 'libs/crypto';

import Password from 'ui/components/input/Password';
import Button from 'ui/components/Button';

import { applyYubikeyMixinDesktop } from 'libs/yubikey/YubikeyMixinDesktop';

/**
 * User account password change component
 */
class PasswordSettings extends PureComponent {
    static propTypes = {
        /** @ignore */
        accounts: PropTypes.object.isRequired,
        /** @ignore */
        setPassword: PropTypes.func.isRequired,
        /** @ignore */
        generateAlert: PropTypes.func.isRequired,
        /** @ignore */
        t: PropTypes.func.isRequired,
        /** @ignore */
        // eslint-disable-next-line react/no-unused-prop-types
        is2FAEnabledYubikey: PropTypes.bool.isRequired,
        /** @ignore */
        yubikeySlot: PropTypes.number.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            passwordCurrent: '',
            passwordNew: '',
            passwordConfirm: '',
        };

        applyYubikeyMixinDesktop(this, props.yubikeySlot);
    }

    async doWithYubikey(yubikeyApi, postResultDelayed, postError) {
        const { passwordCurrent, passwordNew } = this.state;
        const { t, yubikeySlot } = this.props;
        try {
            const passwordNewHash = await hash(passwordNew);
            const passwordCurrentHash = await hash(passwordCurrent);

            const aPwYubiHashedCurrent = await this.doChallengeResponseThenSaltedHash(passwordCurrentHash);
            const aPwYubiHashedNew = await this.doChallengeResponseThenSaltedHash(passwordNewHash);

            if (aPwYubiHashedCurrent !== null && aPwYubiHashedNew !== null) {
                postResultDelayed(async () => {
                    this.changePassword(null, aPwYubiHashedCurrent, aPwYubiHashedNew);
                });
                return;
            }
        } catch (err2) {
            //console.error(err2);
            postError(
                t('yubikey:misconfigured'),
                t('yubikey:misconfiguredExplanation', { slot: yubikeySlot }),
            );
            return;
        }
    }

    /**
     * Check for a valid password, update vault and state
     * @param {event} event - Form submit event
     */
    changePassword = async (event, yubiHashedPasswordCur = null, yubiHashedPasswordNew = null) => {
        if (event) {
            event.preventDefault();
        }

        const { passwordCurrent, passwordNew, passwordConfirm } = this.state;
        const { accounts, setPassword, generateAlert, t } = this.props;

        if (passwordNew !== passwordConfirm) {
            generateAlert(
                'error',
                t('changePassword:passwordsDoNotMatch'),
                t('changePassword:passwordsDoNotMatchExplanation'),
            );
            return;
        }

        const score = zxcvbn(passwordNew);

        if (score.score < 4) {
            const reason = score.feedback.warning
                ? t(`changePassword:${passwordReasons[score.feedback.warning]}`)
                : t('changePassword:passwordTooWeakReason');

            return generateAlert('error', t('changePassword:passwordTooWeak'), reason);
        }

        if (this.shouldStartYubikey(yubiHashedPasswordCur === null)) {
            return;
        }

        try {
            const passwordNewHash = yubiHashedPasswordNew !== null ? yubiHashedPasswordNew : await hash(passwordNew);
            const passwordCurrentHash =
                yubiHashedPasswordCur !== null ? yubiHashedPasswordCur : await hash(passwordCurrent);

            const accountTypes = Object.keys(accounts)
                .map((accountName) => (accounts[accountName].meta ? accounts[accountName].meta.type : 'keychain'))
                .filter((accountType, index, accountTypes) => accountTypes.indexOf(accountType) === index);

            for (let i = 0; i < accountTypes.length; i++) {
                await SeedStore[accountTypes[i]].updatePassword(passwordCurrentHash, passwordNewHash);
            }

            setPassword(passwordNewHash);

            this.setState({
                passwordCurrent: '',
                passwordNew: '',
                passwordConfirm: '',
            });

            generateAlert(
                'success',
                t('changePassword:passwordUpdated'),
                t('changePassword:passwordUpdatedExplanation'),
            );
        } catch (err) {
            generateAlert(
                'error',
                t('changePassword:incorrectPassword'),
                t('changePassword:incorrectPasswordExplanation'),
            );
            return;
        }
    };

    render() {
        const { t } = this.props;
        const { passwordCurrent, passwordNew, passwordConfirm } = this.state;

        return (
            <form onSubmit={(e) => this.changePassword(e)}>
                <fieldset>
                    <Password
                        value={passwordCurrent}
                        label={t('changePassword:currentPassword')}
                        onChange={(value) => this.setState({ passwordCurrent: value })}
                    />
                    <Password
                        showScore
                        value={passwordNew}
                        label={t('changePassword:newPassword')}
                        onChange={(value) => this.setState({ passwordNew: value })}
                    />
                    <Password
                        value={passwordConfirm}
                        label={t('changePassword:confirmPassword')}
                        onChange={(value) => this.setState({ passwordConfirm: value })}
                    />
                </fieldset>
                <footer>
                    <Button
                        className="square"
                        type="submit"
                        disabled={!passwordCurrent.length || !passwordNew.length || !passwordConfirm.length}
                    >
                        {t('settings:changePassword')}
                    </Button>
                </footer>
            </form>
        );
    }
}

const mapStateToProps = (state) => ({
    is2FAEnabledYubikey: state.settings.is2FAEnabledYubikey,
    yubikeySlot: state.settings.yubikeySlot,
    accounts: state.accounts.accountInfo,
});

const mapDispatchToProps = {
    generateAlert,
    setPassword,
};

export default connect(mapStateToProps, mapDispatchToProps)(withI18n()(PasswordSettings));
